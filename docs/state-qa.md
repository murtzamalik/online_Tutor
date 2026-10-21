## QA Team State

TASK-QA-001 | qa-lead | P0 curl login smoke | status:passed | retries:0 | updated:2026-09-30
TASK-QA-002 | qa-lead | P0 browser login E2E | status:passed | retries:0 | updated:2026-09-30
TASK-QA-003 | qa-lead | P1 register + verify-email | status:passed | retries:0 | updated:2026-09-30
TASK-QA-004 | qa-lead | P2 auth matrix | status:partial | retries:0 | updated:2026-09-30
TASK-QA-005 | qa-lead | Compact wiring bug report | status:passed | retries:0 | updated:2026-09-30

Notes:
- Known emails `murtzamlk@gmail.com`, `murtzamlk1@gmail.com`: **ACTIVE**, verified (`account.email_verified_at` set); curl login not run (passwords not in repo).
- Throwaway parent registered via API + Mailpit verify + curl/browser login: **PASS**.
- QA-004: forgot **202** empty **PASS**; refresh **500** (BUG-REFRESH-001); staff MFA / picture-pin / student register **N/A** (no test data); logout without Bearer **403** (expected).
