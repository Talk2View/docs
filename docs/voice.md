---
title: Voice
sidebar_position: 5
description: The voice button, the Gemini Live and ElevenLabs voice models, and the hosts your Content-Security-Policy must allow.
---

# Voice

Voice lets your end-users talk to the assistant. In the packaged chat it's a microphone
button beside the chat launcher: press it to start a voice call, press it again to hang
up. A voice call runs the same tools as the chat, so a tool you registered for the chat
already works by voice, with no new code.

Turn the voice button on in the **Voice** card under **Settings** in the dashboard.

## Voice models

A voice call runs on one of two voice models. The engine picks one when each call starts.

| Voice model | Id | What it is |
|---|---|---|
| Gemini Live | `gemini-live` | Google's realtime voice. |
| ElevenLabs | `elevenlabs` | The most natural-sounding voice. It uses more credits per minute. |

What an end-user says on a call goes to the provider of the voice model the call runs on.
See [Intended use](./intended-use.md) and the
[Privacy Policy](https://talk2view.com/legal/privacy-policy).

## What your app offers

The **Voice** card under **Settings** in the dashboard has three controls:

- **Default voice model** — the voice model a call runs on when the end-user hasn't chosen
  one. Guests (anonymous users) always get it. Gemini Live is the default until you change
  it.
- **Voice models in this app** — the voice models you offer. Gemini Live is ticked.
  ElevenLabs is off until you tick it, and so is any voice model we add later. Your app's
  instructions and your users' speech reach ElevenLabs only after you tick it.
- **Premium voice models** — the voice models that need a paid plan. End-users who aren't
  on a paid plan get your default voice model instead.

The default voice model has to be ticked in **Voice models in this app**, and it can't be
premium. At least one voice model must stay on.

## What your users choose

End-users can set a preferred voice model in the **Voice** section of their Profile page,
at [`https://dashboard.talk2view.com/enduser/profile#voice`](https://dashboard.talk2view.com/enduser/profile#voice).
It follows them into every app that offers that voice model. An end-user with no
preference, and every guest, gets your default voice model. The engine decides when each
call starts, so a changed preference applies from the next call.

The packaged voice button shows a **Change voice** link to that page, in a new tab, for
signed-in end-users. If you build your own voice UI, link to it from wherever suits you
with `VOICE_PREFERENCE_URL`:

```ts
import { VOICE_PREFERENCE_URL } from '@talk2view/sdk';
// https://dashboard.talk2view.com/enduser/profile#voice
```

## SDK version

`@talk2view/sdk` 0.23.0 or newer runs both voice models, so ElevenLabs needs that version.
Older SDKs only run Gemini Live, so they always get it, whatever the default or preferred
voice model. If your app doesn't offer Gemini Live, they show "Voice isn’t available
right now." So leave Gemini Live ticked until your apps are on 0.23.0 or newer.

## When a voice model can't take the call

A call starts from the end-user's preferred voice model, or from your default if they have
none. When that voice model can't take the call, the call runs on another voice model the
end-user may use in your app, your default first, and a note says why for the first few
seconds of the call:

| Why | The note |
|---|---|
| Your app doesn't offer it. | `Using {fallback} — this app doesn’t offer {wanted}.` |
| It's premium in your app and the end-user isn't on a paid plan. | `Using {fallback} — {wanted} needs a paid plan in this app.` |
| It's switched off, or too many calls are running. | `Using {fallback} — {wanted} isn’t available right now.` |
| It failed to start, or the browser couldn't connect to it. | `Using {fallback} — {wanted} couldn’t connect.` |

`{wanted}` is the voice model the call was going to run on, and `{fallback}` is the one it
runs on instead. For example: "Using Gemini Live — ElevenLabs needs a paid plan in this
app."

If no voice model is left to try, the call doesn't start. The API answers 403 with a
`voice_model_unavailable` error (see [Errors](./errors.md)), and the packaged voice button
shows "Voice isn’t available right now." That is also the error's message.

## Content-Security-Policy

If your page sets a Content-Security-Policy, allow what each voice model your app offers
needs. A page with no Content-Security-Policy needs nothing. As of `@talk2view/sdk` 0.23.0:

| Voice model | `connect-src` | `script-src` |
|---|---|---|
| Gemini Live | `https://engine.talk2view.com`, `https://c.daily.co` | `'unsafe-eval'`, `blob:` |
| ElevenLabs | `wss://livekit.rtc.elevenlabs.io`, `https://livekit.rtc.elevenlabs.io` | `blob:` (optional) |

Audio worklets are governed by `script-src`, not `worker-src`, so neither voice model needs
a `worker-src` source. Your bundler puts each voice model's code in separate chunks that
load from your own origin on the first call that uses them, so a page that only chats
never loads either.

**Gemini Live.** Starting a call, the SDK's WebRTC transport has Daily's library download
its call engine from `https://c.daily.co` and run it through `Function()`, and loads its
microphone and playback audio worklets from `blob:` URLs. So Gemini Live needs
`https://c.daily.co` in `connect-src`, and `'unsafe-eval'` and `blob:` in `script-src`;
without any of them, no call starts. The call's offer then goes to the voice URL your
engine returns, which on Talk2View's hosted engine is the engine itself, so `connect-src`
must allow `https://engine.talk2view.com` too. If Daily's download fails, its library
tries to report the error to Daily's own error tracking; you can leave that blocked.

**ElevenLabs.** The SDK connects to ElevenLabs' LiveKit service at
`wss://livekit.rtc.elevenlabs.io`. It also makes plain HTTPS requests to
`https://livekit.rtc.elevenlabs.io`, to find out what went wrong when a connection fails
and to check the connection when the browser goes offline or comes back online. Those are
the only ElevenLabs hosts it needs: it never contacts `api.elevenlabs.io`, and it loads
nothing from a CDN. It also asks your engine to start and end each call, which the chat
already allows.

ElevenLabs needs nothing in `script-src` for the call itself. Its client loads one audio
worklet, which copies the assistant's audio for a callback the SDK doesn't use. It loads
it from a `blob:` URL and, where the browser refuses that (Safari inside an iframe), from
a `data:` URL. If both are blocked, the client logs "Failed to set up audio capture" and
the call carries on, the voice playing as usual. Allow `blob:` to keep that warning, and
the CSP violation report behind it, out of your console. Add `data:` only if your chat
runs inside an iframe that Safari end-users reach and you want it quiet there too.

If a host is blocked, an ElevenLabs call can't connect. The SDK tells the engine and asks
for the call again on another voice model, once. That is Gemini Live where your app offers
it, with the note "Using Gemini Live — ElevenLabs couldn’t connect." Where it doesn't, the
end-user sees "Voice isn’t available right now."
