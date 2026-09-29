# Epic M — M. Content Administration

## M-01 — Spec / Topic Tree Manager

- **Route:** `/staff/spec`  
- **Roles:** Content Admin  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-087 (Manage the specification/topic tree per qualification/board/subject as…), US-039 (Tag every question to its exact specification point, not just a broad …)
- **Design notes (inventory):** Per qualification/board/subject, all 7 board-tracks.
- **Behaviour, states & acceptance criteria:**
  - Tree editor, import spec doc, decompose to objectives
  - AC: changes versioned
- **Endpoints wired:**
  - `SPC-01` `GET /api/v1/internal/specs` — All specifications and tagging status
  - `SPC-02` `POST /api/v1/internal/specs` — Create specification row (new board/subject)
  - `SPC-03` `GET /api/v1/internal/specs/{specificationId}/tree` — Full tree for M-01
  - `SPC-04` `POST /api/v1/internal/specs/{specificationId}/topics` — Add topic/subtopic/spec point
  - `SPC-05` `PATCH /api/v1/internal/topics/{topicId}` — Edit/reorder/tag status
  - `SPC-06` `POST /api/v1/internal/specs/{specificationId}/import-document` — Upload spec PDF → AI extraction → review
  - `SPC-07` `POST /api/v1/internal/topics/{topicId}/decompose` — Run P-QG-01 for a spec point
  - `CAT-05` `GET /api/v1/catalog/specifications/{specificationId}/topics` — Topic tree (levels 1–3)
- **Tables touched (via those endpoints):** `board_style_profile`, `spec_document`, `spec_point_objective`, `spec_topic`, `spec_unit`, `specification`
- **AI prompts:** `P-IN-04` (Specification document extraction), `P-QG-01` (Spec-point decomposition)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## M-02 — Board Style Profile Manager

- **Route:** `/staff/style`  
- **Roles:** Content Admin  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-088 (Maintain each board's style profile (question wording, mark scheme for…), US-038 (Keep a separate style profile per exam board so generated questions do…)
- **Design notes (inventory):** Question wording, mark scheme format per board.
- **Behaviour, states & acceptance criteria:**
  - Edit board style profile, derive from papers
  - AC: profile version pinned into generation runs
- **Endpoints wired:**
  - `STY-01` `GET /api/v1/internal/style-profiles` — List
  - `STY-02` `GET /api/v1/internal/style-profiles/{specificationId}` — Read
  - `STY-03` `PUT /api/v1/internal/style-profiles/{specificationId}` — Edit
  - `STY-04` `POST /api/v1/internal/style-profiles/{specificationId}/derive` — Derive from ingested papers (proposal only, human accepts)
- **Tables touched (via those endpoints):** `board_style_profile`
- **AI prompts:** `P-IN-05` (Board style profile derivation)
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## M-03 — Marking-Flag Systemic Issue Dashboard

- **Route:** `/staff/marking/systemic`  
- **Roles:** Content Admin  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Should / Phase 2 / **W3**
- **User stories:** US-090 (See all student "disagree with this mark" flags in one place to spot s…)
- **Design notes (inventory):** Aggregates F-04 disputes and F-10 outcomes to spot systemic marking issues.
- **Baseline v1.0 change:** UPDATED — Individual disputes resolved in F-10; this is the aggregate view.
- **Behaviour, states & acceptance criteria:**
  - Systemic-issue dashboard by question/topic/board
  - AC: threshold configurable
- **Endpoints wired:**
  - `EXC-05` `GET /api/v1/internal/marking/systemic-issues` — Aggregate disputes/outcomes by board/topic/question (M-03)
  - `MRK-04` `POST /api/v1/answers/{responseId}/dispute` — "Disagree with this mark" → exception queue
- **Tables touched (via those endpoints):** `dispute`, `marking_exception`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.

## M-04 — Spec-Point Tagging Progress Tracker

- **Route:** `/staff/spec/tagging`  
- **Roles:** Content Admin  
- **Platform:** Web (internal tool)  
- **Priority / Phase / Build wave:** Must / Pilot / **W1**
- **User stories:** US-091 (Track which subjects/boards/qualifications still need spec-point-level…), US-039 (Tag every question to its exact specification point, not just a broad …)
- **Design notes (inventory):** Which subjects/boards still need tagging completed.
- **Behaviour, states & acceptance criteria:**
  - Tagging progress by spec/topic
  - AC: coverage % vs target
- **Endpoints wired:**
  - `SPC-08` `GET /api/v1/internal/specs/tagging-progress` — M-04 progress by board/subject
- **Tables touched (via those endpoints):** `spec_topic`
- **Cross-cutting (always):** loading/empty/error/offline states from Shell-07; RBAC enforced server-side; a11y WCAG 2.2 AA; no PII in analytics; audit where staff.
