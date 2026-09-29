# Traceability — user story → screen(s)

Full story→screen→endpoint→table→prompt matrix: `traceability_matrix.csv`.

| Story | Role | Priority | Phase | Screens | Story text |
|---|---|---|---|---|---|
| US-001 | Visitor | Must | Ongoing | A-01, A-02 | Browse subject/qualification pages (11+, GCSE, iGCSE, A Level) to understand the offer before signing up. |
| US-002 | Visitor | Must | Ongoing | A-03 | Read an FAQ covering marking accuracy, exam boards covered, cost vs tutoring, and whether a parent is required |
| US-003 | Visitor | Should | Phase 2 | A-04 | Try one live, marked sample question directly on the homepage before registering. |
| US-004 | Visitor | Should | Ongoing | A-05 | Download a free lead-magnet resource (familiarisation pack, baseline test) in exchange for an email address. |
| US-005 | Visitor | Should | Phase 2 | A-06 | See transparent, methodology-explained outcome statistics rather than one headline percentage. |
| US-006 | Visitor | Could | Phase 2 | A-07 | Read named case studies/testimonials with specific before/after scores (with permission). |
| US-007 | Visitor | Could | Ongoing | A-08 | Find an exam-date calendar by region so I can plan revision timelines. |
| US-008 | Visitor | Should | Phase 2 | A-09 | Take a short "which plan is right for us" quiz instead of parsing the full pricing matrix. |
| US-009 | Visitor | Could | Phase 3 | A-10 | Browse a free, publicly-accessible resource library (glossary, past-paper index) with no email gate. |
| US-010 | Parent | Must | Pilot | B-01 | Create an account to manage my child's subscription and progress. |
| US-011 | Parent | Must | Pilot | B-02 | Add multiple child profiles under one account. |
| US-012 | Student | Should | Phase 2 | B-03 | Have my own profile under a parent account, or use the platform standalone without a parent present. |
| US-013 | Student | Must | Pilot | B-04 | Select qualification, exam board and subject(s) so content is tailored to what I'm actually sitting. |
| US-014 | Student | Must | Pilot | B-05 | Be asked what I want from this subject — exam prep, general study, target score, or a specific weak area — so  |
| US-015 | Student | Must | Pilot | B-06 | Take a short adaptive diagnostic/baseline test so the system knows my starting level. |
| US-016 | Student | Should | Phase 2 | B-07 | Receive a personalised weekly revision plan generated from my subject/board/target exam date. |
| US-017 | Parent | Must | Pilot | B-08 | Set my child's target grade or score per subject so practice is pitched at the right stretch level. |
| US-018 | Student | Should | Phase 3 | B-09 | Set accessibility preferences (dyslexia font, text size, TTS) during onboarding. |
| US-019 | Parent | Must | Phase 2 | C-01 | See a pricing page segmented by age/qualification/tier with a monthly/yearly toggle. |
| US-020 | Parent | Must | Pilot | C-02 | Select subjects within my plan, including Combined Science as an alternative to the three separate sciences. |
| US-021 | Parent | Must | Pilot | C-03 | Try the platform on a free trial before committing to a paid plan. |
| US-022 | Parent | Should | Phase 2 | C-03, C-05, C-10 | Have a sibling/multi-child discount applied automatically. |
| US-023 | Parent | Should | Phase 2 | C-05 | Upgrade, downgrade or change subjects mid-subscription. |
| US-024 | Parent | Could | Phase 3 | C-06 | Buy a lower-commitment single-subject/single-board micro-subscription. |
| US-025 | Parent | Must | Phase 2 | C-04 | See exactly what's included/excluded per tier (e.g. mock tests) before paying. |
| US-026 | Parent | Could | Phase 3 | C-07 | Refer a friend and receive a reward. |
| US-027 | Student | Must | Pilot | D-01 | Get unlimited practice questions per topic so I never run out of material. |
| US-028 | Student | Should | Phase 2 | D-02, D-03 | Request a full mock paper matching the real exam's structure, timing and topic weighting. |
| US-029 | Student | Must | Pilot | D-01 | See real past-paper questions clearly labelled "from [board] [year] paper" vs AI-generated ones. |
| US-030 | Student | Could | Phase 3 | D-04 | Sit a genuinely adaptive 11+ entrance test with no skip and no going back, matching real exam behaviour. |
| US-031 | Student | Should | Phase 2 | D-05 | Request several versions of the same topic/difficulty in one go, with numbers re-randomised for maths. |
| US-032 | Student | Should | Phase 2 | D-01 | Answer by typing, speaking (auto-transcribed), or photographing handwritten working — all marked the same way. |
| US-033 | Student | Should | Phase 2 | D-06 | Photograph a completed printed practice paper and get an instant score. |
| US-034 | Student | Could | Phase 2 | D-07 | Build my own mixed-topic quiz or mock from any combination of topics I've covered. |
| US-035 | Student | Should | Phase 2 | D-08 | Have an achievable daily micro-goal (e.g. 10 questions) as the default rhythm, alongside unlimited practice fo |
| US-036 | Student | Should | Phase 2 | D-09 | Use a "wrong answers only" mode to redrill everything I've previously got wrong across a subject. |
| US-037 | Platform | Must | Pilot | E-01, E-02 | Ground every generated question in real past papers and mark schemes, per board, so style/difficulty is authen |
| US-038 | Platform | Must | Pilot | M-02 | Keep a separate style profile per exam board so generated questions don't read identically across boards. |
| US-039 | Platform | Must | Pilot | E-01, M-01, M-04 | Tag every question to its exact specification point, not just a broad topic name. |
| US-040 | Platform | Could | Phase 3 | E-02 | Supplement the question bank with reviewed, clearly-labelled material sourced from elsewhere online once the c |
| US-041 | Content Admin | Must | Pilot | E-01 | Review only the AI-generated questions that fail automated quality checks (grounding, spec tag, mark-scheme co |
| US-042 | Student | Should | Phase 3 | D-10 | Have the engine keep generating questions at my target grade for a topic until I'm consistently hitting it, th |
| US-043 | Student | Could | Phase 2 | D-03 | See an authentic past-paper look and feel (official layout, cover, numbering) when sitting a real paper. |
| US-044 | Student | Must | Pilot | F-01 | Get instant, exam-aligned automatic marking with a per-question right/wrong + explanation. |
| US-045 | Student | Must | Pilot | F-02 | See the full mark scheme, point by point, for how my answer was marked. |
| US-046 | Student | Could | Phase 2 | F-03 | Self-mark against a revealed mark scheme as an alternative to AI marking. |
| US-047 | Student | Must | Pilot | F-04 | Flag "disagree with this mark" on any auto-marked question so it gets reviewed. |
| US-048 | Marking Reviewer | Must | Phase 2 | F-05 | Review every AI-marked A-Level long answer in an anonymised workbench, confirm or adjust the mark using the AI |
| US-049 | Student | Must | Phase 2 | F-01 | See a "this is an AI-assisted estimate, not an official mark" disclaimer on long-form A-Level marks. |
| US-050 | Student | Should | Phase 2 | F-06 | Be re-explained a concept in a different format (diagram/worked example) if I get it wrong a second time, rath |
| US-051 | Student | Should | Phase 2 | F-07 | Be prompted to explain my reasoning before the answer is revealed (Socratic explain-back), with targeted hints |
| US-052 | Student | Could | Phase 3 | F-08 | Photograph a question I'm stuck on (not just a finished answer) and get a step-by-step walkthrough with hints  |
| US-053 | Student | Must | Pilot | G-03 | Be offered a hint or a switch to a different topic if I stay too long on a question with no progress. |
| US-054 | Student | Should | Pilot | G-04 | Have the tutor notice frustration signals and respond with encouragement and a difficulty reset, rather than p |
| US-055 | Student | Should | Phase 2 | G-01 | Receive occasional surprise short quizzes on topics I haven't touched recently. |
| US-056 | Student | Should | Pilot | G-02 | Be asked how confident I am before an answer is revealed. |
| US-057 | Platform | Must | Pilot | H-01, H-06, Shell-01 | Maintain a mastery model (BKT, graduating to DKT at scale) per student per topic. |
| US-058 | Student | Should | Phase 2 | D-09, I-01, Shell-01 | Have previously-mastered topics resurfaced on a spaced schedule so I don't forget them. |
| US-059 | Platform | Must | Pilot | B-06 | Run an IRT-based adaptive placement test so a student's starting level is estimated from just a few questions. |
| US-060 | Student | Should | Phase 2 | D-01, D-10, F-07 | Have the teaching style (direct instruction vs guided example vs full question) match my current mastery on th |
| US-061 | Parent | Must | Pilot | H-01 | See a longitudinal progress dashboard (topic-level mastery, trend over time). |
| US-062 | Parent | Should | Phase 2 | H-02 | See the specific misconception behind each wrong answer in plain English, not just a score. |
| US-063 | Parent | Should | Phase 2 | H-03 | Receive a weekly AI-generated narrative summary (what improved, what's shaky, what's next). |
| US-064 | Parent | Could | Phase 2 | H-04 | See a predicted grade band per subject with an honest confidence interval. |
| US-065 | Parent | Should | Phase 3 | H-05 | Get an early-warning alert when my child is drifting on a topic, before it becomes a bigger gap. |
| US-066 | Student | Could | Phase 3 | H-06 | See a visual knowledge map/skill tree showing which topics are secure. |
| US-067 | Student | Could | Phase 3 | H-07 | See anonymised cohort context (e.g. "top 20% this month") without any other student's identity exposed. |
| US-068 | Parent | Could | Phase 2 | H-08 | Get a printable action-plan checklist after a diagnostic/session for offline use. |
| US-069 | Student | Should | Phase 2 | I-01 | Get auto-generated flashcard decks per topic as a lighter revision mode. |
| US-070 | Student | Could | Phase 2 | I-02 | Build my own custom flashcard deck. |
| US-071 | Student | Should | Phase 2 | I-03 | Read short, AI-rewritten (original, non-copied) revision notes per topic. |
| US-072 | Student | Could | Phase 2 | I-04 | Get a one-page cheat sheet per topic/subject for last-minute review. |
| US-073 | Student | Should | Phase 2 | I-05 | Do a quick 2-minute knowledge-check quiz between longer practice sessions. |
| US-074 | Student | Could | Phase 3 | I-06 | Share a flashcard deck or quiz set with classmates or a study group. |
| US-075 | Student | Must | Pilot | J-01 | Use a spoken-dialogue tutor mode to talk through a topic hands-free. |
| US-076 | Student | Could | Phase 3 | J-02 | As an English Language/Literature student, practise verbal discussion of a text/writer's intent aloud. |
| US-077 | Student | Should | Phase 3 | J-03 | Use dyslexia-friendly fonts, adjustable spacing and colour/contrast settings. |
| US-078 | Student | Could | Phase 3 | J-04 | Practise under extended-time simulation matching my real exam access arrangements. |
| US-079 | Student | Could | Phase 3 | J-05 | Toggle simplified-language question wording without the underlying content changing. |
| US-080 | Student | Won't (MVP) | Phase 2 | K-01 | Earn streaks and mastery badges tied to genuine topic progress, not just time-on-platform. |
| US-081 | Parent | Should | Phase 3 | K-02 | Opt my child into a daily micro-goal nudge rather than have it on by default. |
| US-082 | Platform | Must | Pilot | L-04 | Run a secondary monitoring model reviewing every tutor conversation in real time. |
| US-083 | Platform | Must | Pilot | D-01, F-07, J-01 | Refuse to do a student's homework verbatim, keeping the tool a practice engine, not an answer shortcut. |
| US-084 | Parent | Must | Pilot | L-01 | Give explicit consent for my under-13 child's data collection. |
| US-085 | Platform | Must | Pilot | L-03 | Default engagement-telemetry collection to high-privacy settings. |
| US-086 | Parent | Must | Phase 2 | L-02 | Request deletion of my child's data. |
| US-087 | Content Admin | Must | Pilot | M-01 | Manage the specification/topic tree per qualification/board/subject as specs change. |
| US-088 | Content Admin | Must | Pilot | M-02 | Maintain each board's style profile (question wording, mark scheme format). |
| US-089 | Content Admin | Must | Pilot | E-01 | Work through the queue of AI-generated questions that failed automated QC, fix or reject them. |
| US-090 | Content Admin | Should | Phase 2 | M-03 | See all student "disagree with this mark" flags in one place to spot systemic marking issues. |
| US-091 | Content Admin | Must | Pilot | M-04 | Track which subjects/boards/qualifications still need spec-point-level tagging completed. |
| US-092 | Parent | Won't (yet) | Deferred | N-01 | Browse and book a 1:1 tutor as an add-on to my subscription. |
| US-093 | Tutor | Won't (yet) | Deferred | N-02 | Create a profile and set my availability/subjects so parents can find and book me. |
| US-094 | Tutor | Won't (yet) | Deferred | N-03 | See a student's AI-tracked mastery data, with permission, before a session so I can target it efficiently. |
| US-095 | Teacher | Must | Pilot | O-01 | Manage a class of students and assign topics/homework. |
| US-096 | School Admin | Must | Pilot | O-02 | See a class-level dashboard of mastery and engagement. |
| US-097 | School Admin | Must | Pilot | O-03 | Confirm the platform aligns with our KCSIE filtering/monitoring policy before school-premises use. |
| US-098 | Parent | Should | Phase 2 | P-01 | Search a help centre/FAQ to self-serve common questions. |
| US-099 | Parent | Could | Phase 2 | P-02 | Use live chat for a quick answer to an account/billing issue. |
| US-100 | Parent | Must | Pilot | B-10 | Verify my email with a code before adding a child — so that the account is provably mine before any child data |
| US-101 | 11+ learner | Must | Pilot | B-11 | Log in with a picture PIN instead of an email and password — so that I can start practising without an adult t |
| US-102 | Parent, student or teacher | Must | Pilot | Shell-09 | Log in on the web, reset my password and use Google or Microsoft sign-in — so that I can get back into my acco |
| US-103 | Staff member, reviewer or school admin | Must | Pilot | Shell-09 | Be required to use two-step verification — so that privileged access to learner data is protected. |
| US-104 | Visitor | Must | Pilot | Shell-10 | Read plain-English terms, privacy and AI-data pages and choose which cookies to allow — so that I understand h |
| US-105 | Platform | Must | Pilot | L-05 | Confirm the paying account holder is an adult using a swappable method — so that we meet OSA age-assurance dut |
| US-106 | Parent | Must | Pilot | C-08 | Get a reminder before my free trial ends and cancel in two clicks — so that I'm never charged by surprise. |
| US-107 | Parent | Must | Pilot | C-09 | Be told when a payment fails and update my card while my child keeps access — so that a card problem doesn't i |
| US-108 | Parent with more than one child | Should | Pilot | C-10 | See one bill for all children and download invoices — so that I can manage family costs in one place. |
| US-109 | Student | Must | Pilot | D-11 | See my mock paper result broken down by topic with a targeted drill — so that I know exactly where marks were  |
| US-110 | Chemistry student | Must | Pilot | D-12 | Write equations with state symbols, give numeric answers with units and significant figures, and open a period |
| US-111 | Content team member | Must | Pilot | E-02 | Author questions with mark schemes and import past papers with spec tags and licence status — so that the bank |
| US-112 | Content team member | Must | Pilot | E-01 | See only generated questions that fail automated quality checks — so that human effort is spent on exceptions, |
| US-113 | A-Level student | Must | Phase 2 | F-09 | See my AI mark labelled provisional with review status and expected turnaround — so that I know the mark will  |
| US-114 | A-Level reviewer | Must | Phase 2 | F-05 | Confirm or adjust the AI mark using its marking trail, without seeing the student's identity — so that every A |
| US-115 | Operations reviewer | Must | Pilot | F-10 | Resolve only GCSE/iGCSE answers that were low-confidence, where two marking passes disagreed, or that a studen |
| US-116 | Parent | Must | Pilot | H-09 | Switch voice and chat on or off, set time limits and quiet hours, and read my child's AI tutor conversations — |
| US-117 | Parent | Must | Pilot | H-10 | See my children's progress and reports in the mobile app — so that I can check in without a laptop. |
| US-118 | Parent / student | Must | Pilot | J-06 | Give separate consent for voice, and see clear microphone and connection errors with a text fallback — so that |
| US-119 | Teacher | Must | Pilot | O-04 | Set adaptive homework for a class with due dates and track completion — so that the platform fits how I alread |
| US-120 | Teacher | Must | Pilot | O-05 | See a class misconception heatmap and drill into any pupil — so that I can target re-teaching where it matters |
| US-121 | School admin | Must | Pilot | O-06 | Import pupils and classes from our MIS or a CSV and enable Google/Microsoft SSO — so that onboarding a whole s |
| US-122 | School business manager | Must | Pilot | O-07 | Sign the DPA online and pay by invoice and purchase order — so that we can buy through normal school procureme |
| US-123 | Support agent | Must | Pilot | P-03 | Look up an account, issue a refund or send a password reset without seeing learning content — so that I can he |
| US-124 | Compliance lead | Must | Pilot | P-04 | See an append-only log of every privileged action — so that we can evidence who did what to whose data. |
| US-125 | Product owner | Must | Pilot | Q-01 | See marking accuracy against the examiner-marked gold set by board and question type — so that we can prove th |
| US-126 | Data protection lead | Must | Pilot | Q-02 | Verify that no personal data reaches any AI vendor and review every redaction — so that our AI data boundary i |
| US-127 | AI engineer | Must | Pilot | Q-03 | Version prompts and promote one only when it beats the live version on the gold set — so that marking quality  |
| US-128 | Business owner | Should | Pilot | Q-04 | See AI cost per active student broken down by task — so that the subscription price stays profitable with voic |
| US-129 | Safeguarding lead | Must | Pilot | Q-05 | Review AI safety-classifier flags and escalate concerns to the DSL — so that risks raised in AI conversations  |
| US-130 | Product owner | Won't (MVP) | Phase 2 | D-08, K-01, Shell-01 | Hold badges, streaks and XP back to Phase 2 and remove them from MVP screens — so that the MVP matches the cli |
