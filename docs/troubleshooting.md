---
title: Troubleshooting
sidebar_position: 5
---

# Troubleshooting

The usual first-run snags, by symptom.

### The chat loads but never answers / nothing happens on a message

The most common cause is **guest access being off** while no one is signed in. Either
sign the user in with their Talk2View account, or ask us to enable guest access for
your key. See [Authentication](./authentication.md).

### "Request a partner key" / my key is rejected

Double-check you're using your `pk_live_…` **partner key** (there is no secret key),
and that you're calling from an **allowed origin** registered in the dashboard. A
browser key used from an unregistered origin is refused.

### Sign-in popup doesn't work on `localhost`

Popup sign-in is attested by origin and does not run on `localhost`. During local
development, either enable guest access or sign in from your registered origin.

### Still stuck?

- Check the [API reference](https://engine.talk2view.com/docs) for the exact request/response shapes.
- [Get in touch](https://talk2view.com/resources/contact) — we read every message during the beta.
