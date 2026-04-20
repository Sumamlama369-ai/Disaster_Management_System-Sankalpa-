# Implementation — Disaster Management System

This document records how the **Disaster Management System** was built, feature by feature, with direct pointers to the code and placeholders for supporting screenshots. It is organized to match the project report's section 3.7 and serves as the primary evidence that every architectural decision and UML design was actually materialized in code and UI.

The system is a full-stack platform that unifies **citizen disaster reporting**, **drone permit regulation**, **officer dispatch**, **AI video analysis**, **Reddit-based disaster intelligence**, and **admin oversight** into a single operational command center. The implementation stack is FastAPI + React 19 + PostgreSQL + Firebase Realtime Database + YOLOv8 + spaCy/TextBlob.

> **Screenshot convention** — placeholders are written as `![Caption](../uploads/docs/<filename>.png)`. Drop screenshots into `uploads/docs/` (or any folder you prefer) and update the relative path. Caption each figure and refer to it inline.

---

## 3.7 Implementation

### 3.7.1 Introduction to Implementation

Implementation is the phase in which the design artifacts produced in earlier sections (system architecture, UML, database ERD, hardware blueprint) were translated into running software. The build followed an **incremental, feature-first approach**: one role at a time (Citizen → Officer → Admin), one module at a time (auth → reporting → permits → command center → AI → SMS/weather → analytics), each commit accompanied by manual smoke testing on the Vite dev server and FastAPI's Swagger UI before moving on.

Two non-negotiables governed every implementation choice:

1. **Every role-restricted action is enforced on both sides** — the React `ProtectedRoute` guard ([ProtectedRoute.jsx](../frontend/src/components/ProtectedRoute.jsx)) redirects mismatched users and the FastAPI dependency `get_current_officer` / `get_current_admin` ([app/api/v1/dependencies/auth.py](../app/api/v1/dependencies/auth.py)) returns **403 Forbidden** if the JWT's role does not match.
2. **Every state change is auditable** — disaster report status transitions append a row to `disaster_report_status_history` instead of overwriting; permit reviews are permanent; drone mission states are constrained at the DB via `CheckConstraint`.

Section 3.7.2 walks the setup; 3.7.3–3.7.5 cover tier-wise build (frontend, backend, database); 3.7.6 is a module-by-module walkthrough; 3.7.8 explains the realtime glue; 3.7.9 aggregates the screenshot evidence.

> *Hardware integration is covered separately in [hardware_physical_design.md](./hardware_physical_design.md); this document focuses on the software implementation.*

---

### 3.7.2 Development Environment Setup

#### 3.7.2.1 Software Setup

| Component | Version | Role |
|---|---|---|
| Python | 3.11+ | FastAPI runtime |
| Node.js | 20.x LTS | Vite dev server + build |
| PostgreSQL | 15 | Primary relational store |
| Docker + Docker Compose | latest | Containerized dev + deployment |
| Git | latest | Version control (GitHub) |
| VS Code | latest | Primary editor |

Python dependencies are pinned in [requirements.txt](../requirements.txt) — notable entries: `fastapi==0.115.0`, `sqlalchemy==2.0.35`, `ultralytics>=8.0.0` (YOLOv8), `pydantic==2.9.2`, `python-jose[cryptography]==3.3.0` (JWT), `passlib[bcrypt]==1.7.4`. Frontend dependencies ([frontend/package.json](../frontend/package.json)) bring in React 19, Vite 7, TailwindCSS 3, Leaflet, three.js, framer-motion, react-router-dom 7, @react-oauth/google, Firebase, and five charting libraries (Recharts, Chart.js, ECharts, Plotly, Nivo).

![Screenshot: Python + Node version check in terminal](../uploads/docs/env-versions.png)

#### 3.7.2.2 Tools and Platforms Configuration

**External service credentials** live in `.env` and are loaded through `pydantic-settings` in [app/core/config.py](../app/core/config.py):

- `DATABASE_URL` — PostgreSQL DSN.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth 2.0.
- `GMAIL_APP_PASSWORD` — Gmail SMTP app-specific password for OTP delivery.
- `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` — auth.
- `ORG_CODE_NDRF`, `ORG_CODE_FIRE`, `ORG_CODE_POLICE`, `MASTER_ADMIN_CODE` — role gates.
- `AAKASH_SMS_TOKEN` — bulk SMS API.
- `FIREBASE_*` — Realtime Database credentials ([frontend/src/firebase/firebase.js](../frontend/src/firebase/firebase.js)).
- `HF_TOKEN` — Hugging Face LLM for weather advisory.
- `ENABLE_REDDIT_FETCHING` — toggles the background scraper.

Docker Compose orchestrates three services — backend, frontend (Nginx-served static bundle), and PostgreSQL — wired together through a shared bridge network.

![Screenshot: .env file fields (redacted values)](../uploads/docs/env-file.png)
![Screenshot: docker-compose.yml + services running via docker ps](../uploads/docs/docker-compose.png)

#### 3.7.2.3 Initial Project Structure

The repository is split into two top-level applications sharing one database:

```
/
├── app/                    FastAPI backend
│   ├── main.py             app factory, CORS, lifespan, router mount
│   ├── core/               config (pydantic-settings) + security (JWT + bcrypt)
│   ├── database/           SQLAlchemy engine + session dependency
│   ├── models/             ORM entities (user, disaster_reports, drone_permit, …)
│   ├── schemas/            Pydantic request/response DTOs
│   ├── services/           business logic (auth, otp, gmail, yolo, nlp, ws_manager, …)
│   ├── api/v1/
│   │   ├── endpoints/      route handlers (auth, users, permits, disasters, …)
│   │   └── dependencies/   auth injectors (get_current_user, _officer, _admin)
│   └── utils/
├── frontend/               React 19 SPA
│   └── src/
│       ├── pages/          one file per screen (RoleSelection, CommandCenter, …)
│       ├── components/     Navbar, GoogleLoginButton, ProtectedRoute
│       ├── context/        AuthContext + React Router guards
│       ├── services/       axios client + API wrappers
│       ├── firebase/       Firebase RTDB SDK init
│       └── data/           Nepal map GeoJSON
├── uploads/                binary media (disaster photos, permit docs, videos)
├── migrations/             Alembic migrations
├── documentation/          project docs (this file lives here)
├── requirements.txt        Python deps
├── docker-compose.yml
└── Dockerfile
```

![Screenshot: VS Code Explorer tree of the repository](../uploads/docs/repo-tree.png)

---

### 3.7.3 Frontend Implementation

The frontend is a **React 19 + Vite 7 Single Page Application** styled with TailwindCSS 3. It is entirely client-rendered; all server state is fetched via axios (`services/api.js`) using a combination of Bearer JWT and httponly session cookies.

#### 3.7.3.1 User Interface Development

Every screen lives under [frontend/src/pages/](../frontend/src/pages/) — 24 pages in total, each self-contained and role-scoped. The design language is consistent: a left-aligned `Navbar` ([Navbar.jsx](../frontend/src/components/Navbar.jsx)) with role-specific links, glass-morphism cards for forms, severity-colored chips for statuses, and framer-motion page transitions to avoid jarring route changes.

Key screens (representative sample):

- Public: [PublicPage.jsx](../frontend/src/pages/PublicPage.jsx), [RoleSelection.jsx](../frontend/src/pages/RoleSelection.jsx)
- Auth flow: [LoginProcess.jsx](../frontend/src/pages/LoginProcess.jsx), [OTPVerification.jsx](../frontend/src/pages/OTPVerification.jsx)
- Citizen: [CitizenDashboard.jsx](../frontend/src/pages/CitizenDashboard.jsx), [DisasterReport.jsx](../frontend/src/pages/DisasterReport.jsx), [MyDisasterReports.jsx](../frontend/src/pages/MyDisasterReports.jsx), [DronePermitForm.jsx](../frontend/src/pages/DronePermitForm.jsx), [MyPermits.jsx](../frontend/src/pages/MyPermits.jsx), [VideoAnalysis.jsx](../frontend/src/pages/VideoAnalysis.jsx)
- Officer: [OfficerDashboard.jsx](../frontend/src/pages/OfficerDashboard.jsx), [CommandCenter.jsx](../frontend/src/pages/CommandCenter.jsx), [PermitReview.jsx](../frontend/src/pages/PermitReview.jsx), [LiveSurveillance.jsx](../frontend/src/pages/LiveSurveillance.jsx), [LiveDashboard.jsx](../frontend/src/pages/LiveDashboard.jsx)
- Admin: [AdminDashboard.jsx](../frontend/src/pages/AdminDashboard.jsx), [AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx), [UserManagement.jsx](../frontend/src/pages/UserManagement.jsx), [DisasterAlertSMS.jsx](../frontend/src/pages/DisasterAlertSMS.jsx), [NoFlyZone.jsx](../frontend/src/pages/NoFlyZone.jsx), [DroneVisualization.jsx](../frontend/src/pages/DroneVisualization.jsx)
- Shared: [NepalWeather.jsx](../frontend/src/pages/NepalWeather.jsx), [AdminWeather.jsx](../frontend/src/pages/AdminWeather.jsx), [IncidentWeather.jsx](../frontend/src/pages/IncidentWeather.jsx)

![Screenshot: Public landing page](../uploads/docs/ui-public.png)
![Screenshot: Role selection page](../uploads/docs/ui-role-selection.png)
![Screenshot: Citizen dashboard](../uploads/docs/ui-citizen-dashboard.png)

#### 3.7.3.2 Routing and Navigation

`react-router-dom` v7 drives SPA navigation. Every protected route is wrapped with [`<ProtectedRoute />`](../frontend/src/components/ProtectedRoute.jsx), which reads the `AuthContext` ([frontend/src/context/](../frontend/src/context/)) and redirects unauthenticated users to `/login` or mismatched roles to their own dashboard (e.g., a citizen landing on `/command-center` is redirected to `/citizen/dashboard`).

Entry point: [frontend/src/App.jsx](../frontend/src/App.jsx) declares the full route table and mounts `<GoogleOAuthProvider>` and `<AuthProvider>` at the root.

![Screenshot: App.jsx route table](../uploads/docs/code-app-routes.png)
![Screenshot: ProtectedRoute.jsx logic](../uploads/docs/code-protected-route.png)

#### 3.7.3.3 Role-Based Page Development

Role-specific pages are never rendered for the wrong user. Beyond `ProtectedRoute`, the `Navbar` renders different link sets based on `user.role`, and individual API calls are guarded server-side.

Example: the officer-only **Command Center** ([CommandCenter.jsx](../frontend/src/pages/CommandCenter.jsx)) renders a full-screen Leaflet map with severity-colored markers, while citizens attempting the same route are redirected before the component mounts.

![Screenshot: Officer navbar vs Citizen navbar comparison](../uploads/docs/ui-navbar-compare.png)

#### 3.7.3.4 Form Handling and Validation

Forms use controlled React state with per-field validation before submission. The most complex form is [DronePermitForm.jsx](../frontend/src/pages/DronePermitForm.jsx) — a multi-section permit application that collects drone specs, operator identity, Nepal address hierarchy (province → district → municipality → ward), and four mandatory file uploads (purpose letter, purchase bill, drone image, citizenship document) with size/type checks before a single `multipart/form-data` POST to `/api/v1/permits/submit`.

Client-side validations include:
- Email format + Gmail-only restriction for OTP deliverability
- Phone number in Nepali format (`+977` prefix handling)
- Latitude/longitude range (−90..90 / −180..180)
- File type whitelists (JPEG/PNG/WebP for images; PDF for documents)
- File size ceilings (≤10 MB image, ≤50 MB video, ≤5 MB document)

The disaster report form ([DisasterReport.jsx](../frontend/src/pages/DisasterReport.jsx)) captures GPS from the browser `Geolocation` API before the user can submit.

![Screenshot: DronePermitForm — section 1 (drone specs)](../uploads/docs/ui-permit-form-1.png)
![Screenshot: DronePermitForm — file uploads section](../uploads/docs/ui-permit-form-2.png)
![Screenshot: DisasterReport — GPS captured + photo preview](../uploads/docs/ui-disaster-report.png)
![Screenshot: Validation error state (e.g., missing file)](../uploads/docs/ui-form-validation.png)

#### 3.7.3.5 Dashboard and Visualization Features

Visualization is intentionally heavy — disaster response is a visual problem. Five charting libraries are used, each for its strength:

- **Recharts / Chart.js** — standard bar/line/pie charts in the admin analytics dashboard.
- **ECharts** — heatmaps and dense multi-series charts.
- **Plotly** — interactive drill-down charts.
- **Nivo** — calendar heatmap + sankey diagrams.
- **Leaflet + react-leaflet** — 2D map with Nepal GeoJSON overlay and severity-colored markers.
- **three.js** — 3D drone visualization with live position/trail ([DroneVisualization.jsx](../frontend/src/pages/DroneVisualization.jsx)).

![Screenshot: Admin analytics dashboard (charts)](../uploads/docs/ui-admin-analytics.png)
![Screenshot: Command Center — Leaflet map with pulsing markers](../uploads/docs/ui-command-center.png)
![Screenshot: 3D drone visualization (three.js)](../uploads/docs/ui-drone-3d.png)

---

### 3.7.4 Backend Implementation

The backend is a **FastAPI 0.115** ASGI application (`Uvicorn`) with ten domain routers, a service layer, SQLAlchemy 2.0 ORM, and two WebSocket endpoints. App factory: [app/main.py](../app/main.py) — creates CORS middleware, mounts `/uploads` as static files, wires lifespan startup (DB bootstrap + background task start), and includes all routers under `/api/v1/*`.

#### 3.7.4.1 API Development

REST endpoints are grouped by domain under [app/api/v1/endpoints/](../app/api/v1/endpoints/):

| Router | Prefix | Responsibility |
|---|---|---|
| [auth.py](../app/api/v1/endpoints/auth.py) | `/auth` | Register, OTP verify, login, logout, session-check |
| [users.py](../app/api/v1/endpoints/users.py) | `/users` | Profile, admin CRUD, analytics stats |
| [drone_permit.py](../app/api/v1/endpoints/drone_permit.py) | `/permits` | Submit, list, review, download permit bundle |
| [disaster_reports.py](../app/api/v1/endpoints/disaster_reports.py) | `/disaster-reports` | Citizen reports + officer triage + media + map markers |
| [disaster.py](../app/api/v1/endpoints/disaster.py) | `/disasters` | Reddit NLP insights dashboard |
| [video.py](../app/api/v1/endpoints/video.py) | `/video` | YOLOv8 video upload + processed results |
| [realtime.py](../app/api/v1/endpoints/realtime.py) | `/realtime` | Live detection WebSocket |
| [sms.py](../app/api/v1/endpoints/sms.py) | `/sms` | Aakash SMS v3 bulk/broadcast |
| [weather.py](../app/api/v1/endpoints/weather.py) | `/weather` | Forecast + HF-LLM flight advisory |
| [ws.py](../app/api/v1/endpoints/ws.py) | `/ws` | Notification pub/sub WebSocket |

Every handler declares a `Depends(get_current_user / _citizen / _officer / _admin)` injector, returning **401** if unauthenticated or **403** if the role does not match.

![Screenshot: FastAPI Swagger UI (http://localhost:8000/docs)](../uploads/docs/code-swagger.png)
![Screenshot: auth.py endpoint definitions](../uploads/docs/code-auth-endpoints.png)

#### 3.7.4.2 Business Logic Implementation

All non-trivial logic lives in [app/services/](../app/services/) so that handlers stay thin and testable:

- [auth_service.py](../app/services/auth_service.py) — registration, OTP triggering, org-code validation, login
- [otp_service.py](../app/services/otp_service.py) — 6-digit OTP generation, **bcrypt-hashed before storage**, 10-minute expiry, max 3 attempts
- [session_service.py](../app/services/session_service.py) — server-side session rows with sliding-window expiry
- [gmail_service.py](../app/services/gmail_service.py) — Gmail SMTP OTP delivery with branded HTML template
- [google_oauth_service.py](../app/services/google_oauth_service.py) — Google ID token verification
- [yolo_service.py](../app/services/yolo_service.py), [yolo_detector.py](../app/services/yolo_detector.py), [yolo_segmenter.py](../app/services/yolo_segmenter.py) — YOLOv8 wrappers
- [video_processor.py](../app/services/video_processor.py) — frame extraction + YOLO run + output stitching
- [reddit_service.py](../app/services/reddit_service.py) — Reddit JSON scrape
- [nlp_processor.py](../app/services/nlp_processor.py) — spaCy + TextBlob → disaster type / severity / sentiment / location / urgency / keywords
- [ws_manager.py](../app/services/ws_manager.py) — channel-based publish-subscribe for live updates
- [background_tasks.py](../app/services/background_tasks.py) — periodic Reddit scraping loop

![Screenshot: otp_service.py (hashing + expiry logic)](../uploads/docs/code-otp-service.png)
![Screenshot: yolo_service.py (model load + inference)](../uploads/docs/code-yolo-service.png)
![Screenshot: nlp_processor.py (classification pipeline)](../uploads/docs/code-nlp-processor.png)

#### 3.7.4.3 Authentication and Authorization Logic

Auth is a hybrid of **Google OAuth 2.0 + Gmail OTP + JWT + server-side sessions**:

1. User selects a role on `RoleSelection.jsx`; officer/admin must supply an organization code validated in [auth_service.py](../app/services/auth_service.py) against `ORG_CODE_NDRF / FIRE / POLICE` or `MASTER_ADMIN_CODE` from `.env`.
2. Google ID token is verified, a 6-digit OTP is generated in [otp_service.py](../app/services/otp_service.py), hashed with bcrypt, stored, and emailed via [gmail_service.py](../app/services/gmail_service.py).
3. On `POST /api/v1/auth/verify-otp`, the OTP is checked, the user is marked `is_verified=True`, a JWT is signed ([app/core/security.py](../app/core/security.py)), and an httponly `session_id` cookie is set.
4. Every protected endpoint accepts **either** the Bearer JWT **or** the session cookie ([dependencies/auth.py](../app/api/v1/dependencies/auth.py)).
5. Role enforcement: `get_current_citizen / _officer / _admin` dependency injectors return **403** on role mismatch.

![Screenshot: OTP email delivered in Gmail inbox](../uploads/docs/ui-otp-email.png)
![Screenshot: OTPVerification.jsx screen](../uploads/docs/ui-otp-verify.png)
![Screenshot: security.py JWT sign + verify](../uploads/docs/code-jwt.png)
![Screenshot: dependencies/auth.py role injectors](../uploads/docs/code-auth-deps.png)

#### 3.7.4.4 Database Connectivity and CRUD Operations

The SQLAlchemy engine and session factory are defined in [app/database/database.py](../app/database/database.py). Every handler receives a scoped session via `Depends(get_db)`, guaranteeing rollback on exceptions and clean-up after the response.

ORM models ([app/models/](../app/models/)) use SQLAlchemy 2.0 declarative mappings with `CheckConstraint`s on enum columns, cascade-delete edges for owned children, and `DECIMAL(10,8)` / `DECIMAL(11,8)` for geospatial precision.

![Screenshot: database.py engine setup](../uploads/docs/code-db-setup.png)
![Screenshot: disaster_reports.py model (CheckConstraint + CASCADE)](../uploads/docs/code-model-disaster-reports.png)
![Screenshot: a CRUD endpoint using Depends(get_db)](../uploads/docs/code-crud-endpoint.png)

#### 3.7.4.5 Integration of External Services

Five external services are wired through dedicated modules so they can be mocked in tests:

| Service | Purpose | Integration point |
|---|---|---|
| Google OAuth 2.0 | user authentication | [google_oauth_service.py](../app/services/google_oauth_service.py) |
| Gmail SMTP | OTP email delivery | [gmail_service.py](../app/services/gmail_service.py) |
| Aakash SMS v3 | bulk SMS to citizens | [sms.py](../app/api/v1/endpoints/sms.py) |
| Hugging Face Inference Router | LLM weather advisory | [weather.py](../app/api/v1/endpoints/weather.py) |
| Reddit public JSON API | disaster intel scraping | [reddit_service.py](../app/services/reddit_service.py) |

Firebase Realtime Database is treated as a **sidecar** rather than an external service: field devices and the browser read/write directly through the Firebase SDK; the backend only syncs periodic snapshots into `drone_deployments`.

![Screenshot: SMS delivered on a real phone (Aakash)](../uploads/docs/ui-sms-received.png)
![Screenshot: weather.py AI advisory call](../uploads/docs/code-weather-advisory.png)

---

### 3.7.5 Database Implementation

The database is the authoritative system of record. Full design is documented in [database_design.md](./database_design.md); this section records the implementation artifacts.

#### 3.7.5.1 Schema Creation

On FastAPI lifespan startup, [app/main.py](../app/main.py) calls `Base.metadata.create_all(bind=engine)`, which materializes **15 tables** across five domain groups: Identity & Session (`user`, `otp`, `user_session`, `organization_code`), Disaster Reporting (`disaster_reports`, `disaster_report_images`, `disaster_report_status_history`, `drone_deployments`), Drone Permits (`drone_permit`), Disaster Intelligence (`disaster_post`, `disaster_insight`, `disaster_stats`), Video Analysis (`video_analysis`, `frame_analysis`, `video_statistics`).

Evolutionary schema changes use Alembic migrations under [migrations/](../migrations/).

![Screenshot: pgAdmin / DBeaver showing all 15 tables](../uploads/docs/db-tables.png)
![Screenshot: migrations/ directory with Alembic revisions](../uploads/docs/db-migrations.png)

#### 3.7.5.2 Table Relationships

Cardinalities are defined via SQLAlchemy `relationship()` with explicit `back_populates` and cascade rules. A citizen user has many `disaster_reports`; each report has many `disaster_report_images`, many `disaster_report_status_history` rows, and many `drone_deployments`. A `disaster_post` has exactly one `disaster_insight` (1:1). The full ERD is in [database_design.md](./database_design.md).

![Screenshot: ERD rendered from database_design.md](../uploads/docs/db-erd.png)

#### 3.7.5.3 Constraints and Validation Mechanisms

Defense-in-depth is enforced at **two layers**:

1. **Pydantic schemas** ([app/schemas/](../app/schemas/)) — field-level validation before the write: enum membership, string length, lat/lon ranges, file size limits.
2. **SQL `CheckConstraint`** — enforced at commit time inside the database, e.g., the drone-mission FSM (`DEPLOYED → EN_ROUTE → ON_SITE → RETURNING → COMPLETED` or `ABORTED`) is constrained in [app/models/disaster_reports.py](../app/models/disaster_reports.py).

Either layer alone rejects invalid state; together they catch bugs that bypass one of them.

![Screenshot: Pydantic schema (validator example)](../uploads/docs/code-schema-validator.png)
![Screenshot: CheckConstraint on drone_deployments.status](../uploads/docs/code-check-constraint.png)

---

### 3.7.6 Module-Wise Implementation

#### 3.7.6.1 User Management Module

Covers registration, OTP verification, login, session management, admin CRUD over users, and analytics. Entry points: [auth.py](../app/api/v1/endpoints/auth.py), [users.py](../app/api/v1/endpoints/users.py), [UserManagement.jsx](../frontend/src/pages/UserManagement.jsx), [AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx).

Admin can filter users by role, search by name/email, toggle `is_active`, edit profile fields, and change roles (except their own — defensive self-lockout prevention in [users.py](../app/api/v1/endpoints/users.py)).

![Screenshot: Admin — User Management page](../uploads/docs/ui-user-management.png)
![Screenshot: Admin — User edit modal](../uploads/docs/ui-user-edit.png)
![Screenshot: users.py — admin update endpoint](../uploads/docs/code-admin-update.png)

#### 3.7.6.2 Reporting / Core Functional Module

The citizen reporting + officer triage + drone dispatch pipeline is the core value of the system.

- **Submit**: `POST /api/v1/disaster-reports/reports` ([disaster_reports.py:49](../app/api/v1/endpoints/disaster_reports.py)) — `disaster_type`, `severity`, `description`, `latitude`, `longitude`, `reporter_name/contact`.
- **Media**: `POST /api/v1/disaster-reports/reports/{id}/media` — images ≤10 MB (JPEG/PNG/WebP), videos ≤50 MB (MP4/WebM/MOV/AVI), saved under `uploads/disaster_images/`.
- **View**: `GET .../my-reports`, `GET .../{id}`, `GET .../{id}/history`, `GET .../map/markers`.
- **Triage**: `PATCH .../{id}` lets officers transition `PENDING → REVIEWING → DISPATCHED → RESCUING → RESOLVED` (or `REJECTED`). Each change appends a row to `disaster_report_status_history` and triggers a branded SMS to the citizen.

![Screenshot: DisasterReport.jsx filled out + submitted](../uploads/docs/ui-disaster-submit.png)
![Screenshot: MyDisasterReports.jsx list with status badges](../uploads/docs/ui-my-reports.png)
![Screenshot: Officer Command Center triage view](../uploads/docs/ui-triage.png)
![Screenshot: Status-change SMS received on phone](../uploads/docs/ui-sms-status.png)
![Screenshot: disaster_reports.py — PATCH handler](../uploads/docs/code-patch-report.png)

#### 3.7.6.3 Real-Time / Monitoring Module

Three realtime subsystems:

1. **Notification WebSocket** at `/api/v1/ws` ([ws.py](../app/api/v1/endpoints/ws.py)) — channel-based pub/sub ([ws_manager.py](../app/services/ws_manager.py)) broadcasting lightweight `{channel, event}` envelopes. Clients re-fetch via REST on receipt.
2. **Detection WebSocket** at `/api/v1/realtime/detect` ([realtime.py](../app/api/v1/endpoints/realtime.py)) — binary channel streaming YOLOv8-annotated frames at ~15 FPS from an IP camera or webcam into [LiveSurveillance.jsx](../frontend/src/pages/LiveSurveillance.jsx).
3. **Firebase Realtime Database** ([frontend/src/firebase/firebase.js](../frontend/src/firebase/firebase.js)) — field-device drones push GPS + sensor data directly to Firebase nodes; officers and admins subscribe directly for sub-second updates; the backend syncs snapshots into PostgreSQL.

![Screenshot: LiveSurveillance.jsx with YOLO overlay](../uploads/docs/ui-live-surveillance.png)
![Screenshot: Command Center new-report notification (live)](../uploads/docs/ui-ws-notify.png)
![Screenshot: Firebase Realtime Database console with drone node](../uploads/docs/ui-firebase-console.png)

#### 3.7.6.4 AI / Analytics / Intelligence Module

Two AI pipelines and one analytics surface:

1. **YOLOv8 video analysis** — citizens upload a drone-recorded video on [VideoAnalysis.jsx](../frontend/src/pages/VideoAnalysis.jsx); [video_processor.py](../app/services/video_processor.py) runs object detection + instance segmentation on each frame, saves an annotated MP4 to `uploads/processed/`, and persists per-frame counts in `frame_analysis` and summary stats in `video_statistics`.
2. **Reddit + spaCy/TextBlob NLP** — [background_tasks.py](../app/services/background_tasks.py) periodically polls curated subreddits via [reddit_service.py](../app/services/reddit_service.py), then [nlp_processor.py](../app/services/nlp_processor.py) classifies each post into disaster type, severity, sentiment, location, urgency, and trending keywords, storing results in `disaster_insight`. Exposed to the UI via [LiveDashboard.jsx](../frontend/src/pages/LiveDashboard.jsx).
3. **Admin analytics** — [AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx) renders system-wide KPIs (totals, role distribution, district distribution, monthly trends, top contributors) fetched from `GET /api/v1/users/admin/stats`.

![Screenshot: VideoAnalysis.jsx — before/after side-by-side](../uploads/docs/ui-video-yolo.png)
![Screenshot: LiveDashboard.jsx Reddit NLP insights](../uploads/docs/ui-live-dashboard.png)
![Screenshot: AdminAnalytics.jsx charts](../uploads/docs/ui-admin-analytics-detail.png)
![Screenshot: video_processor.py YOLO loop](../uploads/docs/code-video-processor.png)
![Screenshot: nlp_processor.py classification function](../uploads/docs/code-nlp-classify.png)

#### 3.7.6.5 Alert / Notification / Communication Module

- **SMS (Aakash v3)** — admins can target a district or broadcast nationally via [DisasterAlertSMS.jsx](../frontend/src/pages/DisasterAlertSMS.jsx) → `POST /api/v1/sms/send`, `/send-bulk`, `/broadcast` ([sms.py](../app/api/v1/endpoints/sms.py)). All active citizens with a registered phone are the broadcast target; status-change SMS is fired automatically on report transitions.
- **Email (Gmail)** — OTP delivery via [gmail_service.py](../app/services/gmail_service.py) with a branded HTML template.
- **In-app notification bell / toast** — subscribes to the notification WebSocket and pops `react-hot-toast` alerts for new reports, status changes, and permit decisions.

![Screenshot: DisasterAlertSMS.jsx compose screen](../uploads/docs/ui-alert-sms.png)
![Screenshot: Delivered SMS on citizen phone](../uploads/docs/ui-sms-delivered.png)
![Screenshot: Toast notification on Command Center](../uploads/docs/ui-toast.png)

#### 3.7.6.6 Admin / Control Module

The admin has full oversight: user management (3.7.6.1), analytics (3.7.6.4), SMS broadcasts (3.7.6.5), weather config ([AdminWeather.jsx](../frontend/src/pages/AdminWeather.jsx)), **no-fly-zone management** ([NoFlyZone.jsx](../frontend/src/pages/NoFlyZone.jsx)) which constrains permit applications nationwide, and **3D drone visualization** ([DroneVisualization.jsx](../frontend/src/pages/DroneVisualization.jsx)) rendered in three.js with live position/trail subscribed directly from Firebase.

![Screenshot: AdminDashboard.jsx overview](../uploads/docs/ui-admin-dashboard.png)
![Screenshot: NoFlyZone.jsx polygon drawing](../uploads/docs/ui-nofly.png)
![Screenshot: DroneVisualization.jsx — 3D viewport](../uploads/docs/ui-drone-3d-detail.png)

---

### 3.7.8 Real-Time Communication and Integration

#### 3.7.8.1 Live Data Flow

Three independent live channels are multiplexed on one backend port:

- **REST (axios)** for commands and paginated reads.
- **Notification WebSocket** for state-change hints (`{channel: "reports", event: "status_updated"}`). Clients react by re-fetching — this keeps the socket small and the REST layer the single source of truth.
- **Detection WebSocket** for binary YOLO-annotated frames.
- **Firebase SDK** (client-direct) for drone GPS / sensor data at sub-second cadence.

![Screenshot: Browser DevTools Network tab showing WS + Firebase traffic](../uploads/docs/ui-devtools-ws.png)

#### 3.7.8.2 Sensor / Device / GPS / Realtime Integration

Field-deployed drones push GPS + sensor payloads to a Firebase Realtime Database node under `drones/{id}`. The officer Command Center and admin 3D visualization subscribe to that node directly, avoiding a backend round-trip on each update. The backend runs a periodic sync to copy the latest snapshot into `drone_deployments.last_known_latitude / longitude / last_sync_at`, preserving durability and enabling historical queries without coupling reads to Firebase uptime.

![Screenshot: Firebase node structure (drones/{id})](../uploads/docs/ui-firebase-node.png)
![Screenshot: Command Center drone marker moving in real time](../uploads/docs/ui-drone-live.png)

#### 3.7.8.3 Event-Based Communication

The [ws_manager.py](../app/services/ws_manager.py) publishes named events on named channels. Examples: a new disaster report submission fires `ws_manager.notify("reports", "new_report")`; a status change fires `ws_manager.notify("reports", "status_updated")`; a permit decision fires on channel `permits`. This keeps concerns decoupled — handlers emit events, components subscribe to channels, and no component needs to know who produced the event.

![Screenshot: ws_manager.py publish method](../uploads/docs/code-ws-manager.png)
![Screenshot: Frontend WS subscription hook](../uploads/docs/code-ws-hook.png)

---

### 3.7.9 Step-by-Step Evidence of Development

This section aggregates the visual evidence of the build. Each subsection below collects the most representative screenshots grouped by concern — for the full dispersed set, see the inline figures above.

#### 3.7.9.1 Screenshot Evidence of Core Feature Development

Evidence of the citizen→officer→drone pipeline working end to end:

- Citizen submits a disaster report with GPS + photo (form filled + 200 response in DevTools).
- Officer sees it appear live on the Command Center map (WebSocket notification arrives).
- Officer changes status to **DISPATCHED**; citizen receives SMS within seconds.
- Officer deploys drone; drone icon tracks live on the map from Firebase.

![Screenshot: end-to-end flow — report submitted](../uploads/docs/flow-01-submit.png)
![Screenshot: end-to-end flow — appears on Command Center](../uploads/docs/flow-02-command.png)
![Screenshot: end-to-end flow — status changed](../uploads/docs/flow-03-status.png)
![Screenshot: end-to-end flow — SMS received](../uploads/docs/flow-04-sms.png)
![Screenshot: end-to-end flow — drone deployed + live](../uploads/docs/flow-05-drone.png)

#### 3.7.9.2 Screenshot Evidence of Interface Development

- Public landing → role selection → OAuth popup → OTP screen → Citizen dashboard.
- Mobile responsiveness (375 px viewport) of each key screen.
- Dark / light theme comparison on CommandCenter.

![Screenshot: UI flow montage](../uploads/docs/ui-flow-montage.png)
![Screenshot: Mobile view (375px)](../uploads/docs/ui-mobile.png)

#### 3.7.9.3 Screenshot Evidence of Backend Logic

- FastAPI Swagger UI listing all endpoints.
- `auth_service.py`, `otp_service.py`, `ws_manager.py` open in VS Code.
- A sample request/response in Postman or curl.

![Screenshot: Swagger UI complete](../uploads/docs/code-swagger-full.png)
![Screenshot: curl POST + 200 JSON response](../uploads/docs/code-curl-response.png)

#### 3.7.9.4 Screenshot Evidence of Integration Process

- Gmail inbox showing OTP email.
- Aakash SMS dashboard or delivered SMS on phone.
- Firebase Realtime Database console showing drone node updating.
- Hugging Face weather advisory response in Swagger UI.

![Screenshot: Integrated services working](../uploads/docs/integration-all.png)

#### 3.7.9.5 Screenshot Evidence of Final Working Features

A consolidated "final build" walkthrough:

- Citizen reports + permits + video analysis.
- Officer triage + permit review + drone dispatch + live surveillance.
- Admin user management + analytics + SMS broadcast + no-fly zones + 3D drone.
- PostgreSQL populated with real rows (pgAdmin screenshot of `disaster_reports` + `drone_permit` + `disaster_report_status_history`).

![Screenshot: Final build — citizen features collage](../uploads/docs/final-citizen.png)
![Screenshot: Final build — officer features collage](../uploads/docs/final-officer.png)
![Screenshot: Final build — admin features collage](../uploads/docs/final-admin.png)
![Screenshot: PostgreSQL data rows populated](../uploads/docs/final-db.png)

---

## Summary of How the System Works (Short)

1. A **citizen** authenticates via Google OAuth → Gmail OTP, then submits a disaster report with GPS, photos, and description. The request hits FastAPI, is validated by Pydantic, written to PostgreSQL, and a WebSocket event is broadcast on the `reports` channel.
2. **Officers** watching the Command Center receive the live hint, re-fetch markers, and see the new incident on a Nepal-boundary Leaflet map with severity-colored pulsing markers. They triage it — changing status through a fixed FSM — and optionally deploy a drone, which streams GPS to Firebase and renders live on the map.
3. Every status change appends to an immutable history table and fires a branded SMS (Aakash v3) to the citizen.
4. In parallel, a background task scrapes Reddit, runs spaCy/TextBlob NLP, and populates a live disaster-intelligence dashboard. Citizens can also upload videos for YOLOv8 object-detection/segmentation analysis.
5. **Admins** oversee everything — managing users, reviewing system-wide analytics, broadcasting SMS to districts, editing no-fly zones, and viewing 3D drone telemetry.

All role boundaries are enforced twice (client guard + server dependency). All state is auditable. All external services are swappable behind service modules.

---

## What to Keep from Your Outline — Recommendation

Keep all of 3.7.1–3.7.6, 3.7.8, and 3.7.9. **Drop 3.7.7 (Hardware Integration)** from this document, since hardware is covered in [hardware_physical_design.md](./hardware_physical_design.md) — reference it here with a one-line pointer to avoid duplication. Under 3.7.9, do not re-take screenshots — *reuse* the figures already placed inline throughout 3.7.2–3.7.8, and in 3.7.9 simply group them into "core / interface / backend / integration / final" narratives so the supervisor sees the story without flipping pages.
