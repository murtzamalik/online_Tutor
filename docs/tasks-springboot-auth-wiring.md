# Spring Boot Tasks — Auth Wiring Audit

**Lead:** springboot-lead  
**Target devs:** Controller Dev, Service Dev

---

## Spring Boot TODO

- [ ] SB-001: Contract JSON test for TokenResponse — [SEQUENTIAL:depends-on-FE-002]
- [ ] SB-002: Conditional DTO/Jackson fix — [SEQUENTIAL:depends-on-QA-002]

---

TASK-SB-001: Document TokenResponse JSON with non_null via test
Status: pending
Parallelism: [SEQUENTIAL:depends-on-FE-002]
Assigned-to: springboot-lead
Target-dev: Controller Dev

## Description
Add an automated test that serializes `AuthDtos.TokenResponse.tokens(...)` with the application `ObjectMapper` and asserts omitted null fields — locking the frontend contract without changing production behavior.

## Implementation Strategy
1. Create test class `TokenResponseSerializationTest` under `backend/core-api/src/test/java/com/karsaaz/studyloop/identity/`.
2. Use `@SpringBootTest` or `@JsonTest` with the same Jackson config as `application.yml` (`non_null`).
3. Serialize `TokenResponse.tokens("access", "refresh", 900L)`.
4. Assert JSON **does not** contain `mfaChallengeToken` key.
5. Assert contains `accessToken`, `refreshToken`, `tokenType`, `expiresInSeconds`, `mfaRequired`.
6. Serialize `TokenResponse.mfaChallenge("challenge-id")` and assert **no** `accessToken`/`refreshToken` keys; assert `mfaRequired` true.

Do **not** change `AuthDtos.java` in this task.

## Interface Contracts
Java record: `AuthDtos.TokenResponse` as defined in `identity/api/dto/AuthDtos.java`.

## Acceptance Criteria
- **When** `./mvnw -pl backend/core-api test -Dtest=TokenResponseSerializationTest` runs,
- **Then** test passes.
- **When** test JSON is printed in assertion failure message,
- **Then** FE team can copy fixture for vitest.

## Files to Create / Modify
- CREATE: `backend/core-api/src/test/java/com/karsaaz/studyloop/identity/TokenResponseSerializationTest.java`

## Relevant Context
- `application.yml` jackson `non_null`
- TASK-FE-002 frontend fix

## TODO Template
- [ ] Add serialization test
- [ ] Run mvn test
- [ ] Share sample JSON with frontend if differs from FE-001

---

TASK-SB-002: Backend contract fix (QA-gated only)
Status: pending
Parallelism: [SEQUENTIAL:depends-on-QA-002]
Assigned-to: springboot-lead
Target-dev: Controller Dev

## Description
**Execute only if QA-002 fails after FE-002, FE-004, and DO-001.** Prefer including null keys OR explicit `@JsonProperty` only if frontend cannot safely parse production JSON.

## Implementation Strategy
Option A (last resort): Add `@JsonInclude(Include.ALWAYS)` on `AuthDtos.TokenResponse` record only.  
Option B: Change `default-property-inclusion` globally — **forbidden** (too broad).  
Option C: Add `@JsonProperty` on nullable fields — only if rename mismatch proven.

Before any change: capture QA failure response body vs FE-009 test fixture diff.

## Interface Contracts
Must remain camelCase: `accessToken`, `refreshToken`, `tokenType`, `expiresInSeconds`, `mfaRequired`, `mfaChallengeToken`.

## Acceptance Criteria
- **Given** QA-002 failed with documented Zod issues after frontend merge,
- **When** SB-002 applied and core-api rebuilt,
- **Then** QA-002 passes without weakening FE schema tests.

## Files to Create / Modify
- MODIFY (conditional): `backend/core-api/src/main/java/com/karsaaz/studyloop/identity/api/dto/AuthDtos.java`

## Relevant Context
- Architect: prefer frontend fixes
- TASK-QA-002

## TODO Template
- [ ] Confirm QA gate failure
- [ ] Apply minimal Jackson annotation on TokenResponse only
- [ ] Update SB-001 expectations if JSON changes
- [ ] Notify devops DO-002
