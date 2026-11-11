---
title: "The previous panel (/ui)"
sidebar_position: 4
description: "The deprecated @talk2view/sdk/ui chat panel: its quick start and the Talk2View, ChatPanel and LoginForm components."
---

# The previous panel (/ui)

`@talk2view/sdk/ui` is the chat panel that came before [the packaged chat](./chat.md). This page covers its quick start and its main components.

## React — the previous panel (`/ui`, deprecated)

:::warning[Deprecated]
`/ui` still works and is still supported, but new
integrations should use [`@talk2view/sdk/chat`](./chat.md). It is kept for the
apps already on it.
:::

```tsx
import { Talk2View, ChatPanel } from '@talk2view/sdk/ui';
import type { ClientTool } from '@talk2view/sdk';

const tools: ClientTool[] = [
  {
    name: 'set_color',
    description: 'Set the background color of the canvas',
    parameters: {
      type: 'object',
      properties: {
        color: { type: 'string', description: 'CSS color value' },
      },
      required: ['color'],
    },
    execute: async (args) => {
      document.body.style.backgroundColor = args.color as string;
      return JSON.stringify({ success: true, color: args.color });
    },
  },
];

function App() {
  return (
    <Talk2View partnerKey="pk_live_..." tools={tools} systemPrompt="You control a canvas.">
      <ChatPanel />
    </Talk2View>
  );
}
```

That's it. `<Talk2View>` registers your tools and holds the chat state; `<ChatPanel>` is the UI — sign-in, streaming replies, tool calls and approvals. Both come from `@talk2view/sdk/ui`, and `<ChatPanel>` must be inside `<Talk2View>`.

:::note
`/ui` is smaller than the packaged chat (40.9 KB gzip against 374.5, plus
syntax highlighting loaded on demand) and has no assistant-ui in it, which is
why it is still here.
:::

A logged-out visitor can chat as a guest, with no account, only where guest access is on for your partner key. It is off by default: switch it on under **Settings → Anonymous access** in the dashboard. Guest sign-in also needs a CAPTCHA check by default, which the SDK does not send, so ask Talk2View to set your key up for guests as well; Talk2View also sets your daily limit on new guests. Otherwise `<ChatPanel>` asks people to sign in. Pass `allowAnonymous={false}` to `<ChatPanel>` to always ask them to sign in first.

## `<Talk2View>` (from `/ui`)

The root provider for the UI components. It creates the client, registers your tools, injects the theme, and holds the chat state every `/ui` component reads.

```tsx
<Talk2View
  partnerKey="pk_live_..."          // Required
  tools={myTools}                    // Optional — ClientTool[] (with execute) or schemas
  systemPrompt="You are..."          // Optional — sent with every message
  baseUrl="https://engine.talk2view.com"  // Optional, this is the default
  model="gpt-4.1-mini"               // Optional, falls back to your partner default
  theme={{ accent: '#26C8B8' }}      // Optional
  debug={false}                      // Optional — log to the browser console
>
  {children}
</Talk2View>
```

## `<ChatPanel>` (from `/ui`)

The full chat surface: header, message list, composer, sign-in, tool approvals. It takes its client and state from `<Talk2View>`, so it must be rendered inside one — on its own it throws `useTalk2View must be used within <Talk2View>`. Note that `tools` and `systemPrompt` belong on `<Talk2View>`, not here.

```tsx
<ChatPanel
  welcome={{ heading: 'Ask about this document', suggestions: ['Summarise it'] }}
  allowAnonymous={true}          // Default. false = require sign-in before chatting
  signupUrl="https://..."        // Link shown on the sign-in form
  resetPasswordUrl="https://..." // Adds a "Forgot password?" link
  resetPasswordTarget="_blank"   // Default. '_self' opens in your own app
  describeToolActivity={(name, args) => (name === 'set_color' ? 'Recolouring' : null)}
  isToolDestructive={(name) => name.startsWith('delete_')}
  groupAssistantMessages={false}
/>
```

With `allowAnonymous` on (the default), a logged-out visitor sees the chat, and the SDK tries to start a guest session the first time it needs one. The sign-in form appears instead:

- when `allowAnonymous` is `false`;
- when the engine refuses the guest session: guest access is off for your key (the default), its daily guest limit is spent, or it requires a CAPTCHA, which the SDK does not send;
- when that visitor's guest allowance runs out.

## `<LoginForm>` (from `/ui`)

The sign-in form on its own, if you want to place it yourself. It renders unconditionally — you decide when to show it (check `isAuthenticated` from `useTalk2View()`, the `/ui` hook).

```tsx
<LoginForm
  heading="Sign in"
  subheading="to keep chatting"
  defaultMode="login"            // or 'signup'
  signupUrl="https://talk2view.com/sign-up"
  resetPasswordUrl="https://..."
  termsUrl="https://..."
  privacyUrl="https://..."
/>
```
