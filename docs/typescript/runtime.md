---
title: What loads at runtime
sidebar_position: 3
description: "What each entry point of @talk2view/sdk fetches once it is running, for your Content Security Policy."
---

# What loads at runtime

What each entry point fetches once it is running, for your Content Security
Policy. "The engine" is your `baseUrl`, `https://engine.talk2view.com` unless
you set another.

| Entry point | Fetches |
|---|---|
| `@talk2view/sdk` | The engine only. Popup sign-in opens a window on the engine, which hands over to Google or Apple. |
| `/react`, `/assistant-ui` | The engine only. |
| `/chat` | The engine only: no fonts, no CDN, no images (an image in a reply becomes a link). Previews of the files an end-user attaches are `blob:` URLs, so a strict `img-src` needs `blob:`. |
| `/ui` (deprecated) | The engine, the IBM Plex fonts from Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) and the Talk2View logo from `db.talk2view.com`. Code highlighting compiles WebAssembly, which a strict CSP allows with `'wasm-unsafe-eval'`. |
| Voice: `t2v.voice`, `<VoiceButton>`, the launcher's microphone | The engine, and on every call, whichever the voice model, Daily's call engine from `https://c.daily.co`, which runs through `Function()` and starts an audio worklet. Gemini Live adds nothing, and neither does ElevenLabs Medical, which runs over the same connection as Gemini Live and contacts no ElevenLabs host from the browser. ElevenLabs adds `wss://livekit.rtc.elevenlabs.io` and `https://livekit.rtc.elevenlabs.io` only (with a token the engine mints, the client never contacts `api.elevenlabs.io`), and one audio worklet from a `blob:` URL that the call works without. |

So every voice call needs `https://c.daily.co` in `connect-src`, and
`'unsafe-eval'` and `blob:` in `script-src`, an ElevenLabs call included: the
SDK opens the microphone through Daily's library before the engine has chosen
the voice model. Without `https://c.daily.co` or `'unsafe-eval'`, no voice call
starts. If Daily's download fails, its library tries to send an error report to
Daily's own error tracking (Sentry); you can leave that blocked. A Gemini Live
call needs nothing more. An ElevenLabs call adds the two ElevenLabs hosts to
`connect-src`; one that cannot reach them is retried on Gemini Live when the
app offers it. The voice libraries come from your own bundle, loaded on the
first call that uses them: a chat that never starts a call never loads them,
the first voice call loads the Pipecat libraries and Daily's call engine,
whichever the voice model, and only an ElevenLabs call loads ElevenLabs'. The
call's audio travels over WebRTC: for Gemini Live through the ICE servers the
engine hands out for each call, for ElevenLabs through its own LiveKit service.
[Voice](../voice.md)
has the rest.
