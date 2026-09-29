# 19 · Mobile Phase Specification (native Swift / Kotlin — separate later phase)

**Status:** deferred by user decision (Cursor scope = backend + web + internal tools first). This document fixes what the backend/web must guarantee now so mobile is a straight add-on, and lists the mobile scope.

## What web/backend must guarantee from day 1
- Every learner/parent capability is an `/api/v1` endpoint (no server-rendered-only logic). Auth works with bearer tokens + refresh rotation (B-05).
- OpenAPI 3.1 is published and versioned; DTOs are stable; SSE endpoints have documented fallbacks (polling on `status` URLs) for mobile networks.
- Device registration `RPT-12` (OneSignal ids) and notification deep links (`notification.deep_link`) use route-agnostic ids, mapped to native screens.
- Photo endpoints accept HEIC/JPEG; client-side crop hints supported; server does EXIF strip.
- Voice: WebSocket protocol documented (`VOX-02`) with audio format Opus 16 kHz mono; reconnection semantics.
- Feature flags & entitlements via `/me` bootstrap.
- Store-policy prep: in-app purchase question — **decision needed** (Apple/Google may require IAP for digital subscriptions; Stripe-only checkout on iOS risks review rejection). Open item M-1 in 20.

## Native architecture (when the phase starts)
- iOS: Swift 5.10+, SwiftUI, async/await, URLSession + generated client (OpenAPI Generator), Keychain, AVAudioEngine for voice, VisionKit/AVCapture for camera, OneSignal SDK, XCTest + XCUITest.
- Android: Kotlin, Jetpack Compose, Retrofit/Ktor + generated client, EncryptedSharedPreferences, CameraX, OneSignal SDK, JUnit + Espresso/Compose tests.
- Shared design tokens exported from `tokens.json` to Swift/Kotlin (style-dictionary).
- Offline: local draft persistence for answers; queue-and-retry uploads.
- Accessibility: Dynamic Type / TalkBack, reduce motion, captions for voice.
- Child safety: picture-PIN flow, no third-party analytics SDKs in child mode, App Store Kids/Families policy review.

## Mobile screens (from the inventory — platform contains Mobile)
| ID | Screen | Platform | Priority / Phase | Backend endpoints (already built) |
|---|---|---|---|---|
| B-01 | Parent Sign-Up | Web + Mobile | Must / Pilot | 6 |
| B-02 | Add Child Profile | Web + Mobile | Must / Pilot | 5 |
| B-03 | Student Standalone Sign-Up | Web + Mobile | Should / Phase 2 | 5 |
| B-04 | Qualification / Board / Subject Selector | Web + Mobile | Must / Pilot | 7 |
| B-05 | Study Goal Setter | Web + Mobile | Must / Pilot | 3 |
| B-06 | Adaptive Diagnostic / Baseline Test | Web + Mobile | Must / Pilot | 5 |
| B-07 | Personalised Weekly Plan Reveal | Web + Mobile | Should / Phase 2 | 3 |
| B-08 | Parent Sets Target Grade | Web + Mobile | Must / Pilot | 3 |
| B-09 | Accessibility Preferences (Onboarding) | Web + Mobile | Should / Phase 3 | 2 |
| C-01 | Pricing Page | Web + Mobile | Must / Phase 2 | 3 |
| C-02 | Plan Subject Selector | Web + Mobile | Must / Pilot | 3 |
| C-03 | Free Trial Sign-Up / Card Capture | Web + Mobile | Must / Pilot | 4 |
| C-04 | Plan Comparison (What's Included) | Web + Mobile | Must / Phase 2 | 1 |
| C-05 | Upgrade / Downgrade / Change Subjects | Web + Mobile | Should / Phase 2 | 4 |
| C-06 | Micro-Subscription Purchase | Web + Mobile | Could / Phase 3 | 2 |
| C-07 | Referral Page | Web + Mobile | Could / Phase 3 | 2 |
| D-01 | Practice Question Screen | Web + Mobile | Must / Pilot | 13 |
| D-02 | Mock Paper Setup | Web + Mobile | Should / Phase 2 | 3 |
| D-03 | Mock Paper Sitting (Timed, Exam-Authentic Layout) | Web + Mobile | Should / Phase 2 | 6 |
| D-04 | 11+ Adaptive Entrance Test (No Skip/Back) | Web + Mobile | Could / Phase 3 | 4 |
| D-05 | Multi-Version Drill Request | Web + Mobile | Should / Phase 2 | 2 |
| D-06 | Photograph Completed Paper → Instant Score | Mobile (camera-first) | Should / Phase 2 | 3 |
| D-07 | Custom Mixed-Topic Quiz Builder | Web + Mobile | Could / Phase 2 | 4 |
| D-08 | Daily Micro-Goal Widget (Home Dashboard Tile) | Web + Mobile | Should / Phase 2 | 3 |
| D-09 | Wrong-Answers-Only Redrill Mode | Web + Mobile | Should / Phase 2 | 2 |
| D-10 | Target-Grade Adaptive Drill ("Keep Going Till Consistent") | Web + Mobile | Should / Phase 3 | 3 |
| D-12 | Chemistry Structured Answer Input | Web + Mobile | Must / Pilot | 2 |
| F-01 | Instant Marking Result | Web + Mobile | Must / Pilot | 4 |
| F-02 | Full Mark Scheme Reveal | Web + Mobile | Must / Pilot | 2 |
| F-03 | Self-Mark Mode | Web + Mobile | Could / Phase 2 | 3 |
| F-04 | "Disagree With This Mark" Flag | Web + Mobile | Must / Pilot | 2 |
| F-06 | Re-Explain Concept (Diagram / Worked Example) | Web + Mobile | Should / Phase 2 | 2 |
| F-07 | Socratic Explain-Back Chat | Web + Mobile | Should / Phase 2 | 6 |
| F-08 | Photo-of-Stuck-Question Walkthrough | Mobile (camera-first) | Could / Phase 3 | 2 |
| F-09 | A-Level Provisional Mark / In Review | Web + Mobile | Must / Phase 2 (A-Level go-live) | 3 |
| G-01 | Surprise Micro-Quiz Pop-Up | Web + Mobile | Should / Phase 2 | 3 |
| G-02 | Confidence Check Prompt | Web + Mobile | Should / Pilot | 2 |
| G-03 | Hint / Switch-Topic Nudge | Web + Mobile | Must / Pilot | 3 |
| G-04 | Frustration-Aware Tutor Response | Web + Mobile | Should / Pilot | 2 |
| H-01 | Parent Progress Dashboard | Web + Mobile | Must / Pilot | 6 |
| H-02 | Misconception Detail View | Web + Mobile | Should / Phase 2 | 2 |
| H-03 | Weekly AI Narrative Report | Web + Mobile + Email | Should / Phase 2 | 3 |
| H-04 | Predicted Grade Band | Web + Mobile | Could / Phase 2 | 1 |
| H-05 | Early-Warning Drift Alert | Web + Mobile | Should / Phase 3 | 2 |
| H-06 | Student Knowledge Map / Skill Tree | Web + Mobile | Could / Phase 3 | 3 |
| H-07 | Anonymised Cohort Benchmark | Web + Mobile | Could / Phase 3 | 1 |
| H-09 | Parent Controls & AI Transcripts | Web + Mobile | Must / Pilot | 7 |
| H-10 | Parent Home (mobile) | Mobile | Must / Pilot | 3 |
| I-01 | Flashcard Study Mode | Web + Mobile | Should / Phase 2 | 4 |
| I-02 | Custom Flashcard Builder | Web + Mobile | Could / Phase 2 | 2 |
| I-03 | Revision Notes Reader | Web + Mobile | Should / Phase 2 | 1 |
| I-04 | One-Page Cheat Sheet | Web + Mobile | Could / Phase 2 | 2 |
| I-05 | 2-Minute Knowledge-Check Quiz | Web + Mobile | Should / Phase 2 | 3 |
| I-06 | Share Deck / Quiz Set | Web + Mobile | Could / Phase 3 | 3 |
| J-01 | Voice Tutor Conversation | Web + Mobile | Must / Pilot | 7 |
| J-02 | Verbal Discussion Mode (English Lang/Lit) | Web + Mobile | Could / Phase 3 | 3 |
| J-03 | Accessibility Settings Panel | Web + Mobile | Should / Phase 3 | 2 |
| J-04 | Extended-Time Exam Simulation | Web + Mobile | Could / Phase 3 | 2 |
| J-05 | Simplified-Language Toggle | Web + Mobile | Could / Phase 3 | 2 |
| J-06 | Voice Consent & Error States | Web + Mobile | Must / Pilot | 4 |
| K-01 | Badges & Streaks (Mastery-Based) | Web + Mobile | Won't (MVP) / Phase 2 | 0 |
| K-02 | Daily Micro-Goal Opt-In Toggle | Web + Mobile | Should / Phase 3 | 2 |
| L-01 | Under-13 Parental Consent Flow | Web + Mobile | Must / Pilot | 5 |
| L-02 | Data Deletion Request | Web + Mobile | Must / Phase 2 | 5 |
| L-03 | Privacy / Data Settings (High-Privacy Defaults) | Web + Mobile | Must / Pilot | 3 |
| N-01 | Tutor Browse & Book | Web + Mobile | Won't (yet) / Deferred | 0 |
| N-02 | Tutor Profile & Availability Editor | Web + Mobile | Won't (yet) / Deferred | 0 |
| N-03 | Tutor's View of Student Mastery Data | Web + Mobile | Won't (yet) / Deferred | 0 |
| O-01 | Teacher Class Management | Web (+ Mobile view) | Must / Pilot | 9 |
| O-02 | School Admin Class Dashboard | Web (+ Mobile view) | Must / Pilot | 3 |
| P-01 | Help Centre / FAQ Search | Web + Mobile | Should / Phase 2 | 3 |
| P-02 | Live Chat Widget | Web + Mobile | Could / Phase 2 | 2 |
| Shell-01 | Student Home Dashboard | Web + Mobile | Must / Pilot | 6 |
| Shell-02 | Parent Home Dashboard | Web + Mobile | Must / Pilot | 4 |
| Shell-03 | Global Navigation / App Shell | Web + Mobile | Must / Pilot | 3 |
| Shell-04 | Login / Forgot Password / Auth | Web + Mobile | Must / Pilot | 8 |
| Shell-05 | Notifications Centre | Web + Mobile | Should / Phase 2 | 6 |
| Shell-06 | Account & Profile Settings | Web + Mobile | Must / Pilot | 9 |
| Shell-07 | Empty / Loading / Error States | Web + Mobile | Must / Pilot | 0 |
| Shell-08 | In-App Search | Web + Mobile | Should / Phase 2 | 1 |

**Mobile-first screens** (camera-first): D-06 photo→instant marking, F-08 photo-of-stuck; **mobile-only:** H-10 Parent Home (uses `RPT-01`, `RPT-05`, `RPT-07`).

## Mobile phase plan (outline)
M0 foundation & auth → M1 student practice/marking → M2 parent app → M3 voice & camera → M4 tutor/revision → M5 polish, store submission. Each mobile screen reuses the endpoint list in `docs/screens/*.md`; no new endpoints expected except push/deep-link helpers.
