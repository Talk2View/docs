---
title: Concepts
sidebar_position: 4
---

# Concepts

A quick tour of how Talk2View fits together.

## Partner, end-user, app

- A **partner** is you — the software company integrating Talk2View. You get one partner key.
- An **end-user** is one of your users, chatting inside your app with their Talk2View account (or as a guest, if you enable it).
- Conversations are scoped to `(partner, end-user)`, so the same person is isolated across different partner apps.

## Tools and the interrupt/resume loop

Tools are what make the assistant *do* things instead of only talking. You define a
tool with a name, a description, a parameter schema, and an `execute` function:

```ts
{
  name: 'set_filter',
  description: 'Filter the current view by status.',
  parameters: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Which items to show.', enum: ['open', 'closed'] },
    },
    required: ['status'],
  },
  execute: async (args) => {
    // runs in your app
    return 'Filtered to ' + String(args.status) + '.';
  },
}
```

When the assistant decides to call a tool, the agent **pauses**, the call is sent to
your client, your `execute` runs locally, your result is sent back, and the agent
**resumes**. The tools you register always run in your app, through this pause and
resume, so inside your app the assistant can only do what your tools let it do.

### Built-in tools

Talk2View also has tools of its own, which run on its servers rather than in your
app:

- **Skills and planning** — on by default. The assistant can look up and load skills
  (instructions for particular tasks, including the ones you write on the dashboard's
  **Skills** page) and keep a to-do list for multi-step work.
- **Web search, maps and image generation** — only if you turn them on in the
  dashboard. Maps and image generation are for signed-in users, not guests. Image
  generation also needs a client that says it can show images; `@talk2view/sdk`
  0.21.3 doesn't yet, so it isn't available through the SDK.
- **Scheduling and email** — these work only after an end-user connects their own
  scheduling or email account for your app, and the SDK can't connect one yet. So you
  can't offer them through the SDK, even if you turn them on in the dashboard.

## Models and configuration

The AI workflow itself is Talk2View's — you don't rebuild it. What you control from the
dashboard: which model to use, a system prompt, which tools and skills are available,
allowed origins, guest access, voice, and web search.

## Streaming

Replies stream back as events (text chunks, tool calls, completion). The packaged chat
renders them for you. If you're building your own UI, let the SDK read the stream: the
`Talk2View` client's `chat()` method yields typed events (see the `ChatEvent` type
exported from `@talk2view/sdk`). The [API reference](https://engine.talk2view.com/docs)
lists the HTTP endpoints, but it doesn't describe the events in the stream.
