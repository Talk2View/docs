---
title: Authentication
sidebar_position: 3
---

# Authentication

Talk2View uses a two-tier model. Most API requests carry both:

1. **Partner key** — identifies which application is making the request.
2. **End-user token** — identifies which of your users is chatting.

The SDK manages both for you; this page explains what's happening underneath.

## Your partner key

As a Talk2View partner you receive one **partner key**:

| Key | Prefix | Use |
|-----|--------|-----|
| Partner key | `pk_live_` | Client-side code, SDK initialization |

It's safe to include in client-side code — it identifies your application to the
platform and cannot access other partners' data. Talk2View does **not** issue a
partner secret key; there is no `sk_` key to keep private.

It's sent on each request as the `X-T2V-Partner-Key` header.

### Allowed websites and sign-in

Your partner key is a public identifier, not a secret: anyone can copy it from your
app and use it. What protects your users' data is end-user sign-in. Every
conversation belongs to one end-user, and the partner key on its own can't read it.

The **Allowed websites** list, under **Settings** in the dashboard, is for popup
sign-in with Google or Apple:

- On a listed website, sign-in goes straight through.
- On any other `https://` website, sign-in still works, but your users first see a
  Talk2View screen that names the site and asks them to confirm it.

Add each website that hosts your chat, as its exact address (`https://`, the domain,
and nothing after it), to skip that screen. Popup sign-in doesn't run on `localhost`,
so use email and password while you develop.

By default, the list doesn't limit where your key works: the API accepts requests
from any website. Talk2View can switch on a stricter setting for a key, which refuses
browser requests from websites that aren't listed and offers popup sign-in only on
listed ones. It isn't a dashboard setting; if it's on for your key, the dashboard
says so.

## Your end-users

End-users sign in with a **Talk2View account**, and the SDK attaches their token to
requests.

To let people use the assistant without signing in, turn on **Anonymous access** under
**Settings** in the dashboard and ask us to set a daily limit on new guests for your
key. Guest access stays off until that limit is set. If the dashboard says guests need
a captcha check, we'll set that up with you; if not, the SDK starts a guest session
for visitors who aren't signed in.

Sessions are scoped to `(partner, user)`, so the same person using two different
partner apps gets separate, isolated conversations.
