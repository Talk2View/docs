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

### Lock it to your site

Because the partner key ships in the browser, register your app's **allowed origins**
in the dashboard. Once you do, the key only works from those origins.

## Your end-users

End-users sign in with a **Talk2View account**, and the SDK attaches their token to
requests. If you'd rather let people use the assistant without signing in, ask us to
turn on **guest access** for your key — then the SDK starts an anonymous session for
visitors automatically.

Sessions are scoped to `(partner, user)`, so the same person using two different
partner apps gets separate, isolated conversations.
