---
title: The packaged chat
sidebar_position: 2
description: "The branded Talk2View chat from @talk2view/sdk/chat, as a full pane or a floating launcher."
---

# The packaged chat

Three lines to a working chat. `@talk2view/sdk/chat` is the branded Talk2View
chat, packaged: your app needs no Tailwind, no PostCSS, no shadcn and no copied
component files.

```tsx
import { Talk2ViewChat } from '@talk2view/sdk/chat';
import '@talk2view/sdk/chat.css';

<Talk2ViewChat partnerKey="pk_live_…" tools={tools} welcome={{ suggestions: ['What can you do?'] }} />
```

That is the full pane: sign-in, streaming replies, attachments, dictation,
Settings, earlier conversations (kept in the end-user's browser) and tool
approvals. Give it a parent with a height — it fills its box.

For a floating chat instead — a mark in the corner of the page, a popover on a
desktop, a full-screen sheet on a phone:

```tsx
import { Talk2ViewChatLauncher } from '@talk2view/sdk/chat';
import '@talk2view/sdk/chat.css';

<Talk2ViewChatLauncher partnerKey="pk_live_…" tools={tools} label="Ask Talk2View" />
```

Theming is the custom properties on `.t2v-chat` (`--radius`, `--primary`, the
rest); dark mode is `className="dark"`. The chat fetches nothing at runtime but
your Talk2View engine — no fonts, no CDN — and uses your page's font unless you
pass `fontFamily`. Voice is the exception; see
[What loads at runtime](./runtime.md).

**It is large: 374.5 KB gzip, excluding React.** A consumer who never imports
`/chat` pays none of it.

**Voice.** For partners with the realtime voice agent enabled, the launcher
shows a microphone beside the mark: press to talk, press again to hang up. The
agent uses the same tools, permissions and approval card as the chat. A voice
call runs on the voice model the end-user and the partner chose, Gemini Live,
ElevenLabs or ElevenLabs Medical. While it runs,
[call captions](../voice.md#call-captions)
show what both sides say above the button, stored nowhere and cleared when the
call ends; `features={{ callCaptions: false }}` turns them off. Standalone it is
`<VoiceButton client={t2v} />`; without a UI it is
`t2v.voice`. Each voice model reaches its own hosts, so a Content Security Policy
has to allow the ones you offer. See
**[Voice](../voice.md)**.

Everything else — the full prop table, theming tokens, the launcher in a hostile
page, CSP, Next.js — is in
**[`docs/chat.md`](https://github.com/Talk2View/talk2view-typescript/blob/main/docs/chat.md)**, which also
ships inside the package. A runnable example with no Tailwind in the host is in
[`examples/react-chat`](https://github.com/Talk2View/talk2view-typescript/tree/main/examples/react-chat).

The three lines at the top of this page are the whole integration. The other
pages in this section show the layers underneath, for apps that want their own UI.
