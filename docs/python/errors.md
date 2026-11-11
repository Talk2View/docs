---
title: "Errors"
sidebar_position: 8
description: "The exception classes the Python SDK raises, how the class is chosen, and the fields every error carries."
---

# Errors

This page covers the exceptions the Python SDK raises.

```python
from talk2view import T2VError, AuthenticationError, PartnerKeyError, NetworkError

try:
    t2v.auth.login(email, password)
except AuthenticationError:
    print("Bad credentials")
except PartnerKeyError:
    print("Invalid partner key")
except NetworkError:
    print("Connection failed")
except T2VError as e:
    print(f"{e.type}: {e} (HTTP {e.status_code}, request {e.request_id})")
```

The class is chosen from the engine's `error.type`, not from the HTTP status:
**a 401 is an `AuthenticationError` only when the engine says so.** A 401
caused by the partner key raises `PartnerKeyError` (refreshing cannot fix it,
and the user's tokens are left alone), and a 401 with any other type raises a
plain `T2VError`. An expired user token is refreshed and the request retried
before you ever see an error; `AuthenticationError("Session expired…")` means
the refresh token itself was rejected and the stored tokens have been cleared —
a sign-out, so the `on_auth_state_change` listeners have already heard `None`.

`T2VError` carries a user-safe `message`, the engine's `type`, the
`status_code`, an optional machine-readable `code`, and a separate `detail` for
debugging. Server stack traces, DB errors and opaque non-JSON bodies are kept
out of `message` so they cannot be shown to an end-user.

Errors from the engine also carry `request_id`, the engine's id for the failed
request (also its `X-Request-Id` header; quote it when you contact support), and
`retry_after`, the seconds to wait when the engine sent `Retry-After` (rate
limits and some temporary outages). The SDK does not retry for you. A stream
`error` event carries `request_id` too. Every error type the engine sends is
listed on the [Errors](../errors.md) page.

:::note[Upgrading from 0.1.0]

`T2VError`'s second parameter is now `type=` (was
`error_type=`) and `code` is the fourth positional parameter, before
`detail`. See [CHANGELOG.md](https://github.com/Talk2View/talk2view-python/blob/main/CHANGELOG.md).

:::
