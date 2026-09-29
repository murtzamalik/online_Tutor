# 07 · Auth, RBAC & Tenancy

## Identities
| Identity | Login | Notes |
|---|---|---|
| Parent | email+password, Google/Apple OIDC | Adult; age-assured (AGE-*); email verified before trial |
| Student 13+ | email+password (or school SSO) | Parent link optional per config for 16+ |
| Child <13 / 11+ learner | **picture PIN** on family device (B-11) | No email; PIN lockout after 5 failures (`auth.picture_pin_max_failures`) → parent notified; unlock via parent or support (SUP-07) |
| Teacher / School admin / SBM | school SSO (Google/Microsoft) or email+password | MFA mandatory for school admin (and recommended teacher) |
| Staff (CNT/REV/OPS/SUP/CMP/AIE/DSL/OWN) | email+password + **TOTP MFA (mandatory)** | Recovery codes; session re-auth for sensitive actions |

## Tokens & sessions
Access JWT 15 min (claims: `sub`, `roles[]`, `school_id?`, `student_ids[]?` for parent, `mfa=true/false`); refresh token 30 d rotating, stored hashed in `auth_session`, **reuse detection revokes the family**; web uses httpOnly Secure SameSite=Lax cookies + CSRF token; mobile uses secure storage. Device/session list & revoke (`AUTH-20/21`). Password: Argon2id, breach-list check, strength meter; rate limits per IP+account (Redis).

## Authorisation model
1. **Role → endpoint** map is in `api/endpoints.json` (`roles` per endpoint). Enforce with `@PreAuthorize`-style annotations generated/verified against that file in CI (a test fails if an endpoint's declared roles ≠ code).
2. **Resource ownership:** `{studentId}` endpoints allow: the parent linked (`parent_student_link`), the student themself, and (read-only, class data) a teacher of the pupil's class when `privacy_settings.teacher_visibility`. Everything else 403 (not 404 leak: use 404 for cross-tenant probes).
3. **Entitlements** gate features (`entitlement` table): practice volume, mock papers, voice, subjects; 402/403 `ENTITLEMENT_REQUIRED` with upgrade hint.
4. **Consent gates:** child profile ACTIVE only after required consent; voice requires `voice_consent`; AI tutor honours `parent_ai_controls`.
5. **Staff separation of duties:** support cannot see learning content (only account/billing metadata); DSL alone sees disclosures; refunds over threshold need second approver; reviewers cannot review their own adjusts; every staff read of personal data → `audit_log (PII_VIEW)`.

## Tenancy (schools)
- School tenant tables have RLS (`V011`). Repository layer: `SchoolContext` sets `SET LOCAL app.school_id = ?` in each transaction; consumer/staff paths set `app.rls_bypass='on'` only inside explicitly annotated `@BypassRls` service methods (audited in code review; grep-able).
- **Mandatory tests:** for every school table and every school endpoint — teacher of school A gets zero rows/403 for school B. Also pupil-in-two-classes, teacher-in-two-schools cases.
- Pupil accounts created by roster carry `school_member`; consumer and school entitlements are separate (D-22).

## Audit
`audit_log` records: logins for staff, PII views, refunds, review adjusts, prompt promotions, flag changes, DSL views/actions, deletion executions, RBAC/role changes. Hash chain verified nightly (AUD-03) and on demand.
