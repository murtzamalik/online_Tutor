## Spring Boot Team State

TASK-SB-001 | springboot-lead | TokenResponseSerializationTest | status:passed | retries:0 | updated:2026-09-30T12:32Z
TASK-SB-002 | springboot-lead | TokenResponse Jackson fix (QA-gated) | status:skipped-pending-qa | retries:0 | blocked-by:QA-002 | updated:2026-09-30T12:33Z
TASK-SB-003 | springboot-lead | AuthService.refresh null student_id | status:passed | retries:0 | updated:2026-09-30T12:40Z

### SB-001 notes
- Test: `backend/core-api/src/test/java/com/karsaaz/studyloop/identity/TokenResponseSerializationTest.java`
- Verified with `mvn -pl core-api test -Dtest=TokenResponseSerializationTest` (pass)
- Jackson config: `spring.jackson.default-property-inclusion: non_null` (`application.yml`)

### SB-002 notes
- Not executed — Architect prefers frontend Zod `.nullish()` (FE-002); backend change only if QA-002 fails after FE/DO fixes.

### SB-003 notes
- Fix: `AuthService.refresh` session row mapping uses `HashMap` (same as other JDBC mappers in file) so `student_id` may be null for parent/account sessions.
- File: `backend/core-api/src/main/java/com/karsaaz/studyloop/identity/application/AuthService.java` (~267)
- No new test — existing identity tests unchanged; manual/QA retest `POST /api/v1/auth/refresh` with parent session.
- **Rebuild:** `core-api` Docker image required after deploy.
