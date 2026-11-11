---
title: "The Talk2View client"
sidebar_position: 7
description: "The framework-agnostic Talk2View class: quick start, core API, configuration, system prompts, rendering replies and chat sessions."
toc_max_heading_level: 4
---

# The Talk2View client

The package root exports the `Talk2View` class, the framework-agnostic client. This page covers a first chat, the core API, configuration, system prompts, rendering replies and chat sessions.

## Vanilla JavaScript

The package root exports a `Talk2View` **class** — the framework-agnostic client. It shares a name with the `<Talk2View>` provider component from `/ui` ([The previous panel](./ui-panel.md#talk2view-from-ui)); if you need both in one file, alias one of them.

```typescript
import { Talk2View } from '@talk2view/sdk';

const t2v = new Talk2View({ partnerKey: 'pk_live_...' });

// 1. Authenticate
await t2v.auth.login('user@example.com', 'password');

// 2. Register tools, then attach their handlers
await t2v.tools.register([
  {
    name: 'get_time',
    description: 'Get the current time',
    parameters: { type: 'object', properties: {} },
  },
]);

t2v.tools.handle('get_time', async () => {
  return new Date().toISOString();
});

// 3. Chat — tool calls are handled automatically
let reply = '';
for await (const event of t2v.chat('What time is it?')) {
  if (event.type === 'text') reply += event.content;
  if (event.type === 'done') console.log(reply);
}
```

## Partner key and sign-in

Talk2View uses two layers of auth on every request:

1. **Partner key** — identifies your application
2. **User JWT** — identifies the end-user (obtained via `auth.login()`)

The SDK manages token storage, refresh, and retry automatically. [Authentication](../authentication.md) covers the partner key, key rotation and how your end-users sign in.

## Core API (framework-agnostic)

### `Talk2View`

Main entry point. Use this directly for vanilla JS or non-React frameworks.

```typescript
const t2v = new Talk2View({
  partnerKey: 'pk_live_...',          // Required
  baseUrl: 'https://engine.talk2view.com', // Optional, this is the default
  model: 'gpt-4.1-mini',             // Optional
});
```

#### `t2v.auth`

```typescript
await t2v.auth.login(email, password)    // Returns User
await t2v.auth.signup(email, password)   // Returns { user, confirmationRequired }
await t2v.auth.logout()
t2v.auth.getUser()                       // Returns User | null
t2v.auth.isAuthenticated()               // Returns boolean

// Subscribe to auth state changes
const unsubscribe = t2v.auth.onAuthStateChange((user) => {
  console.log(user ? 'Logged in' : 'Logged out');
});
unsubscribe(); // stop listening
```

#### `t2v.tools`

Register tool schemas with the server and provide local execution handlers.

```typescript
// Option A: inline execute function
await t2v.tools.register([
  {
    name: 'zoom_in',
    description: 'Zoom the viewport in',
    parameters: { type: 'object', properties: {} },
    execute: async () => {
      myApp.zoomIn();
      return JSON.stringify({ success: true });
    },
  },
]);

// Option B: register the schemas, then attach the handlers
await t2v.tools.register([
  {
    name: 'zoom_in',
    description: 'Zoom the viewport in',
    parameters: { type: 'object', properties: {} },
  },
]);

t2v.tools.handle('zoom_in', async () => {
  myApp.zoomIn();
  return JSON.stringify({ success: true });
});

// Check state
t2v.tools.getRegistered()     // ClientToolSchema[]
t2v.tools.hasHandler('zoom_in') // boolean
```

#### `t2v.skills`

Register user-defined skills — knowledge documents the AI agent can discover and load for specialised expertise. Skills are stored client-side and sent to the server per-session.

```typescript
// Fictional data. Never use real patient data.

// Add skills locally
t2v.skills.add({
  name: 'radiology-workflow',
  description: 'Step-by-step radiology reading workflow',
  content: '## Radiology Reading Workflow\n1. Check study metadata\n2. Apply window/level\n...',
});

// Persist to localStorage
t2v.skills.save();

// Register with server (call after session is created)
await t2v.skills.register(t2v.skills.getAll());

// On next page load, restore from localStorage
t2v.skills.load();

// Manage skills
t2v.skills.remove('radiology-workflow');
t2v.skills.getAll();   // UserSkill[]
t2v.skills.clear();    // Remove all
```

Skills merge with partner-defined and built-in skills, and the end-user's win. The packaged chat has a Skills view built in (`features.skills`), so most integrations never call this API directly.

#### `t2v.chat()`

Send a message and stream the response. Tool calls are executed automatically if handlers are registered.

```typescript
for await (const event of t2v.chat('Zoom in please')) {
  switch (event.type) {
    case 'text':
      // Incremental text chunk from the AI
      console.log(event.content);
      break;
    case 'tool_call':
      // A tool was called (already executed automatically)
      console.log(`Called ${event.toolName} with`, event.arguments);
      break;
    case 'done':
      // Stream complete
      console.log('Thread:', event.threadId);
      break;
    case 'error':
      console.error(event.message);
      break;
  }
}
```

#### `t2v.warmUp()`

A new end-user's first AI call is slower than the rest: the engine sets up their
account with the model proxy on first use, which takes a few seconds. Call
`warmUp()` at the first sign they are going to use the chat — their first
keystroke, a tap on the mic — and that setup happens while they are still typing.

```ts
input.addEventListener('input', () => t2v.warmUp(), { once: true });
```

It is safe to call repeatedly (one request per signed-in end-user), never
throws, and is a no-op against an engine that predates it. Don't call it when
the chat merely opens: for a logged-out visitor it starts a guest session
wherever your key allows guests, and each one counts toward your daily guest
limit.

`<ChatWidget>`, `<ChatPanel>` and the assistant-ui runtime already do this.

#### `t2v.clearSession()`

Reset the current session. Clears the thread ID so the next `chat()` call starts a fresh conversation.

```typescript
t2v.clearSession();
```

#### `t2v.listModels()` / `t2v.listAudioModels()`

List available models:

```typescript
const models = await t2v.listModels();         // Chat/completion models
const audioModels = await t2v.listAudioModels(); // Speech-to-text models
```

#### `t2v.transcribe()`

Transcribe an audio file using the server's speech-to-text service:

Takes a `FormData`, with the fields the engine's `/v1/audio/transcriptions` endpoint accepts (`file`, `model`, and optionally `language`, `translate_to`, `translation_guidance`):

```typescript
const form = new FormData();
form.append('file', audioBlob, 'recording.webm');
form.append('model', 'faster-whisper-large-turbo-gcp'); // one of listAudioModels()
form.append('language', 'en');        // optional

const result = await t2v.transcribe(form);
console.log(result.text);
```

#### `t2v.completions()`

Send a raw completions request (non-streaming):

```typescript
const response = await t2v.completions({
  messages: [{ role: 'user', content: 'Hello' }],
  model: 'gpt-4.1-mini',
});
```

It needs a signed-in end-user: for a guest the engine answers with a `T2VError`
whose `type` is `sign_in_required`. One call asks for one reply, with
`max_tokens` up to 16384.

#### `t2v.createSession()` / `t2v.getSession()`

For advanced use cases where you need direct session control:

```typescript
const session = await t2v.createSession();

// Send message and handle events manually
for await (const event of session.sendMessage('Hello')) {
  // ...
}

// Manual tool result submission
for await (const event of session.resumeToolCall(toolCallId, result)) {
  // ...
}
```

## Configuration

### `T2VConfig`

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `partnerKey` | `string` | Yes | — | Your partner API key |
| `baseUrl` | `string` | No | `'https://engine.talk2view.com'` | Talk2View engine URL |
| `model` | `string` | No | Server default | LLM model to use |
| `requestTimeout` | `number` | No | `30000` | HTTP request timeout in ms. Does not apply to SSE streams after connection. |
| `anonymousAutoStart` | `boolean` | No | `true` | When nobody is signed in, try to start a guest session the first time a call needs one (sending, uploading, transcribing, listing models, `warmUp()`, voice). It succeeds only where your key allows guests; a refusal emits `anonymousUnavailable`. Set `false` to require sign-in. |
| `debug` | `boolean` | No | `false` | Log streaming events, tool calls, history and state changes to the console. |

## System Prompts

System prompts set the AI's behavior and context for your application. Pass one to `<Talk2View>` (the UI components) or to `useT2VChat` (the hooks):

```tsx
// Fictional data. Never use real patient data.
<Talk2View
  partnerKey="pk_live_..."
  systemPrompt="You are a medical imaging assistant. Use the provided tools to control the DICOM viewer."
>
  <ChatPanel />
</Talk2View>
```

Best practices:
- **Keep prompts concise** — every token in the system prompt is sent with every request and adds to cost
- **Focus on tools and context** — describe what tools are available and when to use them, rather than general personality traits
- **Be specific about your domain** — mention the application type and expected user intents
- **Avoid conflicting instructions** — the system prompt should complement, not contradict, tool descriptions

## Rendering model replies

Treat every model reply as untrusted. Prompt injection through web search, documents, email or tool results can make the model write anything. `<ChatPanel>` renders replies as markdown only, and nothing in a reply loads remote content on its own:

- **Raw HTML** in a reply is shown as text, apart from a bare `<br>`, which is kept so a GFM table cell can break a line (a cell can't hold a literal newline).
- **Images** become links (`Image: <alt> (<host>)`) that the end-user can choose to open.
- **Links** open in a new tab with `noopener noreferrer`, and only `http(s)` and `mailto` link destinations are kept.

If you build your own chat UI, render replies the same way:

```tsx
import { renderSafeMarkdown } from '@talk2view/sdk/ui';

<div dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(reply) }} />
```

Never pass model output to `innerHTML` or a markdown library's raw HTML output without it.

Call it in the browser (client components): without a DOM it returns the reply as escaped plain text.

## Chat sessions and deploys

A chat session lives in the engine's memory, so a Talk2View deploy, a restart, or eviction under load can end it. The SDK handles most of that for you:

- **Sending a message:** if the session is gone before the reply has started, the SDK opens a new one, re-registers your tools and resends the turn with the conversation so far — nothing from that turn is lost. It emits `sessionRecovered` with the new session id, which you can log.
- **Answering an approval:** the SDK can't safely resend the tool result, because your handler has already run. It emits one `error` event with `errorType: 'session_lost'` and clears the pending approval, so the end-user can send their message again.
- **Mid-reply or mid-tool-resume:** if the chat session is lost after the reply has started, or while a tool result is being sent back, the SDK reports `session_lost` and doesn't resend, because the tool handler may already have run.

```ts
t2v.on('sessionRecovered', (sessionId) => console.info('reconnected', sessionId));
```

This is why `sendMessage()` and `chat()` take the conversation history: the engine works out which messages are new, so a fresh session continues where the old one stopped.
