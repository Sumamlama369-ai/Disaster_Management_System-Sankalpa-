# Implementation — Choices, Alternatives, and Rationale

This document accompanies [implementation.md](./implementation.md). Where that file records *what* was built, this one records *why* it was built that way. For every non-trivial decision the project faced, this document lists the alternatives that were considered, the option actually chosen, and the reason the choice fit this project.

Each subsection ends with an **Evidence** block listing the exact screenshot or code snippet that should be captured to support the claim in the final report.

> **Screenshot convention** — placeholders are `![Caption](../uploads/docs/<filename>.png)`. Code snippets referenced by `path:line-range` can be pasted into the report verbatim; the line numbers point to the live file so nothing goes stale.

---

## 3.7 Implementation

### 3.7.1 Introduction to Implementation

Implementation is the phase in which the design artefacts (system architecture, UML, ER diagram, hardware blueprint) became running software. The build followed a deliberate **feature-first, role-first incremental strategy**: Citizen was built and stabilised first, then Officer, then Admin; within each role, authentication was finished before reporting, reporting before real-time, and real-time before AI. Every feature was shipped only after it had been manually exercised on the Vite dev server and FastAPI's Swagger UI.

Two non-negotiables governed every decision made during implementation:

1. **Defence-in-depth** — every role-gated action must be enforced on the React router *and* on the FastAPI dependency.
2. **Auditability** — every state transition must append an immutable history row; nothing important is ever overwritten.

**Possibilities considered for development methodology**

| Option | What it would mean | Why rejected / accepted |
|---|---|---|
| Big-bang waterfall build | Finish all design, then build end-to-end in one push | Rejected — too many unknowns (Firebase latency, YOLO FPS, Aakash SMS quota). Incremental discovery was necessary. |
| Pure agile with user stories + sprints | Formal Jira board, sprint ceremonies | Rejected — solo / small-team project, overhead outweighed benefit. |
| **Feature-first incremental with spiking** (chosen) | Build one vertical slice (schema → API → UI) per feature, spike risky ones (YOLO, Firebase) early | Chosen — matched the [Phase methodology](./Phase%20methodology.md) described for the project; let risky integrations fail early. |

**Evidence to capture**
- **Screenshot** — Git commit history graph from GitHub showing incremental feature commits (`5de6aaa Enhanced UI design...`, `d9e3363 UI enhanced and update live location...`, `f113f19 testing plan`).
- **Code snippet** — [app/main.py:31-53](../app/main.py#L31-L53) showing lifespan startup that mirrors the incremental wiring: DB bootstrap → background tasks → yield → clean shutdown.

---

### 3.7.2 Development Environment Setup

#### 3.7.2.1 Software Setup

**Possibilities considered for the language / runtime combination**

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Django + DRF + Vue | Batteries included, admin panel free | Heavy, non-async, harder to fit YOLO + WebSockets | Rejected |
| Node.js (Express) + React | Single-language stack (JS everywhere) | Python ML ecosystem (YOLOv8, spaCy) would have to be bridged via subprocess | Rejected |
| Flask + React | Minimal, Pythonic | Async support is bolt-on, no built-in OpenAPI, no native WebSocket | Rejected |
| **FastAPI + React 19 + PostgreSQL** (chosen) | Native async, automatic OpenAPI at `/docs`, Pydantic validation, first-class WebSocket, matches the ML libs already needed | Two runtimes to manage (Python + Node) | **Chosen** |

| Component | Version | Why this version |
|---|---|---|
| Python | 3.11+ | Needed for `pydantic v2`, faster asyncio, and `ultralytics` compatibility |
| Node.js | 20.x LTS | LTS, required by Vite 7 + React 19 |
| PostgreSQL | 15 | `CheckConstraint`, `DECIMAL(10,8)` precision, mature geo support |
| Docker + Docker Compose | latest | Reproducible env for examiner + deployment |
| Git / GitHub | — | Public history of incremental development |

Pinned dependencies are proof the build is reproducible: [requirements.txt](../requirements.txt) lists `fastapi==0.115.0`, `sqlalchemy==2.0.35`, `ultralytics>=8.0.0`, `pydantic==2.9.2`, `python-jose[cryptography]==3.3.0`, `passlib[bcrypt]==1.7.4`, `spacy`, `textblob`, `psycopg2-binary`. Frontend dependencies in [frontend/package.json](../frontend/package.json) pin React 19, Vite 7, TailwindCSS 3, Leaflet, three.js, framer-motion, react-router-dom 7, `@react-oauth/google`, `firebase`, and the five charting libraries (Recharts, Chart.js, ECharts, Plotly, Nivo).

**Evidence to capture**
- **Screenshot** — Terminal running `python --version`, `node --version`, `psql --version`, `docker --version` side by side.
- **Screenshot** — `pip freeze` output compared to [requirements.txt](../requirements.txt) — proves pinning works.
- **Code snippet** — First 25 lines of [requirements.txt](../requirements.txt) and the `"dependencies"` block of [frontend/package.json](../frontend/package.json).

#### 3.7.2.2 Tools and Platforms Configuration

**Possibilities considered for secret management**

| Option | Why it would / wouldn't work |
|---|---|
| Hard-code secrets in source | Unsafe, leaks into Git |
| OS-level environment variables only | Hard to onboard new machines |
| AWS Secrets Manager / Vault | Overkill for a project-scale build |
| **`.env` file + `pydantic-settings`** (chosen) | Single source of truth, gitignored, typed, works in Docker and locally |

All credentials are typed in [app/core/config.py](../app/core/config.py): `DATABASE_URL`, `GOOGLE_CLIENT_ID/SECRET`, `GMAIL_APP_PASSWORD`, `JWT_SECRET_KEY`, `ORG_CODE_NDRF/FIRE/POLICE`, `MASTER_ADMIN_CODE`, `AAKASH_SMS_TOKEN`, `FIREBASE_*`, `HF_TOKEN`, `ENABLE_REDDIT_FETCHING`. Loading them through a typed settings class means an undefined variable fails at import time rather than at first request.

**Docker Compose** was chosen over stand-alone containers because the system has three processes (backend, frontend Nginx, PostgreSQL) that must talk on a shared network — Compose encodes that network topology declaratively.

**Evidence to capture**
- **Screenshot** — `.env` file opened in VS Code with values **redacted** (only the keys visible).
- **Screenshot** — `docker compose ps` showing `backend`, `frontend`, `postgres` services all healthy.
- **Code snippet** — [app/core/config.py](../app/core/config.py) `Settings` class (prove typed, prove `.env` loaded).
- **Code snippet** — [docker-compose.yml](../docker-compose.yml) services block.

#### 3.7.2.3 Initial Project Structure

**Possibilities considered for project layout**

| Layout | Pros / Cons | Decision |
|---|---|---|
| Monolith — everything in one Python package, Jinja templates for UI | Simpler dev server | No SPA, no component reuse — rejected |
| Separate repos for backend and frontend | Cleaner CI | Shared versioning / local dev harder — rejected |
| **Monorepo with `app/` + `frontend/`** (chosen) | One git history, one `docker-compose up`, still fully decoupled at runtime | Chosen |

The backend follows a **layered clean-architecture split**: `models/` (persistence) → `schemas/` (DTOs) → `services/` (business logic) → `api/v1/endpoints/` (HTTP handlers). This prevents the classic FastAPI anti-pattern of putting database calls inside route handlers.

**Evidence to capture**
- **Screenshot** — VS Code Explorer tree fully expanded showing the `app/`, `frontend/`, `documentation/`, `migrations/`, `uploads/` siblings.
- **Code snippet** — tree output (or the layout block from [project_description.md](./project_description.md)) annotated with what each folder is *for*.

---

### 3.7.3 Frontend Implementation

#### 3.7.3.1 User Interface Development

**Possibilities considered for the UI framework**

| Option | Reason for / against |
|---|---|
| Angular 17 | Heavier, TypeScript-first; team more comfortable in JSX |
| Vue 3 | Good DX but smaller ecosystem for Leaflet + three.js + charting libs |
| Next.js 14 (App Router) | SSR unnecessary — the app is behind auth, SEO irrelevant |
| **React 19 + Vite 7** (chosen) | Fastest HMR, biggest ecosystem for every library needed (Leaflet, three.js, Recharts, ECharts, Plotly, Nivo, framer-motion), works with `@react-oauth/google` out of the box |

**Why Vite over Create-React-App**: CRA is deprecated; Vite's esbuild-based dev server reloads in <50 ms versus 2-3 s for CRA, which matters during rapid UI iteration.

**Why TailwindCSS over styled-components / CSS Modules**: Tailwind is utility-first, so the 24 role-scoped pages share visual language without requiring a shared component library. Removes "where should this class live" debates and co-locates style with markup.

**Design language chosen**: glass-morphism cards, severity-colored chips, a left-aligned `Navbar`, and framer-motion page transitions. This visual consistency is deliberate — operators working under time pressure in a disaster must not be re-learning the UI per screen.

**Evidence to capture**
- **Screenshot** — Public landing page ([PublicPage.jsx](../frontend/src/pages/PublicPage.jsx)).
- **Screenshot** — Role selection page ([RoleSelection.jsx](../frontend/src/pages/RoleSelection.jsx)).
- **Screenshot** — Citizen dashboard ([CitizenDashboard.jsx](../frontend/src/pages/CitizenDashboard.jsx)).
- **Screenshot** — A glass-morphism card close-up (e.g. from DronePermitForm).
- **Code snippet** — a representative page file's JSX head (`<motion.div>` + Tailwind classes) — 15 lines from [CitizenDashboard.jsx](../frontend/src/pages/CitizenDashboard.jsx).

#### 3.7.3.2 Routing and Navigation

**Possibilities considered**

| Option | Why not |
|---|---|
| Server-side routing (FastAPI templates) | Requires full page reload on every navigation — wrong for a realtime command center |
| Hash-based routing | Breaks deep links, ugly URLs |
| **`react-router-dom v7` client-side routing with `<ProtectedRoute>` wrapper** (chosen) | Clean URLs, survives refresh, supports nested layouts, pairs with `AuthContext` for role guards |

The single entry point [frontend/src/App.jsx](../frontend/src/App.jsx) declares the full route table and mounts `<GoogleOAuthProvider>` and `<AuthProvider>` at the root so every descendant has access to identity and Google OAuth. Role-mismatched users are never shown a 404 — they are actively redirected to *their* dashboard by [ProtectedRoute.jsx](../frontend/src/components/ProtectedRoute.jsx), preventing confusing flashes of forbidden content.

**Evidence to capture**
- **Code snippet** — [frontend/src/App.jsx](../frontend/src/App.jsx) route table (the `<Routes>` block).
- **Code snippet** — [ProtectedRoute.jsx](../frontend/src/components/ProtectedRoute.jsx) — the full component, demonstrating the redirect logic.
- **Screenshot** — browser URL bar + page content side-by-side proving a citizen hitting `/command-center` is redirected to `/citizen/dashboard`.

#### 3.7.3.3 Role-Based Page Development

**Possibilities considered**

| Option | Why not |
|---|---|
| Single dashboard component with role-based conditionals | Becomes a 2000-line god component — maintenance nightmare |
| Hide UI elements with CSS on role mismatch | The element is still in the DOM / responds to API; not secure |
| **Separate page files per role + `ProtectedRoute` guard + backend 403** (chosen) | Defense in depth; pages stay small and self-contained |

Each role has its own dashboard tree: `CitizenDashboard`, `OfficerDashboard`, `AdminDashboard`. The `Navbar` renders different link sets based on `user.role` pulled from `AuthContext`. A citizen never even *sees* a "Command Center" link; even if they typed the URL, `ProtectedRoute` redirects them, and even if they bypassed the router, the API returns 403.

**Evidence to capture**
- **Screenshot** — Side-by-side of Citizen Navbar vs. Officer Navbar vs. Admin Navbar showing different link sets.
- **Code snippet** — [Navbar.jsx](../frontend/src/components/Navbar.jsx) role-based rendering block.
- **Screenshot** — Browser DevTools → Network tab showing a 403 response when a citizen hits an officer-only endpoint.

#### 3.7.3.4 Form Handling and Validation

**Possibilities considered**

| Option | Why not |
|---|---|
| `react-hook-form` | Extra dependency; for forms of this scope, controlled state suffices |
| Formik | Heavier; stale since 2021 |
| **Controlled React state + per-field `onChange` validators + server-side Pydantic safety net** (chosen) | Zero dependency, full control, and Pydantic re-validates anyway |

The most complex form is [DronePermitForm.jsx](../frontend/src/pages/DronePermitForm.jsx). It is a **multi-section form** because cramming drone specs + operator identity + address + four file uploads into one flat grid is cognitively unworkable — users consistently miss fields. Sectioning aligns with the three model groups in [app/models/drone_permit.py](../app/models/drone_permit.py).

Client-side validations implemented:
- **Email** — Gmail-only, because OTP delivery is Gmail SMTP.
- **Phone** — Nepali 10-digit after `+977`/`977` stripping (same logic echoed server-side in [sms.py](../app/api/v1/endpoints/sms.py)).
- **Latitude / longitude** — `−90..90` / `−180..180`, matching the Pydantic schema.
- **File type whitelists** — JPEG/PNG/WebP for images, PDF for docs.
- **File size ceilings** — ≤10 MB image, ≤50 MB video, ≤5 MB document.

Server-side Pydantic ([app/schemas/](../app/schemas/)) duplicates every check because **never trust the client**.

**Evidence to capture**
- **Screenshot** — DronePermitForm section 1 (drone specs) filled in.
- **Screenshot** — DronePermitForm file-upload section showing four file inputs and file-name previews.
- **Screenshot** — Validation error state — e.g., "File too large" toast when a 60 MB video is picked.
- **Screenshot** — DisasterReport ([DisasterReport.jsx](../frontend/src/pages/DisasterReport.jsx)) with GPS captured + photo preview.
- **Code snippet** — a validation function from [DronePermitForm.jsx](../frontend/src/pages/DronePermitForm.jsx) + the matching Pydantic validator in [app/schemas/drone_permit.py](../app/schemas/drone_permit.py).

#### 3.7.3.5 Dashboard and Visualization Features

**Possibilities considered for the charting library**

| Option | Why insufficient alone |
|---|---|
| Recharts only | Limited for heatmaps and geo |
| Chart.js only | No out-of-the-box heatmap |
| D3 from scratch | Development time prohibitive |
| **Five specialised libraries, each for its strength** (chosen) | Each chart uses the library whose abstraction fits best |

- **Recharts / Chart.js** — bar / line / pie in the admin KPI strip (lowest barrier).
- **ECharts (+ `echarts-extension-gmap`)** — geo-heatmaps and dense multi-series.
- **Plotly** — interactive drill-down.
- **Nivo** (`@nivo/calendar`, `@nivo/geo`, `@nivo/sankey`) — calendar heatmap + flow sankey.
- **Leaflet + react-leaflet** — 2D Nepal map (open-source tiles, no Google billing).
- **three.js** — 3D drone visualization in [DroneVisualization.jsx](../frontend/src/pages/DroneVisualization.jsx).

Export formats chosen: **PDF** via `jspdf` + `jspdf-autotable` and **CSV** via `file-saver`. PDF for officers in the field, CSV for analysts downstream.

**Evidence to capture**
- **Screenshot** — [AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx) showing multiple chart types simultaneously.
- **Screenshot** — [CommandCenter.jsx](../frontend/src/pages/CommandCenter.jsx) Leaflet map with severity-colored pulsing markers.
- **Screenshot** — [DroneVisualization.jsx](../frontend/src/pages/DroneVisualization.jsx) 3D scene in the browser.
- **Code snippet** — the severity color mapping (~lines 30–36 of [CommandCenter.jsx](../frontend/src/pages/CommandCenter.jsx)) showing the CRITICAL/HIGH/MEDIUM/LOW color codes.
- **Code snippet** — the CSS keyframes for the pulsing-radar animation (~lines 49–57 of CommandCenter.jsx).

---

### 3.7.4 Backend Implementation

#### 3.7.4.1 API Development

**Possibilities considered for API style**

| Style | Trade-off | Decision |
|---|---|---|
| GraphQL (Strawberry / Graphene) | Single endpoint, flexible queries | Overkill for a role-scoped API; file uploads clunky | Rejected |
| gRPC | Fast binary protocol | Browser clients need envoy; SPA doesn't benefit | Rejected |
| SOAP | — | Not even considered seriously | Rejected |
| **REST + WebSockets for realtime** (chosen) | Matches every consumer: SPA, Swagger docs, curl, future mobile | Each domain as its own router with a `/api/v1/<domain>` prefix | **Chosen** |

Ten routers mounted under `/api/v1/*` in [app/main.py:76-85](../app/main.py#L76-L85): `auth`, `users`, `permits`, `disasters`, `video`, `disaster-reports`, `realtime`, `sms`, `weather`, `ws`. The `/v1` versioning is deliberate — when the schema breaks, `/v2` can be added without removing `/v1`.

**Why FastAPI's automatic OpenAPI matters**: the examiner / stakeholders can exercise every endpoint in [Swagger UI at /docs](http://localhost:8000/docs) without writing a line of code. The schema is *derived from the Pydantic DTOs*, so drift between spec and behaviour is impossible.

**Evidence to capture**
- **Screenshot** — Swagger UI at `http://localhost:8000/docs` expanded showing all ten router groups.
- **Screenshot** — Swagger "Try it out" executing `POST /api/v1/auth/register` and returning 200.
- **Code snippet** — [app/main.py:76-85](../app/main.py#L76-L85) — the ten `include_router` calls.
- **Code snippet** — One representative endpoint with `Depends()` + `response_model` to show the declarative style (e.g. from [auth.py](../app/api/v1/endpoints/auth.py)).

#### 3.7.4.2 Business Logic Implementation

**Possibilities considered**

| Option | Why rejected |
|---|---|
| Put business logic directly in route handlers | Route handlers grow past 200 lines, impossible to unit test |
| Active Record pattern on models | Models become god objects; no separation of concerns |
| **Thin handlers + service layer in [app/services/](../app/services/)** (chosen) | Routes stay under 30 lines each; services are plain Python and trivially testable |

Services implemented:
- [auth_service.py](../app/services/auth_service.py) — registration, OTP triggering, org-code validation, login
- [otp_service.py](../app/services/otp_service.py) — 6-digit OTP, **bcrypt-hashed before DB insert**, 10-minute expiry, max 3 attempts
- [session_service.py](../app/services/session_service.py) — server-side session rows with sliding-window expiry
- [gmail_service.py](../app/services/gmail_service.py) — Gmail SMTP OTP delivery with branded HTML template
- [google_oauth_service.py](../app/services/google_oauth_service.py) — Google ID token verification
- [yolo_service.py](../app/services/yolo_service.py), [yolo_detector.py](../app/services/yolo_detector.py), [yolo_segmenter.py](../app/services/yolo_segmenter.py) — YOLOv8 wrappers
- [video_processor.py](../app/services/video_processor.py) — frame extraction + YOLO run + output stitching
- [reddit_service.py](../app/services/reddit_service.py) — Reddit JSON scraping
- [nlp_processor.py](../app/services/nlp_processor.py) — spaCy NER + TextBlob sentiment → disaster type / severity / sentiment / location / urgency / keywords
- [ws_manager.py](../app/services/ws_manager.py) — channel-based publish-subscribe
- [background_tasks.py](../app/services/background_tasks.py) — periodic Reddit scraping loop

**Why OTPs are bcrypt-hashed before storage**: a stolen DB dump otherwise leaks a user's OTP. Hashing treats an OTP like a password, even though it lives for only 10 minutes.

**Evidence to capture**
- **Code snippet** — [app/services/otp_service.py:15-36](../app/services/otp_service.py#L15-L36) — the `create_otp` method showing `hash_password` before `db.add`.
- **Code snippet** — [app/services/otp_service.py:38-74](../app/services/otp_service.py#L38-L74) — verify_otp showing expiry + attempts + constant-time verify.
- **Code snippet** — [app/services/ws_manager.py](../app/services/ws_manager.py) publish/subscribe methods.
- **Screenshot** — VS Code showing `app/services/` tree expanded with all fourteen service files.
- **Screenshot** — A Swagger call into an endpoint whose handler is <30 lines (e.g. `POST /api/v1/auth/register`) — demonstrates the "thin handler" claim.

#### 3.7.4.3 Authentication and Authorization Logic

**Possibilities considered for authentication**

| Option | Why not chosen alone |
|---|---|
| Username + password only | Phishing risk; citizens would forget passwords |
| Google OAuth only | Doesn't prove the user controls the Gmail inbox at the moment of signup |
| SMS OTP | Every OTP costs money via Aakash; reserved for disaster broadcasts |
| **Google OAuth 2.0 + Gmail OTP + JWT + server-side session cookie** (chosen) | OAuth identifies the user; Gmail OTP verifies the inbox is live; JWT is stateless for API / WS; session cookie is revocable |

**Why dual JWT + session cookie**: WebSockets and axios calls pass the `Bearer` JWT (stateless, good for horizontal scale); classic browser fetches use the `httponly` `session_id` cookie (immune to JS exfiltration, revocable). Every protected endpoint accepts **either** via the injector in [app/api/v1/dependencies/auth.py](../app/api/v1/dependencies/auth.py).

**Why three organization codes for officers**: `ORG_CODE_NDRF`, `ORG_CODE_FIRE`, `ORG_CODE_POLICE` are **per-agency** secrets. If one is compromised, only that agency's onboarding is affected — a single blanket code would be an all-or-nothing blast radius.

**Why `get_current_citizen` / `_officer` / `_admin` injectors return 403, not 404**: a 404 leaks nothing, but also tells an attacker the resource is *visible but forbidden*, which is more accurate. For a system that must be auditable, honest status codes matter more than obscurity.

**Role gate layering**:

1. Frontend redirect via `ProtectedRoute` (UX).
2. Backend dependency `get_current_<role>` (security boundary).
3. SQL-level `CheckConstraint` on enum fields (data integrity).

If all three fail, something has gone badly wrong.

**Evidence to capture**
- **Screenshot** — OTP email delivered in Gmail inbox, with timestamp visible.
- **Screenshot** — [OTPVerification.jsx](../frontend/src/pages/OTPVerification.jsx) screen with the 6 input boxes.
- **Code snippet** — [app/core/security.py](../app/core/security.py) JWT sign + verify functions.
- **Code snippet** — [app/api/v1/dependencies/auth.py](../app/api/v1/dependencies/auth.py) showing the "accept Bearer OR session cookie" fork and the three role injectors.
- **Code snippet** — [app/services/auth_service.py](../app/services/auth_service.py) org-code validation — show the `if org_code not in [NDRF, FIRE, POLICE]: raise 400` branch.
- **Screenshot** — DevTools Application tab showing the `httponly` `session_id` cookie set with `SameSite=Lax`.

#### 3.7.4.4 Database Connectivity and CRUD Operations

**Possibilities considered**

| Option | Reason against |
|---|---|
| Raw psycopg2 cursors | No type safety, SQL-injection risk if developer slips |
| SQLAlchemy 1.x classical style | Imperative, harder to read |
| Peewee | Smaller community, fewer FastAPI bindings |
| **SQLAlchemy 2.0 declarative ORM + `Depends(get_db)` scoped session** (chosen) | Typed models, composable queries, auto-rollback on exception |

The session dependency pattern in [app/database/database.py](../app/database/database.py) produces a **request-scoped** session. FastAPI calls `close()` after the response, so no connection leak is possible even on exceptions. Writes are committed only on the success path.

ORM models in [app/models/](../app/models/) use **`DECIMAL(10,8)` / `DECIMAL(11,8)` for latitude / longitude**. This is not cosmetic — `FLOAT` introduces drift of up to ~1 m at equator after two decades of arithmetic. For geofenced no-fly zones and drone dispatch, exact decimals matter.

**Cascade rules** — a user deletion must cascade to their sessions and OTPs but **must not** cascade to their disaster reports (those are historical evidence). This policy is encoded per-relationship in the models.

**Evidence to capture**
- **Code snippet** — [app/database/database.py](../app/database/database.py) showing engine + `SessionLocal` + `get_db` generator.
- **Code snippet** — [app/models/disaster_reports.py](../app/models/disaster_reports.py) showing a `DECIMAL(10,8)` column, a `CheckConstraint`, and a `relationship(..., cascade=...)`.
- **Screenshot** — pgAdmin showing a `disaster_reports` row with actual lat/lon values at 8-decimal precision.
- **Screenshot** — VS Code breakpoint hit inside an endpoint with `db` session visible in the Variables panel.

#### 3.7.4.5 Integration of External Services

Five external services were wired through dedicated modules so each can be mocked in tests and swapped without rippling changes:

| Service | Purpose | Why this vendor |
|---|---|---|
| Google OAuth 2.0 | identity | Free, ubiquitous, trusted |
| Gmail SMTP | OTP email | Free, reliable, already available via Google account |
| Aakash SMS v3 | bulk SMS to Nepali numbers | Nepal-domestic provider with 10-digit normalization support |
| Hugging Face Inference Router → `deepseek-v3-0324` | weather advisory LLM | Free inference tier, open-weights model, one-call JSON-style prompt |
| Reddit public JSON API | disaster intel source | No OAuth required for read-only JSON endpoints |

**Firebase is treated as a sidecar, not a service.** The backend does not proxy drone GPS through itself — field devices write directly to Firebase, the browser reads directly from Firebase. The backend only periodically **syncs** the latest snapshot into `drone_deployments.last_known_latitude / longitude / last_sync_at`. Rationale: Firebase latency is sub-second; a backend proxy would have been the slowest link in a time-critical chain.

**Evidence to capture**
- **Screenshot** — SMS received on a real phone, Sankalpa-branded template visible.
- **Screenshot** — Firebase Realtime Database console showing a `drones/{id}` node updating live.
- **Screenshot** — Hugging Face advisory response in Swagger UI, with `RECOMMENDATION / RISK_LEVEL / KEY_CONCERN / ACTION` all populated.
- **Code snippet** — [app/api/v1/endpoints/sms.py](../app/api/v1/endpoints/sms.py) phone normalization + Aakash v3 call.
- **Code snippet** — [app/api/v1/endpoints/weather.py](../app/api/v1/endpoints/weather.py) HuggingFace call with the prompt template.
- **Code snippet** — [frontend/src/firebase/firebase.js](../frontend/src/firebase/firebase.js) initialization.

---

### 3.7.5 Database Implementation

Full design lives in [database_design.md](./database_design.md); this section records implementation decisions.

#### 3.7.5.1 Schema Creation

**Possibilities considered**

| Option | Why not chosen alone |
|---|---|
| Alembic migrations only | Slow to iterate at project start when schema churns daily |
| Hand-written SQL DDL | No single source of truth; drift from ORM is inevitable |
| **`Base.metadata.create_all()` at startup, augmented by versioned Alembic migrations under [migrations/](../migrations/) for evolutionary changes** (chosen) | Best of both: rapid early iteration, structured evolution after freeze |

At lifespan startup ([app/main.py:38-41](../app/main.py#L38-L41)), `Base.metadata.create_all(bind=engine)` materializes **15 tables** across five domain groups: Identity & Session (`user`, `otp`, `user_session`, `organization_code`), Disaster Reporting (`disaster_reports`, `disaster_report_images`, `disaster_report_status_history`, `drone_deployments`), Drone Permits (`drone_permit`), Disaster Intelligence (`disaster_post`, `disaster_insight`, `disaster_stats`), and Video Analysis (`video_analysis`, `frame_analysis`, `video_statistics`).

**Evidence to capture**
- **Screenshot** — pgAdmin / DBeaver left tree expanded showing all 15 tables under `public`.
- **Screenshot** — terminal log at FastAPI startup showing `✓ Database tables created successfully!` from [app/main.py:40](../app/main.py#L40).
- **Code snippet** — [app/main.py:31-50](../app/main.py#L31-L50) — the lifespan block.
- **Screenshot** — contents of [migrations/](../migrations/) folder with file names visible.

#### 3.7.5.2 Table Relationships

**Possibilities considered for modelling cardinalities**

| Option | Trade-off |
|---|---|
| Implicit foreign keys, no `relationship()` | Handlers must write `JOIN` by hand every time |
| Lazy loading everything | N+1 query storm on list endpoints |
| **Explicit `relationship()` + `back_populates` + selective `joinedload`** (chosen) | Queries are composable, cascade rules are declared once |

Example cardinalities implemented:
- `user 1..N disaster_reports` (citizens report; deleting a user does *not* delete their reports).
- `disaster_report 1..N disaster_report_images` (cascade delete: photos belong to the report).
- `disaster_report 1..N disaster_report_status_history` (cascade delete, chronological).
- `disaster_report 1..N drone_deployments` (officer may deploy multiple drones per incident).
- `disaster_post 1..1 disaster_insight` (NLP output is paired one-to-one with its source post).

**Evidence to capture**
- **Screenshot** — The ERD diagram from [database_design.md](./database_design.md) rendered.
- **Code snippet** — [app/models/disaster_reports.py](../app/models/disaster_reports.py) `relationship()` + `back_populates` block.
- **Screenshot** — pgAdmin → right-click a table → "Constraints" showing the FK names and `ON DELETE CASCADE` / `RESTRICT`.

#### 3.7.5.3 Constraints and Validation Mechanisms

**Possibilities considered**

| Option | Why insufficient alone |
|---|---|
| Pydantic only | Anyone with DB access can still insert garbage |
| SQL constraints only | The API would return 500 on bad input instead of a clean 422 |
| **Pydantic schemas AT the API boundary + SQL `CheckConstraint` in the DB** (chosen) | Pydantic returns a human-friendly 422; SQL protects at rest |

**Representative constraint pair**:
- *Pydantic* (in [app/schemas/disaster_reports.py](../app/schemas/disaster_reports.py)) — `latitude: float = Field(ge=-90, le=90)`, `severity: Literal["LOW","MEDIUM","HIGH","CRITICAL"]`.
- *SQL `CheckConstraint`* (in [app/models/disaster_reports.py](../app/models/disaster_reports.py)) — the drone mission FSM `status IN ('DEPLOYED','EN_ROUTE','ON_SITE','RETURNING','COMPLETED','ABORTED')`.

Either layer alone rejects invalid state; together they catch the bug class where one side was updated but not the other.

**Evidence to capture**
- **Code snippet** — a Pydantic `Field(...)` + `@field_validator` block from [app/schemas/disaster_reports.py](../app/schemas/disaster_reports.py).
- **Code snippet** — a `CheckConstraint(...)` in [app/models/disaster_reports.py](../app/models/disaster_reports.py).
- **Screenshot** — Swagger UI returning a 422 with a human-friendly `"latitude must be between -90 and 90"` message.
- **Screenshot** — psql attempting `UPDATE drone_deployments SET status='INVALID'` and being rejected by the CheckConstraint.

---

### 3.7.6 Module-Wise Implementation

#### 3.7.6.1 User Management Module

**Scope**: registration, OTP verification, login, session management, admin CRUD over users, analytics.

**Key design choices**:
- **Soft delete** (`is_active = false`) over hard delete, because disaster reports submitted by a removed user must remain historical evidence.
- **Admin cannot deactivate self** ([app/api/v1/endpoints/users.py](../app/api/v1/endpoints/users.py) — the self-lockout guard) so a single mis-click cannot lock the system out of its only admin.
- **Admin cannot change own role** — same reason.
- **User-edit endpoint** allows: name, phone, district, role, is_active. Not email — that's the OAuth identity anchor.

**Evidence to capture**
- **Screenshot** — [UserManagement.jsx](../frontend/src/pages/UserManagement.jsx) with role filter + search box in use, showing per-user report/permit counts.
- **Screenshot** — The user-edit modal with role dropdown disabled when editing *self*.
- **Screenshot** — DevTools → Network showing `DELETE /api/v1/users/delete/<self_id>` returning 400 with the self-delete block message.
- **Code snippet** — [app/api/v1/endpoints/users.py](../app/api/v1/endpoints/users.py) admin update block with the self-role-change guard.

#### 3.7.6.2 Reporting / Core Functional Module

This is the **core value** of the system: citizen submission → officer triage → drone dispatch → public SMS.

**Design choices**:
- **Media in a separate endpoint** (`POST /reports/{id}/media`) — keeps the submission atomic (the report exists first, then the photos attach). If photo upload fails, the report still exists.
- **File sizes capped at 10 MB image / 50 MB video** — matches typical smartphone output; anything larger is almost certainly an over-share.
- **Status state machine** — `PENDING → REVIEWING → DISPATCHED → RESCUING → RESOLVED` (or `REJECTED` at any stage). The statuses are explicit vocabulary a SMS recipient can understand.
- **Status history is append-only** — `disaster_report_status_history` rows are never updated or deleted. This is the legal audit trail.
- **SMS fires in a background thread** — the PATCH returns immediately; if Aakash is slow, the officer UI is not blocked.

**Evidence to capture**
- **Screenshot** — [DisasterReport.jsx](../frontend/src/pages/DisasterReport.jsx) with GPS auto-captured + two photos selected.
- **Screenshot** — [MyDisasterReports.jsx](../frontend/src/pages/MyDisasterReports.jsx) list with colored status badges.
- **Screenshot** — [CommandCenter.jsx](../frontend/src/pages/CommandCenter.jsx) triage panel open for one incident, "Change Status" dropdown visible.
- **Screenshot** — SMS received on citizen's phone when officer changes status to DISPATCHED.
- **Screenshot** — pgAdmin view of `disaster_report_status_history` table showing multiple rows for one report_id.
- **Code snippet** — the PATCH handler in [app/api/v1/endpoints/disaster_reports.py](../app/api/v1/endpoints/disaster_reports.py) showing: history-row append + SMS background task + WebSocket broadcast.

#### 3.7.6.3 Real-Time / Monitoring Module

Three parallel realtime subsystems deliberately use **three different technologies**, each fitted to its payload:

| Channel | Tech | Why this tech |
|---|---|---|
| State-change hints (new report, status change, permit decision) | **WebSocket with lightweight `{channel, event}` envelope** ([ws_manager.py](../app/services/ws_manager.py)) | Tiny messages; client re-fetches via REST — REST stays the single source of truth |
| Live YOLO-annotated video frames at ~15 FPS | **Dedicated WebSocket with alternating JSON metadata + binary JPEG** ([realtime.py](../app/api/v1/endpoints/realtime.py)) | Binary frames need a raw byte channel; polling HTTP would be orders of magnitude slower |
| Drone GPS + sensor data at sub-second cadence | **Firebase Realtime Database SDK** (client-direct) | Already purpose-built for this pattern; avoids writing a pub/sub ourselves |

**Why not one protocol for all three**: a single channel would have to carry ~2 KB of JSON and 30 KB of JPEG and have to be backed by our server's capacity. Splitting lets each channel scale on the service that's already good at it.

**Evidence to capture**
- **Screenshot** — [LiveSurveillance.jsx](../frontend/src/pages/LiveSurveillance.jsx) with YOLO bounding boxes overlaid in real time.
- **Screenshot** — Browser DevTools → Network → WS tab showing both WebSocket connections open simultaneously.
- **Screenshot** — Command Center receiving a toast notification *the instant* a new report is submitted in a second browser.
- **Screenshot** — Firebase Realtime Database console with the `drones/{id}` node updating live (screen-record a few seconds, pick representative frame).
- **Code snippet** — [app/services/ws_manager.py](../app/services/ws_manager.py) publish + subscribe methods.
- **Code snippet** — [app/api/v1/endpoints/realtime.py](../app/api/v1/endpoints/realtime.py) binary frame emit loop.

#### 3.7.6.4 AI / Analytics / Intelligence Module

Three AI-adjacent pipelines implemented:

**1. YOLOv8 video analysis (offline)**

Possibilities considered:
- **YOLOv5** — older, slower, larger
- **Detectron2** — heavier, research-focused
- **MediaPipe** — narrower class set
- **YOLOv8n** (chosen) — smallest weights (~6 MB `yolov8n.pt`), CPU-deployable, 80-class COCO is enough for "people, vehicles, animals" detection in disaster footage
- **YOLOv8 instance segmentation** (chosen in parallel) — for footage where outlines matter more than boxes (flood water edge, fire spread)

Pipeline: upload → `BackgroundTasks` → frame extraction → YOLO per frame → re-encoded MP4 to `uploads/processed/` → per-frame counts in `frame_analysis` + summary in `video_statistics`. Progress is exposed through `GET /api/v1/video/status/{id}` so the UI can poll.

**2. Reddit + NLP (online, global signal)**

Possibilities considered:
- Twitter API v2 — **paid after the free-tier cut**, unusable for a student project
- News RSS aggregation — structured but lossy; no urgency cues
- **Reddit public JSON** (chosen) — free, no OAuth needed, rich unstructured text, 43 curated subreddits across news / disasters / climate / regions

NLP stack: **spaCy** for NER (pulls `GPE`, `LOC`, `FAC` entities → location), **TextBlob** for polarity → sentiment, plus a hand-tuned **12-class disaster taxonomy with keyword weights** (earthquake=8, flood=7, fire=7, hurricane=9, tornado=8, tsunami=10, volcano=9, drought=6, landslide=7, pandemic=8, conflict=9, explosion=8). Output saved in `disaster_insight` (1:1 with `disaster_post`).

**Why spaCy + TextBlob instead of a single LLM call**: cost + latency + determinism. spaCy+TextBlob classifies in milliseconds locally; an LLM would be slower, non-deterministic, and rate-limited.

**3. Admin analytics**

Plain aggregate SQL queries served by `GET /api/v1/users/admin/stats` — no AI involved, just `GROUP BY` + `COUNT`. Chosen over a materialized view because the data volume is small and read patterns vary; letting Postgres plan the query each time beats the maintenance cost of a view.

**Evidence to capture**
- **Screenshot** — [VideoAnalysis.jsx](../frontend/src/pages/VideoAnalysis.jsx) before/after: uploaded clip on the left, YOLO-annotated output on the right.
- **Screenshot** — pgAdmin view of `frame_analysis` rows for one video, showing detection counts per frame.
- **Screenshot** — [LiveDashboard.jsx](../frontend/src/pages/LiveDashboard.jsx) showing Reddit-sourced cards with disaster type + urgency + sentiment + location.
- **Screenshot** — [AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx) with all KPI cards + charts visible.
- **Code snippet** — [app/services/yolo_service.py](../app/services/yolo_service.py) model load + inference loop.
- **Code snippet** — [app/services/nlp_processor.py](../app/services/nlp_processor.py) classification function showing keyword weights + severity calculation.
- **Code snippet** — the 12-class taxonomy dict from [app/services/nlp_processor.py](../app/services/nlp_processor.py).

#### 3.7.6.5 Alert / Notification / Communication Module

Three channels, each for a specific audience:

| Channel | Target | Why this channel |
|---|---|---|
| **SMS (Aakash v3)** | Nepali citizens | Highest reach in emergencies — works on feature phones, survives patchy data |
| **Email (Gmail SMTP)** | All users (OTP) | Free, always reachable, OK for OTP latency |
| **In-app toast via WebSocket** | Logged-in operators | Sub-second latency for anyone already on-screen |

**Why Aakash over Twilio**: Twilio's Nepal pricing is ~10× Aakash's; the system targets a district-level Nepali audience and must respect that budget reality.

**Phone normalization** in [app/api/v1/endpoints/sms.py](../app/api/v1/endpoints/sms.py): strips any `+977` / `977` prefix and rejects non-10-digit numbers. This is done at the API boundary so that messy DB data cannot reach Aakash and cause silent failures.

**Automatic status-change SMS** fires in a background thread on every status transition, with the templated line:

> *"Sankalpa Alert: Hi {name}, your {type} report (ID: {id}) status has been updated to: {status}. Officer notes: {notes}"*

Fixed template + variable substitution was chosen over an LLM-generated message because the operator may be legally accountable for the message content — determinism beats creativity here.

**Evidence to capture**
- **Screenshot** — [DisasterAlertSMS.jsx](../frontend/src/pages/DisasterAlertSMS.jsx) compose screen with message + target district picker.
- **Screenshot** — A delivered SMS on the citizen's phone.
- **Screenshot** — `react-hot-toast` notification popping up on Command Center when a new report is submitted from a second browser.
- **Screenshot** — OTP email in Gmail with the branded HTML template rendered.
- **Code snippet** — [app/api/v1/endpoints/sms.py](../app/api/v1/endpoints/sms.py) phone normalization function.
- **Code snippet** — The status-change SMS template from the PATCH handler in [app/api/v1/endpoints/disaster_reports.py](../app/api/v1/endpoints/disaster_reports.py).

#### 3.7.6.6 Admin / Control Module

Admin wraps every other module with oversight powers:

- **User management** (3.7.6.1).
- **System-wide analytics** (3.7.6.4).
- **SMS broadcasts** (3.7.6.5).
- **Weather admin configuration** — [AdminWeather.jsx](../frontend/src/pages/AdminWeather.jsx) — tunes advisory thresholds system-wide.
- **No-fly-zone management** — [NoFlyZone.jsx](../frontend/src/pages/NoFlyZone.jsx) — draws polygons on the map; permit applications and drone deployments respect the zones.
- **3D drone visualization** — [DroneVisualization.jsx](../frontend/src/pages/DroneVisualization.jsx) — three.js scene subscribing directly to Firebase.

**Why admin *inherits* officer + citizen capabilities**: role inheritance mirrors the chain-of-command — admin can do anything an officer can do, in case an officer is unreachable. Enforced by making the role check "is the user at least an admin?" rather than "is the role exactly admin?" where appropriate.

**Evidence to capture**
- **Screenshot** — [AdminDashboard.jsx](../frontend/src/pages/AdminDashboard.jsx) overview with KPI cards.
- **Screenshot** — [NoFlyZone.jsx](../frontend/src/pages/NoFlyZone.jsx) with a polygon drawn over a district.
- **Screenshot** — [DroneVisualization.jsx](../frontend/src/pages/DroneVisualization.jsx) 3D viewport with a drone moving along its trail.
- **Screenshot** — [AdminWeather.jsx](../frontend/src/pages/AdminWeather.jsx) threshold configuration panel.

---

### 3.7.7 Hardware / Device Integration Implementation

*Hardware integration is documented separately in [hardware_physical_design.md](./hardware_physical_design.md). This document is software-only; refer to that file for the assembly process, component integration, calibration, control mechanism, and operational workflow.*

---

### 3.7.8 Real-Time Communication and Integration

#### 3.7.8.1 Live Data Flow

**Possibilities considered**

| Option | Why not chosen alone |
|---|---|
| REST polling only | Wastes bandwidth, misses events, doesn't scale |
| One giant WebSocket carrying every payload | Single point of failure, one slow consumer blocks all |
| **Three specialised live channels** (chosen) | Each channel does one thing well |

Live channels implemented:
- **REST (axios)** — commands, writes, paginated reads. Source of truth.
- **Notification WebSocket (`/api/v1/ws`)** — lightweight `{channel, event}` envelopes. The client re-fetches via REST on receipt → socket stays small, REST stays authoritative.
- **Detection WebSocket (`/api/v1/realtime/detect`)** — binary YOLO-annotated frames + JSON metadata for LiveSurveillance.
- **Firebase SDK** (client-direct) — sub-second drone GPS + sensor data.

**Why clients re-fetch REST on a WebSocket hint**: this is the key architectural decision of the realtime layer. It keeps the WebSocket protocol tiny and stable; a schema change in the report object does not require a WebSocket protocol change. The WS is a doorbell, not the mail.

**Evidence to capture**
- **Screenshot** — Browser DevTools → Network tab split-pane: WS frames on the left (tiny envelopes), XHR calls on the right (full JSON responses) — shows the doorbell pattern in action.
- **Code snippet** — An example frontend subscription hook that receives `{channel:"reports", event:"new_report"}` and calls `fetchReports()`.
- **Code snippet** — [app/api/v1/endpoints/disaster_reports.py](../app/api/v1/endpoints/disaster_reports.py) showing the `ws_manager.notify("reports", "new_report")` call right after `db.commit()`.

#### 3.7.8.2 Sensor / Device / GPS / Realtime Integration

**Possibilities considered for drone GPS streaming**

| Option | Reason rejected |
|---|---|
| Field device → backend → WebSocket → browser | Adds a hop; backend becomes a single point of failure for live GPS |
| MQTT broker (Mosquitto) | Another service to run + monitor for marginal benefit |
| **Firebase Realtime Database** (chosen) | Purpose-built for device→cloud→browser flow; mobile SDKs exist for the field device; browser SDK already lives in the SPA |

Flow: drone publishes to `drones/{id}` in Firebase → officer's Command Center and admin's 3D viz subscribe directly → sub-second updates without a backend round-trip.

**Why the backend still syncs snapshots into `drone_deployments`**: two reasons. First, durability — Firebase is a realtime cache, not a system of record. Second, historical queries ("show me where drone-X was at 14:03 last Tuesday") need relational SQL, not a tree-shaped realtime DB.

**Evidence to capture**
- **Screenshot** — Firebase console showing `drones/<id>` node with GPS values ticking up.
- **Screenshot** — Command Center map with a drone marker visibly moving between two screenshots (record a short screen-capture GIF).
- **Screenshot** — pgAdmin view of `drone_deployments.last_known_latitude / longitude / last_sync_at` updating on refresh.
- **Code snippet** — [frontend/src/firebase/firebase.js](../frontend/src/firebase/firebase.js) subscribe hook.

#### 3.7.8.3 Event-Based Communication

**Possibilities considered**

| Option | Reason rejected |
|---|---|
| Tight coupling — each handler calls each frontend update function directly | Impossible to maintain beyond 3 events |
| Redis pub/sub | Real value, but adds a service to run for a project that already has enough |
| **In-process publish-subscribe via [ws_manager.py](../app/services/ws_manager.py)** (chosen) | Simple, zero deps, enough for a single-node deployment |

The manager exposes `ws_manager.notify(channel, event)`. Channels used: `reports`, `citizens`, `users`, `permits`, `video:{id}`. Events are short strings. The emitter does not know who the subscribers are; the subscriber does not know who produced the event. This is classic event decoupling — handlers can be re-ordered or removed without breaking anything downstream.

**Evidence to capture**
- **Code snippet** — [app/services/ws_manager.py](../app/services/ws_manager.py) `publish` / `notify` and `subscribe` methods side by side.
- **Code snippet** — An emitter call site (e.g., the `notify("reports", "new_report")` in `disaster_reports.py`) *and* a subscriber hook on the frontend in the same figure, showing the decoupling.
- **Screenshot** — Command Center + Admin Dashboard open in two tabs; one new report submission causes both tabs to refresh their relevant panels simultaneously.

---

## How to Use This Document

1. Walk the sections in order. Each subsection gives you the *narrative* (what, what-else, why) and the *evidence list* (exactly which screenshots and code snippets to grab).
2. Drop screenshots into `uploads/docs/` using the filenames already suggested in [implementation.md](./implementation.md) so the two documents share one image library.
3. Paste code snippets directly from the files listed — the `path:line-range` links point to the current source of truth; the report should quote *actual* code, not a summary.
4. For the viva / defense, each "Possibilities considered" table is your answer when the supervisor asks *"Why didn't you use X?"*

---

## Summary — the Five Big Choices

| Choice | Why, in one line |
|---|---|
| **FastAPI + React 19 + PostgreSQL** | Async-native, typed end-to-end, single language per tier, every library needed (YOLO, spaCy, Leaflet, three.js) exists here |
| **Google OAuth + Gmail OTP + dual JWT / session cookie** | Identity + inbox-control proof + both stateless API and revocable browser auth |
| **Defense-in-depth role gating** (router → dependency → DB constraint) | Three independent failures required for a breach; single failure is harmless |
| **Three specialised realtime channels** (WS envelope + WS binary + Firebase direct) | Each channel is the shortest path for its payload; no single hop is critical |
| **Append-only audit history + soft delete** | Disaster response is legally accountable; nothing important is ever overwritten |
