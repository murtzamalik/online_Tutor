# Content Ingestion — AI Prompt Pack v1.0
Stories US-087, US-088, US-091, US-111 · Screens E-02, M-01, M-02, M-04 · Decisions D-06 (Claude vision), D-24 embeddings, D-25 bank-first.
Pipeline: `upload PDF (CNT-12) → licence set (CNT-17) → P-IN-03 metadata (human confirms) → P-IN-01 segment → P-IN-02 schemes → code validation → spec tagging (P-QG-05) → embeddings (embedding-service) → item review (CNT-18/19) → APPROVED reference item`.
Only OFFICIAL exam-board sources are ingested; third-party revision sites are never scraped (P-9). See `data/past_papers/` for the manifest.
