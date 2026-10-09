---
title: Troubleshooting
sidebar_position: 5
---

# Troubleshooting

The usual first-run snags, by symptom.

### The chat asks people to sign in, or nothing happens on a message

By default, when no one is signed in, the SDK tries to start a guest session. If
Talk2View refuses it (guest access isn't set up for your key, today's limit on new
guests is used up, or guests need a captcha check), the packaged chat asks people to
sign in. With the lower-level `Talk2View` client, `chat()` ends without a reply and
the client emits an `anonymousUnavailable` event. Sign the user in with their
Talk2View account, or set up guest access: see
[Authentication](./authentication.md#your-end-users).

### "Request a partner key" / my key is rejected

Double-check you're using your `pk_live_…` **partner key** (there is no secret key).
By default the key works from any website. If a request is refused with
`origin_not_allowed`, either your key is set to accept browser requests only from your
**Allowed websites** (add the site in the dashboard), or popup sign-in was started from
a page that isn't a deployed `https://` site, such as `localhost`.

### Sign-in popup doesn't work on `localhost`

Popup sign-in with Google or Apple only runs on a deployed `https://` site, so the chat
doesn't offer it on `localhost`. While you develop, sign in with email and password.

### Still stuck?

- Check the [API reference](https://engine.talk2view.com/docs) for request and response shapes. It doesn't describe the streamed chat events; the SDK parses those for you.
- [Get in touch](https://talk2view.com/resources/contact).
