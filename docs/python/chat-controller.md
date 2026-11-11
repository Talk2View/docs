---
title: "ChatController"
sidebar_position: 6
description: "ChatController owns the conversation: state as snapshots and op batches, commands, callback rules, host wiring and turn timings."
---

# ChatController

`t2v.chat()` gives you a stream of events and leaves the conversation to you.
`ChatController` owns the conversation instead: the display messages, the
streaming assistant reply with its tool steps and plan, the pending approval,
the error, the LLM history that is replayed on the next turn, and the one run
in flight. A UI is a view over it and never a second source of truth — it reads
the state, follows the changes, and drives the controller with commands.

```python
import qt                                  # 3D Slicer's Qt module
from talk2view import Capabilities, ChatController, Talk2View, qt_dispatcher

t2v = Talk2View(partner_key="pk_live_...", dispatcher=qt_dispatcher(qt.QTimer))
t2v.tools.register_from_functions([get_scene_summary, load_sample])

controller = ChatController(
    t2v,
    system_prompt="You are a 3D Slicer assistant.",   # sent with every turn
    model="gpt-4.1-mini",                              # bound to the session
    capabilities=Capabilities(approval=True),          # bound to the session
)
```

**One controller per `Talk2View`.** It holds that client's chat session, its
LLM history and the single run in flight, so a second controller on the same
client would fight it for all three. `model=` and `capabilities=` are handed to
`t2v.set_chat_defaults()`; `dispatcher=` defaults to the one the tools use
(`t2v.tools.dispatcher`), so tool handlers and main-thread callbacks share a
thread; `executor=` is where a turn streams — by default a daemon thread named
`t2v-chat` per run.

Close the `ChatController` before closing the `Talk2View`: the controller
subscribes to `t2v.skills` and `t2v.auth`, and one dropped without `close()`
stays subscribed — it keeps receiving skills changes and may still recycle the
session.

**The conversation belongs to one end-user.** The controller follows
`t2v.auth` (its `isAnonymous` too), hearing every change before any host
listener, so a listener of yours that blocks or signs in again cannot get ahead
of it:

| Auth change | Approval consent (`alwaysAllowedTools`) | Conversation |
|---|---|---|
| Same user id (a convert, a repeated sign-in) | kept | kept |
| Signed out → signed in (including the anonymous start a `send()` makes) | reset | kept |
| Anonymous demo → account (`signup()`'s convert, or its sign-in to an existing account) | reset | kept |
| Sign-out: `logout()`, or a refresh token the engine rejected | reset | dropped |
| One anonymous session → another, account → anonymous, account → another account | reset | dropped |

"Dropped" is local, like `clear()` but with no engine call (the old token is
gone): the run in flight is abandoned, and the messages, the history the next
turn would replay, a pending approval and `threadId` are emptied. A kept
conversation is replayed into the new identity's session on its next turn —
the demo-to-signup path keeps the demo's chat. No identity ever inherits
another's "always allow". The send that triggers an anonymous start carries on.

**A list of conversations kept per end-user** (`talk2view.ui.ThreadsState` is
one) hears identity changes with `follow_identity(callback)` instead of
reading `t2v.auth` itself: it returns the identity now, and every later change
reaches `callback` once, in order, as an `IdentityChange` — `epoch`, `user_id`,
`anonymous`, and `forgotten`, the conversation the change dropped from the
screen (`None` when one was kept), exported in the same locked step that
dropped it, so nothing that reached the conversation before the drop is
missing from it. `exchange_conversation(snapshot, *, epoch, carry=None)`
exports the outgoing conversation and restores `snapshot` in one locked step
— `epoch` must be the identity `follow_identity` last reported, or nothing
happens and `None` comes back (the identity has already moved on, and the
change reaches `callback` instead); `snapshot=None` only exports. `carry`
decides whether the conversation now on screen may follow the end-user across
a sign-in out of a guest session or out of none (`None` leaves it as it is).
Anything that needs to know a conversation was just replaced, whichever of
`restore_conversation` or `exchange_conversation` did it — a screenshot or file
queue that must not land in the thread just switched away from, say — hears
`on("conversationReplaced", cb)` (below) once for either, rather than overriding
both methods itself.

## State: `snapshot()` and `subscribe()`

State reaches a view in two halves of one protocol. `snapshot()` returns the
whole state as a `ChatSnapshot` dict (camelCase keys, the same shape as the
TypeScript SDK's `DisplayMessage`), stamped with the `seq` of the batch it was
cut on. `subscribe(on_batch)` then delivers every change as an `OpBatch` —
`{"seq": n, "ops": [...]}` — in `seq` order, and `apply_batch()` folds one onto
a snapshot:

```python
from talk2view import SeqGapError, apply_batch

dispatcher = t2v.tools.dispatcher   # the qt_dispatcher above; the controller posts through it
state = None                        # the view's copy; None while it waits for a snapshot

def resync():
    global state
    state = controller.snapshot()   # called outside any delivery, so a replay base
    render(state)

def on_batch(batch):                # deliver_on_main=True: runs on the host's main thread
    global state
    if state is None or batch["seq"] <= state["seq"]:
        return                      # waiting for a resync, or older than the snapshot
    try:
        state = apply_batch(state, batch)
    except SeqGapError:
        state = None                # a gap: resync from a fresh snapshot, but not in here
        dispatcher.post(resync)     # queued: runs on main once this callback has returned
        return
    render(state)

unsubscribe = controller.subscribe(on_batch, deliver_on_main=True)
resync()                            # the first snapshot, taken AFTER subscribing
```

The joining rules, in full: subscribe first, then take the snapshot; drop
batches whose `seq` is not greater than the snapshot's; on a gap
(`seq != last + 1`, which `apply_batch` raises as `SeqGapError`) take a fresh
snapshot **from outside the callback**. `snapshot()` is cut on a batch
boundary, so replaying every batch with a greater `seq` onto it reproduces the
live state exactly — except when it is called from inside a delivery on the
emitting thread, where it is a plain copy (see the callback rules below).
Rebasing on that copy can apply a streaming delta twice, and the view never
heals. So the gap branch above only drops the view and posts `resync`: with
`qt_dispatcher`, `bpy_dispatcher` or a `QueueDispatcher` the post is queued
and runs on the host's main thread once the callback has returned. Under the
default `InlineDispatcher` a post runs at once, on the emitting thread, and
defers nothing. A host with no timer-driven dispatcher gives the controller a
queue of its own instead: create a `QueueDispatcher()` on the host's thread
(only the thread that creates it may `pump()` it), pass it as
`ChatController(t2v, dispatcher=queue)`, use it as `dispatcher` in the example
above, and call `queue.pump()` from the host's loop. Batches and the resync
then run on that one thread, in order, and the example works as written.

Batches are shared between subscribers: treat them as read-only.
`apply_batch` never mutates its arguments and returns a new snapshot.

The op format is two ops: `set` at a path (a `set` at index `len` of a list
appends), and `append-text` for a streaming delta. Any structural shrink
(retry, edit, clear, dropping an empty segment) is one `set` of the whole
`messages` list. A page derives `isRunning = isLoading || pendingApproval !== null`.

## Commands

Every method is safe to call from any thread and none of them blocks on the
run.

| Call | What it does | Raises |
|---|---|---|
| `send(text, attachments=None)` | Starts a turn; returns as soon as the job is on the executor. | `ControllerBusyError` (a run is active or an approval is pending), `ControllerClosedError`, and whatever the executor or the dispatcher raises while the first batch is handed over — re-raised after the run is undone, so the controller is usable, not busy for good. |
| `approve(decision, *, tool_call_id=None)` | Answers the pending approval and resumes on a new run. A no-op when nothing is pending, or when `tool_call_id` names a different call (a stale click). `Decision("always")` is remembered for that client tool (`alwaysAllowedTools`) — never for an engine approval. | `ControllerClosedError`, and — like `send()` — whatever the executor or the dispatcher raises while the first batch is handed over, re-raised after the run is undone. |
| `cancel()` | Stops the stream, keeping the partial reply and setting no error. With an approval pending there is nothing to stop, so the call is denied with `CANCELLED_APPROVAL_FEEDBACK` (`"Cancelled by the user"`) — only the card pending when Stop was pressed, never a newer one. | Never raises. A denial the executor or the dispatcher refuses to launch is logged and surfaces as `error`, and the controller is left idle. |
| `retry()` | Removes the last user turn and everything after it, then sends it again. A no-op with nothing to retry. | `ControllerBusyError`, `ControllerClosedError` |
| `edit(message_id, text)` | Drops that user message and everything after it, then sends `text`. | `ValueError` (no *user* message has that id), `ControllerBusyError`, `ControllerClosedError` |
| `clear()` | Resets the conversation and deletes the engine session on the executor. Allowed while busy: a run in flight is abandoned and a pending approval dropped. `isLoading` stays `True` until the DELETE returns. | `ControllerClosedError` |
| `clear_error()` | Sets `error` back to `None`. | — |
| `export_conversation()` | Everything needed to put this conversation back later — the messages, the replay history, `threadId`, `marks` — as a `ConversationSnapshot`. Take one before switching away. | — |
| `restore_conversation(snapshot)` | Puts `snapshot` on screen, replacing whatever is there. Allowed while busy, like `clear()`: a run in flight is abandoned. The engine session is detached, not deleted. A `snapshot` that fails validation (a bad message id, an attachment shaped wrong) is a no-op, logged. | `ControllerClosedError` |
| `wait_idle(timeout=None)` | Blocks until no run is active. A pending approval counts as idle: no thread waits on it. Idle can be reported while that approval's paused response is still being closed — the run is over, but a `t2v-chat` thread may take a moment more to unwind. | — |
| `close()` | Abandons any run (its cancel token is cancelled), drops subscribers and listeners. Does not close the `Talk2View`. | — |
| `on("demoLimitReached", cb)` | A one-shot notice, not chat state: the anonymous demo budget ran out (`DEMO_LIMIT_REACHED`). Returns an unsubscribe. | — |
| `on("conversationReplaced", cb)` | A conversation was just put on screen, replacing whatever was there — `restore_conversation` or a snapshot-carrying `exchange_conversation`, either one; not raised for an export-only `exchange_conversation(None, ...)` or one refused for a stale `epoch`, since nothing was replaced. For a host that needs to know a switch happened without caring which method caused it — the 3D Slicer extension's screenshot follow-up guard drops what it was queued for on this, not by overriding either method. Returns an unsubscribe. | — |

An approval never parks a thread: the worker returns with `pendingApproval`
set, `isLoading` `False` and the assistant message still `isStreaming` (so the
card renders on it), and `approve()` starts the resume as a new run. A turn
that produced no assistant text because of an `error` event, a stream that
raised, or a cancel is rolled out of the LLM history, so the next `send` does
not replay `[..., user, user]`.

## Callback rules

`subscribe(on_batch, *, deliver_on_main=False)`:

- **`deliver_on_main=False` (the default)** runs the callback on the emitting
  thread — usually the worker — inside the delivery window every other emitter
  waits on. It must not block waiting on the host's main thread (`run_on_main`,
  a blocking Qt connection, a queue only the UI thread drains): that thread may
  be inside `send()` waiting for this very delivery, and neither side could then
  move. Enqueue and return.
- **`deliver_on_main=True`** posts the callback through the dispatcher and never
  waits on it, so it runs on the host's main thread — the right place for
  anything that touches the UI. A host that stops pumping stalls its own
  batches and nothing else; a batch may still be queued when `wait_idle()`
  returns. Under the default `InlineDispatcher` a post runs right there on the
  emitting thread, so the rules above apply to it as well.
- **No callback may call `wait_idle()`.** On the emitting thread the run can
  only go idle once the callback returns; on the main thread it stalls the pump
  the worker's tool handlers need.
- A callback may read `snapshot()` and call back in (`approve()`,
  `clear_error()`, …): the ops that produces arrive in a later batch, never out
  of order. A `snapshot()` taken from inside an emitting-thread callback is a
  plain copy, not a replay base: never rebase a view on it (the State example
  above resyncs from outside the callback).
- `on(...)` listeners always run on the emitting thread, just before the batch
  reaches the subscribers, so the same rules apply to them.
- A subscriber that raises is logged and the run continues; the other
  subscribers still get the batch.

## Wiring it to a host

The dispatcher is the bridge to the host's main thread for both tool handlers
and `deliver_on_main` subscribers. Construct it on that thread:

```python
# 3D Slicer / FreeCAD (Qt)
import qt                                  # PySide6.QtCore in FreeCAD
from talk2view import ChatController, Talk2View, qt_dispatcher

t2v = Talk2View(partner_key="pk_live_...", dispatcher=qt_dispatcher(qt.QTimer))
controller = ChatController(t2v)
controller.subscribe(update_chat_widget, deliver_on_main=True)   # runs on Qt's thread
# `text` is a property in Slicer's PythonQt and a method in FreeCAD's PySide:
send_button.clicked.connect(lambda: controller.send(input_box.text))      # 3D Slicer
# send_button.clicked.connect(lambda: controller.send(input_box.text()))  # FreeCAD
stop_button.clicked.connect(controller.cancel)
```

Disable Send while `isLoading` is `True` or `pendingApproval` is set, or catch
`ControllerBusyError` — that is the state in which `send()` refuses.

```python
# Blender
import bpy
from talk2view import ChatController, Talk2View, bpy_dispatcher

t2v = Talk2View(partner_key="pk_live_...", dispatcher=bpy_dispatcher(bpy.app.timers))
controller = ChatController(t2v)
controller.subscribe(redraw_panel, deliver_on_main=True)
```

For any other host, use `QueueDispatcher` and drain it from your own loop with
`pump()`, or `TimerPumpDispatcher(start_timer)` with a timer of your own.

## Turn timings (`t2v.metrics`)

When a chat "feels slow", `t2v.metrics` says which step is: every turn a
`ChatController` runs ends in one `TurnTiming`, handed to each `on_turn`
listener. Marks are milliseconds since the turn started.

```python
import json

def log_turn(timing):
    print(json.dumps(timing.as_dict()))       # plain data, JSON-ready
    print(timing.time_to_first_text_ms, timing.engine_wait_ms)
    for tool in timing.tools:
        print(tool.name, tool.main_thread_wait_ms, tool.run_ms, tool.resume_ms)

off = t2v.metrics.on_turn(log_turn)           # off() stops it
t2v.metrics.recent()                          # the last 50 turns
```

- `request`: the turn's POST: `sent_ms`, `headers_ms` (TTFB), `first_event_ms`,
  `first_text_ms`; `setup_ms` is the time before it was sent (session, sign-in,
  skills) and `engine_wait_ms` the engine and the model up to the first event.
- `tools`: per call, the interrupt, `approval_wait_ms` (the end-user's time, left
  out of `total_ms`), `main_thread_wait_ms` (the handler posted to your main thread
  until it started there), `run_ms`, and the `/resume` (`resume_ms`, sent to its
  first event). `before_ms + main_thread_wait_ms + run_ms + after_ms + resume_ms`
  is `total_ms`.
- `outcome` (`done`, `error`, `cancelled`, `abandoned`), `error_type`, `model`,
  counts, and `request.completion_id` (the stream's `chatcmpl-...` id) to find the
  turn in the engine's logs.
- The engine's own account of each streamed request (the turn's, and each tool's
  `resume`), when it sends one: `request_id` (its `X-Request-Id` header) and
  `server_timing`, its `Server-Timing` header as `{metric name: dur ms}`, or None.
  The metric names are the engine's; only names and durations are kept.
- `ui`: the chat page's part, for a turn sent from it (see the [UI server](./chat-ui.md)).

Nothing the end-user or the model said is kept: no message or reply text, no tool
arguments or results, no tokens, no URLs. A listener runs on the thread that ends
the turn, never under a controller lock: usually the chat worker, but a turn that
`clear()`, a sign-out or `close()` dropped ends on the caller's thread, which can
be your main thread. One that raises is logged and ignored. Keep it quick, and
post UI work to your main thread.

The controller is the model behind the SDK's own chat UI: the localhost UI
server (`talk2view.ui`, see [Chat UI server](./chat-ui.md)) serves the bundled chat page and forwards the
controller's state over SSE, so a host that embeds that page never touches
this API directly. A host with its own widgets uses it as above.
