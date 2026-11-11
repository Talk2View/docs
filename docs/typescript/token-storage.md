---
title: "Token storage"
sidebar_position: 9
description: "What @talk2view/sdk keeps in localStorage, what logging out clears, and the security trade-offs."
---

# Token storage

The SDK stores auth tokens in `localStorage` (keys prefixed with `talk2view_`). In private browsing or environments without `localStorage`, it falls back to in-memory storage automatically.

Stored keys:
- `talk2view_access_token`
- `talk2view_refresh_token`
- `talk2view_user`
- `talk2view_user_api_key`
- `talk2view_is_anonymous`

On logout, all of these are cleared and a `talk2view_auth_cleared` event is dispatched on `window` for cross-component synchronization.

Logging out leaves the rest of what the SDK keeps in `localStorage`:

- `talk2view_preferences` — Settings choices: model, dictation (speech-to-text) model and language, font size.
- `t2v_chat_conversations_v1:<partner key>` — the packaged chat's earlier conversations, one bucket per end-user. See [where conversations are kept](https://github.com/Talk2View/talk2view-typescript/blob/main/docs/chat.md#conversations-are-kept-in-this-browser).
- `t2v_user_skills` and `t2v_disabled_skills` — skills saved in the chat's Skills view or with `t2v.skills.save()`. They are not divided by end-user: in the packaged chat, whoever signs in next on that browser sees them and sends them with their chats.
- `t2v-launcher-size`, `t2v-launcher-opened` and `t2v-launcher-colourway` — the launcher's size, whether it has been opened, and the colourway a visitor picked.

## Security Considerations

The SDK stores tokens in `localStorage` for persistence across page reloads. This is a deliberate trade-off — `localStorage` is accessible to any JavaScript running on the same origin, which means XSS vulnerabilities could expose tokens.

To mitigate this:

- **Use a Content Security Policy (CSP)** that restricts script sources to trusted origins
- **Keep token lifetimes short** — the SDK automatically refreshes tokens, so short-lived access tokens limit the window of exposure
- **Always serve your application over HTTPS**
- **Sanitize user-generated content** to prevent XSS injection

**CORS and CSRF:** The engine accepts cross-origin requests from any website (`Access-Control-Allow-Origin: *`), so CORS protects neither your key nor your users. Your key needs no protecting: it is a public identifier. What protects user data is the end-user's sign-in token, which the SDK sends in the `Authorization` header, never in a cookie, so a page on another site cannot make the browser send it.
