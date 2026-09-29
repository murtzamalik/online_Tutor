# 16 · NFR, Security & Compliance

## Regulatory frame (UK)
UK GDPR/DPA 2018; ICO **Age Appropriate Design Code** (children's code); **Online Safety Act 2023** (age assurance, illegal-content duties); **KCSIE** (schools' safeguarding); PECR (cookies/marketing); Consumer Contracts/DMCC (subscriptions, trial reminders, easy cancel); Equality Act (accessibility); Stripe/PCI SAQ-A (no card data touches our servers). Legal sign-offs are **open items** (see 20): DPIA, ICO AADC review, OSA children's-access assessment, exam-board licensing, DPAs, safeguarding policy.

## Data protection design
- Data minimisation; high-privacy defaults for children (L-03); no profiling for marketing; no third-party trackers in learner areas.
- **Boundary:** D-15 enforced by tokenisation, redaction, separate gateway process, DB role, daily attestation.
- Retention (B-07) enforced by purge jobs with metrics; deletion/export within statutory time (SLA 30 d; cooling-off 14 d).
- Sub-processor register (`sub_processor`) surfaced publicly (CON-07) and to schools.
- DPIA + LIA documents authored by client/legal; engineering provides data-flow diagram (03) and register.

## Security controls
- **Network/host:** Caddy TLS 1.2+/HSTS, firewall, private Docker network, DB not exposed; fail2ban; OS patching; encrypted volumes and backups (age/GPG), offsite copy; restore drills quarterly.
- **App:** OWASP ASVS L2 target; input validation; output encoding; CSRF; rate limits; brute-force protection; secure headers; dependency scanning (Dependabot/Renovate + OWASP DC); Semgrep SAST; container scan (Trivy); secrets scanning (gitleaks).
- **Auth:** see 07. **Secrets:** Docker secrets; rotation runbook.
- **Data at rest:** Postgres disk encryption; column-level encryption for `student_credential`/TOTP secrets (app-level AES-GCM with KMS-like key file); object storage private, signed URLs.
- **Logging/monitoring:** no PII; audit trail; alerting (SLO burn, error rate, queue depth, AI budget, boundary attestation failures, DSL SLA).
- **Pen test** before pilot go-live; bug-bounty not needed at pilot.
- **Backups/DR:** PITR (WAL) ≥ 14 d; RPO ≤ 15 min, RTO ≤ 4 h (targets; confirm).

## Non-functional targets (starting values, tune in W4)
Availability 99.5% pilot (99.9% later); p95 read API < 300 ms; marking p95 < 8 s (GCSE); voice first audio < 1.5 s; web LCP < 2.5 s on 4G for public pages; support 5k concurrent students; nightly jobs finish < 6 h; zero PII in logs (tested).

## Child safeguarding & OSA operational duties
DSL role + SLAs (11), scripted responses, reporting/blocking, staff DBS (D-10), safer recruitment for reviewers/tutors, content moderation for shared decks, complaints route (P-02/P-03), transparency (parent transcripts).

## Accessibility & inclusion
WCAG 2.2 AA, dyslexia-friendly options, extra-time simulation (J-04), simplified language (J-05), voice alternatives. Colour contrast tested from tokens.
