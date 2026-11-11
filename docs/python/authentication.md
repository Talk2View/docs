---
title: "Authentication and token storage"
sidebar_position: 3
description: "Sign end-users in with email, Apple or Google, start anonymous demo sessions, and choose where the SDK keeps tokens."
---

# Authentication and token storage

This page covers `t2v.auth`, desktop sign-in with Apple or Google, anonymous demo sessions, and where the SDK keeps tokens. For the platform's two-tier auth model, see [Authentication](../authentication.md).

## `t2v.auth`

Authentication methods.

```python
user = t2v.auth.login("user@example.com", "password")
outcome = t2v.auth.signup("user@example.com", "password")   # a SignupOutcome
t2v.auth.logout()

t2v.auth.is_authenticated()  # bool
t2v.auth.get_user()          # User | None
t2v.auth.get_valid_access_token()   # str | None, refreshed first if about to expire

# Subscribe to auth state changes
unsubscribe = t2v.auth.on_auth_state_change(lambda user: print(user))
unsubscribe()  # Stop listening
```

`signup()` returns a `SignupOutcome`: `user` is set when a session exists now, and
`confirmation_required` is True while the emailed confirmation link is unclicked
(the partner decides whether confirmation is required). `login()` raises
`AuthenticationError` when the engine's answer lacks the user or either token, and
`signup()` does when it carries only one of the two (the account exists: sign in);
nothing is stored in either case.

`on_auth_state_change` hears `None` for every sign-out: `logout()`, and a refresh
token the engine rejects. In that case the request that met the rejection raises
`AuthenticationError("Session expired…")`, the stored session is already cleared,
and the listeners run on that request's thread. A listener that raises is logged
and the others still run. The SDK's own listeners (`Talk2View`'s, a
`ChatController`'s) always run before any added here.

`get_valid_access_token(force_refresh=False)` is for a request the SDK does not
make for you, such as a direct call to another service (the TypeScript SDK's
`getValidAccessToken()`). It refreshes first when the stored token is missing,
expired, or within 30 s of expiring; `force_refresh=True` refreshes anyway (use
it after a direct request still got a 401). It shares the one refresh the SDK's
own requests use, so the rotating refresh token is never spent twice. It returns
`None` only when the session is dead: the session is then cleared and the
listeners hear `None`. With nothing stored at all it returns `None` and the
listeners hear nothing, since nobody was signed in. The TypeScript SDK notifies
its listeners with `null` in that case. On a transient failure (the network, a
409, a 429) it returns the stored token unchanged. A token whose expiry cannot
be read is returned as it is.

## Sign in with Apple or Google (desktop)

```python
providers = t2v.auth.desktop_sign_in_providers()   # [] until the partner turns it on
if "apple" in providers:
    user = t2v.auth.sign_in_with_provider(
        "apple",
        open_browser=webbrowser.open,   # a Qt host: lambda url: host.post(lambda: host.open_external(url))
        timeout=300,
        cancel=token,                   # a talk2view.cancel.CancelToken, optional
    )
```

The sign-in runs in the end-user's own browser, which first shows a Talk2View screen
asking them to confirm that an app on their computer is signing them in. It blocks until
the browser comes back, so call it off your UI thread. Failures raise
`ProviderSignInError`, whose message is fit to show the end-user and whose `type` is one
of `oauth_cancelled`, `oauth_timeout`, `oauth_denied`, `oauth_failed`,
`oauth_browser_unavailable`, `desktop_sign_in_disabled` (also when the partner turns it
off while the end-user is on the Talk2View screen), `oauth_expired` (Continue came after
the start link expired), `rate_limited` (too many sign-ins started from this network) or
`engine_url_mismatch` (below). The partner turns it on in the Talk2View dashboard
(Settings → Desktop apps). It needs a browser on the same computer as the app: over
remote desktop or SSH, sign in with email and password.

The SDK opens only a start page on the engine it talks to (same scheme, host and port as
`base_url`). The engine builds that page's address from its `oauth_login_redirect_base`
setting, so the two must match: a staging or local engine left on the default
(`https://engine.talk2view.com`) fails every attempt with `engine_url_mismatch`, and the
SDK logs both addresses.

Another sign-in wins over a waiting one. If `login()`, `signup()` or `logout()` changes
the stored session while the browser is out, the provider session that comes back later
is dropped (`oauth_cancelled`), even one the engine has already issued. A guest session
started meanwhile does not count: the provider sign-in replaces it. To stop waiting,
cancel the token (the [UI server](./chat-ui.md) cancels before it signs in with a password or signs
out). A cancel, `login()` or `logout()` that comes while the provider session is being
stored waits for that store and its `on_auth_state_change` listeners to finish, then
takes effect. So never call `cancel()`, `login()` or `logout()` while holding a lock one
of your listeners takes, and never cancel another provider sign-in's token from an auth
listener (with two sign-ins running, each would wait for the other). A token refresh
that is under way while a new session is stored never overwrites it or, when the engine
rejects that refresh, signs it out: it only ever writes over, or clears, the session it
refreshed.

## Anonymous demo sessions

An end-user can try the app before creating an account, if the partner has enabled
anonymous access for the partner key. **This requires partner configuration**: by
default the engine also requires a Cloudflare Turnstile captcha token, which a native
desktop app cannot obtain by itself — the partner either turns the captcha off for the
desktop partner key or the host obtains a token some other way and passes it in.

```python
from talk2view import AnonymousUnavailableError

try:
    user = t2v.auth.start_anonymous()                 # or start_anonymous(captcha_token=...)
except AnonymousUnavailableError as err:
    print(err.type)  # captcha_required | captcha_invalid | captcha_unavailable |
                     # anonymous_access_disabled | anonymous_daily_cap_reached

t2v.auth.is_anonymous()                               # True for a demo session

# Later: create the real account. From an anonymous session this converts it in
# place (same user id, history kept); the engine emails a confirmation link.
outcome = t2v.auth.signup("me@example.com", "password")
if outcome.confirmation_required:
    print("Check your email")
```

Or let the SDK do it: `Talk2View(..., anonymous_auto_start=True)` makes `chat()`,
`upload_attachment()`, `list_models()`, `completions()`, `voice.transcribe()` and
`voice.list_models()` start the demo session when nobody is signed in (raising
`AuthenticationError(type="sign_in_required")` when the engine refuses). `t2v.ensure_session()` does the same on demand — concurrent callers
share one request — and `t2v.on_anonymous_unavailable(cb)` tells the UI to show a
sign-in form instead. When the anonymous demo budget runs out mid-chat,
`ChatController.on("demoLimitReached", cb)` fires instead of an error.

`sign_in_required` is raised as an `AuthenticationError` here, where the
TypeScript SDK throws a plain `T2VError` with the same `type`. In code that
serves both, match on `err.type`, not on the class.

## `TokenStorage`

Protocol for persisting auth tokens. Implement this to keep users logged in across app restarts.

```python
from talk2view import TokenStorage

class MyStorage:
    """Must implement get, set, delete."""

    def get(self, key: str) -> str | None:
        ...

    def set(self, key: str, value: str) -> None:
        ...

    def delete(self, key: str) -> None:
        ...

t2v = Talk2View(partner_key="...", storage=MyStorage())
```

## `FileStorage`

A `TokenStorage` that keeps one JSON object in a file only the user can read
(`0600`; a directory `FileStorage` has to create is made `0700`, and an existing one is
left as it is; on Windows the permission calls are skipped and the file inherits the
profile's ACL). Writes are atomic — temp file, `fsync`, `os.replace` — and
thread-safe. Two `FileStorage` instances on the same path in one process (even spelled
differently — a symlink, a `..`) share the same lock and cache, so neither can lose the
other's writes.

**Re-reads when the file changes underneath it.** Each call checks the file's
`(mtime, size, inode)` against what this instance's cache last loaded or wrote, and
re-reads when it differs — so a *new* `FileStorage` opened later in the same process (a
relaunched chat's own instance) or a file changed by *another process since this one last
looked* picks up that change automatically, instead of serving a stale copy forever. Two
processes writing at genuinely the same instant remain a lost-update race — last writer
wins — which is a caller's job to serialise (a single-instance lock, such as a file lock
of your own); this class only guarantees that a *sequential* handoff, one process's writer
finishing before another reads or writes, never loses what was written. (Before this
became automatic, a sign-out in one process was invisible to another using the same file
until it reopened the file itself; the TypeScript SDK's cross-tab sign-out still has no
desktop counterpart.) On a filesystem with second-level mtime resolution and no usable
inode (FAT/exFAT, including a USB drive or an old Windows profile — not a concern on
APFS, ext4, NTFS or a normal Windows install) a same-size rewrite within that one-second
window could be missed; nothing in this class's own writes can produce that on its own,
since `os.replace` always gives the file a fresh identity, only a hand edit made in place
outside it could.

A file that exists but cannot be read right now (a permission error, a Windows sharing
violation while an antivirus scans it) makes `get`/`set`/`delete` raise that `OSError`,
and the next call reads the file again: it is never taken for an empty store, so a
write can never replace data that could not be read. A file that is read but is not a
JSON object of strings (invalid JSON, not UTF-8, another JSON type, non-string values)
starts the store empty — keeping any string values — and is moved aside to
`<name>.corrupt-<timestamp>` before the next write replaces it (best effort; the new
name is logged).

```python
from talk2view import FileStorage

t2v = Talk2View(
    partner_key="...",
    storage=FileStorage("~/.config/myapp/talk2view/auth.json"),
    data_storage=FileStorage("~/.config/myapp/talk2view/data.json"),
)
```

`data_storage` holds skills and preferences and defaults to `storage`. Give a
keyring-backed `storage` its own `data_storage`: a keyring must never hold skill bodies.
