---
title: "The Talk2View client"
sidebar_position: 2
description: "The Talk2View client: constructor, chat and session methods, Capabilities, partner config, models, preferences, voice and ChatEvent."
---

# The Talk2View client

This page covers the `Talk2View` client: its constructor, its chat and session methods, `Capabilities`, partner config and models, preferences, voice, and the events `chat()` yields.

## `Talk2View`

Main entry point.

```python
t2v = Talk2View(
    partner_key="pk_live_...",          # Required — your partner API key
    base_url="https://engine.talk2view.com",  # Optional — API endpoint
    storage=MemoryStorage(),            # Optional — token persistence backend
    model="gpt-4.1-mini",              # Optional — default model
    dispatcher=None,                    # Optional — where handlers run (see below)
    capabilities=None,                  # Optional — opt-in engine features
    data_storage=None,                  # Optional — skills + preferences (default: storage)
    anonymous_auto_start=False,         # Optional — start a demo session when signed out
    request_timeout=30.0,               # Optional — seconds per request (and to open a stream)
    upload_timeout=120.0,               # Optional — seconds per upload (attachments, audio)
)
```

`dispatcher` is covered in
[Running tool handlers on the host's main thread](./tools.md#running-tool-handlers-on-the-hosts-main-thread),
and `capabilities` in [`Capabilities`](#capabilities) on this page.

Both timeouts match the TypeScript SDK's defaults and must be positive numbers
of seconds (anything else raises `ValueError`). An open chat stream is not
bound by them: it may go 300 s between bytes, and the engine's heartbeats
arrive well inside that (the TypeScript SDK sets no read limit once a stream is
open).

### `t2v.chat(message, system_prompt=None, history=None, attachments=None, cancel=None)`

Send a message and stream the response. Auto-creates a session if needed. Returns an `Iterator[ChatEvent]`.

```python
for event in t2v.chat("What can you see in the scene?"):
    match event.type:
        case "text":       print(event.content, end="")
        case "reasoning":  print(f"[thinking] {event.content}")
        case "tool_call":  print(f"Calling {event.tool_name}({event.arguments})")
        case "status":     print(f"[{event.status}: {event.message}]")
        case "todos":      print(f"Plan: {event.todos}")
        case "error":      print(f"[{event.error_type}] {event.message}")
        case "done":       print(f"\nThread: {event.thread_id}")
```

This is a generator: nothing is sent until the first `next()`, and failures
surface from the iteration rather than from the call.

If the engine has lost the chat session (a deploy, a restart, an eviction) and
nothing of the reply has arrived yet, a new session is created and the turn is
resent once — subscribe with `t2v.on_session_recovered(callback)` to learn the
new session id. Once the reply has started nothing is resent: an `error` event
with `error_type="session_lost"` is yielded instead, because a tool handler may
already have run on your side.

### `t2v.stop()`

Stop the in-flight `chat()` / `respond_to_approval()` stream. Safe to call from
any thread — it unblocks a read that is stalled mid-stream. Events already
yielded are kept and the iteration then ends quietly, without raising.

```python
threading.Thread(target=consume_chat, daemon=True).start()
t2v.stop()  # e.g. from a Cancel button on the UI thread
```

`chat()` registers its token on the consumer's first `next()`, so a `stop()`
that lands before then is lost. Pass your own token when you need to cancel
earlier, or to cancel one specific turn:

```python
from talk2view import CancelToken, Cancelled

token = CancelToken()
for event in t2v.chat("Segment the liver", cancel=token):
    ...
token.cancel()  # from any thread
```

A cancelled turn ends the `chat()` iteration quietly. The lower-level
`T2VSession` / `T2VClient` iterators raise `Cancelled` instead.

### `t2v.create_session(model=None)`

Explicitly create a new session. Returns a `T2VSession`.

### `t2v.clear_session()`

Delete the current session and reset conversation history.

### `t2v.detach_session()`

Forget the current session without deleting it, so the next `chat()` opens a
fresh one. Unlike `clear_session()`, no `DELETE` goes out: the conversation
this session belongs to may be one you switch back to, and its turn may still
be finishing. `t2v.partner_key` is the partner key `Talk2View` was built with
(read-only).

### `t2v.upload_attachment(file, filename=None, mime_type=None)`

Upload an image or PDF and pass the returned `Attachment` to
`chat(..., attachments=[attachment])`.

### `t2v.close()`

Release the pooled HTTP connections. Long-lived hosts should call this on
shutdown, or use `Talk2View` as a context manager.

## `Capabilities`

Opt-in engine features. All off by default, and nothing is added to the request
body for a flag that is off:

```python
from talk2view import Capabilities, Talk2View

t2v = Talk2View(
    partner_key="pk_live_...",
    capabilities=Capabilities(
        approval=True,           # engine-enforced approval of platform tools
        tool_events=True,        # platform-tool lifecycle (tool_event events)
        reasoning=True,          # the model's reasoning (reasoning events)
        image_generation=True,   # generated-image tool events
        timezone="Australia/Perth",
        surface="app",           # "keyboard" | "app" — the engine rejects anything else
    ),
)
```

## Partner config, models, completions, warm-up

```python
config = t2v.get_config()      # PartnerConfig: default/allowed/gated models, flags; cached
models = t2v.list_models()     # ModelsResponse; show `m.name or m.id`
result = t2v.completions("medgemma-27b", [{"role": "user", "content": "..."}])
t2v.warm_up()                  # get the end-user's key minted early; never raises
content = t2v.get_attachment_content(attachment.id)   # AttachmentContent(data, mime_type)
t2v.set_chat_defaults(model="gemini-3.8-flash")   # the model for the next turns
t2v.set_chat_defaults(model=DEFAULT_MODEL)        # back to the partner's default
```

`completions()` needs a signed-in end-user: for a guest the engine answers
`sign_in_required`. It asks for one reply (`max_tokens` up to 16384).

`set_chat_defaults(model=None)` leaves the model as it is. `DEFAULT_MODEL`
forgets it, so chat sends none and the engine uses the partner's default. The
engine keeps the model a session last used, so after `DEFAULT_MODEL` replaces a
model the next turn first deletes the engine session and starts a fresh one. The
conversation carries on through the history the caller replays
(`ChatController` replays its own).

`get_config()` is fetched once per login (concurrent callers share the request, and on
a failure all of them get the same exception object) and invalidated on any auth
change. `warm_up()` runs once per signed-in identity and
swallows every error (an engine without `POST /v1/account/warm` is a no-op). Uploads
are checked against the engine's MIME allow-list before any request
(`ATTACHMENT_ACCEPT`, `is_allowed_attachment_type`); the allow-list is checked before
the file is even read. `get_attachment_content()` requires `attachment_id` to be a
UUID (anything else raises before any request) and caps a download at 25 MB.

## `t2v.preferences`

The end-user's UI choices (`model`, `stt_model`, `stt_language`, `font_size`), stored
in `data_storage` under the same key and JSON shape as the TypeScript SDK's
`useUserPreferences`.

```python
prefs = t2v.preferences.get()                      # UserPreferences (None = not set)
t2v.preferences.update(model="gemini-3.8-flash", font_size="large")
t2v.preferences.update(model=None)                 # unset one
t2v.preferences.on_change(lambda p: print(p))
```

Every value is a string or `None`: anything else raises `TypeError`, and a `font_size`
other than `small`/`medium`/`large` raises `ValueError`, before anything is stored.

## `t2v.voice`

```python
models = t2v.voice.list_models()            # [AudioModel]; show `m.name or m.id`
result = t2v.voice.transcribe("note.webm", model=models[0].id, language="en")
print(result.text)
```

Each `AudioModel` is a `Model` that also carries `supported_languages` (ISO
639-1 codes; `None` means any language) and a short `description`, as in the
TypeScript SDK. With `anonymous_auto_start` both calls start a guest session
first, as every other authenticated call does. The audio is read before that,
so a missing file never costs a guest session. A transcription is an upload,
bounded by `upload_timeout`.

## `ChatEvent`

Events yielded by `chat()` / `send_message()`.

| `event.type` | Fields | Description |
|---|---|---|
| `"text"` | `content` | A chunk of the AI's response text |
| `"reasoning"` | `content` | A chunk of the model's reasoning (needs `Capabilities(reasoning=True)`) |
| `"tool_call"` | `tool_name`, `tool_call_id`, `arguments` | The AI is calling one of your tools (auto-handled if registered) |
| `"tool_event"` | `tool_name`, `tool_call_id`, `tool_event` | Lifecycle of a *platform* tool call (needs `Capabilities(tool_events=True)`) |
| `"approval_required"` | `kind`, `tool_name`, `tool_call_id`, `arguments`, `description`, `details` | The turn is paused for the end-user — answer with `respond_to_approval()` |
| `"approval_result"` | `tool_name`, `tool_call_id`, `decision` | The decision that was applied (`"once"`, `"always"` or `"deny"`) |
| `"status"` | `status`, `message` | Agent status update (e.g., "thinking", "planning") |
| `"todos"` | `todos` | Agent's task plan |
| `"error"` | `message`, `error_type`, `detail` | A failure reported inside the stream (e.g. `"session_lost"`, a budget error). Never rendered as text |
| `"done"` | `thread_id` | Stream complete |

An `error` event is a report, not an exception: the iteration continues (and
usually ends) normally. `chat()` raises for failures that end the turn outright.
