---
title: "Error handling"
sidebar_position: 10
description: "The error classes @talk2view/sdk throws, the fields they carry, and how to handle them."
---

# Error handling

The SDK throws typed errors:

| Error Class | When | `err.type` |
|-------------|------|------------|
| `AuthenticationError` | Bad credentials, expired or rejected token | `authentication_error` |
| `PartnerKeyError` | Unknown or inactive partner key | `partner_key_error` |
| `NetworkError` | Network failure, server unreachable, request timed out | `network_error` |
| `T2VError` | Base class — and what everything else arrives as | the engine's own type |
| `SessionError` | Reserved — see below | `session_not_found` |

Every error carries the engine's machine-readable `type`, so `err.type` is the precise test; the classes above are a convenience for the common cases. Types worth knowing that arrive as a plain `T2VError`: `origin_not_allowed` (403 — the request's Origin isn't on your key's allow-list), `not_found` (404), and `rate_limit_exceeded` (429).

Some failures never reach a `catch` at all, because they arrive inside the chat stream rather than as a rejected request: a spent anonymous demo budget comes through as an `error` event with `errorType: 'budget_exceeded'`, which the SDK turns into a `demoLimitReached` event rather than an error state. Listen for that instead of trying to catch it.

**On lost chat sessions:** `SessionError` is reserved for a dedicated engine type that isn't in use yet — today a chat session that no longer exists comes back as a `T2VError` with `type: 'not_found'` and `statusCode: 404`. You shouldn't need to catch it: the SDK recovers the session itself where that is safe, and otherwise reports an `error` event with `errorType: 'session_lost'`. See [Chat sessions and deploys](./client.md#chat-sessions-and-deploys).

All errors extend `T2VError`, which exposes `message`, `type`, `statusCode`, `code`, and `detail` (the server's raw diagnostic text, kept out of `message` so it never reaches an end-user by accident). Errors from the engine also carry:

- `requestId`: the engine's id for the failed request, also sent as the `X-Request-Id` header. Quote it when you contact support. A stream `error` event carries it too.
- `retryAfter`: seconds to wait before trying again, when the engine sent `Retry-After` (rate limits and some temporary outages).

Every error type the engine sends, with its status and meaning, is listed at [Errors](../errors.md):

```typescript
import { T2VError, AuthenticationError, NetworkError, PartnerKeyError } from '@talk2view/sdk';

try {
  await t2v.auth.login(email, password);
} catch (err) {
  if (err instanceof AuthenticationError) {
    console.log('Bad credentials');
  } else if (err instanceof NetworkError) {
    console.log('Server unreachable');
  } else if (err instanceof PartnerKeyError) {
    console.log('Check your partner key:', err.message);
  } else if (err instanceof T2VError) {
    // Branch on err.type; quote err.requestId to support.
    console.log(`Error [${err.type}]: ${err.message} (HTTP ${err.statusCode}, request ${err.requestId})`);
  }
}
```

**Rate limiting:** The server may return HTTP 429 when rate limits are exceeded. This surfaces as a `T2VError` with `statusCode: 429` and, when the engine says how long to wait, `retryAfter` in seconds. The SDK does not retry for you; wait at least `retryAfter` before trying again.

In React, the hooks catch errors internally and expose them via the `error` state:

```tsx
const { error, clearError } = useT2VAuth();
const { error: chatError } = useT2VChat({ systemPrompt: '...' });
// error is a string message, not a thrown exception
```
