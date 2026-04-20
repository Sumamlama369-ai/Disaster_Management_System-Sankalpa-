# Hardware / Physical Design — Disaster Management System

This document describes the **physical and hardware design** of the Disaster Management System. While the platform is primarily a software stack (FastAPI + React + PostgreSQL + Firebase + YOLOv8), it operates across a heterogeneous set of physical devices — aerial drones that broadcast live GPS, IP cameras that feed surveillance footage, citizen smartphones that capture geotagged incident evidence, officer workstations that run the Command Center, and server infrastructure that hosts the backend. This section specifies how those physical components are arranged, connected, powered, and protected, and the safety/operational rules that govern them.

The hardware design is driven by three constraints specific to this project's context (district-level disaster response in Nepal):

1. **Modest hardware footprint** — the platform must run on commodity infrastructure. YOLOv8 nano (`yolov8n.pt`, ~6 MB) is deliberately chosen so inference works on a CPU or an entry-level GPU; no specialist deep-learning hardware is required.
2. **Intermittent connectivity tolerance** — field devices (drones, citizen phones) may operate in areas with weak or unreliable cellular coverage. The architecture uses Firebase for telemetry precisely because its offline-capable SDK buffers writes during disconnection.
3. **Low-friction deployment** — the entire server side ships as three Docker containers, deployable via `docker-compose up` on any single host with moderate CPU, RAM, and storage.

---

## 3.6.8 Hardware / Physical Design

The hardware design covers four perspectives, from macro (end-to-end physical topology) to specific (per-component assembly, supporting peripherals, and operational safety rules).

---

### 3.6.8.1 Hardware Architecture

The system's physical architecture spans five distinct hardware classes, connected by three network transports. Each class has a specific role in the data-flow loop that begins at a citizen's smartphone and ends on an officer's Command Center screen.

#### Hardware Topology Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                      FIELD DEVICES (Mobile / Remote)               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   📱 Citizen Smartphone         ✈  Drone (UAV)        🎥 IP Camera │
│   ┌───────────────────┐     ┌─────────────────┐   ┌──────────────┐ │
│   │ GPS chip          │     │ GPS module      │   │ RTSP / HTTP  │ │
│   │ Camera (CMOS)     │     │ Flight computer │   │ streaming    │ │
│   │ 4G/Wi-Fi modem    │     │ Camera payload  │   │ Wi-Fi/LAN    │ │
│   │ Browser (React SPA)│     │ 4G/Wi-Fi modem  │   │ PoE / DC PSU │ │
│   └─────────┬─────────┘     └────────┬────────┘   └──────┬───────┘ │
└─────────────┼───────────────────────┼────────────────────┼─────────┘
              │ HTTPS + WS            │ Firebase write    │ RTSP/HTTP
              │                       │                   │
┌─────────────▼───────────────────────▼───────────────────▼─────────┐
│                       NETWORK TRANSPORT LAYER                     │
│   Cellular (4G/LTE) · Public Internet · Wi-Fi · LAN               │
└─────────────┬───────────────────────┬────────────────────┬────────┘
              │                       │                    │
┌─────────────▼──────────────┐  ┌─────▼──────────┐  ┌─────▼─────────┐
│  BACKEND SERVER (Docker)   │  │ FIREBASE RTDB  │  │ SURVEILLANCE  │
│  ┌──────────────────────┐  │  │ (Google Cloud) │  │ WORKSTATION   │
│  │ FastAPI container    │  │  │                │  │ (connects to  │
│  │  + Uvicorn           │  │  │ sub-second     │  │ IP cam,       │
│  │  + YOLOv8 (CPU/GPU)  │  │  │ pub/sub for    │  │ relays feed   │
│  ├──────────────────────┤  │  │ drone GPS      │  │ through       │
│  │ PostgreSQL container │  │  │                │  │ backend WS)   │
│  ├──────────────────────┤  │  └────────────────┘  └───────────────┘
│  │ Nginx container      │  │
│  │  (frontend + proxy)  │  │
│  └──────────────────────┘  │
│  Local disk: uploads/      │
└────────────┬───────────────┘
             │ HTTPS
┌────────────▼─────────────────────────────────────────────────────┐
│                       OPERATOR WORKSTATIONS                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   💻 Officer Desktop          💻 Admin Desktop                   │
│   ┌────────────────────┐      ┌────────────────────┐             │
│   │ Browser (Chrome)   │      │ Browser (Chrome)   │             │
│   │ Leaflet map        │      │ 3D three.js scene  │             │
│   │ WS subscriber      │      │ Analytics charts   │             │
│   │ Firebase subscriber│      │ User management UI │             │
│   └────────────────────┘      └────────────────────┘             │
└──────────────────────────────────────────────────────────────────┘
```

#### Hardware Classes and Their Roles

**Class 1 — Citizen Smartphone / Mobile Device**

- **Role**: primary capture device for disaster reports. Provides geolocation (GPS or A-GPS), camera (still images + video), and browser access to the React SPA.
- **Minimum specification**: any device that can run a modern browser (Chrome ≥100, Safari ≥15, Firefox ≥100) with the HTML5 Geolocation API and file upload support. No native app is required — the SPA runs purely in the browser.
- **Connectivity**: 4G/LTE cellular or Wi-Fi. Works offline for data entry, but submission and media upload require connectivity.
- **Data produced**: GPS coordinates (WGS84), photo files (JPEG/PNG/WebP ≤10 MB), video files (MP4/WebM/MOV/AVI ≤50 MB).

**Class 2 — Drone (UAV)**

- **Role**: aerial search-and-rescue asset. Deployed by officers to incident sites to provide real-time GPS position and optional camera feed.
- **Key subsystems**:
  - GPS module (GNSS / GPS / GLONASS) — broadcasts position ≥1 Hz.
  - Flight controller / companion computer — runs firmware that writes position to Firebase RTDB over 4G or Wi-Fi.
  - Camera payload (optional) — sends video to a ground station or directly to an RTSP endpoint reachable by the backend.
  - Radio / 4G modem — uplink channel to Firebase.
- **Data produced**: latitude, longitude, altitude, heading, speed, battery level — written to `/drones/{drone_id}` in Firebase. Optional H.264/H.265 video stream.
- **What the platform does not do**: the backend **does not fly the drone**. It is strictly a telemetry consumer. Flight autonomy and control are handled by the drone's own flight controller and ground-control software.

**Class 3 — IP Camera (fixed surveillance feed)**

- **Role**: provides live video to the YOLOv8 detection pipeline for officer monitoring.
- **Interface**: any RTSP or HTTP-accessible camera reachable at a URL like `rtsp://192.168.1.100:554/stream1` or `http://192.168.1.100:8080/video`. Configured via the `IP_CAM_URL` env var or overridden per-session through the `ip_cam_url` query param on the `/api/v1/realtime/detect` WebSocket.
- **Fallback**: if no IP camera is available, `use_webcam=true` opens the local USB webcam at OpenCV device index 0 on the server host.
- **Throughput**: the backend samples at `YOLO_TARGET_FPS=15` (configurable). `CAP_PROP_BUFFERSIZE=1` is set in OpenCV to minimize latency by discarding queued frames.

**Class 4 — Backend Server Host**

- **Role**: runs the FastAPI application, PostgreSQL database, Nginx front proxy, YOLOv8 inference, spaCy/TextBlob NLP, and the Reddit scraper. A single physical or virtual host is sufficient for an MVP deployment.
- **Recommended specification**:
  - **CPU**: 4+ cores (YOLOv8 nano runs on CPU; 8 cores recommended when running live surveillance + background Reddit scraping concurrently).
  - **RAM**: 8 GB minimum, 16 GB recommended (PostgreSQL ~2 GB, YOLOv8 model + OpenCV ~1.5 GB, FastAPI + Uvicorn ~500 MB, headroom).
  - **Storage**: 100 GB minimum for the `uploads/` directory (photos, permit documents, original videos, YOLO-annotated outputs grow over time). SSD preferred for database IO.
  - **Optional GPU**: any CUDA-capable card (GTX 1050 or newer) accelerates YOLOv8 inference to 30+ FPS if available; optional because the nano model performs acceptably on CPU.
  - **Network**: stable Internet with public IPv4 or reverse-proxied domain; minimum 10 Mbps upload to serve video streams.
- **Deployment form factor**: three Docker containers orchestrated by [docker-compose.yml](../docker-compose.yml) — `backend` (FastAPI + YOLOv8), `frontend` (Nginx + compiled SPA), `db` (PostgreSQL with persistent volume).

**Class 5 — Operator Workstations (Officer / Admin)**

- **Role**: the primary human interface. Operators interact entirely through a web browser — no desktop application installation is required.
- **Recommended specification**:
  - **Display**: 1920×1080 or higher; dual monitors recommended for officers who want the Command Center map and the Live Surveillance feed simultaneously.
  - **GPU**: any hardware with WebGL support for three.js 3D drone visualization on the admin dashboard.
  - **Browser**: Chrome / Chromium is the primary target; Edge and Firefox are supported.
  - **Input**: keyboard + mouse; touchscreens work but the Leaflet map interactions are optimized for pointer input.
- **Connectivity**: stable LAN or 4G/LTE; WebSocket disconnects are auto-reconnected by the SPA.

#### Network Transport Layers

Three distinct transports connect the hardware classes:

| Transport | Endpoints | Payload |
|---|---|---|
| **HTTPS (TLS)** | Browsers ↔ Nginx (port 443 in production, 5173/3000 in dev) | REST API, static assets, WebSocket upgrade handshake |
| **WebSocket (WSS)** | Browsers ↔ FastAPI (`/api/v1/ws`, `/api/v1/realtime/detect`) | Notification envelopes; JPEG frames at 15 FPS |
| **Firebase pub/sub** | Drone firmware / Browser ↔ Firebase RTDB | JSON telemetry documents under `/drones/{id}` |
| **RTSP / HTTP (camera)** | Backend ↔ IP camera | H.264/MJPEG video frames |

Transport separation is intentional: video traffic on the detection WebSocket cannot starve notification traffic on the lightweight WebSocket, and a cellular outage on a drone does not block HTTPS API calls from citizens on Wi-Fi.

---

### 3.6.8.2 Assembly Design Considerations

"Assembly" here means how the physical and logical parts are packaged, installed, and wired together to form a deployable system. Since the backend, database, and frontend are software artifacts, their "assembly" is containerization. Field devices (drones, cameras) have physical assembly considerations tied to their role.

#### 3.6.8.2.1 Server-Side Assembly — Docker Composition

The server side is assembled as **three Docker images** orchestrated by a single compose file:

```yaml
services:
  backend:    # FastAPI + Uvicorn + YOLOv8 + OpenCV
  frontend:   # Nginx serving compiled React bundle, proxying /api/*
  db:         # PostgreSQL 15+ with persistent volume
```

**Assembly sequence** on a fresh host:

1. Install Docker Engine and docker-compose.
2. Clone the repository; populate `.env` with all required secrets (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AAKASH_SMS_AUTH_TOKEN`, `HF_API_TOKEN`, Firebase credentials, `ORG_CODE_NDRF`, `ORG_CODE_FIRE`, `ORG_CODE_POLICE`, `MASTER_ADMIN_CODE`).
3. Drop the YOLOv8 weights `yolov8n.pt` (~6 MB) at the repository root — this ships with the codebase.
4. Run `docker-compose up -d`; the three containers start, share a private network, and `Base.metadata.create_all(engine)` bootstraps the schema on first run.
5. Confirm health via `GET /docs` (Swagger UI at port 8000) and the frontend root (port 3000).

**Key assembly decisions**:

- **Volumes for persistence** — PostgreSQL uses a named Docker volume so data survives container recreation. The `uploads/` directory is bind-mounted from the host filesystem so media files survive redeploys.
- **`.dockerignore`** excludes `venv/`, `node_modules/`, local `uploads/` artifacts, and `.env` so the images stay lean and secrets never leak into layers.
- **Nginx reverse-proxy configuration** (`frontend/nginx.conf`) routes `/api/*` and `/uploads/*` to the backend container and serves everything else from the compiled SPA. This keeps the browser talking to a single origin and simplifies CORS.
- **Health checks** — each container has a healthcheck so compose can wait for Postgres to be ready before starting the backend.

#### 3.6.8.2.2 Field Device Assembly — Drone

Drone assembly is outside the software repository but must integrate with it:

- **Flight-controller firmware** — must include a module that writes position, altitude, heading, speed, and battery to Firebase Realtime Database under a consistent node path (`/drones/{drone_id}`). This can be implemented on a Raspberry Pi companion computer running a small Firebase SDK script, or baked into the flight controller if it supports HTTPS PUT/PATCH.
- **Uplink modem** — 4G/LTE modem for over-the-air connectivity during flight; Wi-Fi for ground-based bench testing.
- **Power subsystem** — LiPo battery sized for expected mission duration. Telemetry drops when battery is low; the platform interprets absent telemetry as "last known position" (from `drone_deployments.last_known_*`).
- **Camera payload** — optional; if the drone carries a camera whose RTSP feed is reachable, it can be added as an IP camera source for the Live Surveillance feature.

**Assembly integration point**: the officer, on deploying a drone via the Command Center, enters the drone's `drone_id` — which must match the Firebase node path the drone firmware writes to. This string is the contract between physical hardware and software.

#### 3.6.8.2.3 Field Device Assembly — IP Camera

IP cameras for the Live Surveillance feature require:

- **Mounting** — at a fixed vantage point (building roof, observation tower, surveillance pole) with unobstructed view of the monitored area.
- **Power over Ethernet (PoE)** or local DC power with UPS backup so the feed survives brief grid outages.
- **Network** — wired LAN preferred for latency; Wi-Fi acceptable with a strong signal.
- **Configuration** — RTSP or HTTP streaming enabled, reachable from the backend host; URL captured in `.env` as `IP_CAM_URL` (default) or passed per-session as a query parameter.
- **Resolution vs. bandwidth tradeoff** — higher resolutions (1080p, 4K) improve YOLO detection but strain the backend's inference loop; 720p is a reasonable default at `YOLO_TARGET_FPS=15`.

#### 3.6.8.2.4 Operator Workstation Assembly

Operator workstations require only a modern browser and stable Internet — no local installation. For officers who spend full shifts on the Command Center, ergonomic assembly matters:

- **Dual-monitor setup** — map on the primary monitor, surveillance feed / drone GPS on the secondary. Both pages share the same browser session.
- **Bandwidth budgeting** — a single live surveillance feed at 15 FPS consumes ~1–3 Mbps; a district Command Center with simultaneous feed, Firebase drone subscription, and notification WS should plan for 10 Mbps downlink headroom.
- **Browser profile isolation** — officer and admin accounts should log in on separate browser profiles / private windows to avoid accidental cross-role actions.

---

### 3.6.8.3 Supporting Physical Components

Beyond the primary hardware classes, a production deployment relies on several supporting components that are easy to overlook but critical for reliability.

#### 3.6.8.3.1 Power and Uninterruptible Supply

- **Server host** — UPS with at least 15 minutes of runtime at peak load, so a brief power interruption doesn't truncate ongoing video analyses or force a hard PostgreSQL shutdown.
- **IP cameras** — PoE switch with UPS backup; battery-backed PoE keeps surveillance feeds alive during outages, which is exactly when they matter most.
- **Drones** — LiPo battery matched to expected mission profile. Firmware reports battery percentage to Firebase so officers can recall the drone before depletion.
- **Operator workstations** — UPS recommended but not critical; the platform's state lives server-side, so a workstation power loss only interrupts the session.

#### 3.6.8.3.2 Networking Equipment

- **Backend host uplink** — stable Internet with public IPv4 (or NAT with reverse-proxy) and a domain name with a valid TLS certificate (e.g. via Let's Encrypt). HTTPS is assumed by the browser SPA (`@react-oauth/google` requires a secure origin).
- **Internal LAN** — gigabit switch for the backend host to achieve low-latency Postgres + file-system IO and to pull high-resolution IP-camera streams without bottleneck.
- **Firewall rules** — only ports 80 (HTTP → HTTPS redirect) and 443 (HTTPS + WSS) should be exposed publicly. Postgres port 5432 must remain on the internal Docker network.
- **Cellular coverage** — drones and field-deployed citizens depend on 4G/LTE coverage; in rural Nepal this is geographically uneven. The system's Firebase-first telemetry design is specifically a response to this: Firebase SDKs buffer writes during brief outages and flush on reconnect.

#### 3.6.8.3.3 Storage Subsystems

- **Database storage** — PostgreSQL data volume on SSD; 20–50 GB is ample for the structured data of a district-scale deployment for several years.
- **Media storage** — `uploads/` bind-mounted from the host. Grows linearly with usage:
  - Disaster report photos: ~2 MB average × reports per month.
  - Permit documents: ~4 PDFs × ~1 MB each × permits per month.
  - Original uploaded videos: up to 500 MB each.
  - YOLO-annotated outputs: roughly the same size as originals.
- **Backup strategy** — nightly `pg_dump` of the Postgres database to a separate disk or cloud bucket; weekly `tar` of the `uploads/` directory. Neither is automated by the platform itself; this is an operational responsibility.
- **Retention policy** — status history and permit records are legally significant and should be retained indefinitely. Raw scraped Reddit posts (`disaster_post`) and video frame data (`frame_analysis`) can be pruned after their dashboards aggregate them.

#### 3.6.8.3.4 Peripheral Input/Output Devices

- **Operator inputs** — standard keyboard + mouse; the Command Center map benefits from a scroll wheel for zoom.
- **Mobile GPS / camera** — built into the citizen's smartphone; no separate hardware is needed.
- **Drone ground-control hardware** — radio transmitter / ground station is separate from the platform. The platform only consumes telemetry, it does not issue flight commands.
- **USB webcam (optional)** — the Live Surveillance feature falls back to a USB camera at OpenCV device index 0 when `use_webcam=true` is passed. Useful for bench demos.

#### 3.6.8.3.5 External Service Dependencies (Logical Infrastructure)

While not "physical" in the classical sense, these remote services are essential physical infrastructure from the deployment's perspective:

| Service | Physical location | Platform dependency |
|---|---|---|
| Google OAuth 2.0 | Google datacenters | Blocks login if unreachable |
| Gmail SMTP | Google datacenters | Blocks OTP delivery |
| Firebase Realtime Database | Google Cloud | Blocks live drone GPS |
| Aakash SMS v3 | Nepal-based SMS gateway | Blocks SMS alerts |
| Hugging Face Inference Router | Novita / HF datacenters | Blocks AI weather advisory |
| Reddit public JSON | Reddit CDN | Blocks intelligence refresh |

An operations team should monitor each of these and have documented fallback behavior (e.g. weather advisory falls back to a static threshold table if HuggingFace is unreachable).

---

### 3.6.8.4 Safety and Operational Design Considerations

The system interacts with aerial vehicles, emergency responders, and vulnerable citizens during real disasters. Safety is therefore not a software feature — it is a design principle that shapes both hardware choices and operational procedures.

#### 3.6.8.4.1 Aerial Safety

**No-fly-zone enforcement**

- Admins define restricted airspace via [NoFlyZone.jsx](../frontend/src/pages/NoFlyZone.jsx) (airports, military zones, sensitive infrastructure).
- Permit applications and live deployments must respect these zones. Officers can see a no-fly overlay on the Command Center map before deploying a drone.
- **This is an advisory layer** — the platform does not issue flight commands and cannot physically stop a drone from entering a zone. Enforcement remains the operator's legal responsibility.

**Weather-gated dispatch**

- Before any drone deployment, officers are guided to consult the Weather Advisory (`POST /api/v1/weather/ai-advisory` with `context=drone_takeoff`).
- The AI advisory returns a `RISK_LEVEL` (LOW / MODERATE / HIGH / CRITICAL) and a GO / CAUTION / NO_GO recommendation based on raw metrics (wind speed, gusts, precipitation, visibility, pressure).
- Officers retain final judgement. The platform records the advisory in the deployment notes for post-incident review.

**Telemetry loss handling**

- If a drone stops writing to Firebase, the system retains its `last_known_latitude` / `last_known_longitude` from the most recent sync. The officer UI surfaces the stale timestamp so operators can distinguish "stationary drone" from "lost signal."
- `mission_status=ABORTED` is always available as an explicit terminal state; it is recorded in the FSM alongside completion.

**Battery-aware operation**

- Drone firmware reports battery percentage to Firebase. Officer UI is expected to surface low-battery warnings and recommend recall before the safe-landing threshold is breached.

#### 3.6.8.4.2 Responder Safety

**Role-gated dispatch**

- Only verified officers can change disaster report status beyond `PENDING`. This prevents citizens or unauthenticated actors from falsely claiming incidents are "resolved" and diverting responders.
- Organization codes (NDRF / Fire / Police) tie every officer's actions to their agency, so post-incident review can attribute decisions to the right chain of command.

**SMS confirmation loop**

- On every status change, the citizen who reported the incident receives an automatic SMS ("Sankalpa Alert: your report is now Under Review / Dispatched / Resolved"). This acts as a safety confirmation: if the citizen sees incorrect status, they can challenge the record.
- SMS is sent in a background thread so the PATCH response never blocks on Aakash's API — avoiding the situation where an officer thinks a status change failed and retries, generating duplicate SMS.

**Audit trail**

- `disaster_report_status_history` is append-only: every status transition is recorded with officer identity, role, timestamp, and optional notes. If a responder is injured or a decision is questioned, the trail is legally reconstructible.

#### 3.6.8.4.3 Citizen Safety

**Geolocation privacy**

- GPS coordinates are captured only with explicit browser permission (HTML5 Geolocation API consent prompt). The platform cannot passively track citizens.
- Coordinates are associated with reports, not with persistent tracking. The citizen's home location is not stored.

**Anonymous reporting**

- `user_id` on `disaster_reports` is nullable. A citizen can submit a report without being authenticated, with `reporter_name` defaulting to "Anonymous." This protects whistleblowers and emergency witnesses who may not want to identify themselves.

**SMS opt-out**

- Automatic SMS is triggered only when a citizen has provided a phone number. Citizens without phones receive no SMS; broadcast SMS from admins targets only `User.role == "citizen" AND is_active == True AND phone IS NOT NULL`.

#### 3.6.8.4.4 Data Security Considerations

**At rest**

- PostgreSQL volume should reside on an encrypted filesystem or cloud disk with server-side encryption.
- OTP codes are stored with short TTL (10 minutes) and limited attempt counts; in a future hardening pass, they should be hashed (noted in code review).
- Uploaded files under `uploads/` are not public — the `/uploads` static mount is reachable only through authenticated session context in production Nginx configuration.

**In transit**

- Production deployments must terminate TLS at Nginx. All browser ↔ backend traffic flows over HTTPS/WSS.
- Firebase uses its own TLS transport.
- Aakash SMS, Hugging Face, and Google OAuth are all HTTPS endpoints by default.

**Credentials management**

- Every external secret lives in `.env` loaded by `pydantic-settings`. No credentials are hardcoded.
- `.env` is gitignored; `.dockerignore` excludes it from images.
- Google OAuth token cache (`token.json`) is gitignored.
- Organization codes and the master admin code are secrets on par with API keys and must be rotated if leaked.

**Role enforcement hardness**

- RBAC is enforced at two layers: frontend `ProtectedRoute` (UX) and backend `Depends(get_current_*)` (authoritative). Even a compromised browser cannot invoke an officer-only endpoint without a matching JWT.
- Admins cannot deactivate themselves or change their own role — this prevents both accidental and adversarial self-lockout.

#### 3.6.8.4.5 Operational Resilience

**Graceful degradation**

The system is designed so that failure of any single external service degrades gracefully:

| If this fails | Impact |
|---|---|
| Google OAuth | New logins blocked; existing sessions continue. |
| Gmail SMTP | New OTP delivery fails; verified users unaffected. |
| Firebase RTDB | Drone live GPS stops; `last_known_*` snapshot persists; reports and permits unaffected. |
| Aakash SMS | Status-change SMS and broadcasts fail; the PATCH response still succeeds because SMS runs in a background thread. |
| Hugging Face | Weather advisory falls back to a plain threshold check; dispatch can still proceed. |
| Reddit | Intelligence dashboards stop refreshing; all other features unaffected. |
| PostgreSQL | System cannot serve any request. Highest-priority recovery target. |

**Container restart policy**

- `docker-compose` configures `restart: unless-stopped` on the backend and frontend containers, so crashes (e.g. OOM during a large video analysis) recover automatically.
- PostgreSQL is the single recovery-sensitive container; regular backups are the only real defense.

**Concurrency safety**

- `disaster_report_status_history` is append-only, preventing lost-update races on the status field.
- SMS dispatch is in a background thread so concurrent status PATCHes from multiple officers do not serialize on Aakash's API.
- YOLO model is loaded once in [yolo_service.py](../app/services/yolo_service.py) and shared across detection / segmentation / live streaming, avoiding the race of two cold loads competing for memory.

**Monitoring hooks**

- FastAPI's `/docs` provides interactive API health.
- `GET /api/v1/users/admin/stats` can double as a coarse health-check endpoint (returns non-error only if DB is reachable).
- Production deployments should add container-level metrics (CPU, RAM, disk, network) via the usual tooling (Prometheus, Grafana, or cloud-native equivalents) — these are outside the platform's own code but must exist in the operational envelope.

#### 3.6.8.4.6 Legal and Regulatory Considerations

- **Drone permits** — the permit form mirrors Nepal's official paper permit (drone specs + operator identity + address + documents + rule agreement). The digital form does not replace legal compliance with Nepal's Civil Aviation Authority rules; it digitizes the workflow.
- **SMS broadcasting** — restricted to admin role, and broadcasts target only active citizens with consented phone numbers, in alignment with acceptable-use expectations for a government disaster-response platform.
- **Personal data retention** — profile data, OTP rows, and sessions should be purged or anonymized in line with applicable data-protection rules when a user is deleted. Current soft-delete (`is_active=False`) preserves audit links; a future hardening pass can add a hard-delete pipeline.

---

## Summary

The Disaster Management System's hardware design is **minimal by intent**: five classes of devices (smartphone, drone, IP camera, server host, workstation) connected by three transports (HTTPS, WebSocket, Firebase pub/sub), with no specialist deep-learning hardware required thanks to YOLOv8's nano variant. Server-side assembly is a single `docker-compose up` on a commodity host. Field-device assembly for drones and IP cameras is specified through a small number of integration contracts (a matching `drone_id` for Firebase telemetry, an RTSP/HTTP URL for the camera feed). Supporting components — UPS, networking, storage, backups — exist at a typical operational tier for a district-scale system.

Safety is designed in at four levels: **aerial** (no-fly zones, weather advisory, telemetry-loss handling), **responder** (role gating, SMS confirmation, audit trails), **citizen** (geolocation consent, anonymous reporting, phone-opt-out), and **data** (TLS in transit, envelope-only WebSocket hints, secret management via `.env`, two-layer RBAC). The result is a hardware footprint that a district disaster-response authority can realistically deploy, operate, and maintain — with graceful degradation paths for every external dependency.
