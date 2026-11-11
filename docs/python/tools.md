---
title: "Tools and approvals"
sidebar_position: 4
description: "Define tools with @tool, register them, gate them on the end-user, answer approvals, and run handlers on the host's main thread."
---

# Tools and approvals

Tools are functions in your app that the assistant can call. This page covers defining and registering them, gating them on the end-user, and running them on the host's main thread.

## `@tool` Decorator

Generates a JSON Schema from your function's type hints and Google-style docstring.

```python
from talk2view import tool

@tool
def search_nodes(query: str, node_type: str = "vtkMRMLVolumeNode") -> str:
    """Search the scene for matching nodes.

    Args:
        query: Search term to match against node names.
        node_type: MRML node class to filter by.
    """
    # Implementation
    return json.dumps(results)
```

The decorator:
- Maps Python types to JSON Schema (`str` -> `"string"`, `int` -> `"integer"`, `float` -> `"number"`, `bool` -> `"boolean"`, `list[str]` -> `{"type": "array", "items": {"type": "string"}}`)
- Parses the `Args:` section for parameter descriptions
- Uses the first paragraph of the docstring as the tool description
- Parameters without defaults are marked as `required`
- Works with both regular functions and bound methods (`tool(self.method)`)

## `t2v.tools`

Tool registration.

```python
# Register @tool-decorated functions (extracts schema + registers handler)
t2v.tools.register_from_functions([my_tool, another_tool])

# Or register schema and handler separately
from talk2view import ClientToolSchema
t2v.tools.register([ClientToolSchema(name="my_tool", description="...")])
t2v.tools.handle("my_tool", my_handler_function)
```

Tools are session-scoped on the engine. `create_session()` re-sends the
registered schemas, so a new session — including one created by recovery —
keeps your tools. Once the create has answered, the schemas and the enabled
skills are sent at the same time, on threads of their own.

Arguments are validated against the registered schema before a handler runs:
`None` and empty-object placeholders are stripped, string enums are matched
case-insensitively and normalised to the schema's casing, and a type mismatch
is returned to the model as an error result rather than reaching your code.

### Tool permissions (fail closed)

Gate a tool on the end-user, or decide in code:

```python
from talk2view import PermissionResult, tool

@tool(permission=True)           # every call pauses for the end-user
def delete_volume(name: str) -> str:
    """Delete a volume from the scene."""
    ...

def policy(tool_name: str, args: dict) -> PermissionResult:
    if args["path"].startswith("/etc"):
        return PermissionResult.deny("system files are off limits")
    return PermissionResult.allow({**args, "read_only": True})  # may rewrite the input

t2v.tools.handle("open_file", open_file, permission=policy)
```

Permission checks **fail closed**: a callback that raises, that returns
anything other than a `PermissionResult`, or that yields an action the SDK does
not recognise, denies the call and tells the model — the handler does not run.
A `permission=` that is not `None`, a `bool`, or a callable raises `TypeError`
at registration, and re-registering a tool without `permission=` drops the
permission it had (logged as a warning).

## Human-in-the-loop approvals

`permission=True` (a client tool) and the engine's own approval of a platform
tool both pause the stream with an `approval_required` event. Answer it with
`respond_to_approval()`, which continues the turn:

```python
from talk2view import Decision

for event in t2v.chat("Delete the CT volume"):
    if event.type == "approval_required":
        print(event.description)          # the tool's description, or the engine's summary
        for row in event.details or []:   # engine approvals only
            print(f"  {row['label']}: {row['value']}")

        decision = Decision("once")       # "once" | "always" | "deny"
        # Decision("deny", feedback="Hide it instead.")
        # Decision("once", updated_input={"name": "CT_copy"})
        for resumed in t2v.respond_to_approval(event, decision):
            ...
        break
```

`event.kind` is `"client"` (your handler runs locally on approval) or
`"engine"` (the platform runs the tool; `updated_input` and `feedback` do not
apply). Anything other than `"once"`/`"always"` is treated as a denial.
Engine approvals need `Capabilities(approval=True)`.

## Running tool handlers on the host's main thread

Desktop hosts (3D Slicer, FreeCAD, Blender) only allow scene and UI access from
their main thread, while you will want to stream on a worker thread so the UI
stays responsive. A **dispatcher** bridges the two: handlers and permission
callbacks are posted to the host's main thread and the streaming thread waits
for the result. The SDK never imports a UI toolkit — you hand in the host's
timer class.

```python
import qt                                  # 3D Slicer; PySide6.QtCore in FreeCAD
from talk2view import Talk2View, qt_dispatcher

t2v = Talk2View(partner_key="pk_live_...", dispatcher=qt_dispatcher(qt.QTimer))
```

```python
import bpy
from talk2view import bpy_dispatcher

t2v = Talk2View(partner_key="pk_live_...", dispatcher=bpy_dispatcher(bpy.app.timers))
```

Construct the dispatcher **on the host's main thread**. For any other host, use
`QueueDispatcher` and drain it from your own main loop with `pump()`, or
`TimerPumpDispatcher(start_timer)` with a timer of your own. The default is
`InlineDispatcher`: handlers run on the calling thread, exactly as they always
have.

A `stop()` while a handler is still queued raises `Cancelled` and the handler
never runs. A handler that has already started is never interrupted — the SDK
waits for it and uses its result.

**Listener callbacks are not auto-marshalled.** `on_auth_state_change`,
`on_anonymous_unavailable` and `t2v.skills.on_change` can run on any SDK-owned
thread — a `ChatController` worker, the `t2v-warm-up` daemon, a skills debounce
timer, the `t2v-register-skills` and `t2v-register-tools` threads a new session
re-registers on — not just the thread that registered them. Unlike tool handlers and
`deliver_on_main` subscribers, these do not go through the dispatcher
automatically: do any UI work from inside them with `run_on_main(dispatcher, fn)`.
