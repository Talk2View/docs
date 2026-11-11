---
title: "React provider and hooks"
sidebar_position: 5
description: "The headless provider and hooks in @talk2view/sdk/react, for building your own chat UI."
---

# React provider and hooks

The headless React entry point, `@talk2view/sdk/react`, gives you a provider and hooks for building your own UI.

## `<T2VProvider>` (from `/react`)

The headless provider. Use it when you are building your own UI on the hooks below; `<Talk2View>` already includes it, so you never need both.

```tsx
<T2VProvider
  partnerKey="pk_live_..."   // Required
  baseUrl="https://engine.talk2view.com"  // Optional, this is the default
  model="gpt-4.1-mini"      // Optional, uses your partner default
>
  {children}
</T2VProvider>
```

## `useT2V()`

Access the Talk2View client instance and auth state.

```tsx
const { t2v, user, isAuthenticated } = useT2V();
```

## `useT2VAuth()`

Authentication state and actions.

```tsx
const {
  user,              // User | null
  isAuthenticated,   // boolean
  isLoading,         // boolean
  error,             // string | null
  login,             // (email: string, password: string) => Promise<void>
  signup,            // (email, password) => Promise<{ user, confirmationRequired }>
  logout,            // () => Promise<void>
  clearError,        // () => void
  signInWithGoogle,  // () => Promise<void> — opens the Google sign-in popup
  signInWithApple,   // () => Promise<void> — opens the Apple sign-in popup
  oauthLoading,      // boolean — true while either popup is open
  oauthProvider,     // 'google' | 'apple' | null — which one
  oauthProviders,    // ('google' | 'apple')[] | null — popup sign-ins available on this website; null while loading
} = useT2VAuth();
```

`signup()` resolves to a `SignupOutcome`: `{ user: User | null; confirmationRequired: boolean }`. When your project has email confirmation switched on, `confirmationRequired` is `true` and `user` is `null` until the person clicks the link in their inbox.

Google and Apple sign-in open a popup and work on any `https://` website, with nothing to configure — your users have Talk2View accounts, and the sign-in form is the same in every app. Your publishable key is public, though, so on a website you have **not** registered your users first see a Talk2View screen naming the site that is asking, and press Continue. Add your site under **Settings → Allowed websites** in the dashboard (the exact `https://` address, nothing after the domain) and that screen goes away; the SDK logs one line to the console when it applies. If your account is set to allow only registered websites, `<LoginForm>` hides the two buttons elsewhere. Popup sign-in never runs on `localhost`; use email and password while developing.

## `useT2VChat()`

Chat state and message sending.

```tsx
const {
  messages,            // DisplayMessage[]
  isLoading,           // boolean — true while streaming
  error,               // string | null
  threadId,            // string | null
  agentStatus,         // { status: string; message: string } | null
  pendingApproval,     // PendingApproval | null — a tool call awaiting a decision
  alwaysAllowedTools,  // ReadonlySet<string> — approved for the rest of the session
  sendMessage,         // (content, { attachments? }) => Promise<void>
  approveToolCall,     // (decision: HumanDecision) => Promise<void>
  retryLastMessage,    // () => Promise<void> — only meaningful while error is set
  stop,                // () => void — ends the reply, keeps the text so far
  clearMessages,       // () => void
  clearError,          // () => void
} = useT2VChat({ systemPrompt: 'You are a helpful assistant.' });
```

When a tool is registered with `permission: true`, the agent pauses and `pendingApproval` fills in. Show it, then call `approveToolCall({ action: 'once' | 'always' | 'deny' })` — `'always'` adds the tool to `alwaysAllowedTools` for the rest of the session. `<ChatPanel>` already does all of this; you only need it when building your own UI.

`DisplayMessage` shape:
```typescript
{
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean   // true while the assistant is still generating
  attachments?: Attachment[]  // files sent with a user message
  plan?: string           // markdown checklist from the agent's planning tool
  steps?: ToolStep[]      // completed tool calls, rendered as inline steps
}
```

## `useT2VTools()`

Tool registration.

```tsx
const {
  registerTools,     // (tools: ClientTool[]) => Promise<RegisterToolsResponse>
  registeredTools,   // string[] — names of registered tools
  isRegistered,      // boolean
} = useT2VTools();
```
