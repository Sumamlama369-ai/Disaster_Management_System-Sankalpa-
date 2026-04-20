# Disaster Management System — Project Description

## 1. What Is This Project?

The **Disaster Management System** is a full-stack, multi-role platform that unifies **citizen-reported incidents**, **social-media disaster intelligence**, **drone permit regulation**, **aerial drone surveillance**, and **AI-driven video analysis** into a single operational command center. It is designed for disaster-response authorities (e.g. NDRF, Fire, Police), officers, and ordinary citizens working together during emergencies.

It combines:

- A **FastAPI** Python backend (REST + WebSocket APIs, SQLAlchemy ORM, PostgreSQL),
- A **React 19 + Vite + TailwindCSS** web frontend,
- A **YOLOv8** computer-vision pipeline for object detection / segmentation on uploaded or live video,
- A **Reddit scraping + NLP** intelligence pipeline (spaCy + TextBlob) for global disaster awareness,
- **Firebase Realtime Database** for live drone GPS tracking,
- **Google OAuth 2.0 + Gmail OTP** for secure multi-factor authentication,
- **Aakash SMS** integration for bulk disaster alerts,
- Weather advisory, heatmaps, timeline analytics, and 3D drone visualization.

---

## 2. Why This Project Exists (The Problem)

Disaster response in many regions (notably Nepal, which this system targets at the district/municipality level) suffers from fragmented tooling:

- Citizens have **no standard channel** to report real-time incidents with precise geolocation and photo evidence.
- Officers rely on **phone calls and manual dispatch**, with no unified dashboard showing all pending reports, drone deployments, and severity.
- **Drone operations are unregulated** or regulated via paper forms — there is no digital permit workflow with officer review.
- **Social-media signals** (Reddit, news) that reveal emerging disasters are not systematically ingested.
- **Video evidence** from surveillance feeds or drone footage is rarely processed automatically to detect people, vehicles, or hazards.
- **Alerting the public** via SMS requires separate, disconnected systems.

The project's purpose is to **close every one of these gaps in one coherent platform** so that a reported incident can flow from citizen → officer → drone dispatch → AI-assisted monitoring → public SMS alert without leaving the system.

---

## 3. Role-Based Features (Who Can Do What)

The system defines three hierarchical roles in [app/models/user.py:11-15](../app/models/user.py#L11-L15): `CITIZEN`, `OFFICER`, `ADMIN`. Role enforcement is two-layered — the frontend guards pages via [ProtectedRoute.jsx](../frontend/src/components/ProtectedRoute.jsx) (redirects mismatched users to their own dashboard), and the backend enforces it via dependency injectors in [app/api/v1/dependencies/auth.py](../app/api/v1/dependencies/auth.py) (`get_current_citizen`, `get_current_officer`, `get_current_admin`, returning **403 Forbidden** on mismatch).

### Citizen
- They can request a drone permit for emergency conditions such as search and rescue, submitting full drone specs, operator identity, Nepal address hierarchy, and four supporting documents.
- They can view weather updates with a 6-hour forecast and an AI-generated flight advisory.
- They can view no-fly zones for restricted airspace before flying.
- They can send real-time disaster request reports with GPS and photos, and receive automatic SMS updates as officers change the report status.
- They can upload drone-recorded videos for post-search-and-rescue analysis using computer vision (YOLOv8 object detection and instance segmentation).
- They can view a real-time disaster intelligence dashboard sourced from social media (Reddit) where NLP extracts disaster type, severity, sentiment, location, urgency, and trending keywords.

### Officer
- They can review and approve or reject drone permit requests submitted by citizens, with remarks and reviewer details permanently recorded.
- They can review citizen real-time disaster reports through live indication on a map of Nepal with live GPS tracking and severity-colored markers.
- They can deploy drones to an incident and manage the mission state (`DEPLOYED → EN_ROUTE → ON_SITE → RETURNING → COMPLETED`).
- They can view weather conditions and receive an AI-powered flight advisory before deploying a drone.
- They can see the drone's live motion and sensor data (GPS, status, flight metrics) streamed to the website in real time via Firebase.
- They can monitor live surveillance video with real-time YOLO object-detection overlay from an IP camera or webcam.

### Super (Admin)
- They can view overall system performance through analytics dashboards (totals, role distribution, district distribution, monthly trends, top contributors).
- They can manage user accounts — create, edit, soft-delete, reactivate, and change roles for any user.
- They can see the drone's live motion and sensor data live on the website, including a 3D visualization of drone position and flight paths.
- They can view weather data with live alerts and configure advisory thresholds system-wide.
- They can send real-time alert SMS to specific districts based on the alert information, targeting all active citizens with registered phone numbers.
- They can review citizen real-time disaster request reports through live indication on a map with live location tracking, with full override authority over officer decisions.
- They can define and manage no-fly zones that constrain permit applications and drone deployments nationwide.

### 3.1 Citizen (Public User)

**How they join**: Select "Citizen" on [RoleSelection.jsx](../frontend/src/pages/RoleSelection.jsx) → no code required → Gmail OTP verification → JWT + session cookie issued. Profile fields captured: `email` (from Google), `name`, `profile_picture`, optionally `phone` and `district` (can be set later).

**What they can do**:
| Capability | Where | Notes |
|---|---|---|
| Submit disaster reports with GPS + photos/videos | [DisasterReport.jsx](../frontend/src/pages/DisasterReport.jsx) → `POST /api/v1/disaster-reports/reports` | GPS from browser Geolocation API; images ≤10 MB, videos ≤50 MB |
| View their own reports | [MyDisasterReports.jsx](../frontend/src/pages/MyDisasterReports.jsx) → `GET /api/v1/disaster-reports/reports/my-reports` | Paginated, filter by status |
| Read report status history | `GET /api/v1/disaster-reports/reports/{id}/history` | Full audit trail |
| Apply for drone permit | [DronePermitForm.jsx](../frontend/src/pages/DronePermitForm.jsx) → `POST /api/v1/permits/submit` | Multi-section form with 4 file uploads |
| Track their permits | [MyPermits.jsx](../frontend/src/pages/MyPermits.jsx) → `GET /api/v1/permits/my-permits` | Pending / Approved / Rejected |
| Upload and analyze videos with YOLOv8 | [VideoAnalysis.jsx](../frontend/src/pages/VideoAnalysis.jsx) → `POST /api/v1/video/upload` | Citizens *can* use this page |
| View public weather advisories | [NepalWeather.jsx](../frontend/src/pages/NepalWeather.jsx), [IncidentWeather.jsx](../frontend/src/pages/IncidentWeather.jsx) | AI advisory via HuggingFace |
| Receive automatic SMS updates | triggered from officer status changes | Sankalpa-branded SMS via Aakash API |

**What they cannot do**: view other users' reports, approve permits, deploy drones, access the Command Center, send SMS broadcasts, manage users.

### 3.2 Officer (Field Responder)

**How they join**: Select "Officer" on RoleSelection → **enter an organization code** validated server-side in [app/services/auth_service.py](../app/services/auth_service.py) against three agency codes stored in [.env](../.env) and loaded by [app/core/config.py:34-36](../app/core/config.py#L34-L36): `ORG_CODE_NDRF`, `ORG_CODE_FIRE`, `ORG_CODE_POLICE` (currently `"NDRF2024"`, `"FIRE-DEPT-2024"`, `"POLICE-2024"`). Invalid code → `HTTPException 400 "Invalid organization code"`. The code is persisted on the user as `organization_code` so every officer is tied to their agency.

**What they can do** (inherits all Citizen abilities, plus):
| Capability | Where | Notes |
|---|---|---|
| **Triage every disaster report** | [CommandCenter.jsx](../frontend/src/pages/CommandCenter.jsx) → `GET /api/v1/disaster-reports/reports` | Live Leaflet map of Nepal with severity-colored markers and pulsing radar animation |
| Change report status | `PATCH /api/v1/disaster-reports/reports/{id}` | Transitions: `PENDING → REVIEWING → DISPATCHED → RESCUING → RESOLVED` (or `REJECTED` at any stage) |
| Assign a report to themselves | same endpoint, sets `assigned_officer_id` + `assigned_at` | Auto-fires SMS to the citizen reporter |
| Add `officer_notes` / `response_notes` | same endpoint | Notes included in SMS template |
| **Deploy drones** to an incident | creates `DroneDeployment` row, links to Firebase GPS stream | Mission FSM: `DEPLOYED → EN_ROUTE → ON_SITE → RETURNING → COMPLETED` (or `ABORTED`), enforced by DB `CheckConstraint` |
| **Review drone permits** | [PermitReview.jsx](../frontend/src/pages/PermitReview.jsx) → `GET /api/v1/permits/pending`, `POST /api/v1/permits/review` | Approve / reject only once; decision is permanent |
| Download permit bundle | `GET /api/v1/permits/download/{id}` | ZIP of all uploaded documents |
| Live video surveillance with YOLO overlay | [LiveSurveillance.jsx](../frontend/src/pages/LiveSurveillance.jsx) → `WS /api/v1/realtime/detect` | IP-camera or webcam stream, ~15 FPS |
| Live dashboard with Reddit intel | [LiveDashboard.jsx](../frontend/src/pages/LiveDashboard.jsx) | Reads NLP-processed insights |

**What they cannot do**: create/delete users, edit other officers, broadcast SMS to all citizens (admin-only), manage no-fly zones.

### 3.3 Admin (System Oversight)

**How they join**: Select "Admin" on RoleSelection → **enter the master admin code** (`MASTER_ADMIN_CODE` in [.env](../.env)) validated in [auth_service.py:65-67](../app/services/auth_service.py). Invalid → `HTTPException 400 "Invalid master admin code"`.

**What they can do** (inherits all Officer abilities, plus):
| Capability | Where | Notes |
|---|---|---|
| **User management** | [UserManagement.jsx](../frontend/src/pages/UserManagement.jsx) → `GET /api/v1/users/all` | Filter by role / search / is_active; includes per-user report + permit counts |
| Soft-delete users | `DELETE /api/v1/users/delete/{id}` | Sets `is_active=False`; cannot deactivate self |
| Edit any user | `PUT /api/v1/users/admin/update/{id}` | Change name, phone, district, role, is_active (cannot change own role) |
| Reactivate users | `PUT /api/v1/users/admin/activate/{id}` | |
| **System-wide analytics** | [AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx) → `GET /api/v1/users/admin/stats` | Returns totals, role distribution, district distribution, monthly trends, top citizens/officers |
| **Admin dashboard** | [AdminDashboard.jsx](../frontend/src/pages/AdminDashboard.jsx) | Central hub of KPI cards + charts |
| **Disaster Alert SMS** broadcasts | [DisasterAlertSMS.jsx](../frontend/src/pages/DisasterAlertSMS.jsx) → `POST /api/v1/sms/send`, `/send-bulk`, `/broadcast` | Broadcast targets all active citizens with a phone number |
| **Weather admin configuration** | [AdminWeather.jsx](../frontend/src/pages/AdminWeather.jsx) | AI advisory, report generation |
| **No-fly zone** management | [NoFlyZone.jsx](../frontend/src/pages/NoFlyZone.jsx) | Geo-fenced restricted airspace |
| **3D drone visualization** | [DroneVisualization.jsx](../frontend/src/pages/DroneVisualization.jsx) | three.js real-time drone tracking |

**What they cannot do**: deactivate their own account, change their own role (defensive self-lockout prevention).

---

## 4. Feature-by-Feature Breakdown (What the System Actually Does)

### 4.1 Authentication, OTP & Session Management

**Stack**: Google OAuth 2.0 (`@react-oauth/google`) + Gmail-delivered OTP + dual JWT/session-cookie auth.

**Endpoints** ([app/api/v1/endpoints/auth.py](../app/api/v1/endpoints/auth.py)):
- `POST /api/v1/auth/register` (line 28) — creates an unverified user, emails a 6-digit OTP via [gmail_service.py](../app/services/gmail_service.py).
- `POST /api/v1/auth/verify-otp` (line 68) — validates OTP, marks `is_verified=True`, issues JWT, sets httponly `session_id` cookie.
- `POST /api/v1/auth/resend-otp` (line 118) — **rate-limited to 5 per hour per email**.
- `POST /api/v1/auth/login` (line 154) — existing-user login.
- `POST /api/v1/auth/logout` (line 209) — destroys the session row.
- `GET /api/v1/auth/session-check` (line 233) — validates cookie, returns user info.
- `GET /api/v1/auth/check-email/{email}` (line 272) — pre-flight check before registration.

**OTP specifics** ([otp_service.py](../app/services/otp_service.py)): 6 digits, **hashed before DB storage**, **10-minute expiry**, **max 3 attempts** per code. On success, OTP row is consumed.

**Session specifics** ([session_service.py:62-65](../app/services/session_service.py)): server-side `UserSession` row; **sliding-window expiry** (refreshed on each request). Cookie attributes: `httponly`, `samesite=lax`. `destroy_all_user_sessions()` logs the user out everywhere.

**Dual auth** ([dependencies/auth.py:21-64](../app/api/v1/dependencies/auth.py#L21-L64)): every protected endpoint accepts **either** a `Bearer` JWT (primary, used by SPA API calls and WebSockets) **or** the `session_id` cookie (browser fallback).

### 4.2 Citizen Disaster Reporting

**Submit**: `POST /api/v1/disaster-reports/reports` ([disaster_reports.py:49](../app/api/v1/endpoints/disaster_reports.py)) accepts ([schemas/disaster_reports.py:11-41](../app/schemas/disaster_reports.py)):
- `disaster_type` (validated lowercase: `fire / flood / earthquake / landslide / storm / other`)
- `severity` (enum: `LOW / MEDIUM / HIGH / CRITICAL`)
- `description` (10–5000 chars)
- `latitude` (−90..90) and `longitude` (−180..180), stored as `DECIMAL(10,8)` / `DECIMAL(11,8)`
- `location_accuracy` (meters, optional)
- `reporter_name` (defaults to `"Anonymous"` or the authed user's name)
- `reporter_contact` (optional)

**Attach media**: `POST /api/v1/disaster-reports/reports/{id}/media` (line 112)
- **Images**: JPEG / PNG / WebP, ≤ 10 MB
- **Videos**: MP4 / WebM / MOV / AVI, ≤ 50 MB
- Saved under `uploads/disaster_images/` with timestamp-prefixed filenames; metadata persisted in `disaster_report_images` (mime_type, file_size, width, height, display_order).

**View**:
- `GET /api/v1/disaster-reports/reports/my-reports` (line 221) — citizen's own, paginated.
- `GET /api/v1/disaster-reports/reports/{id}` (line 331) — citizens get 403 on anyone else's.
- `GET /api/v1/disaster-reports/reports/{id}/history` (line 479) — full status audit log from `disaster_report_status_history` (previous_status, new_status, changed_by_user_id, changed_by_role, change_notes, changed_at).
- `GET /api/v1/disaster-reports/map/markers` (line 508) — all active reports for map rendering.

**Real-time**: on creation, `ws_manager.notify("reports", "new_report")` is broadcast so every officer's Command Center pushes a new marker without polling.

### 4.3 Officer Command Center & Dispatch

**[CommandCenter.jsx](../frontend/src/pages/CommandCenter.jsx)** — the operational heart of the officer role:
- **Nepal-boundary Leaflet map** with GeoJSON overlay from `data/map.json`.
- **Severity-colored markers** (lines 30–36 of the component): CRITICAL `#dc2626` (red), HIGH `#ea580c` (orange), MEDIUM `#d97706` (amber), LOW `#0284c7` (blue), each wrapped in a **pulsing radar animation** (CSS keyframes, lines 49–57).
- **Status badges**: PENDING / REVIEWING / DISPATCHED / RESCUING / RESOLVED / REJECTED.
- **5 tile-layer options**: Positron, Street, Satellite, Terrain, Dark.
- **Fly-to-target animation** when an officer clicks a marker (`FlyToTarget` component, lines 71–77).

**Triage**: `PATCH /api/v1/disaster-reports/reports/{id}` ([disaster_reports.py:364-476](../app/api/v1/endpoints/disaster_reports.py)):
- Officer can set `status`, `assigned_officer_id`, `officer_notes`, `response_notes`.
- Each status change appends a row to `disaster_report_status_history` (previous/new status, officer identity & role, timestamp, notes).
- On status change, a background thread fires a Sankalpa-branded SMS to the citizen using status-specific labels: *Under Review*, *Team Dispatched*, *Rescue in Progress*, *Resolved*, *Rejected*.
- WebSocket broadcast: `ws_manager.notify("reports", "status_updated")` (line 474) — Command Centers for all officers update live.

**Drone dispatch**: an officer action creates a `DroneDeployment` row linking the report to a drone ID. [Firebase Realtime Database](../frontend/src/firebase/firebase.js) then streams GPS which the backend syncs into `last_known_latitude` / `last_known_longitude` / `last_sync_at`. Mission FSM: `DEPLOYED → EN_ROUTE → ON_SITE → RETURNING → COMPLETED` (or `ABORTED`), enforced by `CheckConstraint` in [disaster_reports.py:152-157](../app/models/disaster_reports.py#L152-L157). Metrics recorded: `distance_traveled`, `flight_duration`, `arrived_at`, `completed_at`.

**WebSocket layer** ([ws_manager.py](../app/services/ws_manager.py)): channel-based publish-subscribe. Channels: `reports`, `citizens`, `users`, `permits`, `video:{id}`. Messages are lightweight `{channel, event}` envelopes — clients receive the hint and re-fetch via REST (avoids sending full records over the socket).

### 4.4 Drone Permit Workflow

**Model** ([app/models/drone_permit.py](../app/models/drone_permit.py)) captures three groups of data:

*Drone technical specs*: `manufacturer`, `model`, `serial_number`, `manufactured_year`, `drone_type`, `max_payload` (float kg), `color`, `retailer_name`.

*Operator identity*: `registration_type` (`individual` / `company`), `full_name`, `citizenship_passport_no`, `date_of_birth`, `phone_number`, `email_address`, `username`.

*Nepal address hierarchy*: `country`, `province`, `district`, `municipality`, `ward_no`.

Plus **4 mandatory file uploads** stored under `uploads/permits/{user_id}/` with timestamp prefixes: `purpose_letter` (PDF), `purchase_bill` (PDF), `drone_image` (image), `citizenship_doc` (PDF). And an explicit `agrees_to_rules=true` checkbox.

**Endpoints** ([drone_permit.py](../app/api/v1/endpoints/drone_permit.py)):
- `POST /api/v1/permits/submit` (line 29) — citizen submission (multipart).
- `GET /api/v1/permits/my-permits` (line 142) — citizen's own.
- `GET /api/v1/permits/pending` (line 155) — **officer/admin only**.
- `GET /api/v1/permits/{id}` (line 171) — citizens see only own; officers see all.
- `POST /api/v1/permits/review` (line 192) — **officer/admin only**, one-shot approve/reject. If already reviewed, returns 400 (line 209).
- `GET /api/v1/permits/download/{id}` (line 239) — officer ZIP export of all documents.

On review, the permit persists: `reviewed_by_officer_id`, `officer_name`, `officer_designation`, `officer_organization`, `officer_email`, `review_remarks`, `reviewed_at` — fully auditable.

### 4.5 Video Analysis (Uploaded Footage)

**Upload**: `POST /api/v1/video/upload` ([video.py:24](../app/api/v1/endpoints/video.py)):
- Formats: `.mp4 / .avi / .mov / .mkv / .wmv / .flv / .webm`.
- Max size: **500 MB**.
- Saved as `uploads/original/{user_id}_{timestamp}_{filename}`.
- Processed asynchronously via FastAPI `BackgroundTasks`.
- Status progression: `uploading → processing → completed`.

**Progress polling**: `GET /api/v1/video/status/{id}` (line 109).

**List & results**: `GET /api/v1/video/list` (line 137), `GET /api/v1/video/analysis/{id}` (line 176).

**Two YOLO modes**:
- **Detection** ([yolo_detector.py](../app/services/yolo_detector.py)) — bounding boxes, output to `uploads/detection_output/`.
- **Segmentation** ([yolo_segmenter.py](../app/services/yolo_segmenter.py)) — instance masks, output to `uploads/segmentation_output/`.

Output videos are streamed back via the `/uploads` static mount. Per-frame object counts feed a severity calculator that tags each frame with a risk level.

### 4.6 Real-Time Live Surveillance (WebSocket + YOLO)

**[LiveSurveillance.jsx](../frontend/src/pages/LiveSurveillance.jsx)** connects to `WS /api/v1/realtime/detect` ([realtime.py:49](../app/api/v1/endpoints/realtime.py)) with query params:
- `token` — JWT for authentication.
- `confidence` — YOLO confidence threshold (0.1–0.95, default `YOLO_CONFIDENCE=0.45`).
- `ip_cam_url` — any RTSP/HTTP camera URL (default `IP_CAM_URL` from config, e.g. `http://192.168.1.100:8080/video`).
- `use_webcam` — boolean fallback to local webcam (OpenCV index 0).

The socket alternates between **JSON metadata frames** (`{type, frame_id, detections, size}`) and **binary JPEG bytes** (annotated frame) at **~15 FPS** (`YOLO_TARGET_FPS`). Uses `CAP_PROP_BUFFERSIZE=1` for minimum latency and auto-reconnects on camera disconnect. Model is configurable via `YOLO_MODEL_PATH` (default `yolov8n.pt` at repo root, ~6 MB).

### 4.7 Reddit Disaster Intelligence (Global NLP Signal)

**Scraper** ([reddit_service.py](../app/services/reddit_service.py)): monitors **43 subreddits** across categories — news (`news`, `worldnews`, `nottheonion`, `UpliftingNews`), disasters (`naturaldisasters`, `TropicalWeather`, `Wildfire`, `Earthquakes`, `emergencymanagement`), climate (`climate`, `climatechange`, `environment`), regional (`europe`, `asia`, `africa`, `australia`, `canada`, `unitedkingdom`), plus technology, cybersecurity, health, conflict. Delays between fetches are **3 seconds** to respect Reddit rate limits. Gated by `ENABLE_REDDIT_FETCHING` flag in config.

**NLP pipeline** ([nlp_processor.py](../app/services/nlp_processor.py)):
- **12-class disaster taxonomy** with keyword matching + base severity weights: earthquake(8), flood(7), fire(7), hurricane(9), tornado(8), tsunami(10), volcano(9), drought(6), landslide(7), pandemic(8), conflict(9), explosion(8).
- **Sentiment** via TextBlob polarity (−1 to +1).
- **Urgency level** (low/medium/high/critical) computed from severity × sentiment × keyword intensity.
- **Location extraction** via spaCy NER (`GPE`, `LOC`, `FAC` entities).
- **Trending keywords**, **affected population**, **damage estimate**, **confidence score**.

**Dashboard endpoints** ([disaster.py](../app/api/v1/endpoints/disaster.py)) — consumed by [LiveDashboard.jsx](../frontend/src/pages/LiveDashboard.jsx) and [AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx):
- `GET /api/v1/disasters/dashboard/stats` (line 44) — totals, urgent count, avg sentiment, top type, top location, hourly count.
- `GET /api/v1/disasters/dashboard/recent-disasters` (line 77) — filterable by urgency/type.
- `GET /api/v1/disasters/dashboard/disaster-types` (line 121) — distribution.
- `GET /api/v1/disasters/dashboard/urgency-distribution` (line 143).
- `GET /api/v1/disasters/dashboard/location-hotspots` (line 163).
- `GET /api/v1/disasters/dashboard/timeline` (line 188).

### 4.8 SMS Alerting (Aakash SMS Integration)

**Service** ([sms.py:20](../app/api/v1/endpoints/sms.py)) calls `https://sms.aakashsms.com/sms/v3/send` authenticated by `AAKASH_SMS_AUTH_TOKEN`. Phone numbers are normalized: any `+977` / `977` prefix is stripped and the number must be a **10-digit Nepali format**. Message max length: **500 chars**.

**Endpoints** (all admin-only):
- `POST /api/v1/sms/send` (line 94) — single recipient.
- `POST /api/v1/sms/send-bulk` (line 107) — explicit list.
- `POST /api/v1/sms/broadcast` (line 132) — auto-targets `User.role == "citizen" AND is_active == True AND phone IS NOT NULL`.
- `GET /api/v1/sms/citizens-with-phone` (line 186) — preview recipients before broadcasting.

**Broadcast response** (line 132–183): `{total, sent, failed, results: [{phone, success, message_id/error}]}`.

**Automatic SMS on status change**: fired from the PATCH endpoint (lines 422–469), in a background thread, using the template:
> *"Sankalpa Alert: Hi {name}, your {type} report (ID: {id}) status has been updated to: {status}. Officer notes: {notes}"*

### 4.9 Weather Advisory (AI-Powered)

**Endpoint**: `POST /api/v1/weather/ai-advisory` ([weather.py:85](../app/api/v1/endpoints/weather.py)).

**Input** (lines 19–43): a bundle of pre-computed thresholds (`checks`) plus an overall `level` (`GO` / `CAUTION` / `NO_GO`) and raw metrics (temperature, wind_speed, wind_gusts, visibility, precipitation, cloud_cover, humidity, pressure, uv_index). A `context` field switches between `"drone_takeoff"` and `"disaster_response"` prompt framings, and `disaster_type` / `location` tailor the response.

**AI backend** (lines 15–16): Hugging Face Inference Router → model `deepseek/deepseek-v3-0324`, endpoint `router.huggingface.co/novita/v3/openai/chat/completions`, authed by `HF_API_TOKEN`.

**Output format** (lines 76–82):
```
RECOMMENDATION: [1-2 sentence actionable recommendation]
RISK_LEVEL: [LOW/MODERATE/HIGH/CRITICAL]
KEY_CONCERN: [single most important weather factor]
ACTION: [specific action to take right now]
```

Plus `POST /api/v1/weather/generate-report` (line 254) for longer structured reports. Consumed by [NepalWeather.jsx](../frontend/src/pages/NepalWeather.jsx), [AdminWeather.jsx](../frontend/src/pages/AdminWeather.jsx), and [IncidentWeather.jsx](../frontend/src/pages/IncidentWeather.jsx).

### 4.10 User Management & System Analytics (Admin)

**Endpoints** ([users.py](../app/api/v1/endpoints/users.py)):
- `GET /api/v1/users/all` (line 147) — filter by `role` / `search` / `is_active`, joined with report + permit counts.
- `DELETE /api/v1/users/delete/{id}` (line 203) — soft delete (`is_active=False`); self-delete blocked.
- `PUT /api/v1/users/admin/update/{id}` (line 233) — edit name, phone, district, role, is_active; **self-role-change blocked** to prevent lockout.
- `PUT /api/v1/users/admin/activate/{id}` (line 283) — reactivate.
- `GET /api/v1/users/admin/stats` (line 298) — returns (lines 374-388):
  - `total_users`, `active_users`, `verified_users`, `inactive_users`
  - `role_counts` (by role string)
  - `district_distribution`
  - `monthly_trend` (keyed `YYYY-MM`, nested per role)
  - `citizen_reports_total`, `officer_assigned_total`
  - `report_status_distribution`, `permit_status_distribution`
  - `top_citizens` (by report count) and `top_officers` (by assigned count), each with id/name/email/district/profile_picture.

### 4.11 3D Drone Visualization & No-Fly Zones

- **[DroneVisualization.jsx](../frontend/src/pages/DroneVisualization.jsx)** — `three.js` scene rendering current drone positions and flight paths in 3D space.
- **[NoFlyZone.jsx](../frontend/src/pages/NoFlyZone.jsx)** — admin-defined geo-fenced restricted airspace; permit applications and live deployments respect these zones.

### 4.12 Analytics Dashboards (Cross-Pipeline)

[AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx) aggregates data across all three classification pipelines (Reddit NLP, citizen reports, video analysis) — see the existing deep-dive docs [classification_logic.md](./classification_logic.md), [location_heatmap.md](./location_heatmap.md), [timeline_analysis.md](./timeline_analysis.md), [filters_implementation.md](./filters_implementation.md), [date_range_picker.md](./date_range_picker.md).

Charting libraries used: **Recharts**, **Chart.js** (via `react-chartjs-2`), **ECharts** (with `echarts-extension-gmap` for geo-heatmaps), **Plotly** (`react-plotly.js`), **Nivo** (`@nivo/calendar`, `@nivo/geo`, `@nivo/sankey`). Exports: **PDF** via `jspdf` + `jspdf-autotable`, **CSV** via `file-saver`.

---

## 5. How It Works — Architecture

### 5.1 Backend Stack
- **FastAPI 0.115** as the ASGI framework; routers mounted at `/api/v1/*` (auth, users, permits, disasters, video, disaster-reports, realtime, sms, weather, ws).
- **SQLAlchemy 2.0** ORM over **PostgreSQL** (`psycopg2-binary`), with `Base.metadata.create_all` on startup and versioned migrations under `migrations/`.
- **Pydantic 2** schemas for request/response validation ([app/schemas/](../app/schemas/)).
- **CORS middleware** pre-configured for `localhost:5173`, `localhost:3000`, and Docker frontend.
- **Lifespan context** starts/stops the Reddit scraper background thread cleanly.
- **Static file mount** at `/uploads` serves all uploaded / processed media.

### 5.2 Frontend Stack
- **React 19** + **react-router-dom 7** for routing.
- **TailwindCSS 3** + **framer-motion** for styling and animation.
- **axios** for REST, native `WebSocket` for realtime.
- **Leaflet + react-leaflet** for 2D maps; **three.js** for 3D drone scenes.
- **Firebase 12** SDK for listening to drone GPS updates pushed by field devices.
- **ECharts + echarts-extension-gmap** for geo-heatmap layers.

### 5.3 Data Flow — End-to-End Incident Example
1. Citizen opens **DisasterReport**, auto-captures GPS, picks "Flood", severity "HIGH", uploads two photos, submits.
2. Backend creates a `DisasterReport` + two `DisasterReportImage` rows; status = `PENDING`, priority auto-assigned.
3. WebSocket broadcasts the new report to all connected officer dashboards.
4. Officer opens **CommandCenter**, self-assigns (`assigned_officer_id` set), changes status to `REVIEWING` (history row appended).
5. Officer clicks "Deploy Drone" → `DroneDeployment` row created, Firebase listener starts streaming GPS; status → `DISPATCHED`.
6. Drone arrives, `mission_status` → `ON_SITE`, `arrived_at` recorded; YOLO analyzes the live stream for victims/vehicles.
7. Officer broadcasts an SMS advisory to the district via Aakash SMS.
8. Incident closes: status → `RESOLVED`, `resolved_at` set, flight metrics (distance, duration) persisted.
9. Admin sees the closed incident on analytics dashboards alongside Reddit NLP signals of the same flood.

### 5.4 Deployment
- **Dockerfile** + **docker-compose.yml** at repo root — backend + frontend + Postgres composed together.
- `.dockerignore` excludes `venv`, `node_modules`, and local uploads.
- **nginx.conf** in frontend serves the built SPA.

### 5.5 Security Considerations
- All secrets loaded from `.env` via `pydantic-settings` — never committed.
- OAuth tokens stored in `token.json` (gitignored).
- Role-based dependencies in [app/api/v1/dependencies/](../app/api/v1/dependencies/) enforce per-endpoint role checks.
- Organization codes separate Officer registrations per agency (NDRF / Fire / Police) so a compromised code only affects one agency.
- DB `CheckConstraint`s enforce valid enum values at the storage layer, not just the app layer.

---

## 6. Why Each Choice Matters

| Choice | Reason |
|---|---|
| FastAPI | Async-native, automatic OpenAPI docs at `/docs`, fast. |
| YOLOv8n | Smallest weights (`yolov8n.pt`, ~6 MB) deployable on modest hardware, still accurate. |
| Firebase RTDB for drone GPS | Sub-second latency and built-in mobile SDKs without standing up our own pub/sub. |
| Postgres + `DECIMAL(10,8)` lat/long | Exact geospatial precision without floating-point drift. |
| Reddit + NLP pipeline | Free, global, real-time disaster signal that complements citizen reports. |
| Three-role model | Mirrors real-world chain of command (public → responder → oversight). |
| Status history audit table | Disaster response is legally accountable — every state transition must be traceable. |
| Gmail OTP over SMS OTP | SMS is paid per-message (Aakash) and reserved for broadcast alerts; Gmail is free and reliable for verification. |

---

## 7. Repository Map

```
d:/files/
├── app/                      # FastAPI backend
│   ├── api/v1/endpoints/     # REST routes (auth, permits, disasters, video, sms, weather, ws, ...)
│   ├── core/                 # config.py (settings), security.py (JWT/hashing)
│   ├── database/             # SQLAlchemy engine + Base
│   ├── models/               # ORM tables (user, disaster, drone_permit, disaster_reports, ...)
│   ├── schemas/              # Pydantic request/response models
│   ├── services/             # Business logic (yolo, nlp, gmail, otp, reddit, ws, session, ...)
│   ├── utils/                # Shared helpers
│   └── main.py               # App entrypoint, router mounting, lifespan
├── frontend/                 # React 19 + Vite SPA
│   ├── src/pages/            # Role dashboards, forms, command center, live surveillance, ...
│   ├── src/components/       # Navbar, ProtectedRoute, GoogleLoginButton
│   ├── src/services/         # axios clients (api, auth, permit)
│   ├── src/firebase/         # Firebase RTDB config
│   └── src/context, hooks, data, logo, assets
├── documentation/            # This file + accuracy tests, implementation notes
├── migrations/               # SQL migration files
├── uploads/                  # Runtime: original / processed / detection / segmentation / disaster_images
├── drone visualization/      # Standalone drone viz assets
├── models/                   # ML model artifacts (shared)
├── scripts/                  # One-off utilities
├── yolov8n.pt                # YOLOv8 nano weights
├── requirements.txt          # Python dependencies
├── Dockerfile, docker-compose.yml
└── .env                      # Local secrets (gitignored)
```

---

## 8. Summary in One Sentence

This project is a **role-based, map-centric disaster-response platform** that lets citizens report incidents with geolocation and photos, lets officers triage reports and deploy live-tracked drones to the scene, lets admins oversee nationwide operations with AI-powered video, Reddit intelligence, and weather overlays, and binds the whole workflow together with Google-OAuth-authenticated sessions, an immutable status history, and SMS-based public alerting — all on a FastAPI + React + PostgreSQL + Firebase + YOLOv8 stack.

---

## 2.2.2 System Overview (Technical Perspective)

From a technical standpoint, the Disaster Management System is a **distributed, multi-tier, event-driven web application** built around a REST + WebSocket backend, a single-page React client, a relational transactional store, and an external real-time database for telemetry. The platform is designed so that every user action — a citizen submitting a report, an officer assigning it, a drone broadcasting GPS — propagates through the system within sub-second latency without polling.

### 2.2.2.1 High-Level System Architecture

The architecture follows a **3-layer + sidecar** pattern:

1. **Presentation layer** — a React 19 Single Page Application built with Vite and served statically through Nginx in production. It consumes two transports: HTTPS REST for CRUD and WebSocket for real-time push.
2. **Application layer** — a FastAPI (ASGI) Python service that exposes the `/api/v1/*` REST surface, a `/api/v1/ws` notification socket, and a `/api/v1/realtime/detect` streaming socket. It houses all business logic, role enforcement, and orchestration of external services.
3. **Data layer** — PostgreSQL as the system of record (accessed through SQLAlchemy 2.0 ORM), plus a local static filesystem under `uploads/` for media, plus Firebase Realtime Database as a *sidecar* store for high-frequency drone telemetry.
4. **AI / ML sidecar** — YOLOv8 (Ultralytics) runs in-process within the FastAPI application for both batch video analysis (uploaded videos) and live streaming (IP-camera WebSocket). spaCy + TextBlob run in a background thread for Reddit post processing.

Cross-cutting concerns — authentication (dual JWT + session cookie), CORS, static file serving, lifespan startup/shutdown hooks, and background task orchestration — are wired in [app/main.py](../app/main.py). The entire stack is containerized via [Dockerfile](../Dockerfile) and orchestrated through [docker-compose.yml](../docker-compose.yml), enabling single-command deployment of backend + frontend + database.

### 2.2.2.2 Role-Based System Design

Role-based access control (RBAC) is enforced at **two independent layers** so that no single breach of one layer exposes unauthorized functionality:

- **Client-side guards** — [ProtectedRoute.jsx](../frontend/src/components/ProtectedRoute.jsx) inspects the authenticated user's role from React `AuthContext` and redirects mismatches to the user's own dashboard. This is for UX only; it is assumed defeatable.
- **Server-side dependencies** — every sensitive endpoint declares a FastAPI `Depends(get_current_citizen | get_current_officer | get_current_admin)` injector. These raise **403 Forbidden** if the JWT/session identity does not match the required role. This is the authoritative check.

Roles are hierarchical: admin inherits officer capabilities, officer inherits citizen capabilities. This is implemented by having `get_current_officer()` accept officer **or** admin, and `get_current_citizen()` accept any authenticated user. The hierarchy mirrors the real-world chain of command: *public → responder → oversight*.

Role elevation is gated by **out-of-band secrets**: officers must present an organization code (one of `NDRF2024`, `FIRE-DEPT-2024`, `POLICE-2024` from [app/core/config.py](../app/core/config.py)), admins must present the `MASTER_ADMIN_CODE`. These are validated in [auth_service.py](../app/services/auth_service.py) during registration only, then discarded — they are never re-requested.

### 2.2.2.3 Integration of Frontend, Backend, and Database

The three tiers communicate through well-defined contracts:

- **Frontend ↔ Backend** — REST requests go through a centralized axios instance in [frontend/src/services/api.js](../frontend/src/services/api.js) that automatically attaches the JWT `Bearer` header and `session_id` cookie. Responses are plain JSON validated against Pydantic schemas on the server ([app/schemas/](../app/schemas/)).
- **Backend ↔ Database** — SQLAlchemy ORM models in [app/models/](../app/models/) map 1:1 to PostgreSQL tables. Tables are auto-created on startup via `Base.metadata.create_all(bind=engine)` ([main.py:39](../app/main.py#L39)); richer schema changes live under [migrations/](../migrations/). Connection pooling and session scoping are handled through SQLAlchemy's session factory.
- **Frontend ↔ Firebase** — [frontend/src/firebase/firebase.js](../frontend/src/firebase/firebase.js) initializes the Firebase SDK directly. Drone GPS updates flow from field devices to Firebase, and the officer's Command Center subscribes to the relevant node for live map updates.
- **Backend ↔ Firebase** — the backend periodically syncs drone GPS into the `drone_deployments` table (`last_known_latitude`, `last_known_longitude`, `last_sync_at`) so that the system of record always has the latest position.

### 2.2.2.4 Real-Time System Components

Three independent real-time channels coexist:

1. **Notification WebSocket** (`/api/v1/ws`, [ws.py](../app/api/v1/endpoints/ws.py)) — a lightweight publish-subscribe channel managed by [ws_manager.py](../app/services/ws_manager.py). Channels include `reports`, `citizens`, `users`, `permits`, and `video:{id}`. Messages are tiny `{channel, event}` envelopes — the client re-fetches via REST on receipt, keeping the socket cheap.
2. **Detection streaming WebSocket** (`/api/v1/realtime/detect`, [realtime.py](../app/api/v1/endpoints/realtime.py)) — a heavy binary channel that streams alternating JSON metadata frames (`{type, frame_id, detections, size}`) and JPEG-encoded annotated frames at ~15 FPS. Used by [LiveSurveillance.jsx](../frontend/src/pages/LiveSurveillance.jsx).
3. **Firebase Realtime Database** — used exclusively for drone telemetry (GPS, sensor data). Firebase pushes updates at sub-second latency directly to subscribed clients without round-tripping through the backend.

### 2.2.2.5 External System Integration

The platform depends on five external services, each wired through a dedicated service module:

| External Service | Purpose | Integration Point |
|---|---|---|
| **Google OAuth 2.0** | User authentication | [google_oauth_service.py](../app/services/google_oauth_service.py) + `@react-oauth/google` on the SPA |
| **Gmail SMTP / API** | OTP delivery | [gmail_service.py](../app/services/gmail_service.py), sender identity from `SENDER_EMAIL` |
| **Aakash SMS v3** | SMS delivery | POST to `https://sms.aakashsms.com/sms/v3/send` with `AAKASH_SMS_AUTH_TOKEN` |
| **Hugging Face Inference Router** | AI weather advisory | `router.huggingface.co/novita/v3/openai/chat/completions`, model `deepseek/deepseek-v3-0324`, `HF_API_TOKEN` |
| **Firebase Realtime Database** | Drone telemetry pub/sub | Firebase Web SDK v12 + backend sync job |
| **Reddit JSON API** | Disaster intelligence scraping | [reddit_service.py](../app/services/reddit_service.py) — anonymous public-feed reads |

Every external secret lives in [.env](../.env) and is loaded through `pydantic-settings`, never hardcoded.

---

## 2.2.3 Core System Components and Modules

The system is decomposed into ten loosely-coupled modules. Each module owns its own database tables, schemas, endpoints, service logic, and UI pages.

### 2.2.3.1 Authentication and User Management Module

**Responsibility**: identify every caller, verify them via Gmail OTP, assign them a role (gated by agency or master codes), issue a JWT + session cookie, and enforce role-based access on every downstream call.

**Components**:
- **Models**: `User` ([app/models/user.py](../app/models/user.py)), `OTP` ([otp.py](../app/models/otp.py)), `UserSession` ([session.py](../app/models/session.py)).
- **Services**: [auth_service.py](../app/services/auth_service.py) (registration/login orchestration), [google_oauth_service.py](../app/services/google_oauth_service.py) (OAuth token exchange), [otp_service.py](../app/services/otp_service.py) (6-digit OTP generate/hash/verify, 10-min expiry, 3-attempt cap), [gmail_service.py](../app/services/gmail_service.py) (OTP email delivery), [session_service.py](../app/services/session_service.py) (sliding-window sessions).
- **Endpoints**: 7 auth routes + 5 user-management routes ([users.py](../app/api/v1/endpoints/users.py)).
- **UI**: [LoginProcess.jsx](../frontend/src/pages/LoginProcess.jsx), [RoleSelection.jsx](../frontend/src/pages/RoleSelection.jsx), [OTPVerification.jsx](../frontend/src/pages/OTPVerification.jsx), [UserManagement.jsx](../frontend/src/pages/UserManagement.jsx), [GoogleLoginButton.jsx](../frontend/src/components/GoogleLoginButton.jsx).

**Key guarantees**: OTP rate-limit (5 per hour per email), hashed OTP at rest, self-lockout prevention (admin cannot deactivate self or change own role), dual-mode auth (JWT **or** cookie).

### 2.2.3.2 Disaster Reporting Module

**Responsibility**: let citizens submit geolocated incident reports with media, let officers triage and update them, and preserve an immutable audit trail of every status change.

**Components**:
- **Models**: `DisasterReport`, `DisasterReportImage`, `DisasterReportStatusHistory`, `DroneDeployment` (all in [disaster_reports.py](../app/models/disaster_reports.py)).
- **Schemas**: [schemas/disaster_reports.py](../app/schemas/disaster_reports.py) — status enum, severity enum, type whitelist, lat/long bounds.
- **Endpoints**: 10 routes in [disaster_reports.py](../app/api/v1/endpoints/disaster_reports.py) (CRUD, media upload, history, map markers, officer triage PATCH).
- **UI**: [DisasterReport.jsx](../frontend/src/pages/DisasterReport.jsx), [MyDisasterReports.jsx](../frontend/src/pages/MyDisasterReports.jsx), [CitizenDashboard.jsx](../frontend/src/pages/CitizenDashboard.jsx).

**Status lifecycle**: `PENDING → REVIEWING → DISPATCHED → RESCUING → RESOLVED` (or `REJECTED` at any stage). Every transition appends a `DisasterReportStatusHistory` row and triggers a WebSocket broadcast plus an automatic SMS to the reporter.

### 2.2.3.3 Drone Permit Management Module

**Responsibility**: digitize Nepal's drone permit process — collect all operator, technical, and document information; route it to an officer reviewer; record an auditable approval or rejection.

**Components**:
- **Model**: `DronePermit` with 30+ columns spanning drone specs, operator identity, Nepal address hierarchy, documents, and officer review fields ([drone_permit.py](../app/models/drone_permit.py)).
- **Enums**: `PermitStatus` (PENDING/APPROVED/REJECTED), `RegistrationType` (INDIVIDUAL/COMPANY).
- **Endpoints**: 6 routes ([drone_permit.py](../app/api/v1/endpoints/drone_permit.py)) — submit, my-permits, pending, detail, review, download ZIP.
- **UI**: [DronePermitForm.jsx](../frontend/src/pages/DronePermitForm.jsx), [MyPermits.jsx](../frontend/src/pages/MyPermits.jsx), [PermitReview.jsx](../frontend/src/pages/PermitReview.jsx).

**Key constraint**: review is one-shot — once a permit is APPROVED or REJECTED, it cannot be re-reviewed, guaranteeing decision finality.

### 2.2.3.4 Command Center and Dispatch Module

**Responsibility**: give officers a single pane of glass showing every active incident on a live map, with the ability to assign reports, add notes, deploy drones, and track missions in real time.

**Components**:
- **Map rendering**: Leaflet + React-Leaflet with Nepal boundary GeoJSON ([map.json](../frontend/src/data/)), 5 tile layers, severity-colored radar-pulse markers.
- **Mission state machine**: `DEPLOYED → EN_ROUTE → ON_SITE → RETURNING → COMPLETED` (or `ABORTED`), enforced by a DB `CheckConstraint`.
- **Endpoints**: report triage PATCH (with SMS + WebSocket side effects), map markers, drone deployment CRUD.
- **UI**: [CommandCenter.jsx](../frontend/src/pages/CommandCenter.jsx), [OfficerDashboard.jsx](../frontend/src/pages/OfficerDashboard.jsx), [LiveDashboard.jsx](../frontend/src/pages/LiveDashboard.jsx).

**Real-time feedback loop**: officer PATCHes a status → DB writes history row → backend fires SMS to citizen → backend broadcasts WebSocket event → all connected Command Centers re-fetch and re-render markers.

### 2.2.3.5 Video Analysis and Computer Vision Module

**Responsibility**: accept uploaded drone or surveillance videos, process them frame-by-frame with YOLOv8, and return annotated output for post-incident review.

**Components**:
- **Services**: [yolo_service.py](../app/services/yolo_service.py) (shared model loader), [yolo_detector.py](../app/services/yolo_detector.py) (bounding-box detection), [yolo_segmenter.py](../app/services/yolo_segmenter.py) (instance segmentation masks), [video_processor.py](../app/services/video_processor.py) (OpenCV read/write pipeline).
- **Model artifact**: `yolov8n.pt` (YOLOv8 nano, ~6 MB) at the repository root.
- **Model**: `VideoAnalysis` ([video.py](../app/models/video.py)) tracking processing status.
- **Endpoints**: 4 routes ([video.py](../app/api/v1/endpoints/video.py)) — upload, status, list, analysis-result.
- **UI**: [VideoAnalysis.jsx](../frontend/src/pages/VideoAnalysis.jsx).

**Processing pipeline**: upload → queue `BackgroundTasks` → OpenCV opens video → iterate frames → YOLO predict → annotate → write output file → update DB status `uploading → processing → completed`.

### 2.2.3.6 Real-Time Surveillance System

**Responsibility**: stream a live IP-camera or webcam feed through the server, run YOLO inference on each frame, and push annotated frames to the browser at target FPS.

**Components**:
- **Endpoint**: `WS /api/v1/realtime/detect` with query params `token`, `confidence`, `ip_cam_url`, `use_webcam` ([realtime.py](../app/api/v1/endpoints/realtime.py)).
- **Stream buffering**: OpenCV with `CAP_PROP_BUFFERSIZE=1` for minimum latency.
- **Wire protocol**: alternating JSON metadata + binary JPEG bytes.
- **UI**: [LiveSurveillance.jsx](../frontend/src/pages/LiveSurveillance.jsx).

**Operational parameters**: model `YOLO_MODEL_PATH` (default `yolov8n.pt`), confidence `YOLO_CONFIDENCE` (default 0.45, user-overridable 0.1–0.95), target throughput `YOLO_TARGET_FPS=15`, automatic reconnection on camera disconnect.

### 2.2.3.7 NLP-Based Disaster Intelligence Module

**Responsibility**: passively collect global disaster signals from Reddit, classify them with NLP, and surface aggregated dashboards so operators see trends before they reach Nepal.

**Components**:
- **Scraper**: [reddit_service.py](../app/services/reddit_service.py) monitors **43 subreddits** across 5 categories (news, natural-disasters, climate, regional, other). 3-second delay between subreddit fetches.
- **NLP processor**: [nlp_processor.py](../app/services/nlp_processor.py) — spaCy `en_core_web_sm` for NER (GPE/LOC/FAC entity extraction) + TextBlob for sentiment polarity + keyword matching across a 12-class disaster taxonomy with base severity weights (1–10).
- **Orchestration**: [background_tasks.py](../app/services/background_tasks.py) — long-running thread managed by FastAPI lifespan, gated by `ENABLE_REDDIT_FETCHING` flag.
- **Models**: `DisasterPost` (raw), `DisasterInsight` (processed), `DisasterStats` (aggregated).
- **Endpoints**: 6 dashboard routes in [disaster.py](../app/api/v1/endpoints/disaster.py).
- **UI**: [LiveDashboard.jsx](../frontend/src/pages/LiveDashboard.jsx), [AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx).

**Derived fields per post**: disaster_type, severity_score (1–10), sentiment (−1..+1), location, urgency_level, request/offer signal, trending_keywords, affected_population, damage_estimate, confidence_score.

### 2.2.3.8 SMS Alert and Notification Module

**Responsibility**: deliver SMS to Nepali phone numbers through the Aakash SMS v3 API — both automatic (report status transitions) and manual (admin broadcasts).

**Components**:
- **Endpoints**: 4 routes in [sms.py](../app/api/v1/endpoints/sms.py) — single-send, bulk-send, broadcast, citizens-with-phone preview.
- **Phone normalization**: strips `+977` / `977` prefix, validates 10-digit length.
- **Automatic hooks**: the status-change handler in [disaster_reports.py:422-469](../app/api/v1/endpoints/disaster_reports.py#L422-L469) fires an SMS in a background thread with a status-specific label (Under Review, Team Dispatched, Rescue in Progress, Resolved, Rejected) and the Sankalpa-branded template.
- **UI**: [DisasterAlertSMS.jsx](../frontend/src/pages/DisasterAlertSMS.jsx).

### 2.2.3.9 Weather Advisory Module

**Responsibility**: transform raw weather metrics into actionable flight / response guidance using a large language model.

**Components**:
- **Endpoints**: `POST /api/v1/weather/ai-advisory` and `POST /api/v1/weather/generate-report` ([weather.py](../app/api/v1/endpoints/weather.py)).
- **Input**: pre-computed threshold checks + raw metrics (temperature, wind_speed, wind_gusts, visibility, precipitation, cloud_cover, humidity, pressure, uv_index) + context (`drone_takeoff` | `disaster_response`) + optional `disaster_type` / `location`.
- **LLM**: `deepseek/deepseek-v3-0324` via Hugging Face Inference Router.
- **Output**: four-section structured text (`RECOMMENDATION`, `RISK_LEVEL`, `KEY_CONCERN`, `ACTION`).
- **UI**: [NepalWeather.jsx](../frontend/src/pages/NepalWeather.jsx), [AdminWeather.jsx](../frontend/src/pages/AdminWeather.jsx), [IncidentWeather.jsx](../frontend/src/pages/IncidentWeather.jsx).

### 2.2.3.10 Analytics and Visualization Module

**Responsibility**: aggregate data from all other modules into charts, heatmaps, timelines, and exportable reports for administrative oversight.

**Components**:
- **Aggregation endpoint**: `GET /api/v1/users/admin/stats` returns totals, role/district distributions, monthly trends, top contributors, and per-module status distributions ([users.py:298-388](../app/api/v1/endpoints/users.py#L298-L388)).
- **Dashboard pages**: [AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx), [AdminDashboard.jsx](../frontend/src/pages/AdminDashboard.jsx).
- **Specialized views**: [DroneVisualization.jsx](../frontend/src/pages/DroneVisualization.jsx) (3D), [NoFlyZone.jsx](../frontend/src/pages/NoFlyZone.jsx), location heatmaps, timeline analysis.
- **Libraries**: Recharts, Chart.js (`react-chartjs-2`), ECharts (+ `echarts-extension-gmap`), Plotly (`react-plotly.js`), Nivo (`calendar`, `geo`, `sankey`), Leaflet, three.js.
- **Exports**: PDF via `jspdf` + `jspdf-autotable`, CSV via `file-saver`.

---

## 2.2.4 System Workflow and Functional Process

### 2.2.4.1 Disaster Reporting Workflow

1. Citizen opens [DisasterReport.jsx](../frontend/src/pages/DisasterReport.jsx); the browser Geolocation API captures latitude, longitude, and accuracy.
2. User selects disaster type (`fire / flood / earthquake / landslide / storm / other`), severity (`LOW / MEDIUM / HIGH / CRITICAL`), writes a 10–5000 char description, optionally adds contact info, and submits.
3. The SPA calls `POST /api/v1/disaster-reports/reports`. The backend validates via Pydantic, inserts a `DisasterReport` row with `status=PENDING`, and returns the new report ID.
4. The user then uploads images and/or videos via `POST /api/v1/disaster-reports/reports/{id}/media`. Each file is size- and mime-checked, saved under `uploads/disaster_images/`, and logged in `disaster_report_images`.
5. The backend calls `ws_manager.notify("reports", "new_report")`; every Command Center subscribed to `reports` re-fetches and drops a new marker on the map.
6. Citizen sees the submission in [MyDisasterReports.jsx](../frontend/src/pages/MyDisasterReports.jsx) with status `PENDING`.

### 2.2.4.2 Officer Response Workflow

1. Officer opens [CommandCenter.jsx](../frontend/src/pages/CommandCenter.jsx). Their WebSocket client subscribes to `reports` and fetches all active markers.
2. A new marker appears — pulsing red (CRITICAL) on the Leaflet Nepal map.
3. Officer clicks it; the map flies to coordinates and opens a detail panel with description, photos, and reporter contact.
4. Officer calls `PATCH /api/v1/disaster-reports/reports/{id}` with `status=REVIEWING`, `assigned_officer_id=self`, optional `officer_notes`.
5. Backend appends a `DisasterReportStatusHistory` row (previous=PENDING, new=REVIEWING, role=officer, timestamp), then:
   a. Fires a Sankalpa SMS to the citizen ("Hi {name}, your {type} report is now Under Review…").
   b. Broadcasts `ws_manager.notify("reports", "status_updated")`.
6. Officer progresses the report through `DISPATCHED → RESCUING → RESOLVED`, with each transition firing steps 5a and 5b.

### 2.2.4.3 Drone Deployment Workflow

1. From a report's detail panel, the officer triggers a deploy action, creating a `DroneDeployment` row linking the report to a drone ID, with `mission_status=DEPLOYED`.
2. Before launch, the officer consults the Weather Advisory module (`POST /api/v1/weather/ai-advisory` with `context=drone_takeoff`) to get a GO / CAUTION / NO_GO + risk-level recommendation.
3. The officer also consults [NoFlyZone.jsx](../frontend/src/pages/NoFlyZone.jsx) to confirm the incident is outside restricted airspace.
4. The drone is launched in the field; its onboard software writes GPS updates to Firebase Realtime Database.
5. Firebase pushes updates to all subscribed clients (officer map, admin 3D visualization). The backend concurrently syncs `last_known_latitude / longitude / last_sync_at` into Postgres.
6. Officer progresses `mission_status` through `EN_ROUTE → ON_SITE → RETURNING → COMPLETED`. `arrived_at`, `completed_at`, `distance_traveled`, and `flight_duration` are recorded.
7. During the mission, [LiveSurveillance.jsx](../frontend/src/pages/LiveSurveillance.jsx) streams the drone's camera feed through YOLO for live object detection.

### 2.2.4.4 AI Processing Workflow

Two parallel AI pipelines run continuously:

**Pipeline A — Reddit → NLP (global signals)**:
1. [background_tasks.py](../app/services/background_tasks.py) (started from the FastAPI `lifespan` hook if `ENABLE_REDDIT_FETCHING=True`) wakes the Reddit scraper.
2. [reddit_service.py](../app/services/reddit_service.py) iterates 43 subreddits, pulls new posts, inserts `DisasterPost` rows (3-sec delay between subreddits).
3. For each new post, [nlp_processor.py](../app/services/nlp_processor.py) runs: keyword classification → disaster_type + base severity; spaCy NER → location; TextBlob → sentiment; combined scoring → urgency_level; keyword extraction → trending_keywords.
4. Result persisted as `DisasterInsight`; aggregates rolled into `DisasterStats`.
5. Admin dashboards query `GET /api/v1/disasters/dashboard/*` for live visualization.

**Pipeline B — Video → YOLOv8 (local evidence)**:
1. User uploads a video via `POST /api/v1/video/upload`; status set to `uploading`.
2. FastAPI schedules a `BackgroundTasks` job; status flips to `processing`.
3. [video_processor.py](../app/services/video_processor.py) opens the video via OpenCV, iterates frames, calls [yolo_detector.py](../app/services/yolo_detector.py) or [yolo_segmenter.py](../app/services/yolo_segmenter.py), writes the annotated frames to `uploads/detection_output/` or `uploads/segmentation_output/`.
4. On completion, status flips to `completed` and per-frame object counts are persisted.
5. User retrieves the output via the `/uploads` static mount and views results in [VideoAnalysis.jsx](../frontend/src/pages/VideoAnalysis.jsx).

### 2.2.4.5 Real-Time Data Flow

The platform's real-time guarantees come from three independent channels, each optimized for its payload:

- **Small state changes (reports, permits, users)** → Notification WebSocket (`/api/v1/ws`). Backend emits a tiny `{channel, event}` envelope; clients subscribed to that channel re-fetch via REST. This keeps the socket cheap and the data authoritative (REST is the source of truth).
- **Continuous video frames (YOLO)** → Detection WebSocket (`/api/v1/realtime/detect`). Server streams binary JPEG + JSON metadata at 15 FPS directly to the subscribed client. No database write per frame.
- **High-frequency telemetry (drone GPS + sensors)** → Firebase Realtime Database. Field devices write directly to Firebase; clients subscribe directly; backend performs periodic sync into Postgres for durability.

The separation means a flood of GPS updates cannot starve report notifications, and a spike in video traffic cannot delay SMS dispatch.

---

## 2.2.5 Technology Stack and Implementation Details

### Backend Technologies

**FastAPI architecture** — the backend is a FastAPI 0.115 ASGI application ([app/main.py](../app/main.py)) running under Uvicorn with `reload=True` in development. The app uses an `asynccontextmanager` lifespan hook to: create upload directories, run `Base.metadata.create_all(engine)`, conditionally start the Reddit background task, and cleanly stop it on shutdown. CORS middleware is pre-configured for `localhost:5173` (Vite dev server), `localhost:3000`, and `frontend:3000` (Docker network). Static files are served from `/uploads` via `StaticFiles`.

**API routing structure** — routers are grouped by domain and mounted under `/api/v1/*`:
- `/api/v1/auth` (Authentication)
- `/api/v1/users` (Users)
- `/api/v1/permits` (Drone Permits)
- `/api/v1/disasters` (Disasters — NLP dashboard)
- `/api/v1/video` (Video Analysis)
- `/api/v1/disaster-reports` (Citizen Reports)
- `/api/v1/realtime` (Real-Time Detection — WebSocket)
- `/api/v1/sms` (SMS Alerts)
- `/api/v1/weather` (Weather Advisory)
- `/api/v1/ws` (WebSocket Notifications)

Interactive API documentation is auto-generated at `/docs` (Swagger UI) and `/redoc`. Role enforcement is implemented as FastAPI dependencies in [dependencies/auth.py](../app/api/v1/dependencies/auth.py).

**Database integration** — PostgreSQL via `psycopg2-binary` and SQLAlchemy 2.0 ORM. The `engine` and declarative `Base` live in [app/database/database.py](../app/database/database.py); sessions are scoped per request through `Depends(get_db)`. Eleven tables span the three major domains (users/auth, disaster reports/deployments, permits), with foreign keys and `CheckConstraint`s enforcing referential integrity and enum validity at the storage layer. Geospatial coordinates use `DECIMAL(10,8)` / `DECIMAL(11,8)` to avoid float-drift. Versioned SQL migrations live under [migrations/](../migrations/) and are applied by [run_migration.py](../app/run_migration.py).

### Frontend Technologies

**React architecture** — React 19 + Vite 7 Single Page Application. Routing is handled by `react-router-dom` 7 declared in [App.jsx](../frontend/src/App.jsx). State is organized as:
- **AuthContext** ([frontend/src/context/](../frontend/src/context/)) — global user identity.
- **Custom hooks** ([frontend/src/hooks/](../frontend/src/hooks/)) — data-fetching, WebSocket subscription, geolocation.
- **Service layer** ([frontend/src/services/](../frontend/src/services/)) — `api.js` (axios instance with auth interceptors), `auth.js`, `permit.js`.
- **Firebase client** ([frontend/src/firebase/firebase.js](../frontend/src/firebase/firebase.js)) — initialized once, consumed by pages that need live drone telemetry.

**UI/UX design** — TailwindCSS 3 (`tailwind.config.js`, `postcss.config.js`) for utility-first styling, `framer-motion` for page transitions and micro-interactions, `react-hot-toast` for toast notifications, a custom [Navbar.jsx](../frontend/src/components/Navbar.jsx) that renders role-specific menu items, and a [ProtectedRoute.jsx](../frontend/src/components/ProtectedRoute.jsx) wrapper enforcing per-page role access.

**Data visualization** — the frontend bundles seven charting/mapping libraries, each chosen for its strength:
- **Leaflet** + `react-leaflet` — 2D maps with custom markers and GeoJSON overlays (used by CommandCenter).
- **three.js** — 3D drone visualization.
- **ECharts** + `echarts-for-react` + `echarts-extension-gmap` — geo-heatmaps.
- **Chart.js** + `react-chartjs-2` — standard bar / line / pie charts.
- **Recharts** — composable React-idiomatic charts.
- **Plotly** + `react-plotly.js` — advanced statistical plots.
- **Nivo** (`@nivo/calendar`, `@nivo/geo`, `@nivo/sankey`) — calendar heatmaps, flow diagrams, choropleths.
- **jspdf** + `jspdf-autotable` + `file-saver` — PDF and CSV export.

### AI and Machine Learning

**YOLOv8 detection system** — `ultralytics>=8.0.0` provides the YOLOv8 implementation. The model weights `yolov8n.pt` (nano variant, ~6 MB) ship at the repository root for fast startup. [yolo_service.py](../app/services/yolo_service.py) loads the model once at module import and shares the instance across the detector, segmenter, and real-time stream. Confidence threshold is configurable per call (`YOLO_CONFIDENCE=0.45` default), and target FPS for streaming is `YOLO_TARGET_FPS=15`. Detection classes are the standard COCO 80 (person, car, motorcycle, bicycle, etc.) from the nano model's pre-training.

**Segmentation pipeline** — [yolo_segmenter.py](../app/services/yolo_segmenter.py) uses YOLOv8's instance-segmentation mode to produce per-object masks. Output videos go to `uploads/segmentation_output/` with colored mask overlays drawn via OpenCV. Segmentation is heavier than detection and is used mainly for post-incident review rather than live streaming.

**NLP processing** — [nlp_processor.py](../app/services/nlp_processor.py) combines:
- **spaCy** `en_core_web_sm` for tokenization, POS tagging, and Named Entity Recognition (extracts `GPE`, `LOC`, `FAC` entities as disaster locations).
- **TextBlob** for sentiment polarity (−1 to +1 scale).
- **Rule-based classification** against a 12-class disaster taxonomy with per-class keyword lists and base severity weights (1–10).
- **Urgency scoring** that combines disaster severity × sentiment × keyword intensity.

The AI weather advisory uses a remote hosted LLM (`deepseek/deepseek-v3-0324` via Hugging Face Inference Router) with strict structured output parsing.

### Real-Time and IoT

**WebSocket communication** — two distinct WebSocket channels:
- **Notification channel** (`/api/v1/ws`) — [ws_manager.py](../app/services/ws_manager.py) manages subscriber sets per channel (`reports`, `citizens`, `users`, `permits`, `video:{id}`). Messages are tiny JSON envelopes that hint the client to re-fetch via REST. Authentication uses a JWT passed as a query parameter on socket connect.
- **Detection channel** (`/api/v1/realtime/detect`) — a binary-capable WebSocket that alternates JSON metadata frames with JPEG-encoded video frames at 15 FPS. OpenCV's `CAP_PROP_BUFFERSIZE=1` keeps latency minimal. The server auto-reconnects to the IP camera on disconnect.

**Firebase integration** — Firebase 12 Web SDK on the client, initialized via environment-driven config in [firebase.js](../frontend/src/firebase/firebase.js). Drone field devices write GPS and sensor telemetry directly to Firebase Realtime Database nodes keyed by `drone_id`. Officer map UIs and the admin 3D visualization subscribe to those nodes and update instantly on every write. A backend sync job periodically reads the latest position per deployed drone and persists it to the `drone_deployments` table, giving the system of record a durable snapshot without incurring per-write Postgres overhead.

### External Integrations

**OAuth authentication** — Google OAuth 2.0. The frontend uses `@react-oauth/google` v0.13 to open the Google consent dialog and obtain an ID token. The backend validates that token in [google_oauth_service.py](../app/services/google_oauth_service.py) against `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` from [.env](../.env), extracts the user's email, name, profile picture, and Google ID, then creates or fetches the `User` row. Local OAuth refresh tokens are cached to [token.json](../token.json) (gitignored) for Gmail API access.

**SMS API** — Aakash SMS v3 (`https://sms.aakashsms.com/sms/v3/send`). Authentication uses `AAKASH_SMS_AUTH_TOKEN` in the request body. Phone numbers are normalized to 10-digit Nepali format (stripping `+977` or `977` prefixes). Messages are capped at 500 characters. Bulk sends iterate the recipient list with per-call error handling, returning `{total, sent, failed, results[]}`.

**Weather API** — the AI advisory is powered by Hugging Face Inference Router (`router.huggingface.co/novita/v3/openai/chat/completions`) using model `deepseek/deepseek-v3-0324`. Authentication uses `HF_API_TOKEN`. The prompt is templated with raw weather metrics plus pre-computed threshold checks (GO / CAUTION / NO_GO) plus a context flag (`drone_takeoff` or `disaster_response`). Output is parsed into four structured sections: `RECOMMENDATION`, `RISK_LEVEL`, `KEY_CONCERN`, `ACTION`. Raw weather data ingestion (temperature, wind, precipitation, etc.) is assumed to come from upstream sources passed in by the frontend weather widget.
