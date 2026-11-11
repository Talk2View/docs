---
title: "Chat UI server"
sidebar_position: 7
description: "Serve the SDK's chat page to a web view from 127.0.0.1 with talk2view.ui: options, chat history, guests, security, threads and the page itself."
---

# Chat UI server

`talk2view.ui` serves the SDK's chat page to a web view (3D Slicer's
`qSlicerWebWidget`, a `QWebEngineView`, or the system browser) from
`http://127.0.0.1:<port>`, using only the standard library. Python owns every
piece of state; the page is a view that reads it as SSE op batches and sends
commands back. Nothing in `talk2view` imports it: it is opt-in.

```python
from talk2view import ChatController, Talk2View
from talk2view.ui import GenericHost, UIServer

host = GenericHost()                         # build it on the thread that will pump it
t2v = Talk2View(partner_key="pk_live_...", dispatcher=host)
controller = ChatController(t2v)
server = UIServer(controller, host)
server.start()                               # http://127.0.0.1:<port>/#t=<token>
server.show()                                # posted: the browser opens as the host pumps
host.run_forever()                           # tool handlers run here; Ctrl+C to quit
server.stop(); controller.close(); t2v.close()
```

A host with a toolkit writes its own `HostAdapter` (`post`, `is_main_thread`,
`show`, `open_external`, `clipboard_set`, `theme`, `storage`, `audio`, plus
`supports_clipboard = True` when its clipboard works): 3D Slicer's adapter
shows the URL in a `qSlicerWebWidget` and drains `post()` with a `qt.QTimer`.
`server.set_theme(Theme(mode="dark", tokens={"--t2v-background": "#021C25"}))`
restyles the page live. `UIServer(..., on_skills_list=rescan)` lets the host
rescan its skill folders when the page opens the skills list.

**Options.** `ChatOptions` are the TypeScript `<Talk2ViewChat>` props as plain
data:

```python
from talk2view.ui import ChatFeatures, ChatOptions, ChatWelcome, ToolPresentation

options = ChatOptions(
    welcome=ChatWelcome(heading="Ask about your scene", suggestions=["Load MRHead"]),
    features=ChatFeatures(attachments=False),       # enforced: no uploads
    allow_anonymous=False,                          # enforced: no guest sessions
    reset_password_url="https://example.com/reset",
    footer="Answers can be wrong. Check them before you act.",
    tools={"load_file": ToolPresentation(activity="Loading a file", destructive=True)},
)
server = UIServer(controller, host, options=options)
```

They are checked when built (`TypeError`, `ValueError`) and served to the page
read-only. `ToolPresentation` gives a tool's running label, and marks the tools
whose calls change the end-user's work, which the approval card warns about.
The server enforces the options that fail closed. With attachments off it
refuses an upload, and a `send` that names one. With
`ChatFeatures(provider_sign_in=False)` it refuses `oauthStart`, and the page
hides "Continue with Apple / Google". With `allow_anonymous=False`
it refuses `startAnonymous`, and `UIServer` itself refuses to start at all: it
raises `ValueError` at construction if any `Talk2View` in play — the
controller's, or the one inside `app=` — was built with
`anonymous_auto_start=True`, since a `send` would otherwise start a guest
session behind the page's sign-in gate. `UIServer` also raises `ValueError` if
`app=` wraps a different `Talk2View` than the controller's own (a controller
with none, such as `FakeController`, plus an `app=` over a real `Talk2View` is
fine). A host that passes its own `app=AppState(...)` gives the options to
that `AppState` instead.

**Chat history.** With `ChatFeatures(thread_list=True)`, the default (as in
the TypeScript `<Talk2ViewChat>`), the page keeps earlier conversations on
this device: New chat, switch, rename and delete. They are stored in the
`Talk2View`'s `data_storage` under `t2v_chat_conversations_v1:<partner key>`,
one bucket per signed-in user (guests included), up to 512 KB in all, and
written 500 ms after a reply settles. At `start()`, a controller with nothing
on screen gets the newest stored conversation back. `data_storage` defaults to
the token store, so give `Talk2View(data_storage=FileStorage(...))` a file of
its own rather than rewrite the tokens on every reply. Call `server.stop()`
before quitting: it writes what is pending (an interpreter exit without it
does too). `ChatFeatures(thread_list=False)` turns the list and the writes off.
On read, a stored conversation's title is cut to 200 characters (the same cap
`threadRename` itself is held to) and its messages to the newest 5000 — a
backstop for a hand-edited or corrupt file, not a shape this SDK's own writes
approach at any realistic size.

**Guests.** The page's `limits` slice says when a guest was turned away: the
demo allowance ran out, or the engine refused a guest session (with its
reason). The page then shows sign-in in place of the thread. The **engine's**
demo budget is the real limit — the SDK does not count anonymous turns itself,
it only relays what the engine decided — so both limits lift not just on a
real sign-in but on a sign-out, on a new guest session starting, and on any
other change of identity (the TypeScript SDK instead keeps the gate for the
rest of the page's life). The page then sends the stopped turn again with
`reload`. "Default" in the model picker returns to the partner's default
model.

The page's "new chat" (`newSession`) runs `controller.clear()`, which deletes
the engine session. The engine keeps one session per account and partner key,
so that is also the session of any other Talk2View app the user is signed in
to with the same partner key.

**Security.** The server binds `127.0.0.1` on an ephemeral port and admits
a request only from a loopback peer, with its own `Host`, and with its own
`Origin` when one is sent. Every API route (`/events`, `/command`,
`/upload`) needs the per-launch token, which travels in the URL fragment (the
browser never sends a fragment) and then in an `Authorization: Bearer`
header. A preflight is never answered and no `Access-Control-*` header is ever
sent, so no other page on the machine can drive it. The request log (logger
`talk2view.ui`, DEBUG) records paths and statuses only, never a query string.
`GenericHost` hands the tokened URL to the system browser, whose command line
other local users on a multi-user machine can read from the process list, so
a host that cares shows the page in an embedded web view instead.

**Threads.** HTTP threads never call the controller, `Talk2View` or host
code. Commands run in order on one router thread, uploads on one upload
thread, and account refreshes (config, models) on one refresh thread. The
controller's batches reach each page through a bounded queue: a page that
falls behind a streaming reply gets the backlog as one event, and one that
falls too far behind gets a fresh snapshot. Those threads (`t2v-ui-router`,
`t2v-ui-refresh`, `t2v-ui-upload`) sign in and out (a refresh token the
engine rejects signs out too), start guest sessions and change preferences,
so the host's own `t2v.auth.on_auth_state_change` and
`t2v.preferences.on_change` listeners can run on them too: a toolkit host
marshals their UI work to its main thread.

**Turn timings.** The page sends `send` with `timing: true` and, once that
turn is over, one `metrics` command: Send to the command's POST, and the first
text op to it painted. The server adds how long the command waited for the
router and how long the first text took to reach the page, and holds that
turn's `TurnTiming` until the report arrives (three seconds at most), so
`t2v.metrics` listeners see the whole path in `timing.ui`.

**The page.** The chat page is built from `embed/` and shipped in
the wheel. A git checkout does not have it until it is built: `UIServer`
then raises `StaticAssetsMissingError`, whose message says how to build it,
or pass `static_dir=` a built bundle. To try a built page without an engine,
run `python -m talk2view.ui.testing --static-dir <dist>`, which serves it
against a scripted `FakeController`.

It is the TS SDK's assistant-ui chat, rebuilt for Chromium 83 (3D Slicer's
web view on Windows and Linux): streamed Markdown replies, tool steps named
by `ToolPresentation.activity`, the approval card (allow once, always allow,
deny with a reason, edited arguments, the destructive warning; allow or deny
only for an engine approval), the error card with Try again, sign-in,
sign-up and sign-out behind the guest gate, the model picker with Default,
text size, skills, attachments, and New chat. Links open with the host's
`open_external`, and Copy uses `clipboard_set` when the host declares
`supports_clipboard`.

**Continue with Apple / Google.** The Account view offers them while the
partner has desktop sign-in turned on (the page asks the engine at startup and
on every sign-in change) and `ChatFeatures(provider_sign_in=True)`, the
default. The sign-in runs `t2v.auth.sign_in_with_provider` on its own thread,
and the browser opens through the host's `open_external` on its main thread;
a host whose `open_external` returns `False` (as `GenericHost` does when
`webbrowser.open` finds no browser) or raises gets "the browser could not be
opened" at once. While the browser is out the page shows a Cancel button, and
signing in with email, signing up or signing out cancels it too.

Not yet available in the chat page: anonymous sessions on a partner key
that requires a captcha, generated images (the page names the file; the
bytes need a route), and editing a sent message.

Dictation needs a microphone from the host: the page shows a mic button only
when the host's `audio()` returns an `AudioCapture` (see `talk2view.audio`).
`GenericHost` returns none.
