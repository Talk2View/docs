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

The **Voice** card under **Settings** in the dashboard has four controls:

- **Default voice model** — the voice model a call runs on when the end-user hasn't chosen
  one. Guests (anonymous users) always get it. Gemini Live is the default until you change
  it.
- **Voice models in this app** — the voice models you offer. Gemini Live is ticked.
  ElevenLabs is off until you tick it, and so is any voice model we add later. Your app's
  instructions and your users' speech reach ElevenLabs only after you tick it.
- **Premium voice models** — the voice models that need a paid plan. End-users who aren't
  on a paid plan get your default voice model instead.
- **Faster ElevenLabs replies (Eleven Realtime)** — shown once ElevenLabs is ticked.
  ElevenLabs answers sooner, in the same voice, and your app's calls move to it from the
  next ElevenLabs call. Off until you tick it.

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

Call captions need 0.24.0 or newer.

## Languages

An ElevenLabs call starts in the browser's language when it is one of these 15, and in
English when it isn't: English, Spanish, French, German, Italian, Portuguese, Dutch,
Japanese, Korean, Chinese, Vietnamese, Hindi, Arabic, Russian, and Turkish. When the
end-user speaks another of the 15, the call switches to it.

Gemini Live replies in whatever language it hears.

## Call captions

Call captions are the words of a voice call, from both sides, shown in the voice panel
above the voice button while the call runs. They're on by default in the packaged chat,
on both voice models. They're cleared when the call ends and stored nowhere.

To turn them off, set `features={{ callCaptions: false }}` on the packaged chat, or
`callCaptions={false}` on a standalone `<VoiceButton>`:

```tsx
import { Talk2ViewChatLauncher, VoiceButton } from '@talk2view/sdk/chat';

<Talk2ViewChatLauncher partnerKey="pk_live_..." features={{ callCaptions: false }} />;
<VoiceButton client={t2v} callCaptions={false} />;
```

If you build your own voice UI, the SDK's `transcript` event carries the same words. Since
0.24.0, the assistant's lines in that event carry no tone cue, such as `[sad]`.

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

If your page sets a Content-Security-Policy, allow what every voice call needs, and what
each voice model your app offers adds. A page with no Content-Security-Policy needs
nothing. As of `@talk2view/sdk` 0.23.0:

| | `connect-src` | `script-src` |
|---|---|---|
| Every voice call | `https://engine.talk2view.com`, `https://c.daily.co` | `'unsafe-eval'`, `blob:` |
| Gemini Live adds | nothing | nothing |
| ElevenLabs adds | `wss://livekit.rtc.elevenlabs.io`, `https://livekit.rtc.elevenlabs.io` | nothing |

Every voice call needs Daily's sources, ElevenLabs included, because the SDK opens the
microphone before the engine has chosen the voice model. Audio worklets are governed by
`script-src`, not `worker-src`, so no voice call needs a `worker-src` source. Your bundler
puts the voice code in separate chunks that load from your own origin on the first call
that uses them, so a page that only chats never loads any of it.

**Every voice call.** The SDK opens the microphone through Daily's library, the media
layer of Gemini Live's WebRTC transport. Opening it, Daily's library downloads its call
engine from `https://c.daily.co`, runs it through `Function()`, and starts an audio
worklet that measures the microphone's level. Without `https://c.daily.co` in
`connect-src` or `'unsafe-eval'` in `script-src`, no voice call starts, on either voice
model, and nothing falls back. If Daily's download fails, its library tries to report the
error to Daily's own error tracking; you can leave that blocked.

**Gemini Live** adds nothing: the call's offer goes to the voice URL your engine returns,
which on Talk2View's hosted engine is `https://engine.talk2view.com` itself.

**ElevenLabs.** The SDK connects to ElevenLabs' LiveKit service at
`wss://livekit.rtc.elevenlabs.io`. It also makes plain HTTPS requests to
`https://livekit.rtc.elevenlabs.io`, to find out what went wrong when a connection fails
and to check the connection when the browser reports it has gone offline or come back
online. Those are the only hosts it adds: it never contacts `api.elevenlabs.io`, and it
loads nothing from a CDN. It also asks your engine to start and end each call, which the
chat already allows.

ElevenLabs adds nothing to `script-src`. Its client loads one audio worklet, which copies
the assistant's audio for a callback the SDK doesn't use, from a `blob:` URL, which every
voice call allows already. Where the browser refuses that (Safari inside an iframe), it
tries a `data:` URL. If that's blocked too, the client logs "Failed to set up audio
capture" and the call carries on, the voice playing as usual. Add `data:` only if your
chat runs inside an iframe that Safari end-users reach and you want that warning gone
there too.

If an ElevenLabs host is blocked, an ElevenLabs call can't connect. The SDK tells the
engine and asks for the call again on another voice model, once. That is Gemini Live where
your app offers it, with the note "Using Gemini Live — ElevenLabs couldn’t connect." Where
it doesn't, the end-user sees "Voice isn’t available right now." A blocked Daily source is
different: no voice call starts at all, on either voice model.
