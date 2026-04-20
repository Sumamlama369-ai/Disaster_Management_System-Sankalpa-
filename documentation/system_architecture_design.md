# System Architecture Design — Disaster Management System

This document describes the architectural blueprint of the **Disaster Management System** — a role-based, map-centric, AI-augmented platform built on FastAPI + React + PostgreSQL + Firebase + YOLOv8 that unifies citizen incident reporting, drone permit regulation, officer dispatch, live aerial surveillance, and nationwide admin oversight into a single operational command center.

The architecture is structured to satisfy four cross-cutting concerns simultaneously: **sub-second real-time responsiveness** (for drone telemetry and officer notifications), **strict role-based authorization** (citizen / officer / admin), **auditable state transitions** (every report status change and permit review is immutably logged), and **in-process AI integration** (YOLOv8 and spaCy/TextBlob run inside the application process rather than as isolated microservices).

---

## 3.6.3 System Architecture Design

The System Architecture Design specifies how the system's responsibilities are partitioned across processes, layers, and services; how those parts communicate; and how data flows between them. It answers three structural questions:

1. **Overall System Architecture** — How is the system decomposed at the highest level, and which process owns which responsibility?
2. **Module-Level Architecture** — How is each process internally decomposed into cohesive, loosely coupled modules?
3. **Frontend–Backend–Database Interaction** — How do the three tiers communicate over REST, WebSocket, and Firebase channels, and what are the exact contracts between them?

Together, these three views describe the system from macro (distributed topology) to micro (per-request database flow), giving both operators and future contributors a complete mental model of how the platform behaves at runtime.

---

### 3.6.3.1 Overall System Architecture

The Disaster Management System follows a **3-layer + sidecar** distributed architecture. Each layer has a single, well-defined responsibility, and communication between layers uses explicit contracts (REST schemas, WebSocket envelopes, Firebase node paths). The sidecar — Firebase Realtime Database — is deliberately separated from the primary data layer so that high-frequency drone telemetry cannot saturate the transactional store.

#### Architectural Layers

**Layer 1 — Presentation (Client Tier)**

A React 19 + Vite 7 Single Page Application delivered to the browser as a static bundle. In production, Nginx (configured via [frontend/nginx.conf](../frontend/nginx.conf)) serves the compiled SPA and proxies `/api/*` requests to the backend. The SPA is entirely client-rendered — it holds no server-side state beyond the authentication cookie. TailwindCSS 3 provides the utility-first design system, framer-motion powers page transitions, Leaflet renders 2D maps, three.js renders the 3D drone visualization, and a suite of charting libraries (Recharts, Chart.js, ECharts, Plotly, Nivo) powers the admin analytics dashboards.

**Layer 2 — Application (Server Tier)**

A FastAPI 0.115 ASGI application (`app/main.py`) running under Uvicorn. The application exposes three independent surfaces on a single port:

- **REST API** at `/api/v1/*` — ten domain routers covering auth, users, permits, disaster reports, disasters (Reddit NLP), video, realtime, SMS, weather, and ws.
- **Notification WebSocket** at `/api/v1/ws` — a lightweight publish-subscribe channel for state-change hints.
- **Detection WebSocket** at `/api/v1/realtime/detect` — a heavy binary channel streaming YOLOv8-annotated frames at ~15 FPS.

Cross-cutting concerns — dual-mode authentication (JWT **or** session cookie), role enforcement via FastAPI dependencies, CORS for the Vite and Docker origins, static serving of `/uploads`, lifespan-managed background tasks — are wired centrally in [app/main.py](../app/main.py). All business logic lives under [app/services/](../app/services/) and all route handlers under [app/api/v1/endpoints/](../app/api/v1/endpoints/).

**Layer 3 — Data (Persistence Tier)**

Three complementary stores, each chosen for its strengths:

- **PostgreSQL** — the system of record. Accessed through SQLAlchemy 2.0 ORM (`psycopg2-binary` driver). Eleven tables span three domain groups: auth/user, disaster reporting, and drone permits. Geospatial coordinates use `DECIMAL(10,8)` / `DECIMAL(11,8)` to prevent floating-point drift, and `CheckConstraint`s enforce enum validity directly at the storage layer.
- **Local filesystem** under `uploads/` — binary media (disaster photos, permit documents, original videos, YOLO-annotated outputs). Served through FastAPI's `StaticFiles` mount at `/uploads`.
- **Firebase Realtime Database (sidecar)** — high-frequency drone telemetry (GPS coordinates, sensor data). Field-device drones write directly to Firebase nodes; officer and admin clients subscribe directly. The backend syncs snapshots into `drone_deployments.last_known_latitude` / `last_known_longitude` / `last_sync_at` for durability without incurring per-write Postgres overhead.

**External Service Plane**

Five external services are wired through dedicated service modules so they can be mocked during testing:

| Service | Purpose | Service module |
|---|---|---|
| Google OAuth 2.0 | User authentication | [google_oauth_service.py](../app/services/google_oauth_service.py) |
| Gmail SMTP / API | OTP delivery | [gmail_service.py](../app/services/gmail_service.py) |
| Aakash SMS v3 | SMS delivery to Nepali phones | [sms.py](../app/api/v1/endpoints/sms.py) |
| Hugging Face Inference Router | AI weather advisory LLM | [weather.py](../app/api/v1/endpoints/weather.py) |
| Reddit public JSON API | Global disaster intelligence scraping | [reddit_service.py](../app/services/reddit_service.py) |

All external credentials live in `.env` and are loaded through `pydantic-settings` ([app/core/config.py](../app/core/config.py)); none are hardcoded.

#### Topology Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                          │
│  React 19 SPA (Vite build, served by Nginx in production)   │
│  — TailwindCSS 3, framer-motion, Leaflet, three.js,         │
│    Recharts / Chart.js / ECharts / Plotly / Nivo            │
└──────────────┬───────────────────────┬───────────────────────┘
         REST (axios)           WS (native)          Firebase SDK
         JWT + cookie           JWT query param      (direct subscription)
               │                       │                      │
┌──────────────▼───────────────────────▼──────────────────────┼───┐
│  APPLICATION LAYER                                           │   │
│  FastAPI 0.115 (Uvicorn ASGI)                                │   │
│  ├── /api/v1/auth, /users, /permits, /disasters,             │   │
│  │   /video, /disaster-reports, /sms, /weather               │   │
│  ├── /api/v1/ws (notification pub/sub)                       │   │
│  └── /api/v1/realtime/detect (YOLO stream, ~15 FPS)          │   │
│                                                              │   │
│  Services: auth, otp, gmail, google_oauth, session,          │   │
│            ws_manager, yolo_service, yolo_detector,          │   │
│            yolo_segmenter, video_processor, reddit,          │   │
│            nlp_processor, background_tasks                   │   │
└──────┬────────────────────────────────────┬──────────────────┼───┘
       │                                    │                  │
┌──────▼──────────────────────┐    ┌────────▼────────┐  ┌─────▼──────────┐
│  DATA LAYER                 │    │  STATIC MEDIA   │  │  SIDECAR       │
│  PostgreSQL                 │    │  uploads/*      │  │  Firebase RTDB │
│  + SQLAlchemy 2.0 ORM       │    │  (disaster      │  │  (drone GPS    │
│  11 tables, 3 domains       │    │   images,       │  │   + sensors,   │
│  DECIMAL(10,8) geo coords   │    │   permit docs,  │  │   sub-second   │
│  CheckConstraints for enums │    │   YOLO output)  │  │   push)        │
└─────────────────────────────┘    └─────────────────┘  └────────────────┘
                                            │
┌───────────────────────────────────────────▼─────────────────────────┐
│  EXTERNAL SERVICES                                                  │
│  Google OAuth · Gmail · Aakash SMS v3 ·                             │
│  Hugging Face (deepseek-v3-0324) · Reddit JSON                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Deployment Topology

The entire stack is containerized. A single `docker-compose.yml` at the repository root brings up three services on a shared network:

- **backend** — FastAPI under Uvicorn, built from the root `Dockerfile`, exposing port 8000.
- **frontend** — the compiled React SPA served by Nginx from `frontend/Dockerfile`, exposing port 3000, proxying `/api/*` to the backend.
- **db** — PostgreSQL with a persistent volume.

`.dockerignore` excludes `venv/`, `node_modules/`, and local `uploads/` runtime artifacts. On startup, the FastAPI `lifespan` hook creates the upload directories, runs `Base.metadata.create_all(engine)` to ensure schema, and conditionally starts the Reddit background task (gated by `ENABLE_REDDIT_FETCHING`).

#### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **Separate system of record (Postgres) from telemetry sidecar (Firebase)** | Firebase handles sub-second drone GPS updates without write-amplifying Postgres; the backend syncs snapshots for durability. |
| **Two distinct WebSocket channels** | A lightweight notification channel (`/api/v1/ws`) cannot be starved by a heavy video stream (`/api/v1/realtime/detect`). |
| **In-process AI (YOLOv8 + spaCy/TextBlob)** | Reduces operational complexity for the MVP; a single loaded YOLO model serves detection, segmentation, and live streaming via [yolo_service.py](../app/services/yolo_service.py). |
| **Dual-mode authentication (JWT + session cookie)** | JWTs are used by SPA API calls and WebSockets (query param); cookies provide browser fallback. Either is sufficient to authenticate. |
| **Role enforcement at two independent layers** | Client-side `ProtectedRoute` for UX; server-side FastAPI `Depends(get_current_*)` dependencies as the authoritative check. |
| **WebSocket envelopes carry `{channel, event}` only** | Clients re-fetch via REST after each hint, keeping the socket cheap and REST as the single source of truth. |

---

### 3.6.3.2 Module-Level Architecture

Inside the FastAPI application, the system is decomposed into **ten loosely-coupled modules**. Each module owns a coherent slice of functionality: its own ORM models, Pydantic schemas, REST endpoints, service logic, and (on the frontend) React pages. Modules communicate through well-defined interfaces — never by reaching into each other's internals — which makes the codebase navigable and testable.

#### Module Decomposition Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   FASTAPI APPLICATION PROCESS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────────────┐    │
│  │  M1 Auth &   │  │ M2 Disaster │  │ M3 Drone Permit     │    │
│  │  User Mgmt   │  │ Reporting   │  │ Management          │    │
│  └──────┬───────┘  └──────┬──────┘  └──────────┬──────────┘    │
│         │                 │                    │               │
│         │ (role checks used by every module)  │               │
│         ▼                 ▼                    ▼               │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Dependency layer: get_current_citizen/officer/admin   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────────────┐    │
│  │ M4 Command   │  │ M5 Video    │  │ M6 Real-Time        │    │
│  │ Center &     │  │ Analysis &  │  │ Surveillance        │    │
│  │ Dispatch     │  │ CV (YOLO)   │  │ (WS + YOLO)         │    │
│  └──────┬───────┘  └──────┬──────┘  └──────────┬──────────┘    │
│         │                 │                    │               │
│         └── shares ───────┴────── yolo_service.py ─────────┐   │
│                                                            │   │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐  │   │
│  │ M7 NLP       │  │ M8 SMS      │  │ M9 Weather       │  │   │
│  │ Disaster     │  │ Alert &     │  │ Advisory (LLM)   │  │   │
│  │ Intelligence │  │ Notification│  │                   │  │   │
│  └──────────────┘  └─────────────┘  └──────────────────┘  │   │
│                                                            │   │
│  ┌──────────────────────────────────────────────────────┐ │   │
│  │          M10 Analytics & Visualization               │ │   │
│  │    (aggregates across M2, M3, M5, M7)                │ │   │
│  └──────────────────────────────────────────────────────┘ │   │
│                                                            │   │
│  ┌──────────────────────────────────────────────────────┐ │   │
│  │  Cross-cutting: ws_manager (pub/sub), background_    │ │   │
│  │  tasks (Reddit thread), database session factory     │ │   │
│  └──────────────────────────────────────────────────────┘ │   │
└────────────────────────────────────────────────────────────┘   │
                                                                 │
                    shared loaded YOLO model instance ───────────┘
```

#### Module Specifications

**M1 — Authentication & User Management**

Responsibility: identify every caller, verify via Gmail OTP, assign role (gated by organization codes for officers or the master code for admins), issue a JWT + session cookie, and enforce role-based access on every downstream call.

Components:
- Models: `User` ([app/models/user.py](../app/models/user.py)), `OTP` ([otp.py](../app/models/otp.py)), `UserSession` ([session.py](../app/models/session.py)).
- Services: [auth_service.py](../app/services/auth_service.py), [google_oauth_service.py](../app/services/google_oauth_service.py), [otp_service.py](../app/services/otp_service.py) (6-digit, hashed at rest, 10-min expiry, 3-attempt cap), [gmail_service.py](../app/services/gmail_service.py), [session_service.py](../app/services/session_service.py) (sliding-window sessions).
- Endpoints: 7 auth routes + 5 user-management routes.
- Dependency layer: [dependencies/auth.py](../app/api/v1/dependencies/auth.py) exports `get_current_citizen`, `get_current_officer`, `get_current_admin` — these are the single authoritative role gates used by every other module.
- UI: [LoginProcess.jsx](../frontend/src/pages/LoginProcess.jsx), [RoleSelection.jsx](../frontend/src/pages/RoleSelection.jsx), [OTPVerification.jsx](../frontend/src/pages/OTPVerification.jsx), [UserManagement.jsx](../frontend/src/pages/UserManagement.jsx).

Downstream modules depend on M1 for identity and role resolution, but M1 does not depend on any other module — it is the root of the dependency graph.

**M2 — Disaster Reporting**

Responsibility: let citizens submit geolocated incident reports with media; let officers triage and update them; preserve an immutable audit trail of every status change.

Components:
- Models: `DisasterReport`, `DisasterReportImage`, `DisasterReportStatusHistory`, `DroneDeployment` (all in [disaster_reports.py](../app/models/disaster_reports.py)).
- Schemas: [schemas/disaster_reports.py](../app/schemas/disaster_reports.py) — status enum, severity enum, disaster-type whitelist, lat/long bounds.
- Endpoints: 10 routes in [disaster_reports.py](../app/api/v1/endpoints/disaster_reports.py).
- UI: [DisasterReport.jsx](../frontend/src/pages/DisasterReport.jsx), [MyDisasterReports.jsx](../frontend/src/pages/MyDisasterReports.jsx).

State machine: `PENDING → REVIEWING → DISPATCHED → RESCUING → RESOLVED` (or `REJECTED` at any stage). Every transition appends a `DisasterReportStatusHistory` row, fires a WebSocket broadcast on channel `reports`, and triggers an automatic SMS to the reporter (delegated to M8).

**M3 — Drone Permit Management**

Responsibility: digitize Nepal's drone permit process — collect drone specs, operator identity, Nepal address hierarchy (province / district / municipality / ward), and four mandatory documents (purpose letter, purchase bill, drone image, citizenship) — then route to officer review with one-shot approve/reject.

Components:
- Model: `DronePermit` with 30+ columns across drone specs, operator identity, address hierarchy, documents, officer review fields ([drone_permit.py](../app/models/drone_permit.py)).
- Enums: `PermitStatus` (PENDING/APPROVED/REJECTED), `RegistrationType` (INDIVIDUAL/COMPANY).
- Endpoints: 6 routes — submit, my-permits, pending, detail, review, download ZIP.
- UI: [DronePermitForm.jsx](../frontend/src/pages/DronePermitForm.jsx), [MyPermits.jsx](../frontend/src/pages/MyPermits.jsx), [PermitReview.jsx](../frontend/src/pages/PermitReview.jsx).

One-shot review guarantee: once a permit is APPROVED or REJECTED, subsequent reviews return HTTP 400 — the decision is terminal and immutable.

**M4 — Command Center & Dispatch**

Responsibility: give officers a single pane of glass showing every active incident on a live Leaflet map of Nepal, with the ability to assign reports, add notes, deploy drones, and track mission state in real time.

Components:
- Map rendering: Leaflet + react-leaflet with Nepal boundary GeoJSON ([map.json](../frontend/src/data/)), 5 tile layers (Positron / Street / Satellite / Terrain / Dark), severity-colored radar-pulse markers.
- Mission state machine: `DEPLOYED → EN_ROUTE → ON_SITE → RETURNING → COMPLETED` (or `ABORTED`), enforced by DB `CheckConstraint`.
- Endpoints: reuses M2's triage PATCH endpoint + drone deployment CRUD.
- UI: [CommandCenter.jsx](../frontend/src/pages/CommandCenter.jsx), [OfficerDashboard.jsx](../frontend/src/pages/OfficerDashboard.jsx).

Consumes Firebase GPS directly (not via backend) for sub-second map updates; simultaneously, the backend periodically syncs positions into `drone_deployments.last_known_*` for durability.

**M5 — Video Analysis & Computer Vision**

Responsibility: accept uploaded drone or surveillance videos and process them frame-by-frame with YOLOv8, returning annotated output for post-incident review.

Components:
- Services: [yolo_service.py](../app/services/yolo_service.py) (shared model loader — single instance across M5 and M6), [yolo_detector.py](../app/services/yolo_detector.py), [yolo_segmenter.py](../app/services/yolo_segmenter.py), [video_processor.py](../app/services/video_processor.py).
- Model artifact: `yolov8n.pt` (~6 MB) at repo root.
- Endpoints: 4 routes — upload, status poll, list, analysis-result.
- UI: [VideoAnalysis.jsx](../frontend/src/pages/VideoAnalysis.jsx).

Processing pipeline: upload → queue `BackgroundTasks` → OpenCV read → YOLO predict → annotate → write output → status `uploading → processing → completed`.

**M6 — Real-Time Surveillance**

Responsibility: stream a live IP-camera or webcam feed through the server, run YOLO inference on each frame, and push annotated frames to the browser at target FPS.

Components:
- Endpoint: `WS /api/v1/realtime/detect` with query params `token`, `confidence`, `ip_cam_url`, `use_webcam` ([realtime.py](../app/api/v1/endpoints/realtime.py)).
- Wire protocol: alternating JSON metadata (`{type, frame_id, detections, size}`) and binary JPEG at ~15 FPS.
- OpenCV tuning: `CAP_PROP_BUFFERSIZE=1` for minimum latency; automatic reconnect on camera disconnect.
- UI: [LiveSurveillance.jsx](../frontend/src/pages/LiveSurveillance.jsx).

Shares the loaded YOLO model with M5 via `yolo_service.py`, avoiding duplicate cold-loads.

**M7 — NLP Disaster Intelligence**

Responsibility: passively collect global disaster signals from Reddit, classify them with NLP, and surface aggregated dashboards so operators see emerging trends.

Components:
- Scraper: [reddit_service.py](../app/services/reddit_service.py) monitors **43 subreddits** across 5 categories with 3-second delays.
- NLP pipeline: [nlp_processor.py](../app/services/nlp_processor.py) — spaCy `en_core_web_sm` (NER: GPE/LOC/FAC), TextBlob (sentiment polarity), rule-based keyword matching (12-class disaster taxonomy with severity weights 1–10).
- Orchestration: [background_tasks.py](../app/services/background_tasks.py) — lifespan-managed thread, gated by `ENABLE_REDDIT_FETCHING`.
- Models: `DisasterPost` (raw), `DisasterInsight` (processed), `DisasterStats` (aggregated).
- Endpoints: 6 dashboard routes in [disaster.py](../app/api/v1/endpoints/disaster.py).
- UI: [LiveDashboard.jsx](../frontend/src/pages/LiveDashboard.jsx).

**M8 — SMS Alert & Notification**

Responsibility: deliver SMS to Nepali phone numbers through Aakash SMS v3 — both automatic (triggered by M2 status transitions) and manual (admin broadcasts).

Components:
- Endpoints: 4 routes in [sms.py](../app/api/v1/endpoints/sms.py) — single, bulk, broadcast, citizens-with-phone preview.
- Phone normalization: strip `+977` / `977` prefix, enforce 10-digit Nepali format, cap messages at 500 chars.
- Automatic hook: invoked in a background thread from M2's PATCH endpoint with status-specific Sankalpa-branded templates.

M8 is a consumer of M2 (receives status change events) and a peer of M10 (broadcast endpoint is admin-only, guarded by M1 dependencies).

**M9 — Weather Advisory**

Responsibility: transform raw weather metrics into actionable flight / response guidance using an LLM.

Components:
- Endpoints: `POST /api/v1/weather/ai-advisory`, `POST /api/v1/weather/generate-report` ([weather.py](../app/api/v1/endpoints/weather.py)).
- Input: pre-computed threshold checks + raw metrics + context (`drone_takeoff` | `disaster_response`) + optional `disaster_type` / `location`.
- LLM: `deepseek/deepseek-v3-0324` via Hugging Face Inference Router.
- Output: four-section structured text — `RECOMMENDATION`, `RISK_LEVEL`, `KEY_CONCERN`, `ACTION`.
- UI: [NepalWeather.jsx](../frontend/src/pages/NepalWeather.jsx), [AdminWeather.jsx](../frontend/src/pages/AdminWeather.jsx), [IncidentWeather.jsx](../frontend/src/pages/IncidentWeather.jsx).

**M10 — Analytics & Visualization**

Responsibility: aggregate data across M2, M3, M5, and M7 into charts, heatmaps, timelines, and exportable reports for administrative oversight.

Components:
- Aggregation endpoint: `GET /api/v1/users/admin/stats` returns totals, role/district distributions, monthly trends, top contributors, per-module status distributions.
- Dashboard pages: [AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx), [AdminDashboard.jsx](../frontend/src/pages/AdminDashboard.jsx).
- Specialized views: [DroneVisualization.jsx](../frontend/src/pages/DroneVisualization.jsx) (three.js 3D), [NoFlyZone.jsx](../frontend/src/pages/NoFlyZone.jsx), location heatmaps, timeline analyses.
- Libraries: Recharts, Chart.js, ECharts (+ `echarts-extension-gmap`), Plotly, Nivo, Leaflet, three.js.
- Exports: PDF (jspdf + jspdf-autotable), CSV (file-saver).

M10 is a read-only consumer — it queries across modules but does not mutate their state.

#### Cross-Cutting Services

Three services provide infrastructure consumed by multiple modules:

- **`ws_manager.py`** — channel-based pub/sub for the notification WebSocket. Channels: `reports` (M2, M4), `citizens`/`users` (M1, M10), `permits` (M3), `video:{id}` (M5). Messages are minimal `{channel, event}` envelopes — clients re-fetch via REST on receipt.
- **`background_tasks.py`** — hosts long-running threads (Reddit scraper for M7) managed by FastAPI's `lifespan` context so they start on boot and stop cleanly on shutdown.
- **Database session factory** ([app/database/database.py](../app/database/database.py)) — provides per-request SQLAlchemy sessions via `Depends(get_db)` to every endpoint.

#### Inter-Module Coupling Summary

| From | To | Coupling type |
|---|---|---|
| All modules | M1 | Role-based authorization (dependency injection) |
| M2 | M8 | Event (status change → SMS in background thread) |
| M2, M3 | ws_manager | Publish state-change events |
| M4 | M2 | Reads reports via REST, updates via PATCH |
| M4 | Firebase | Subscribes directly to drone telemetry |
| M5, M6 | yolo_service | Share single loaded model instance |
| M7 | Reddit, spaCy, TextBlob | External intelligence pipeline |
| M10 | M2, M3, M5, M7 | Read-only aggregation across modules |

This decomposition follows two principles: **data ownership** (each table has a single owning module) and **authorization at the boundary** (role checks are applied in the dependency layer, not inside business logic), which together make the system easy to reason about and safe to extend.

---

### 3.6.3.3 Frontend–Backend–Database Interaction

The three tiers communicate through four distinct channels, each optimized for its payload characteristics: REST for request/response CRUD, a lightweight notification WebSocket for state-change hints, a heavy binary WebSocket for YOLO video frames, and a direct Firebase subscription for drone telemetry. This section specifies the exact contracts, flows, and guarantees of each channel.

#### Communication Channels

**Channel 1 — REST over HTTPS (axios ↔ FastAPI)**

All CRUD operations (auth, reports, permits, users, videos, SMS, weather, NLP dashboard queries) travel over standard HTTPS REST. On the frontend, requests go through a centralized axios instance in [frontend/src/services/api.js](../frontend/src/services/api.js) that automatically attaches the `Authorization: Bearer <jwt>` header and `session_id` cookie. On the backend, every request is validated against Pydantic schemas in [app/schemas/](../app/schemas/) and dispatched to a route handler under [app/api/v1/endpoints/](../app/api/v1/endpoints/).

Authentication is **dual-mode** ([dependencies/auth.py](../app/api/v1/dependencies/auth.py)): a request is accepted if **either** a valid JWT is present **or** the session cookie resolves to an active `UserSession` row. This means SPA API calls (JWT) and cross-origin browser redirects (cookie) are both handled transparently.

**Channel 2 — Notification WebSocket (`/api/v1/ws`)**

Used for lightweight state-change hints: a new report, a permit status change, a user update, a video-processing progress event. The protocol is minimal — JSON envelopes of the form `{channel, event}` — and clients are expected to re-fetch the affected resource via REST on receipt. This keeps the socket cheap (tiny payloads, no duplicated data) and preserves REST as the single source of truth.

Channels: `reports`, `citizens`, `users`, `permits`, `video:{id}`. Authentication uses a JWT passed as a query parameter on socket connect. Channel subscribers are managed by [ws_manager.py](../app/services/ws_manager.py) as in-memory sets.

**Channel 3 — Detection WebSocket (`/api/v1/realtime/detect`)**

Used exclusively for the live YOLO surveillance feature ([LiveSurveillance.jsx](../frontend/src/pages/LiveSurveillance.jsx) ↔ [realtime.py](../app/api/v1/endpoints/realtime.py)). The protocol alternates JSON metadata frames (`{type, frame_id, detections, size}`) with binary JPEG-encoded annotated frames at ~15 FPS. OpenCV's `CAP_PROP_BUFFERSIZE=1` keeps latency minimal. This channel is deliberately isolated from Channel 2 so that video traffic cannot starve notification delivery.

**Channel 4 — Firebase Realtime Database (direct subscription)**

Drone GPS and sensor telemetry bypasses the backend entirely for latency-sensitive push. Field-device drones write directly to Firebase nodes keyed by `drone_id`. Officer Command Center maps and the admin 3D visualization subscribe directly via the Firebase Web SDK ([frontend/src/firebase/firebase.js](../frontend/src/firebase/firebase.js)), receiving updates in sub-second time. A backend sync job periodically reads the latest position per deployed drone and persists it into `drone_deployments.last_known_latitude` / `last_known_longitude` / `last_sync_at` so the system of record has a durable snapshot.

#### End-to-End Request/Response Contract

Every REST call follows a consistent layered flow from browser to database and back:

```
┌────────────────────────────────────────────────────────────────┐
│  1. Browser                                                    │
│     React page (e.g. DisasterReport.jsx) fires axios.post(...) │
│     Auth headers auto-attached: Bearer JWT + session cookie    │
└───────────────────────┬────────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼────────────────────────────────────────┐
│  2. FastAPI router                                             │
│     Route matched (e.g. POST /api/v1/disaster-reports/reports) │
│     Pydantic validates body against schema                     │
│     Depends(get_current_citizen) → resolves user + role        │
│     Depends(get_db)              → injects SQLAlchemy session  │
└───────────────────────┬────────────────────────────────────────┘
                        │
┌───────────────────────▼────────────────────────────────────────┐
│  3. Endpoint handler (app/api/v1/endpoints/*)                  │
│     Coordinates: validation, DB write, side effects            │
│     Side effects: ws_manager.notify(), background SMS thread   │
└───────────────────────┬────────────────────────────────────────┘
                        │
┌───────────────────────▼────────────────────────────────────────┐
│  4. SQLAlchemy ORM                                             │
│     Model instantiation → session.add() / .commit()            │
│     CheckConstraint validates enums at storage layer           │
└───────────────────────┬────────────────────────────────────────┘
                        │
┌───────────────────────▼────────────────────────────────────────┐
│  5. PostgreSQL                                                 │
│     Row inserted, transaction committed, FK + CHECK enforced   │
└───────────────────────┬────────────────────────────────────────┘
                        │ (response bubbles back up)
┌───────────────────────▼────────────────────────────────────────┐
│  6. Response serialization                                     │
│     SQLAlchemy model → Pydantic response schema → JSON         │
└───────────────────────┬────────────────────────────────────────┘
                        │
┌───────────────────────▼────────────────────────────────────────┐
│  7. Browser                                                    │
│     axios resolves, React state updates, UI re-renders         │
│     (meanwhile, other clients receive a WS hint and re-fetch)  │
└────────────────────────────────────────────────────────────────┘
```

#### Authentication & Authorization Flow

Every protected interaction passes through a uniform auth/role gate:

1. User logs in via Google OAuth (`@react-oauth/google` on the SPA) + Gmail-delivered OTP. On success, the backend issues a JWT (returned in the response body) and sets an `httponly` session cookie with `samesite=lax`.
2. The SPA stores the JWT in memory (not localStorage) and relies on the cookie for cross-tab continuity.
3. On every subsequent request, axios attaches the `Authorization: Bearer <jwt>` header; the browser automatically sends the session cookie.
4. FastAPI's `Depends(get_current_user)` validates **either** credential; `Depends(get_current_citizen | officer | admin)` additionally enforces role, raising HTTP 403 on mismatch.
5. Server-side sessions use sliding-window expiry — every authenticated request refreshes `UserSession.last_active_at`. `destroy_all_user_sessions()` forces a global logout.

Role elevation happens only at registration. Officers must present an organization code (one of three agency codes from `.env`); admins must present the master admin code. Both are validated in [auth_service.py](../app/services/auth_service.py) against `pydantic-settings`-loaded config and persisted on the `User` row (`organization_code`). Subsequent requests rely solely on the JWT/cookie — codes are never re-requested.

#### Concrete End-to-End Example: Citizen Report → Officer Dispatch

This scenario exercises all four channels:

**Step 1 — Citizen submits a report (REST)**
- [DisasterReport.jsx](../frontend/src/pages/DisasterReport.jsx) captures GPS via the browser Geolocation API.
- User picks type = `flood`, severity = `HIGH`, writes description, attaches two photos.
- Axios: `POST /api/v1/disaster-reports/reports` → Pydantic validation → `DisasterReport` row inserted with `status=PENDING`.
- Second call: `POST /api/v1/disaster-reports/reports/{id}/media` → photos saved under `uploads/disaster_images/`, metadata in `disaster_report_images`.

**Step 2 — Broadcast to officers (Notification WebSocket)**
- Endpoint handler calls `ws_manager.notify("reports", "new_report")`.
- Every officer's [CommandCenter.jsx](../frontend/src/pages/CommandCenter.jsx) is subscribed to channel `reports`; each receives the tiny envelope `{channel: "reports", event: "new_report"}`.
- Each Command Center fires `GET /api/v1/disaster-reports/map/markers` (REST) and drops a new severity-colored radar-pulse marker on the Leaflet map.

**Step 3 — Officer triages (REST + WebSocket + SMS)**
- Officer clicks the marker; the map flies to target via `FlyToTarget` component.
- Officer assigns to self, changes status to `REVIEWING`: `PATCH /api/v1/disaster-reports/reports/{id}`.
- Handler:
  - Inserts a `DisasterReportStatusHistory` row (previous=PENDING, new=REVIEWING, officer identity, timestamp).
  - Spawns a background thread that calls the Aakash SMS v3 API with the Sankalpa-branded template ("Hi {name}, your {type} report is now Under Review…").
  - Broadcasts `ws_manager.notify("reports", "status_updated")` → every connected Command Center re-fetches.

**Step 4 — Drone dispatch (Firebase + backend sync)**
- Officer clicks "Deploy Drone" → `DroneDeployment` row created, linked to the report, `mission_status=DEPLOYED`.
- The drone begins writing GPS to Firebase under the matching `drone_id` node.
- [CommandCenter.jsx](../frontend/src/pages/CommandCenter.jsx) subscribes directly to that Firebase node via the Web SDK — markers move in sub-second real time.
- Backend sync job periodically reads Firebase and writes `last_known_latitude` / `longitude` / `last_sync_at` into `drone_deployments` so the system of record stays durable.
- Mission FSM progresses: `DEPLOYED → EN_ROUTE → ON_SITE → RETURNING → COMPLETED`, each transition recorded with timestamps and flight metrics.

**Step 5 — Live surveillance during mission (Detection WebSocket)**
- Officer opens [LiveSurveillance.jsx](../frontend/src/pages/LiveSurveillance.jsx).
- Client connects to `WS /api/v1/realtime/detect?token=<jwt>&ip_cam_url=<rtsp>&confidence=0.45`.
- Server opens the stream with OpenCV (`CAP_PROP_BUFFERSIZE=1`), iterates frames, runs `yolo_service.predict()`, alternates JSON metadata and binary JPEG on the socket at ~15 FPS.
- Client renders annotated video inline.

**Step 6 — Resolution (REST + SMS)**
- Officer progresses status to `RESOLVED`; another `DisasterReportStatusHistory` row + another Sankalpa SMS + another `ws_manager.notify` event.
- [MyDisasterReports.jsx](../frontend/src/pages/MyDisasterReports.jsx) on the citizen's side shows the final status via `GET /api/v1/disaster-reports/reports/my-reports`.

In a single incident, all four channels cooperate: REST for authoritative CRUD, notification WebSocket for cheap state-change hints, Firebase for high-frequency telemetry, and the detection WebSocket for heavy video frames — each handling the payload class it is best suited for.

#### Database Interaction Details

**ORM layer**: SQLAlchemy 2.0 declarative models under [app/models/](../app/models/) map 1:1 to PostgreSQL tables. The `engine` and declarative `Base` live in [app/database/database.py](../app/database/database.py); per-request sessions are provided through `Depends(get_db)` which yields a session and closes it in a `finally` block.

**Schema management**: `Base.metadata.create_all(engine)` runs on FastAPI `lifespan` startup, creating any missing tables. Richer schema changes (index additions, column alterations) live as versioned SQL files under [migrations/](../migrations/) and are applied by [run_migration.py](../app/run_migration.py).

**Integrity guarantees**:
- **Foreign keys** enforce referential integrity across all cross-table relationships (User → DisasterReport, DisasterReport → DisasterReportImage, etc.).
- **Cascade delete** removes dependent rows (images, status history, deployments) when a report is deleted.
- **`CheckConstraint`s** enforce enum validity at the storage layer, not just the app layer — severity ∈ {LOW/MEDIUM/HIGH/CRITICAL}, mission status ∈ {DEPLOYED/EN_ROUTE/ON_SITE/RETURNING/COMPLETED/ABORTED}, and others.
- **`DECIMAL(10,8)` / `DECIMAL(11,8)`** for latitude/longitude prevent floating-point drift.

**Query patterns**: hot-path columns (`disaster_reports.status`, `.severity`, `.disaster_type`, `disaster_insight.urgency_level`) are indexed. Joins against user counts for admin analytics are precomputed in a single aggregation endpoint (`GET /api/v1/users/admin/stats`) rather than scattered across multiple round-trips.

**Media storage**: binary media (photos, permit documents, videos, YOLO-annotated outputs) are stored on the local filesystem under `uploads/{category}/` with timestamp-prefixed filenames; only their paths and metadata (mime, size, dimensions) live in the database. The FastAPI `StaticFiles` mount at `/uploads` serves these files directly to the browser without round-tripping through route handlers.

#### Summary of Interaction Guarantees

| Guarantee | Mechanism |
|---|---|
| **Authoritative authorization** | FastAPI `Depends(get_current_*)` on every protected route — not relying on frontend guards |
| **Single source of truth for state** | REST + Postgres; WebSocket carries only hints, never records |
| **Sub-second telemetry** | Firebase RTDB direct subscription bypasses the backend |
| **Storage-layer integrity** | `CheckConstraint` + FK + cascade rules catch bugs that bypass app-level validation |
| **Immutable audit** | `disaster_report_status_history` append-only, permit review one-shot |
| **Channel isolation** | Notification WS cannot be starved by video WS; both are independent of Firebase |
| **Dual-mode auth** | JWT **or** session cookie — no single credential failure locks a user out mid-session |

These guarantees together define a system where every user action — a citizen submitting a report, an officer assigning it, a drone broadcasting GPS, an admin broadcasting SMS — propagates through the architecture within sub-second latency, with every state transition durably recorded and every access decision independently verified on the server.
