---
title: "Defining tools"
sidebar_position: 8
description: "Define client tools for @talk2view/sdk: the schema, parameter types, the execute function and return_direct."
---

# Defining tools

A tool needs a **schema** (so the AI knows when and how to call it) and an **execute function** (so your app can run it locally).

```typescript
import type { ClientTool } from '@talk2view/sdk';

// Fictional data. Never use real patient data.
const myTool: ClientTool = {
  name: 'set_window_level',
  description: 'Set the brightness and contrast of the medical image viewer',
  parameters: {
    type: 'object',
    properties: {
      windowWidth: {
        type: 'number',
        description: 'Contrast range (window width)',
      },
      windowCenter: {
        type: 'number',
        description: 'Brightness level (window center)',
      },
    },
    required: ['windowWidth', 'windowCenter'],
  },
  return_direct: false,  // Let the AI summarize the result (default)
  execute: async (args) => {
    viewer.setWindowLevel(args.windowWidth as number, args.windowCenter as number);
    return JSON.stringify({
      success: true,
      windowWidth: args.windowWidth,
      windowCenter: args.windowCenter,
    });
  },
};
```

## Tool Schema Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique tool identifier |
| `description` | `string` | Yes | What the tool does (the AI reads this) |
| `parameters` | `object` | Yes | JSON Schema for the tool's arguments |
| `parameters.properties` | `Record<string, { type, description }>` | Yes | Argument definitions |
| `parameters.required` | `string[]` | No | Required argument names |
| `return_direct` | `boolean` | No | Skip AI post-processing (default: `false`) |
| `execute` | `(args) => Promise<string>` | Yes* | Local execution handler |

*`execute` is required on `ClientTool`. If using `ClientToolSchema` with `t2v.tools.handle()`, provide the handler separately.

## Parameter Types

Supported `type` values in `parameters.properties`:

| Type | Maps to |
|------|---------|
| `'string'` | `string` |
| `'number'` | `number` |
| `'integer'` | `number` |
| `'boolean'` | `boolean` |
| `'array'` | `unknown[]` |
| `'object'` | `Record<string, unknown>` |

Use `enum` to restrict string values:
```typescript
{
  type: 'string',
  description: 'Image orientation',
  enum: ['axial', 'sagittal', 'coronal'],
}
```

## Execute Function

The `execute` function receives the AI's arguments as a `Record<string, unknown>` and must return a `Promise<string>`. The returned string is sent back to the AI as the tool's result.

- Return `JSON.stringify(...)` for structured results
- Throw an error or return an error string if the tool fails — the SDK catches it and sends the message back to the AI as `{ result: '{"error":"..."}', is_error: true }`, so the agent can explain or try something else

## Client Tools

Tools are functions that run **in your application**, not on the server. When the AI decides to call a tool:

1. The server pauses the AI agent
2. The server sends a `tool_call` event to your app via SSE
3. Your app executes the tool locally using the registered handler
4. Your app sends the result back to the server (via `/resume`)
5. The server resumes the AI agent with the result

The SDK handles steps 2-5 automatically when you provide an `execute` function on your tools.

[Concepts](../concepts.md#tools-and-the-interruptresume-loop) describes the same interrupt and resume loop.

## `return_direct`

Tools with `return_direct: true` skip the AI's post-processing step. The tool result is returned directly to the user without the AI rephrasing it. Use this for tools that return UI updates or structured data that doesn't need summarization.
