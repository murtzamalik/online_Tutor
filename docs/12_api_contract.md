# 12 · API Contract & Conventions

**Catalogue:** `api/API_CATALOGUE.md` (339 endpoints, each with roles, tables, prompts and consuming screens) and machine-readable `api/endpoints.json` / `api/screens.json`. Base path `/api/v1`. Implementation must match the catalogue; CI diffs generated OpenAPI against it. New endpoints require updating the catalogue *and* the traceability matrix in the same PR.

## Conventions
- JSON, `camelCase` fields, ISO-8601 UTC timestamps, UUID ids, money `{amountPence:int, currency:"GBP"}`.
- **Auth:** `Authorization: Bearer <jwt>` (mobile) or httpOnly cookie (web). Public endpoints marked PUB.
- **Errors:** `application/problem+json` `{type,title,status,code,detail,traceId,errors[]}`. Codes are stable strings (see 05).
- **Pagination:** cursor-based `?cursor=&limit=` → `{items[],nextCursor}`; default 25, max 100. Sort params whitelisted.
- **Idempotency:** `Idempotency-Key` header required on `POST /billing/*`, `POST /practice/**/answers`, `POST /mock-papers/*/submit`; replay returns stored response.
- **Async work:** `202 Accepted` + resource with `status` + polling URL; **SSE** (`text/event-stream`) for marking results (`PRA-05`) and tutor streaming (`TUT-02`); events: `status`, `partial`, `result`, `error`. WebSocket only for voice (`VOX-02`).
- **Versioning:** URL major (`/v1`); additive changes only within v1; deprecations via `Deprecation` header.
- **Rate limits (Redis):** per IP and per account; stricter on auth, sample-question, lead-capture. `429` with `Retry-After`.
- **Uploads:** photos via multipart to `PRA-06`/`MOC-07` (max 10 MB, image/jpeg|png|heic) → gateway image-prepare; PDFs (staff) via signed upload URLs.
- **Files:** downloads (invoices, PDFs, exports) via short-lived signed URLs from MinIO.
- **Bootstrap:** `GET /me` returns identity, roles, school, children (for parents), entitlements, feature flags, consent status — the web app hydrates from this once per session.
- **Internal endpoints** (`/internal/**`, staff roles) are on the same host but require staff role + MFA claim; `/internal-svc/**` and `/gateway/**` are service-to-service (mTLS or signed service token, not routed by Caddy publicly).
- **Webhooks:** `/webhooks/stripe` (signature verify, idempotent via `stripe_event`), `/webhooks/ucheck`.

## Example contracts (illustrative — full field lists come from OpenAPI generated from code; Cursor must write DTOs consistent with these)
`POST /practice/sessions/{id}/answers`
```json
// request
{"questionId":"…","answer":{"type":"TEXT|MCQ|NUMERIC|STRUCTURED|PHOTO_REF","text":"…","optionId":null,"value":"0.25","unit":"mol","structured":{},"photoId":null},
 "confidence":3,"telemetry":{"msOnQuestion":42100,"hintsUsed":1,"edits":6}}
// 202 response
{"responseId":"…","status":"MARKING","resultUrl":"/api/v1/practice/answers/…/result","sse":true}
```
`GET /practice/answers/{id}/result` (SSE final event)
```json
{"status":"FINAL|PROVISIONAL_EXCEPTION|IN_REVIEW","marks":{"awarded":3,"max":4},
 "points":[{"id":"M1","awarded":1,"max":1,"evidence":"…","reason":"…"}],
 "feedback":{"headline":"3 out of 4","wentWell":["…"],"toImprove":["…"],"nextStep":"…"},
 "reveal":{"schemeAvailable":true},"provisional":false}
```
`POST /students/{id}/consents/under13` → `{consentId,method,verifiedAt}`; `409 CONSENT_ALREADY_RECORDED`.
