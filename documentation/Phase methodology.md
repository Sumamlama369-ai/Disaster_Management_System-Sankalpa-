# Phase Methodology — Disaster Management System

This document describes the phased development methodology followed during the construction of the Disaster Management System — a role-based, map-centric, AI-augmented platform for citizen incident reporting, drone permit regulation, officer dispatch, live surveillance, and nationwide admin oversight, built on FastAPI + React + PostgreSQL + Firebase + YOLOv8.

The methodology is an iterative hybrid of the **Waterfall** (for upfront design artifacts — database schema, role model, API surface) and **Agile / Incremental** (for per-module build-test-refine loops). Each phase produced concrete artifacts that fed into the next phase.

---

## 3.3 Phases of Methodology

### 3.3.1 Overview of Development Phases

The project was executed across **six sequential but overlapping phases**. Earlier phases produced the scaffolding (database schema, role model, authentication) that later phases extended with feature modules. Each phase delivered a working, demonstrable increment of the system.

| # | Phase | Primary Output | Key Artifacts |
|---|---|---|---|
| 1 | Requirement Gathering & Problem Understanding | Problem statement, stakeholder map, functional/non-functional requirements | Role definitions (citizen/officer/admin), feature list |
| 2 | Planning & Feasibility Analysis | Scope document, resource plan, timeline, feasibility report | Technology selection, external-service shortlist |
| 3 | System Design | Architecture diagram, UML (use-case, sequence, class), ER diagram, API contract | `app/models/`, `app/schemas/`, route plan |
| 4 | Prototype / Module Development | Working modules (10 core modules) | `app/api/v1/endpoints/`, `app/services/`, `frontend/src/pages/` |
| 5 | Testing & Refinement | Test plans, accuracy reports, bug fixes, UX polish | `documentation/testing_plan.md`, `nlp_accuracy_test.md`, `scraping_accuracy_test.md` |
| 6 | Final Integration & Documentation | Integrated production build, documentation suite | `Dockerfile`, `docker-compose.yml`, this documentation folder |

The phases **overlap deliberately**: for example, Phase 4 (module development) began before Phase 3 (design) finished for all modules, because the Authentication module's schema had to stabilize before any other module could build on top of it. Phase 5 (testing) ran continuously from the first working module onward.

---

### 3.3.2 Phase 1: Requirement Gathering and Problem Understanding

**Goal**: establish *what* the system must do and *why*, before making any technical commitment.

#### 3.3.2.1 Initial Idea Refinement

The original concept — a "drone-assisted disaster response app" — was intentionally broad. The team refined it through three rounds of narrowing:

1. **First narrowing** — from "generic disaster app" to "disaster response platform for Nepal", because Nepal's combination of earthquake, landslide, and flood risk plus limited digital infrastructure made the problem concrete and locally useful.
2. **Second narrowing** — from "disaster platform" to "three-role platform (citizen + officer + admin)", after identifying that the operational chain of command required strict separation of capabilities.
3. **Third narrowing** — from "drone dispatch only" to "drone dispatch + citizen reporting + AI intelligence + SMS alerting + weather advisory", because during interviews it became clear that without citizen reports and public alerting, the drone workflow had no trigger and no closing loop.

The refined concept was documented as: *"A single platform where a citizen can report an incident, an officer can see it live and respond with a drone, and an admin can oversee nationwide operations with AI support."*

#### 3.3.2.2 Problem Identification

Five concrete problems were identified as the motivating pain points:

1. **No digital channel for citizen incident reporting** — existing reporting relied on phone calls, with no geolocation, no photo evidence, and no audit trail.
2. **Manual, paper-based drone permit process** — Nepal's existing permit workflow required in-person submissions and had no digital tracking, delaying emergency drone use.
3. **Fragmented officer tooling** — officers used a mix of phone, paper, and ad-hoc spreadsheets, with no unified view of pending incidents or dispatched drones.
4. **No systematic ingestion of disaster signals from social media** — global early-warning indicators (e.g. neighbouring-country earthquakes) were not being aggregated.
5. **No unified public alert channel** — SMS alerts to affected districts required separate, disconnected systems and manual recipient lists.

These five problems directly shaped the five primary feature areas of the final system.

#### 3.3.2.3 Stakeholder Understanding

Three stakeholder classes were identified, corresponding directly to the three system roles:

| Stakeholder | Real-world Counterpart | Core Need |
|---|---|---|
| **Citizen** | General public affected by or witnessing a disaster | A fast, low-friction way to report incidents with evidence, and to know help is coming |
| **Officer** | NDRF / Fire Department / Police responder | A live operational view, ability to triage, assign, and dispatch resources (including drones) |
| **Admin** | Government / central disaster-management authority | System-wide oversight, user control, broadcast alerting, analytics, no-fly zone regulation |

Secondary stakeholders included drone operators (who submit permits), field devices (drones broadcasting GPS), and external services (Google OAuth, Gmail, Aakash SMS, Hugging Face, Firebase, Reddit).

#### 3.3.2.4 Requirement Collection

Requirements were captured in two categories:

**Functional requirements** — 12 feature areas:
1. Google-OAuth authentication with Gmail OTP verification.
2. Role-based access control (citizen/officer/admin) with code-gated elevation.
3. Citizen disaster reporting with GPS, severity, type, and media attachments.
4. Real-time status tracking with an immutable audit trail.
5. Drone permit submission, review, and approval workflow.
6. Officer Command Center with live Leaflet map of Nepal.
7. Drone deployment with Firebase-based live GPS tracking.
8. Video upload and YOLOv8 object detection / segmentation.
9. Live IP-camera surveillance with YOLO overlay.
10. Reddit-based disaster intelligence dashboard (NLP-processed).
11. SMS alerting via Aakash SMS (single / bulk / broadcast).
12. AI-powered weather advisory via Hugging Face LLM.

**Non-functional requirements**:
- **Security**: dual-mode auth (JWT + session cookie), role enforcement at both frontend and backend.
- **Real-time**: sub-second latency for notifications and drone telemetry.
- **Scalability**: modular backend with independent services, containerized deployment.
- **Auditability**: every disaster-report status change and permit review is permanently logged.
- **Localization**: Nepal-specific address hierarchy (province / district / municipality / ward), Nepali phone-number format, Nepal boundary GeoJSON.
- **Portability**: deployable via `docker-compose` on any Docker host.

---

### 3.3.3 Phase 2: Planning and Feasibility Analysis

**Goal**: confirm that the requirements are buildable with available time, people, and tools — and commit to a specific technology stack.

#### 3.3.3.1 Scope Definition

The scope was fixed as a **web-based MVP** (not mobile-native) covering all 12 functional requirements, with the following explicit in-scope and out-of-scope boundaries:

**In scope**:
- Browser-based SPA for all three roles.
- Single-region deployment (Nepal).
- English-language UI.
- Real-time drone GPS via Firebase.
- Uploaded video analysis (not real-time drone video).
- IP-camera live surveillance with YOLO overlay.

**Out of scope** (explicitly deferred):
- Native iOS / Android apps.
- Multi-language UI (Nepali localization).
- Drone autonomous flight control (the system reads telemetry only; it does not fly the drone).
- Payment processing for permits.
- SMS replies / two-way SMS conversations.

#### 3.3.3.2 Resource Planning

The stack was chosen with **cost, team familiarity, and deployment simplicity** as the primary criteria:

| Resource | Choice | Rationale |
|---|---|---|
| Backend framework | FastAPI 0.115 | Async-native, automatic OpenAPI docs, Pydantic validation |
| Database | PostgreSQL + SQLAlchemy 2.0 | ACID, `DECIMAL(10,8)` for exact geospatial precision, `CheckConstraint` for enum validation |
| Frontend framework | React 19 + Vite 7 | Component-driven, fast HMR, large ecosystem |
| Styling | TailwindCSS 3 + framer-motion | Utility-first, consistent design system |
| Real-time telemetry | Firebase Realtime DB | Sub-second latency, no pub/sub server to maintain |
| Real-time notifications | WebSocket (FastAPI) | Native support, channel pub/sub in `ws_manager.py` |
| CV model | YOLOv8 nano (`ultralytics`) | ~6 MB weights, deployable on modest hardware, COCO-pretrained |
| NLP | spaCy `en_core_web_sm` + TextBlob | Lightweight NER + sentiment, no external API cost |
| LLM (weather advisory) | `deepseek/deepseek-v3-0324` via Hugging Face Inference Router | Free tier available, strong reasoning on structured prompts |
| SMS gateway | Aakash SMS v3 | Nepal-local provider with reliable delivery |
| Auth | Google OAuth 2.0 + Gmail OTP | No password management, free email delivery |
| Deployment | Docker + docker-compose + Nginx | Single-command deploy, reproducible environment |

Human resources were a small team with full-stack responsibilities — one primary developer covering backend + frontend + ML integration, supported by code review.

#### 3.3.3.3 Time Planning

The project was planned across roughly six milestones, each producing a working demo:

1. **M1 — Auth spine**: registration, OTP, Google OAuth, role selection, JWT + session cookie, protected routes.
2. **M2 — Citizen reporting + officer triage**: `DisasterReport` CRUD, CommandCenter map, PATCH status flow.
3. **M3 — Drone permit**: full permit form with 4 file uploads, officer review, ZIP download.
4. **M4 — AI modules**: YOLOv8 video upload, YOLOv8 live WebSocket, Reddit scraper + NLP, LLM weather advisory.
5. **M5 — Drone dispatch + Firebase**: `DroneDeployment` table, Firebase live GPS, mission FSM, 3D visualization.
6. **M6 — Admin + polish**: user management, admin analytics, SMS broadcast, no-fly zones, UI refinement, documentation.

Each milestone closed with a demo and a round of test-plan updates under [documentation/](./).

#### 3.3.3.4 Feasibility Considerations

Four feasibility dimensions were evaluated:

- **Technical feasibility** — confirmed by building a minimal auth + reporting prototype in week 1, verifying that FastAPI + React + Postgres + Firebase interoperated cleanly.
- **Economic feasibility** — total external-service cost targeted at zero or near-zero for the MVP: Google OAuth is free, Gmail SMTP is free, Hugging Face has a free inference tier, Firebase has a free Spark plan, Reddit's public JSON is free. Only Aakash SMS incurs per-message cost, scoped to admin broadcasts only.
- **Operational feasibility** — confirmed that officers would accept a web-based Command Center because the existing phone-based workflow had obvious gaps; and that citizens with smartphones could use the geolocation + camera features without special training.
- **Legal / compliance feasibility** — the permit form was modelled on Nepal's existing paper drone permit (drone specs + operator identity + address + documents + rule agreement), so digitizing it preserves the regulatory structure rather than replacing it. SMS alerting was restricted to admin to prevent abuse.

---

### 3.3.4 Phase 3: System Design

**Goal**: produce the blueprints — architecture, UML, UI wireframes, and database schema — before writing feature code.

#### 3.3.4.1 Architectural Design

A **3-layer + sidecar** architecture was chosen:

```
┌──────────────────────────────────────────────────────┐
│  Presentation: React 19 SPA (Vite, Tailwind)         │
│  — served by Nginx in production                     │
└──────────────┬───────────────────────────────────────┘
               │ REST (axios) + WS (native) + Firebase SDK
┌──────────────▼───────────────────────────────────────┐
│  Application: FastAPI (Uvicorn, ASGI)                │
│  ├── /api/v1/* REST routers                          │
│  ├── /api/v1/ws notification WebSocket               │
│  ├── /api/v1/realtime/detect YOLO streaming WS       │
│  └── Services: auth, otp, gmail, ws_manager,         │
│                yolo, nlp, reddit, session, oauth     │
└──────┬───────────────────────────┬───────────────────┘
       │                           │
┌──────▼──────────────┐    ┌───────▼───────────────────┐
│ Data: PostgreSQL    │    │ Sidecar: Firebase RTDB    │
│ + SQLAlchemy 2.0 +  │    │ (drone GPS / sensors)     │
│ uploads/ filesystem │    │                            │
└─────────────────────┘    └───────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│ External: Google OAuth, Gmail, Aakash SMS,          │
│           Hugging Face (deepseek-v3), Reddit JSON   │
└─────────────────────────────────────────────────────┘
```

The key architectural decisions were:

- **Separate the system of record (Postgres) from high-frequency telemetry (Firebase)**: Firebase handles sub-second drone GPS updates without burdening Postgres with write amplification; the backend periodically syncs snapshots into `drone_deployments` for durability.
- **Two WebSocket channels, not one**: a lightweight notification socket for state changes (`reports`, `permits`, etc.) and a separate heavy binary socket for YOLO video streaming, so that video traffic cannot starve notifications.
- **All AI runs in-process**: YOLOv8 and spaCy/TextBlob run inside the FastAPI process rather than as separate microservices, reducing operational complexity at the cost of scaling flexibility — acceptable for an MVP.
- **External services are isolated in dedicated service modules** (`gmail_service.py`, `google_oauth_service.py`, `reddit_service.py`, etc.) so they can be swapped or mocked during testing.

#### 3.3.4.2 UML and Process Design

Three categories of UML / process diagrams were produced:

**Use-case diagrams** — one per role:
- *Citizen*: submit report, attach media, track my reports, apply for permit, track my permits, upload video for analysis, view weather, view Reddit dashboard.
- *Officer*: all citizen actions + view all reports on map, triage report status, assign to self, deploy drone, review permits, live surveillance.
- *Admin*: all officer actions + manage users, view system analytics, broadcast SMS, configure weather, manage no-fly zones, 3D drone view.

**Sequence diagrams** — one per critical workflow:
- *Registration + OTP*: SPA → `POST /register` → OTP generated + hashed → Gmail SMTP → user enters OTP → `POST /verify-otp` → JWT + session cookie issued.
- *Disaster report + dispatch*: citizen `POST /reports` → DB insert → WebSocket `new_report` broadcast → officer PATCH status → `disaster_report_status_history` row → SMS fired + WebSocket `status_updated` broadcast.
- *Drone mission*: officer deploy action → `DroneDeployment` row → drone writes to Firebase → Firebase pushes to all subscribers → backend syncs `last_known_*` to Postgres → officer progresses mission FSM.
- *Video analysis*: `POST /video/upload` → `BackgroundTasks` scheduled → OpenCV reads frames → YOLOv8 predicts → annotated frames written → status `completed`.

**Class diagrams** (via the SQLAlchemy models in `app/models/`):
- `User ⟷ DronePermit` (1:N)
- `User ⟷ DisasterReport` (1:N as reporter, 1:N as assigned officer)
- `DisasterReport ⟷ DisasterReportImage` (1:N, cascade delete)
- `DisasterReport ⟷ DisasterReportStatusHistory` (1:N, cascade delete)
- `DisasterReport ⟷ DroneDeployment` (1:N, cascade delete)
- `DisasterPost ⟷ DisasterInsight` (1:1)

**State machines**:
- Report status: `PENDING → REVIEWING → DISPATCHED → RESCUING → RESOLVED` (or `REJECTED` at any stage).
- Mission status: `DEPLOYED → EN_ROUTE → ON_SITE → RETURNING → COMPLETED` (or `ABORTED`).
- Permit status: `PENDING → APPROVED` or `PENDING → REJECTED` (terminal — one-shot review).

#### 3.3.4.3 Interface Planning

The SPA was planned around **role-specific dashboards** accessed after login:

- **Citizen**: CitizenDashboard → DisasterReport, MyDisasterReports, DronePermitForm, MyPermits, VideoAnalysis, NepalWeather, IncidentWeather.
- **Officer**: OfficerDashboard → CommandCenter (live map), PermitReview, LiveSurveillance, LiveDashboard (Reddit intel), VideoAnalysis.
- **Admin**: AdminDashboard → AdminAnalytics, UserManagement, DisasterAlertSMS, AdminWeather, NoFlyZone, DroneVisualization (3D) + everything officers can see.

Common components shared across dashboards: `Navbar` (role-aware menu), `ProtectedRoute` wrapper, `GoogleLoginButton`. A unified design language was set: Tailwind utility classes, framer-motion transitions, `react-hot-toast` for feedback, severity-colored markers (CRITICAL `#dc2626`, HIGH `#ea580c`, MEDIUM `#d97706`, LOW `#0284c7`).

The map was planned with **five tile layers** (Positron / Street / Satellite / Terrain / Dark) switchable by the officer, plus a Nepal-boundary GeoJSON overlay from `data/map.json` and pulsing radar animation for active markers.

#### 3.3.4.4 Database Design

Eleven tables were designed across three domain groups, with foreign keys and `CheckConstraint`s enforcing integrity at the storage layer (not just the app layer):

**Auth / user domain**:
- `user` — Google-OAuth identity + role + verification + profile.
- `otp` — hashed OTP, expiry, attempt counter.
- `user_session` — server-side sessions with sliding expiry.

**Disaster reporting domain**:
- `disaster_reports` — core report with `DECIMAL(10,8)` latitude / `DECIMAL(11,8)` longitude, severity enum, status enum.
- `disaster_report_images` — cascade-linked media with mime/size/dimensions/display_order.
- `disaster_report_status_history` — immutable audit log of every status change.
- `drone_deployments` — mission records with FSM status, Firebase sync columns, flight metrics.

**Permit domain**:
- `drone_permit` — 30+ columns spanning drone specs, operator identity, Nepal address hierarchy, document paths, officer review fields.

**Intelligence domain**:
- `disaster_post` — raw Reddit posts keyed by Reddit post ID.
- `disaster_insight` — NLP-processed output per post (type, severity, sentiment, urgency, location, keywords).
- `disaster_stats` — time-series aggregates for dashboard widgets.

`CheckConstraint`s enforce severity ∈ {LOW/MEDIUM/HIGH/CRITICAL}, status ∈ {PENDING/REVIEWING/DISPATCHED/RESOLVED/REJECTED}, and mission status ∈ {DEPLOYED/EN_ROUTE/ON_SITE/RETURNING/COMPLETED/ABORTED} directly at the database level.

---

### 3.3.5 Phase 4: Prototype / Module Development

**Goal**: build the ten core modules one by one, each fully functional and independently testable, then integrate them.

#### 3.3.5.1 Initial Prototype Development

The first working prototype (week 1) was minimal but end-to-end:

- A single FastAPI app with `/register`, `/verify-otp`, `/login`.
- A single React page with Google login + OTP entry.
- A Postgres database with just the `user` and `otp` tables.
- No Docker yet — local `uvicorn` and `vite dev`.

This prototype proved the **cross-stack plumbing** worked: the SPA could authenticate against the backend, the backend could email OTPs via Gmail, and sessions persisted across reloads. Once this spine was stable, every subsequent module plugged into it.

#### 3.3.5.2 Module-Wise Feature Development

The ten modules were then developed in dependency order:

1. **Authentication & User Management** — expanded from the prototype to include role selection, organization-code validation (NDRF/Fire/Police), master admin code, session management with sliding expiry, user CRUD endpoints.
2. **Disaster Reporting** — `disaster_reports` table, CRUD endpoints, Pydantic validation (severity enum, lat/long bounds, description length), image upload (JPEG/PNG/WebP, ≤10 MB) and video upload (MP4/WebM/MOV/AVI, ≤50 MB), status history table.
3. **Command Center & Dispatch** — Officer-only triage endpoints, Leaflet-based map page, WebSocket notification channel via `ws_manager.py`, drone deployment table with mission FSM.
4. **Drone Permit** — the largest single form in the system; multipart file uploads (4 documents), officer review endpoint with one-shot approve/reject, ZIP download for reviewers.
5. **Video Analysis** — YOLOv8 integration via `ultralytics`, two modes (detection + segmentation), OpenCV frame-by-frame processing, `BackgroundTasks` queuing, progress polling endpoint.
6. **Real-Time Surveillance** — WebSocket streaming endpoint with query-param auth (`token`, `confidence`, `ip_cam_url`, `use_webcam`), alternating JSON / binary JPEG frames at 15 FPS, `CAP_PROP_BUFFERSIZE=1` for low latency.
7. **NLP Disaster Intelligence** — Reddit scraper across 43 subreddits with 3-second delays, spaCy + TextBlob processing pipeline, 12-class disaster taxonomy with severity weights, six dashboard endpoints.
8. **SMS Alerting** — Aakash SMS v3 integration, phone normalization (strip `+977`/`977`, enforce 10-digit), single/bulk/broadcast endpoints (admin-only), automatic SMS hook on report status change.
9. **Weather Advisory** — Hugging Face `deepseek/deepseek-v3-0324` integration, structured input schema, four-section parsed output (`RECOMMENDATION / RISK_LEVEL / KEY_CONCERN / ACTION`).
10. **Analytics & Visualization** — `/api/v1/users/admin/stats` aggregation endpoint, seven charting libraries wired into AdminAnalytics (Recharts, Chart.js, ECharts, Plotly, Nivo, Leaflet, three.js), PDF/CSV export via `jspdf` + `file-saver`.

Each module was developed in a tight inner loop: model → schema → endpoint → React page → manual test → documentation stub.

#### 3.3.5.3 Integration of Components

Integration points were explicitly identified and tested:

- **Auth ↔ every module**: every protected endpoint uses `Depends(get_current_citizen|officer|admin)`. An integration test confirmed a citizen token cannot hit officer/admin endpoints.
- **Reporting ↔ SMS**: the PATCH report endpoint fires a background-thread SMS to the reporter on every status change.
- **Reporting ↔ WebSocket**: report creation and status changes emit `ws_manager.notify(...)` events so every Command Center updates live.
- **Dispatch ↔ Firebase**: drone deployment creates a Firebase listener; the backend syncs the latest GPS into Postgres periodically for durability.
- **Video ↔ YOLO**: the `BackgroundTasks` pipeline shares a single loaded YOLO model across detection, segmentation, and live streaming via `yolo_service.py`.
- **Reddit ↔ NLP ↔ Dashboard**: background task inserts `DisasterPost` rows, NLP processor produces `DisasterInsight`, dashboard endpoints aggregate both into `DisasterStats`.
- **Frontend router ↔ Role model**: the `ProtectedRoute` component reads the role from `AuthContext` and allows/redirects per page.

A dedicated integration pass at the end of Phase 4 ran through each user journey end-to-end in a browser, fixing coupling bugs as they surfaced.

#### 3.3.5.4 Iterative Improvement

Each module went through **at least two iteration cycles** after its initial build:

- **First iteration** delivered functional correctness.
- **Second iteration** added polish: loading states, error toasts, empty states, pagination, filters, and responsive layout.
- **Third iteration** (for select modules) added analytics instrumentation and export capability.

Iteration was tracked informally against the test-plan documents ([testing_plan.md](./testing_plan.md), [responsive_testing.md](./responsive_testing.md)) in the documentation folder.

---

### 3.3.6 Phase 5: Testing and Refinement

**Goal**: validate each module against its requirements, measure AI pipeline accuracy, and refine based on feedback.

#### 3.3.6.1 Early Validation

Validation began as soon as the first module was deployed:

- **Unit-level sanity checks** — Pydantic schemas automatically validate every incoming payload (lat/long bounds, enum membership, length constraints).
- **Database-level invariants** — `CheckConstraint`s enforce severity / status / mission-status enums at the storage layer, catching bugs that bypass app-level validation.
- **Manual end-to-end runs** — each milestone demo exercised the full user journey for the role that milestone targeted.
- **AI-pipeline accuracy tests** — dedicated tests under [nlp_accuracy_test.md](./nlp_accuracy_test.md) and [scraping_accuracy_test.md](./scraping_accuracy_test.md) measured NLP classification precision and Reddit-scraper reliability against known-good sample sets.
- **Classification-logic verification** — [classification_logic.md](./classification_logic.md) cross-checked that Reddit NLP, citizen reports, and video analysis used consistent vocabularies where they overlapped (e.g. the word `flood`).

#### 3.3.6.2 Bug Fixing and Optimization

Several categories of bugs surfaced during testing and were fixed systematically:

- **Authentication edge cases** — OTP replay prevention (OTP row consumed on success), OTP rate-limiting added (5 resends per hour per email), self-role-change blocked on the admin update endpoint to prevent lockout.
- **Concurrency bugs** — the automatic SMS on report status change originally blocked the PATCH response; this was fixed by moving it to a background thread.
- **Upload validation** — file size and mime-type checks tightened after test uploads of oversized and malformed files crashed the OpenCV pipeline.
- **WebSocket disconnection** — the YOLO streaming socket originally hung on IP-camera disconnect; added reconnect loop and `CAP_PROP_BUFFERSIZE=1` for lower latency.
- **Map rendering performance** — Leaflet initially re-rendered every marker on every WebSocket event; switched to keyed marker updates so only changed reports re-render.
- **Responsive layout issues** — documented in [responsive_testing.md](./responsive_testing.md); several dashboard cards were reflowed for mobile / tablet breakpoints.

Optimizations applied:
- **Shared YOLO model instance** across detection / segmentation / streaming, avoiding repeated cold loads.
- **Lazy-loaded dashboard pages** on the frontend via route-level code splitting.
- **Indexed columns** on hot query paths (`disaster_reports.status`, `.severity`, `.disaster_type`, `disaster_insight.urgency_level`).
- **WebSocket envelopes carry only `{channel, event}`**, not full records — clients re-fetch via REST, keeping the socket cheap.

#### 3.3.6.3 User Feedback-Based Refinement

Informal user feedback from early demos produced these UI / UX refinements:

- **Pulsing radar animation** on severity markers in the Command Center — originally static markers were hard to spot on a busy map; the radar pulse draws the eye to active incidents.
- **Fly-to-target camera animation** when an officer clicks a marker — replaced an abrupt jump with a smooth pan+zoom.
- **Five tile-layer switcher** (Positron / Street / Satellite / Terrain / Dark) — officers working at night preferred the Dark tile layer; satellite preferred for rural incidents.
- **Sankalpa-branded SMS template** — citizens didn't recognize plain status-update SMS as legitimate; adding the "Sankalpa Alert" prefix improved perceived authenticity.
- **Role-aware navbar** — initially showed all menu items with some grayed-out; refined to show only items the current role can actually use.
- **Filter + date-range picker on analytics** — documented in [filters_implementation.md](./filters_implementation.md) and [date_range_picker.md](./date_range_picker.md), added after admins asked for time-bounded views.
- **Location heatmap** on admin analytics — documented in [location_heatmap.md](./location_heatmap.md), added after testers wanted to see geographic concentration of incidents.
- **Timeline analysis view** — documented in [timeline_analysis.md](./timeline_analysis.md), showing incident volume over time.

---

### 3.3.7 Phase 6: Final Integration and Documentation

**Goal**: produce a deployable, documented system ready for handover and demonstration.

#### 3.3.7.1 Final System Integration

The final integration pass covered:

- **Docker containerization** — a single `Dockerfile` for the backend, the frontend shipped via its own `frontend/Dockerfile`, and `docker-compose.yml` at repo root orchestrating backend + frontend + Postgres with a shared network.
- **`.dockerignore`** configured to exclude `venv/`, `node_modules/`, `uploads/` runtime artifacts, and secrets.
- **Nginx configuration** (`frontend/nginx.conf`) to serve the built SPA and proxy `/api/*` calls to the backend.
- **Environment configuration** consolidated into a single `.env` file loaded via `pydantic-settings`; all external credentials (Google, Gmail, Aakash, Hugging Face, Firebase, organization codes, master admin code) live here and nowhere else.
- **Database bootstrap** — `Base.metadata.create_all(bind=engine)` runs on FastAPI lifespan startup, creating any missing tables. Versioned SQL migrations under [migrations/](../migrations/) handle schema changes for existing deployments.
- **Upload directory creation** at startup (`uploads/original`, `uploads/processed`, `uploads/detection_output`, `uploads/segmentation_output`, `uploads/disaster_images`, `uploads/permits`) so first-run deployments don't fail on missing paths.
- **Static file mount** at `/uploads` so the SPA can fetch processed media directly.
- **CORS** configured for both local development (`localhost:5173`) and Docker-networked deployment (`frontend:3000`).
- **Background task lifecycle** — the Reddit scraper starts on FastAPI startup (if `ENABLE_REDDIT_FETCHING=True`) and stops cleanly on shutdown via the lifespan context manager.

A final end-to-end smoke test ran every major user journey one last time on a clean Docker deployment.

#### 3.3.7.2 Final Review of Features

A feature-by-feature review confirmed every Phase-1 requirement was satisfied:

| Requirement | Delivered In | Status |
|---|---|---|
| Google OAuth + Gmail OTP | `auth.py`, `otp_service.py`, `gmail_service.py` | ✓ |
| Role-based access (citizen/officer/admin) | `dependencies/auth.py`, `ProtectedRoute.jsx` | ✓ |
| Citizen disaster reporting with GPS + media | `disaster_reports.py` endpoints + model + schema | ✓ |
| Immutable status audit trail | `disaster_report_status_history` table | ✓ |
| Drone permit workflow with 4 documents | `drone_permit.py` endpoints + model | ✓ |
| Officer Command Center with live map | `CommandCenter.jsx` + Leaflet + WebSocket | ✓ |
| Drone deployment with Firebase GPS | `drone_deployments` + `firebase.js` | ✓ |
| Uploaded video YOLOv8 analysis | `video.py` + `yolo_service.py` | ✓ |
| Live IP-camera YOLO streaming | `realtime.py` + `LiveSurveillance.jsx` | ✓ |
| Reddit NLP dashboard | `reddit_service.py` + `nlp_processor.py` + `disaster.py` | ✓ |
| SMS alerting (single / bulk / broadcast) | `sms.py` + Aakash integration | ✓ |
| AI weather advisory | `weather.py` + Hugging Face integration | ✓ |
| Admin user management + analytics | `users.py` + `UserManagement.jsx` + `AdminAnalytics.jsx` | ✓ |
| No-fly zones + 3D drone visualization | `NoFlyZone.jsx` + `DroneVisualization.jsx` | ✓ |

Non-functional requirements were reviewed similarly: dual-mode auth confirmed, sub-second notification latency measured, Docker deployment reproducible, all enums enforced at the DB layer, Nepal localization verified.

#### 3.3.7.3 Documentation Preparation

The documentation suite under [documentation/](./) was finalized to cover both technical and testing perspectives:

**Narrative documents**:
- [project_description.md](./project_description.md) — the system overview including what / why / who / how, role-based features, feature-by-feature breakdown, architecture, workflow, and full technology stack detail.
- [Phase methodology.md](./Phase%20methodology.md) — this file.
- [classification_logic.md](./classification_logic.md) — the classification vocabularies and pipelines across Reddit NLP, citizen reports, and video analysis.

**Testing / accuracy documents**:
- [testing_plan.md](./testing_plan.md) — overall test strategy.
- [nlp_accuracy_test.md](./nlp_accuracy_test.md) — NLP classification accuracy benchmarks.
- [scraping_accuracy_test.md](./scraping_accuracy_test.md) — Reddit scraper reliability tests.
- [responsive_testing.md](./responsive_testing.md) — responsive / multi-device testing results.

**Implementation deep-dives**:
- [filters_implementation.md](./filters_implementation.md) — analytics filters.
- [date_range_picker.md](./date_range_picker.md) — date-range UI component.
- [location_heatmap.md](./location_heatmap.md) — heatmap rendering details.
- [timeline_analysis.md](./timeline_analysis.md) — timeline analytics view.

**In-code documentation**:
- Automatic **OpenAPI / Swagger UI** at `/docs` (generated from FastAPI route signatures).
- Automatic **ReDoc** at `/redoc`.
- Type hints and Pydantic schemas throughout `app/schemas/` and `app/models/` serve as a living contract.

With documentation complete, Phase 6 closes the methodology. The system is deployed via `docker-compose up`, accessed through the browser, and every role — citizen, officer, and admin — has a clearly defined set of capabilities backed by verifiable code paths.
