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
    properties: { status: { type: 'string', enum: ['open', 'closed'] } },
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
**resumes**. Tools always run in your app — Talk2View never executes them server-side
— so the assistant can only do what you've given it.

## Models and configuration

The AI workflow itself is Talk2View's — you don't rebuild it. What you control from the
dashboard: which model to use, a system prompt, which tools and skills are available,
allowed origins, guest access, voice, and web search.

## Streaming

Replies stream back as events (text chunks, tool calls, completion). The packaged chat
renders them for you; if you're building your own UI, the SDK and the
[API reference](https://engine.talk2view.com/docs) document the event stream.
