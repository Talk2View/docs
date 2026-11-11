---
title: "assistant-ui runtime"
sidebar_position: 6
description: "Render assistant-ui's stock Thread on Talk2View with the @talk2view/sdk/assistant-ui runtime."
---

# assistant-ui runtime

assistant-ui already has a seam other backends plug into at the runtime level — `@assistant-ui/react-ai-sdk` for the Vercel AI SDK is the well-known example. `useTalk2ViewRuntime` is Talk2View's equivalent: it hands assistant-ui an `AssistantRuntime`, built on `useExternalStoreRuntime`, so the stock `<Thread />` (or the primitives) render Talk2View's messages, client tools, approvals and streaming — with no Talk2View-specific component in the tree.

This is a separate entry point from `/ui` and `/react`. `@assistant-ui/react` is a dependency of this package — installing `@talk2view/sdk` installs it, and you do not add it yourself. It is only *loaded* when you import `@talk2view/sdk/assistant-ui` or `/chat`, so the root, `/react` and `/ui` bundles are unaffected.

**Do not `npm install @assistant-ui/react` separately.** A second copy that npm cannot collapse with ours makes the chat throw `Two copies of @assistant-ui/react are loaded`.

## Install

```bash
npx shadcn@latest init --yes --defaults
npx shadcn@latest add @assistant-ui/thread --yes
```

The `shadcn` commands generate the Thread's source into your own `src/components/` — they're your files, not a Talk2View package, so you can restyle or extend them freely.

One known wrinkle in the registry output at the time of writing: `tooltip-icon-button.tsx` passes `delayDuration={0}` to a `TooltipProvider` whose prop is `delay`. It is inert at runtime, but it fails `tsc`, so if your build type-checks (most Vite templates run `tsc -b && vite build`) change it to `delay={0}` — the example does.

## `useTalk2ViewRuntime`

```tsx
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useTalk2ViewRuntime } from '@talk2view/sdk/assistant-ui';

function Chat() {
  const runtime = useTalk2ViewRuntime({ partnerKey: 'pk_live_...', tools });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

`useTalk2ViewRuntime(options)` takes the same connection options as `<T2VProvider>` (`partnerKey`, `baseUrl`, `model`, `debug`, `anonymousAutoStart`) plus `tools` and `systemPrompt`, and creates its own `Talk2View` client — a new one only when `partnerKey`, `baseUrl`, `debug` or `anonymousAutoStart` changes (`requestTimeout` is read once, at creation). `model` is sent with each message rather than baked into the client, so an end-user can switch models from a settings screen without losing the chat. `tools` are registered with the engine when their schemas change, compared by value, so an inline array is fine.

## `useTalk2ViewRuntimeForClient`

For an app that already has a `Talk2View` client — for example from `<T2VProvider>`, so auth and chat state stay shared with the rest of the app — pass it in instead of creating a second one:

```tsx
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useT2V } from '@talk2view/sdk/react';
import { useTalk2ViewRuntimeForClient } from '@talk2view/sdk/assistant-ui';

function Chat() {
  const { t2v } = useT2V(); // from <T2VProvider>
  const runtime = useTalk2ViewRuntimeForClient(t2v, { tools });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

## What maps to what

| assistant-ui | Talk2View SDK |
| --- | --- |
| Streaming replies | `DisplayMessage`s from `t2v.messages`, converted per-message by `toThreadMessage()` |
| Client tools | `tools` registers schemas via `t2v.tools.register()` and handlers via `t2v.tools.handle()` — same as `<Talk2View tools>` |
| Tool approvals | A `PendingApproval` becomes assistant-ui's own approval card (`allow-once` / `allow-always` / `reject-once`, plus a free-form reason); the decision is sent through `t2v.approveToolCall()` |
| Attachments | assistant-ui's `AttachmentAdapter` uploads through `t2v.uploadAttachment()` |
| Stop | assistant-ui's cancel action calls `t2v.stop()` — or, while a tool call is waiting for a decision, denies it with the reason "Cancelled by the user" |
| Retry | assistant-ui's reload action on the **latest turn** — its reply, or the error card when it failed — calls `t2v.retryLastMessage()`; on an older reply it does nothing, because the SDK can only regenerate the last turn |

Four things do not map, on purpose:

- **Editing tool arguments before approval.** The SDK supports it (`HumanDecision.updatedInput`, used by `<ApprovalCard>` in `/ui`), but the stock assistant-ui approval card has no edit-and-resubmit affordance to drive it from — it can only approve, deny, or attach a free-form reason.
- **Sign-in UI.** `useTalk2ViewRuntime` only creates a client and a runtime; there is no `<LoginForm>` equivalent. Where your key allows guests, a logged-out visitor gets a guest session (same default as `<ChatPanel>`); where it does not, the message is not sent and the client emits `anonymousUnavailable`. Building your own sign-in UI, or gating the app before it mounts, is on the partner.
- **The agent's plan.** The planning checklist `<ChatPanel>` shows arrives as a `data` part named `plan` (`{ markdown }`). The stock Thread has no renderer for it, so it is silently not shown; register one to see it: `<MessagePrimitive.Parts components={{ data: { by_name: { plan: PlanView } } }} />`.
- **Editing and deleting sent messages.** The runtime supplies no `onEdit`/`onDelete`, so the stock Thread's pencil on user messages stays disabled. Remove it from your copy of the Thread if you'd rather not show it.

## Bundle size

`<Thread />` and its dependencies are the partner's own assistant-ui bundle, sized however assistant-ui and its registry components size it; `@talk2view/sdk/assistant-ui` itself adds about 1.9 KB gzipped on top (`dist/assistant-ui/{index,convert}.js`, bundled and minified with esbuild, `react`, `react-dom`, `@assistant-ui/react` and the SDK's own `Talk2View` client marked external since a partner already has them).
