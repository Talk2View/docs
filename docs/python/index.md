---
title: "Python SDK"
sidebar_position: 1
description: "Install the talk2view Python package, run a first chat, and see how tool calls run in your app."
---

# Python SDK

Python SDK for the [Talk2View Platform](https://talk2view.com) — add AI-powered natural language control to any Python application.

Built for desktop apps like [3D Slicer](https://www.slicer.org/), scientific tools, and any Python environment where you want users to interact with your app through natural language.

These pages describe `talk2view` 0.4.0. See the [package on PyPI](https://pypi.org/project/talk2view/), the [repository](https://github.com/Talk2View/talk2view-python) and the [changelog](https://github.com/Talk2View/talk2view-python/blob/main/CHANGELOG.md).

:::warning[Intended use]

Talk2View is not a medical device. Do not send protected health information, or any other data that can identify a patient, through the SDK: see [Intended use and data handling](../intended-use.md).

:::

## Install

```bash
pip install talk2view
```

Install from PyPI: its wheels include the chat page that `talk2view.ui` serves. A
checkout or a `git+https://` install has to build that page first (see
[Development](https://github.com/Talk2View/talk2view-python#development)); the build refuses to package the SDK without it.

You need a partner key. Talk2View is in private beta:
**[request a partner key](https://talk2view.com/resources/contact?subject=partner-key)**.
You get one key, `pk_live_…`, a public identifier that is safe to ship inside your app;
see [Your partner key](../authentication.md#your-partner-key).

## Quick Start

```python
from talk2view import Talk2View, tool

# 1. Initialize with your partner key
t2v = Talk2View(partner_key="pk_live_abc123")

# 2. Authenticate a user
user = t2v.auth.login("user@example.com", "password")

# 3. Define tools the AI can call (runs locally in your app)
@tool
def create_shape(shape: str, size: int) -> str:
    """Create a 3D shape in the viewport.

    Args:
        shape: The shape type (cube, sphere, cylinder).
        size: The size in units.
    """
    # Your app logic here
    return f"Created {shape} with size {size}"

# 4. Register tools
t2v.tools.register_from_functions([create_shape])

# 5. Chat — tool calls are handled automatically
for event in t2v.chat("Make a large red cylinder"):
    if event.type == "text":
        print(event.content, end="")
    elif event.type == "tool_call":
        print(f"\n[Tool called: {event.tool_name}]")
    elif event.type == "done":
        print("\n--- Done ---")
```

## How It Works

```
Your App                    Talk2View Platform
────────                    ──────────────────
t2v.chat("message")  ───►  AI Agent processes message
                      ◄───  SSE stream: text chunks
                      ◄───  SSE stream: tool_call interrupt
@tool handler runs    ───►  Tool result sent to /resume
locally in your app   ◄───  SSE stream: more text
                      ◄───  SSE stream: done
```

The SDK handles the full interrupt/resume loop automatically. When the AI decides to call one of your tools:

1. The stream pauses with an interrupt
2. Your `@tool` function executes **locally in your process** (important for desktop apps — your tools have full access to the app's state)
3. The result is sent back to the server
4. The AI continues with the tool's output

## In this section

- [The Talk2View client](./client.md): the constructor, `chat()`, `stop()`, sessions, attachments, `Capabilities`, partner config and models, preferences, voice and `ChatEvent`.
- [Authentication and token storage](./authentication.md): `t2v.auth`, Apple and Google desktop sign-in, anonymous demo sessions, `TokenStorage` and `FileStorage`.
- [Tools and approvals](./tools.md): the `@tool` decorator, `t2v.tools`, tool permissions, human-in-the-loop approvals, and running handlers on the host's main thread.
- [Skills](./skills.md): user skills from code or from `SKILL.md` folders, and how they reach the engine.
- [ChatController](./chat-controller.md): the conversation model behind a chat view, with its state, commands, callback rules and turn timings.
- [Chat UI server](./chat-ui.md): the bundled chat page served from `127.0.0.1`, with its options, chat history, guests, security and threads.
- [Errors](./errors.md): the exception classes the SDK raises and the fields they carry.
- [3D Slicer integration](./slicer.md): token storage, tools and streaming in a 3D Slicer extension, and a full example.

## Requirements

- Python >= 3.10
- Single runtime dependency: `httpx >= 0.27`

## License

[MIT licensed](https://github.com/Talk2View/talk2view-python/blob/main/LICENSE).

The source, issues and contributor setup are in the [GitHub repository](https://github.com/Talk2View/talk2view-python).
