# Epic K — K. Motivation & Gamification

## K-01 — Badges & Streaks (Mastery-Based)

- **Route:** `(flag off) /student/rewards`  
- **Roles:** Student  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Won't (MVP) / Phase 2 / **DEFERRED**
- **User stories:** US-080 (Earn streaks and mastery badges tied to genuine topic progress, not ju…), US-130 (Hold badges, streaks and XP back to Phase 2 and remove them from MVP s…)
- **Design notes (inventory):** Held back per client Round 1 and removed from MVP screens. Kept in the prototype labelled "Phase 2" so the design is not lost.
- **Baseline v1.0 change:** REVISED — Could → Won't (MVP); labelled Phase 2 per client Round 1 (D-21).
- **Behaviour, states & acceptance criteria:**
  - Specced only
  - feature_flag gamification_phase2=off
  - Phase 2
- **Endpoints wired:** none (specced only / flag off)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## K-02 — Daily Micro-Goal Opt-In Toggle

- **Route:** `/parent/children/[id]/controls#goals`  
- **Roles:** Parent  
- **Platform:** Web + Mobile  
- **Priority / Phase / Build wave:** Should / Phase 3 / **W4**
- **User stories:** US-081 (Opt my child into a daily micro-goal nudge rather than have it on by d…)
- **Design notes (inventory):** Parent-enabled opt-in, not default-on.
- **Behaviour, states & acceptance criteria:**
  - Parent opt-in toggle for daily micro-goals
- **Endpoints wired:**
  - `STU-14` `PUT /api/v1/students/{studentId}/daily-goal` — Change daily question target
  - `PCT-02` `PUT /api/v1/students/{studentId}/ai-controls` — Update controls
- **Tables touched (via those endpoints):** `daily_goal`, `parent_ai_controls`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
