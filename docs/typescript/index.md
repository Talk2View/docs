---
title: TypeScript SDK
sidebar_position: 1
description: "Install @talk2view/sdk, pick an entry point, and find the versioning policy and supported environments."
---

# TypeScript SDK

Add AI-powered natural language control to any application. Talk2View's SDK handles authentication, tool registration, streaming chat, and the interrupt/resume cycle for client-side tool execution.

These pages describe `@talk2view/sdk` 0.25.0. See the [package on npm](https://www.npmjs.com/package/@talk2view/sdk), the [repository](https://github.com/Talk2View/talk2view-typescript) and the [changelog](https://github.com/Talk2View/talk2view-typescript/blob/main/CHANGELOG.md).

:::warning[Intended use]
Talk2View is not a medical device, and patient data must not be sent through the SDK. See [Intended use and data handling](../intended-use.md).
:::

New to Talk2View? [Getting started](../getting-started.md) is the shortest path to a working chat.

## In this section

- **[The packaged chat](./chat.md)**: `<Talk2ViewChat>` and `<Talk2ViewChatLauncher>` from `@talk2view/sdk/chat`.
- **[What loads at runtime](./runtime.md)**: what each entry point fetches, for your Content Security Policy.
- **[The previous panel (/ui)](./ui-panel.md)**: the deprecated `/ui` components, `<Talk2View>`, `<ChatPanel>` and `<LoginForm>`.
- **[React provider and hooks](./react.md)**: `<T2VProvider>` and the hooks in `@talk2view/sdk/react`, for your own UI.
- **[assistant-ui runtime](./assistant-ui.md)**: running assistant-ui's stock `<Thread />` on Talk2View.
- **[The Talk2View client](./client.md)**: the framework-agnostic `Talk2View` class, its configuration, system prompts, rendering replies and chat sessions.
- **[Defining tools](./tools.md)**: tool schemas, parameter types, the `execute` function and `return_direct`.
- **[Token storage](./token-storage.md)**: what the SDK keeps in `localStorage`, and the security trade-offs.
- **[Error handling](./errors.md)**: the SDK's error classes and how to handle them.
- **[Full integration example](./example.md)**: a complete drawing-app integration.
- **[TypeScript types](./types.md)**: the types each entry point exports.

## Installation

```bash
npm install @talk2view/sdk
```

You need a partner key. Talk2View is in private beta:
**[request a partner key](https://talk2view.com/resources/contact?subject=partner-key)**.
You get one key, `pk_live_…`, a public identifier that is safe to ship in a
browser bundle; see [Your partner key](../authentication.md#your-partner-key).

## Entry points

The package root, `@talk2view/sdk`, exports the framework-agnostic `Talk2View` client: see [The Talk2View client](./client.md).

There are four React entry points, and they do different jobs:

- **`@talk2view/sdk/chat`** — the branded Talk2View chat, packaged: `<Talk2ViewChat>` and `<Talk2ViewChatLauncher>`, one stylesheet, nothing to configure. Start here. See [The packaged chat](./chat.md) and [`docs/chat.md`](https://github.com/Talk2View/talk2view-typescript/blob/main/docs/chat.md).
- **`@talk2view/sdk/ui`** — the previous chat panel, still supported: `<Talk2View>`, `<ChatPanel>`, `<ChatWidget>` and the components they are built from. 40.9 KB gzip against the packaged chat's 374.5, and no assistant-ui.
- **`@talk2view/sdk/react`** — headless: `<T2VProvider>` and hooks, for building your own UI.
- **`@talk2view/sdk/assistant-ui`** — a runtime for [assistant-ui](https://www.assistant-ui.com): render the stock `<Thread />` on Talk2View. See [assistant-ui runtime](./assistant-ui.md).

## Versioning

This package follows semantic versioning, with one qualification that matters
while it is below 1.0: a **minor** version may change behaviour, and a
**patch** never removes or changes anything in the public surface, though it
may add to it — a new optional prop, say. Breaking changes to exports or to
prop shapes are called out in [CHANGELOG.md](https://github.com/Talk2View/talk2view-typescript/blob/main/CHANGELOG.md) under the release
that makes them.

What counts as the public surface: everything exported from `@talk2view/sdk`,
`/react`, `/chat` and `/assistant-ui`, and the CSS custom properties documented
in [docs/chat.md](https://github.com/Talk2View/talk2view-typescript/blob/main/docs/chat.md). Class names
inside the chat's DOM are not — they are assistant-ui's and ours to change.
`/ui` is deprecated and frozen: it will keep working, and will not gain
anything.

`T2VClient`, `T2VSession` and `TypedEventEmitter` are exported because the
typed surface needs them, not because they are meant to be constructed
directly. Use `Talk2View`.

## Supported environments

- **Node** `^22.14.0 || ^24.0.0 || >=26.0.0`, for builds, tests and server
  rendering. That is the range the package's runtime dependencies declare;
  outside it npm warns `EBADENGINE` on install.
- **ES modules only.** There is no CommonJS build. Node's `require()` of ES
  modules, on by default in the versions above, loads it too.
- **React** 18 or 19, for `/react`, `/ui`, `/assistant-ui` and `/chat`. The
  core client does not use React. The test suite runs on React 19.
- **Browsers.** The packaged chat uses `dvh` units and the `inert` attribute,
  so it needs at least Chrome or Edge 108, Safari 15.5 or Firefox 112. Part of
  its styling also needs CSS nesting, `:has()` and media-query range syntax:
  Chrome and Edge 112, Safari 16.5, Firefox 121. The package's own JavaScript
  is ES2022, not transpiled further. Those versions come from the package's own
  code and stylesheet; its dependencies were not measured, and the browser test
  suites run in current Chromium only.
- **Popup sign-in** (Google and Apple) works in a browser only: it opens a
  window, so it throws in Node and during server rendering. It also needs an
  `https://` website and never runs on `localhost`.

## Source, issues and contributing

The source is at
[github.com/Talk2View/talk2view-typescript](https://github.com/Talk2View/talk2view-typescript).
Bugs and feature requests go in
[Issues](https://github.com/Talk2View/talk2view-typescript/issues); pull
requests are welcome, and [CONTRIBUTING.md](https://github.com/Talk2View/talk2view-typescript/blob/main/CONTRIBUTING.md) says how to get
set up and what a reviewer looks for.

Security problems do **not** go in an issue — see
[SECURITY.md](https://github.com/Talk2View/talk2view-typescript/blob/main/SECURITY.md).

MIT licensed. See [LICENSE](https://github.com/Talk2View/talk2view-typescript/blob/main/LICENSE).
