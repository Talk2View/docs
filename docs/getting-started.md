---
title: Getting started
sidebar_position: 2
---

# Getting started

Add AI-powered natural-language control to your app in a few lines of code.

## 1. Get a partner key

Talk2View is in private beta. [Request a partner key](https://talk2view.com/resources/contact?subject=partner-key)
and we'll get you set up. You receive one key:

- `pk_live_…` — your partner key: a public identifier, safe in client-side code.

That one key is all you need — Talk2View does not issue a partner secret key.

## 2. Install the SDK

```bash
npm install @talk2view/sdk
```

## 3. Drop in the chat

The fastest path is the packaged chat — one component and one stylesheet. Give it a
tool and the assistant can act in your app, not just answer:

```tsx
import { Talk2ViewChat } from '@talk2view/sdk/chat';
import type { ClientTool } from '@talk2view/sdk';
import '@talk2view/sdk/chat.css';

const tools: ClientTool[] = [{
  name: 'send_email',
  description: 'Send an email.',
  parameters: {
    type: 'object',
    properties: { to: { type: 'string', description: 'Recipient address.' } },
    required: ['to'],
  },
  execute: async (args) => {
    // your app's code runs here
    return 'Sent to ' + String(args.to) + '.';
  },
}];

export function Assistant() {
  return <Talk2ViewChat partnerKey="pk_live_..." tools={tools} />;
}
```

`<Talk2ViewChat>` handles sign-in, tool registration, streaming, and the
interrupt/resume cycle. See [Concepts](./concepts.md) for how that loop works.

## 4. Who can chat

End-users sign in with a Talk2View account. If you'd rather let anyone chat without
signing in, ask us to enable **guest access** for your key. Either way, register your
app's **allowed origins** in the dashboard so a browser key only works from your own
site. See [Authentication](./authentication.md).

## Going further

Building headless, outside React, or on the desktop (e.g. Python)? The lower-level
`Talk2View` client, tool registration, and the streaming event API are covered in the
SDK repositories and the API reference.

- [TypeScript SDK](https://github.com/Talk2View/talk2view-typescript) — source, runnable examples, full API
- [Python SDK](https://pypi.org/project/talk2view/) — `pip install talk2view` (beta)
- [API reference](https://engine.talk2view.com/docs) — REST + SSE
