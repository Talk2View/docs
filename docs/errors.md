---
title: Errors
sidebar_position: 6
description: Every error the Talk2View API sends, and what to do about it.
---

{/* Generated from the engine's error catalogue
    (packages/server/src/t2v/error_catalogue.py). Do not edit by hand. */}

# Errors

Every error comes back in the same shape:

```json
{
  "error": {
    "type": "partner_key_error",
    "code": "partner_key_missing",
    "message": "Missing partner key: send it in the X-T2V-Partner-Key header",
    "request_id": "9b9a2f013f354578820fdda925d4a28f"
  }
}
```

- `type` is stable: branch on it. The table below lists every one.
- `message` is written for people and may change. Don't match on it.
- `request_id` is also in the `X-Request-Id` header.
  Quote it when you contact support.
- `code` narrows some types, such as `partner_key_missing`.
- A `validation_error` also has `param`, the first field that failed,
  and `errors`, the list of every field that failed.
- When a response has a `Retry-After` header,
  wait that many seconds before trying again.

The SDKs raise these as errors with the same `type`, `code`, `requestId`
(`request_id` in Python) and `retryAfter` (`retry_after`).

## Errors inside a stream

A streamed reply has already answered `200` when it fails, so the error
arrives as the last chunk instead: `data: {"error": {...}}` with the same
fields. Those types are marked *stream* below.

## Error types

| Type | Status | Meaning |
|---|---|---|
| `anonymous_error` | 400 | A guest session was refused; the message says why. |
| `attachment_not_supported` | 400 | The model cannot read this kind of attachment. |
| `bad_request` | 400 | A required value is missing; the message names it. |
| `budget_exceeded` | 400, 429, *stream* | The user's or the guest's model budget is spent. |
| `content_filter` | 400 | The image provider declined the prompt. |
| `convert_error` | 400, 409 | A guest could not be converted to an account; 409 when the email is already taken. |
| `http_error` | 400, 401, 403, 409, 410, 413, 415, 429, 503 | An HTTP error without a more specific type; the status says what kind. |
| `image_model_unknown` | 400 | The image model is not one Talk2View offers. |
| `invalid_nonce` | 400 | The sign-in nonce is missing or too short. |
| `link_requires_session` | 400 | Linking a provider sign-in to a guest needs the guest's access token. |
| `model_not_allowed` | 400 | The model is not enabled for this partner. |
| `model_request_rejected` | 400, 404, 413, 422, *stream* | The model provider rejected the request. |
| `not_anonymous` | 400 | Converting a guest to an account, but the user already has an account. |
| `session_error` | 400 | There is no active conversation to continue. Send a message first. |
| `signup_error` | 400 | Sign-up was refused; the message says why. |
| `skills_disabled` | 400 | Skills are not turned on for this partner. |
| `unsupported_parameter` | 400 | A parameter is not supported on this route; `fields` lists them. |
| `validation_error` | 400, 422 | A field is missing or invalid. `param` names the first one and `errors` lists them all. |
| `authentication_error` | 401 | The end-user's access token is missing, invalid or expired. Refresh it, or sign the user in again. |
| `invalid_partner_key` | 401 | The partner key sent to a sign-in route is not a valid key. |
| `partner_key_error` | 401 | The X-T2V-Partner-Key header is missing (code partner_key_missing), malformed, unknown or for a deactivated partner. Signing the user in again will not help. |
| `voice_ticket_invalid` | 401 | The realtime voice ticket is invalid or expired. Ask for a new one. |
| `insufficient_credit` | 402 | The user's credit does not cover this request. |
| `account_required` | 403 | The feature needs a Talk2View account rather than a guest session. |
| `anonymous_access_disabled` | 403 | The partner has not turned on guest access. |
| `authorization_error` | 403 | The signed-in user may not do this, or not to this resource. |
| `captcha_invalid` | 403 | The captcha token was rejected. |
| `captcha_required` | 403 | This sign-up needs a captcha token. |
| `image_generation_disabled` | 403 | Image generation is not turned on for this partner. |
| `live_translate_disabled` | 403 | Live translation is not turned on for this partner. |
| `model_gated` | 403 | The model needs a paid subscription; `model` names it. |
| `no_api_key` | 403 | The user has no model key yet. Retry shortly; if it persists, contact support. |
| `origin_not_allowed` | 403 | The request's Origin is not on the partner's list of allowed websites (console: Settings → Allowed websites). |
| `scribe_disabled` | 403 | This dictation model is not turned on for this partner. |
| `sign_in_required` | 403 | A guest (anonymous) user called a route that needs a signed-in account, such as the direct model calls. |
| `voice_disabled` | 403 | Realtime voice is not turned on for this partner. |
| `attachment_not_found` | 404 | An attachment the message refers to does not exist or has expired. |
| `not_found` | 404 | No such route, or the session, skill or record it names does not exist. |
| `session_not_found` | 404 | The chat session is gone (often after a deploy). Start a new one. |
| `turn_not_found` | 404 | The turn to re-attach to is gone or finished. |
| `unknown_provider` | 404 | The sign-in provider is not one Talk2View offers. |
| `method_not_allowed` | 405 | The route exists but not for this method; the Allow header lists the ones that do. |
| `refresh_conflict` | 409 | Two refreshes raced with the same refresh token. Retry with the newest token. |
| `tool_call_id_mismatch` | 409 | The tool results sent to /resume do not match the paused tool calls. |
| `expired` | 410 | The sign-in hand-off expired. Start the sign-in again. |
| `file_too_large` | 413 | The uploaded file is over the size limit. |
| `payload_too_large` | 413 | The request body is over the size limit. |
| `quota_exceeded` | 413 | The upload would exceed the user's storage quota. |
| `content_type_mismatch` | 415 | The upload's content does not match its declared type. |
| `unsupported_media_type` | 415 | The upload's file type is not accepted. |
| `invalid_language` | 422 | The language code is not supported. |
| `invalid_request` | 422 | The request is well formed but not allowed as sent. |
| `anonymous_daily_cap_reached` | 429 | Today's limit on new guest sessions from this address is reached. |
| `daily_limit` | 429 | Today's limit for this action is reached. |
| `rate_limit_exceeded` | 429 | Too many requests. Wait the number of seconds in Retry-After. |
| `rate_limited` | 429, *stream* | The model provider is rate limiting. Retry shortly. |
| `usage_limit_exceeded` | 429 | The user's usage limit is reached. |
| `internal_error` | 500, *stream* | Something failed inside the engine. Quote the request_id to support. |
| `provider_error` | 502 | The image provider returned an error. |
| `upstream_error` | 502, *stream* | A service behind the engine failed. On /v1/chat/completions the status is the provider's own. |
| `anonymous_unavailable` | 503 | A guest session could not be started. Retry shortly. |
| `auth_service_unavailable` | 503 | The sign-in service did not answer. Retry shortly. |
| `captcha_unavailable` | 503 | The captcha could not be checked. Retry shortly. |
| `credit_check_unavailable` | 503 | The user's credit could not be checked. Retry shortly. |
| `model_initialization_error` | 503 | The model could not be started. Retry shortly. |
| `service_unavailable` | 503 | A service the request needs is down. Retry shortly. |
| `usage_unavailable` | 503 | Usage figures are unavailable. Retry shortly. |
| `timeout` | 504 | The image provider took too long. |
| `complexity_limit` | *stream* | The turn hit the agent's step limit and stopped. Ask for something smaller. |
| `detached_turn_cancelled` | *stream* | A background turn was interrupted before it finished. |
| `detached_turn_timeout` | *stream* | A background turn ran past its time limit and was stopped. |
