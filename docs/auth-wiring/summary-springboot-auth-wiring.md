# Spring Boot — Auth Wiring (SB-001 / SB-002)

## SB-001: TokenResponse JSON contract (Jackson `non_null`)

**Status:** Done — automated test passes.

**Test class:** `backend/core-api/src/test/java/com/karsaaz/studyloop/identity/TokenResponseSerializationTest.java`

**Run:**

```bash
cd backend && mvn -pl core-api test -Dtest=TokenResponseSerializationTest
```

### Successful login / refresh / picture-pin (`TokenResponse.tokens(...)`)

Present keys: `accessToken`, `refreshToken`, `tokenType`, `expiresInSeconds`, `mfaRequired`.

**Omitted when null:** `mfaChallengeToken`.

Example shape:

```json
{"accessToken":"access","refreshToken":"refresh","tokenType":"Bearer","expiresInSeconds":900,"mfaRequired":false}
```

### MFA challenge (`TokenResponse.mfaChallenge(...)`)

Present keys: `tokenType`, `expiresInSeconds`, `mfaRequired`, `mfaChallengeToken`.

**Omitted when null:** `accessToken`, `refreshToken`.

Example shape:

```json
{"tokenType":"Bearer","expiresInSeconds":0,"mfaRequired":true,"mfaChallengeToken":"challenge-id"}
```

Frontend (FE-002 / FE-009) should treat omitted nullable fields as absent, not require every key.

## SB-002: Backend DTO / Jackson override

**Status:** SKIPPED-PENDING-QA

No change to `AuthDtos.java`. Revisit only if QA-002 fails after FE-002, FE-004, and DO-001.

## SB-003: `POST /api/v1/auth/refresh` (null `student_id`)

**Status:** Done.

**Root cause:** Parent/account sessions store `student_id = NULL`. `refresh()` mapped the JDBC row with `Map.of(...)`, which rejects null values → NPE → HTTP 500.

**Fix:** Session row mapping in `AuthService.refresh` uses `HashMap` + `put` (consistent with other mappers in `AuthService`).

**Deploy:** Rebuild and redeploy `core-api` Docker image.
