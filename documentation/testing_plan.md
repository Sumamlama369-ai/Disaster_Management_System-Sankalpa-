# 4. Testing Plan

The testing strategy for the Sankalpa Disaster Management System is structured into four major categories: **Unit Testing**, **System Testing**, **IoT (Firebase) Testing**, and **Drone Features Testing**. This layered approach ensures validation of individual components, integrated workflows, real-time communication, and hardware-related functionalities.

---

## 1. Unit Testing

Unit testing focuses on validating individual backend components, APIs, and service-level logic in isolation using the FastAPI Swagger interface (`/docs`).


### 1.1 Core Application and Environment Unit Tests

#### 1.1.1 UT-01 -- Root Endpoint Validation

Verify that the root endpoint (`GET /`) returns API metadata including name ("Disaster Management System API"), version ("1.0.0"), docs path, and status ("operational").

#### 1.1.2 UT-02 -- Health Check Endpoint

Ensure the `/health` endpoint returns system status as "healthy", confirms database connectivity as "connected", and reports background task state as "running" or "stopped".

#### 1.1.3 UT-03 -- Upload Directory Initialization

Validate that required directories (`uploads/original`, `uploads/processed`, `uploads/detection_output`, `uploads/segmentation_output`, `uploads/disaster_images`) are automatically created at application startup during the lifespan context.

#### 1.1.4 UT-04 -- Static File Access

Verify uploaded files are correctly served via the `/uploads` static file route and are accessible by filename.

#### 1.1.5 UT-05 -- Database Table Auto-Creation

Ensure all SQLAlchemy models (User, OTP, DronePermit, Disaster, Video, DisasterReports, Session, OrganizationCode) have their corresponding tables created via `Base.metadata.create_all()` during startup.

#### 1.1.6 UT-06 -- CORS Middleware Configuration

Validate that CORS middleware allows requests from configured origins (`http://localhost:5173`, `http://localhost:3000`, `http://frontend:3000`) with credentials, all methods, and all headers.

#### 1.1.7 UT-07 -- Background Task Initialization

Verify that background tasks (Reddit data fetching) start only when `ENABLE_REDDIT_FETCHING` is set to `True` in settings, and remain stopped when set to `False`.

---



### 1.2 Authentication and OTP Unit Tests

#### 1.2.1 UT-08 -- User Registration (Valid Input)

Verify successful registration (`POST /api/v1/auth/register`) using a valid Google token and role. Response should return HTTP 201 with a `RegisterResponse` containing user details and OTP status.

#### 1.2.2 UT-09 -- Citizen Registration Without Organization Code

Ensure citizen registration succeeds without providing an organization code, as citizens are not required to belong to an organization.

#### 1.2.3 UT-10 -- Officer Registration Without Organization Code

Verify the system rejects officer registration when the required organization code is missing or invalid, returning an appropriate validation error.

#### 1.2.4 UT-11 -- Admin Registration Without Master Code

Ensure admin registration fails when a valid admin/master code is not provided, preventing unauthorized admin account creation.

#### 1.2.5 UT-12 -- OTP Verification (Valid OTP)

Verify that submitting a correct OTP via `POST /api/v1/auth/verify-otp` returns a `LoginResponse` containing a valid access token.

#### 1.2.6 UT-13 -- OTP Verification (Invalid OTP)

Ensure that submitting an incorrect OTP returns a validation error response and does not issue any access token.

#### 1.2.7 UT-14 -- OTP Verification (Expired OTP)

Verify that attempting to verify an OTP after its expiration window returns an appropriate "OTP expired" error message, requiring the user to request a new OTP.

#### 1.2.8 UT-15 -- Resend OTP (Valid User)

Verify OTP resend functionality (`POST /api/v1/auth/resend-otp`) works correctly for a registered but unverified user, returning a `MessageResponse` confirmation.

#### 1.2.9 UT-16 -- Resend OTP (Non-Existent User)

Ensure that requesting OTP resend for a non-existent email returns an appropriate error indicating the user is not found.

#### 1.2.10 UT-17 -- Login (Verified User)

Ensure a verified user can log in via `POST /api/v1/auth/login` and receive an access token directly in the `LoginResponse`.

#### 1.2.11 UT-18 -- Login (Unverified User) 

Verify the system returns a `needs_verification` flag for users who have not yet completed OTP verification.

#### 1.2.12 UT-19 -- Logout Functionality

Verify that `POST /api/v1/auth/logout` invalidates the current session and returns a `MessageResponse` confirming logout.

#### 1.2.13 UT-20 -- Session Check (Valid Session)

Ensure `GET /api/v1/auth/session-check` returns valid session details for an authenticated user with a valid token/cookie.

#### 1.2.14 UT-21 -- Session Check (Expired/Invalid Session)

Verify that session check with an expired or invalid token returns an unauthorized response (HTTP 401).

#### 1.2.15 UT-22 -- Check Email Existence

Validate that `GET /api/v1/auth/check-email/{email}` correctly reports whether an email is already registered in the system.

---



### 1.3 User Profile and Admin User Management Unit Tests

#### 1.3.1 UT-23 -- Fetch Own Profile

Verify that an authenticated user can retrieve their profile via `GET /api/v1/users/me`, returning a `UserResponse` with complete user details.

#### 1.3.2 UT-24 -- Unauthorized Profile Access

Ensure unauthenticated access to `GET /api/v1/users/me` is denied with HTTP 401.

#### 1.3.3 UT-25 -- Update Phone Number

Validate phone update functionality via `PUT /api/v1/users/me/phone` and ensure the updated phone number is persisted and returned in the response.

#### 1.3.4 UT-26 -- Update District

Verify district update functionality via `PUT /api/v1/users/me/district` and confirm the updated district is reflected in subsequent profile fetches.

#### 1.3.5 UT-27 -- Fetch User Profile by ID

Verify that `GET /api/v1/users/profile/{user_id}` returns the correct user profile for a valid user ID.

#### 1.3.6 UT-28 -- Admin Fetch All Users

Ensure an admin user can retrieve the complete user list via `GET /api/v1/users/all` with proper pagination and filtering support.

#### 1.3.7 UT-29 -- Non-Admin Access Restriction

Verify that non-admin users (citizen, officer) cannot access admin-only endpoints like `GET /api/v1/users/all`, returning HTTP 403.

#### 1.3.8 UT-30 -- Admin User Deactivation

Ensure an admin can deactivate other users via `DELETE /api/v1/users/delete/{user_id}` but cannot deactivate their own account.

#### 1.3.9 UT-31 -- Admin Update User Details

Verify that `PUT /api/v1/users/admin/update/{user_id}` allows admins to modify other user details such as role, district, and phone number.

#### 1.3.10 UT-32 -- Admin Activate User

Ensure `PUT /api/v1/users/admin/activate/{user_id}` correctly reactivates a previously deactivated user account.

#### 1.3.11 UT-33 -- Admin User Statistics

Verify `GET /api/v1/users/admin/stats` returns accurate counts and breakdowns of users by role, status, and district.

---




### 1.4 Drone Permit Unit Tests

#### 1.4.1 UT-34 -- Permit Submission (Valid Data)

Verify successful permit submission via `POST /api/v1/permits/submit` (HTTP 201) with all required documents and fields including drone specifications, flight plan, and supporting files.

#### 1.4.2 UT-35 -- Permit Submission (Missing Required File)

Ensure permit submission fails with validation error when required documents (e.g., registration certificate, flight plan document) are not attached.

#### 1.4.3 UT-36 -- Permit Submission (Invalid Data)

Verify that submitting a permit with invalid data (e.g., past flight dates, invalid coordinates) returns appropriate validation errors.

#### 1.4.4 UT-37 -- Fetch User's Own Permits

Verify authenticated users can retrieve their own permit requests via `GET /api/v1/permits/my-permits` with proper filtering by status.

#### 1.4.5 UT-38 -- Pending Permit Access (Officer/Admin)

Ensure only officer and admin roles can access pending permits via `GET /api/v1/permits/pending`. Citizens should receive a forbidden (HTTP 403) response.

#### 1.4.6 UT-39 -- Permit Details by ID

Verify `GET /api/v1/permits/{permit_id}` returns complete permit details including attached documents, status history, and reviewer notes.

#### 1.4.7 UT-40 -- Permit Review Workflow (Approval)

Validate the permit approval process via `POST /api/v1/permits/review`, ensuring status updates to "approved" and relevant metadata is recorded.

#### 1.4.8 UT-41 -- Permit Review Workflow (Rejection)

Validate the permit rejection process, ensuring rejection reason is required and status updates to "rejected".

#### 1.4.9 UT-42 -- Permit Document Download

Verify `GET /api/v1/permits/download/{permit_id}` returns the permit package with all associated documents for download.

#### 1.4.10 UT-43 -- Citizen Cannot Review Permits

Ensure citizens cannot access the permit review endpoint, receiving an authorization error.

---




### 1.5 Disaster Reporting Unit Tests

#### 1.5.1 UT-44 -- Create Disaster Report (Valid Data)

Verify successful report creation via `POST /api/v1/disaster-reports/reports` (HTTP 201) with valid disaster type, location coordinates, description, and severity level. Response should match `DisasterReportResponse` schema.

#### 1.5.2 UT-45 -- Create Disaster Report (Missing Required Fields)

Ensure missing fields (e.g., no location, no disaster type) trigger appropriate validation errors with descriptive messages.

#### 1.5.3 UT-46 -- Upload Media to Report (Image)

Validate successful image upload via `POST /api/v1/disaster-reports/reports/{report_id}/media` and confirm the file is stored in `uploads/disaster_images/` and the response matches `DisasterReportImageResponse`.

#### 1.5.4 UT-47 -- Upload Media to Report (Video)

Validate successful video evidence upload associated with a disaster report, ensuring proper file storage and metadata recording.

#### 1.5.5 UT-48 -- Upload Media (Invalid File Type)

Ensure unsupported file types (e.g., `.exe`, `.bat`, `.js`) are rejected with an appropriate error message when uploading to a report.

#### 1.5.6 UT-49 -- Fetch Report Media

Verify `GET /api/v1/disaster-reports/reports/{report_id}/media` returns all media files associated with a specific report.

#### 1.5.7 UT-50 -- Fetch Own Reports

Verify users can retrieve their own reports via `GET /api/v1/disaster-reports/reports/my-reports` with pagination support and proper filtering.

#### 1.5.8 UT-51 -- Fetch All Reports (Officer/Admin)

Ensure officers and admins can access all disaster reports via `GET /api/v1/disaster-reports/reports` with filtering and pagination.

#### 1.5.9 UT-52 -- Fetch Report Details

Verify `GET /api/v1/disaster-reports/reports/{report_id}` returns complete report details including media, status history, and reporter information.

#### 1.5.10 UT-53 -- Update Report Status

Validate that authorized users (officer/admin) can update report status via `PATCH /api/v1/disaster-reports/reports/{report_id}`, triggering status history recording and optional SMS notifications.

#### 1.5.11 UT-54 -- Fetch Report Status History

Verify `GET /api/v1/disaster-reports/reports/{report_id}/history` returns the complete chronological status change history for a report.

#### 1.5.12 UT-55 -- Get Map Markers

Ensure `GET /api/v1/disaster-reports/map/markers` returns disaster report locations in `MapMarker` format suitable for map rendering.

#### 1.5.13 UT-56 -- Get Disaster Statistics

Verify `GET /api/v1/disaster-reports/statistics` returns accurate statistical data matching the `DisasterStatistics` response model.

#### 1.5.14 UT-57 -- Access Control for Reports

Verify that citizens cannot access or modify other users' reports, ensuring proper ownership validation.

---




### 1.6 Drone Deployment Unit Tests

#### 1.6.1 UT-58 -- Deploy Drone (Valid Request)

Verify successful drone deployment via `POST /api/v1/disaster-reports/drones/deploy` (HTTP 201) with valid deployment parameters including target coordinates and mission type. Response should match `DroneDeploymentResponse`.

#### 1.6.2 UT-59 -- Deploy Drone (Invalid Parameters)

Ensure drone deployment fails with appropriate errors when given invalid coordinates, missing mission type, or unauthorized user role.

#### 1.6.3 UT-60 -- Fetch Active Drones

Verify `GET /api/v1/disaster-reports/drones/active` returns the list of currently deployed/active drones with their deployment details and status.

#### 1.6.4 UT-61 -- Drone Deployment Authorization

Ensure only officers and admins can deploy drones; citizens should receive a forbidden response.

---





### 1.7 Video Analysis Unit Tests

#### 1.7.1 UT-62 -- Video Upload (Valid Format)

Ensure valid video file upload via `POST /api/v1/video/upload` succeeds and returns video metadata including video ID and processing status.

#### 1.7.2 UT-63 -- Video Upload (Invalid Format)

Verify unsupported video formats (e.g., `.avi`, `.wmv` or non-video files) are rejected with a clear error message.

#### 1.7.3 UT-64 -- Video Upload (Exceeding Size Limit)

Ensure videos exceeding the maximum allowed file size are rejected with an appropriate error.

#### 1.7.4 UT-65 -- Video Processing Status

Check that `GET /api/v1/video/status/{video_id}` correctly returns the current processing state (queued, processing, completed, failed) for an uploaded video.

#### 1.7.5 UT-66 -- Video Analysis Retrieval

Ensure `GET /api/v1/video/analysis/{video_id}` returns correct YOLO detection/segmentation results for a fully processed video, including detected objects, confidence scores, and frame-level annotations.

#### 1.7.6 UT-67 -- Video List Retrieval

Verify `GET /api/v1/video/list` returns all videos uploaded by the authenticated user with metadata and status information.

#### 1.7.7 UT-68 -- Video Stream Access

Validate that `GET /api/v1/video/stream/{video_id}/{output_type}` correctly streams the processed video output (detection or segmentation) to the client.

#### 1.7.8 UT-69 -- Video Deletion

Ensure `DELETE /api/v1/video/delete/{video_id}` removes the video record and associated files from storage, returning confirmation.

#### 1.7.9 UT-70 -- Video Analysis (Non-Existent Video)

Verify that requesting analysis for a non-existent video ID returns a proper 404 response.

---





### 1.8 Realtime Detection and WebSocket Unit Tests

#### 1.8.1 UT-71 -- WebSocket Connection (Valid Token)

Verify that a WebSocket connection to `/api/v1/realtime/detect` is successfully established when a valid authentication token is provided.

#### 1.8.2 UT-72 -- WebSocket Connection (Invalid Token)

Ensure an unauthorized WebSocket connection attempt with an invalid or expired token is rejected immediately.

#### 1.8.3 UT-73 -- Realtime Detection Frame Processing

Validate that sending a video frame through the WebSocket triggers YOLO detection and returns annotated results with bounding boxes, object labels, and confidence scores.

#### 1.8.4 UT-74 -- WebSocket Notification Connection

Verify that `WS /api/v1/ws/notifications` establishes a persistent connection for receiving real-time data-change notifications across subscribed channels.

#### 1.8.5 UT-75 -- WebSocket Channel Subscription

Ensure clients can subscribe to specific notification channels (e.g., "reports", "disasters", "permits") and receive only relevant updates.

#### 1.8.6 UT-76 -- WebSocket Reconnection Handling

Verify that the frontend WebSocket hook (`useWebSocket`) correctly handles disconnections and attempts automatic reconnection with backoff.

#### 1.8.7 UT-77 -- Dashboard Live WebSocket

Validate that the disaster dashboard live WebSocket (`WS /api/v1/disasters/dashboard/live`) broadcasts new disaster events to all connected clients.

---





### 1.9 SMS Alert Unit Tests

#### 1.9.1 UT-78 -- Send Single SMS

Verify `POST /api/v1/sms/send` successfully sends an SMS message to a single phone number and returns an `SMSResponse` with delivery status.

#### 1.9.2 UT-79 -- Send Bulk SMS

Ensure `POST /api/v1/sms/send-bulk` correctly sends SMS messages to multiple recipients and returns a `BulkSMSResponse` with individual delivery statuses.

#### 1.9.3 UT-80 -- Broadcast to Citizens

Validate `POST /api/v1/sms/broadcast` sends disaster alerts to all registered citizens who have phone numbers on file, returning a `BulkSMSResponse`.

#### 1.9.4 UT-81 -- Get Citizens with Phone Numbers

Verify `GET /api/v1/sms/citizens-with-phone` returns a list of all citizen users who have registered phone numbers, for SMS broadcast targeting.

#### 1.9.5 UT-82 -- SMS with Invalid Phone Number

Ensure sending SMS to an invalid or malformed phone number returns an appropriate error rather than silently failing.

#### 1.9.6 UT-83 -- SMS Authorization Check

Verify that only officers and admins can access SMS sending endpoints; citizens should be restricted from broadcasting alerts.

---




### 1.10 Weather Intelligence Unit Tests

#### 1.10.1 UT-84 -- AI Advisory Request

Verify `POST /api/v1/weather/ai-advisory` generates an AI-powered weather advisory using the configured LLM based on the `AdvisoryRequest` parameters (location, weather data, context).

#### 1.10.2 UT-85 -- AI Advisory Response Structure

Ensure the AI advisory response contains structured sections including risk assessment, recommended actions, and severity indicators.

#### 1.10.3 UT-86 -- Weather Report Generation

Ensure `POST /api/v1/weather/generate-report` generates a comprehensive weather report using the `ReportRequest` parameters and returns correctly structured output.

#### 1.10.4 UT-87 -- Weather Report with Invalid Location

Verify that requesting a weather report for an invalid or non-existent location returns a meaningful error.

#### 1.10.5 UT-88 -- AI Advisory Prompt Construction

Validate that the `build_prompt()` function correctly constructs the LLM prompt with all required weather parameters, location data, and context for accurate advisory generation.

---





### 1.11 Disaster Dashboard Analytics Unit Tests

#### 1.11.1 UT-89 -- Dashboard Statistics

Verify `GET /api/v1/disasters/dashboard/stats` returns correct aggregate statistics including total disasters, active incidents, resolved count, and response metrics.

#### 1.11.2 UT-90 -- Recent Disasters Retrieval

Ensure `GET /api/v1/disasters/dashboard/recent-disasters` returns the most recent disaster events with complete details and proper chronological ordering.

#### 1.11.3 UT-91 -- Disaster Type Distribution

Validate `GET /api/v1/disasters/dashboard/disaster-types` returns accurate counts for each disaster category (flood, earthquake, landslide, fire, etc.).

#### 1.11.4 UT-92 -- Urgency Distribution

Verify `GET /api/v1/disasters/dashboard/urgency-distribution` returns correct breakdowns by urgency levels (critical, high, medium, low).

#### 1.11.5 UT-93 -- Location Hotspots

Ensure `GET /api/v1/disasters/dashboard/location-hotspots` returns geographic clustering of disaster events for heatmap visualization.

#### 1.11.6 UT-94 -- Disaster Timeline

Validate `GET /api/v1/disasters/dashboard/timeline` returns chronological disaster data suitable for timeline chart rendering.

#### 1.11.7 UT-95 -- System Status

Verify `GET /api/v1/disasters/system/status` returns the current operational status of all system components.

---





### 1.12 Background Service Unit Tests

#### 1.12.1 UT-96 -- Reddit Data Fetching Service

Verify the Reddit service (`reddit_service.py`) correctly fetches disaster-related posts from configured subreddits when enabled.

#### 1.12.2 UT-97 -- NLP Processor

Validate the NLP processor (`nlp_processor.py`) correctly classifies disaster types, extracts location entities, and determines severity from text input.

#### 1.12.3 UT-98 -- Gmail Service Integration

Ensure the Gmail service (`gmail_service.py`) correctly sends OTP emails using the configured Google OAuth credentials.

#### 1.12.4 UT-99 -- YOLO Detection Service

Verify the YOLO detection service (`yolo_detector.py`) correctly processes images/frames and returns detection results with bounding boxes and confidence scores using the `yolov8n.pt` model.

#### 1.12.5 UT-100 -- YOLO Segmentation Service

Validate the YOLO segmentation service (`yolo_segmenter.py`) produces accurate segmentation masks for detected objects in disaster imagery.

#### 1.12.6 UT-101 -- Video Processor Pipeline

Ensure the video processor (`video_processor.py`) correctly handles the full pipeline: frame extraction, YOLO processing, result aggregation, and output video generation.

#### 1.12.7 UT-102 -- WebSocket Manager

Verify the WebSocket manager (`ws_manager.py`) correctly handles client connections, disconnections, channel subscriptions, and message broadcasting.

#### 1.12.8 UT-103 -- Session Service

Validate the session service (`session_service.py`) correctly creates, validates, and invalidates user sessions with proper cookie handling.

---







## 2. System Testing\\\\\\\\\\\

System testing validates the complete integrated application using frontend workflows, ensuring all components work together seamlessly from the user's perspective.

### 2.1 Authentication Flow System Tests

#### 2.1.1 ST-01 -- User Registration and OTP Flow

Verify the complete registration workflow: Google OAuth login on `PublicPage.jsx` -> role selection on `RoleSelection.jsx` -> OTP delivery via Gmail -> OTP entry on `OTPVerification.jsx` -> successful account creation and redirect to dashboard.

#### 2.1.2 ST-02 -- Login Flow (Verified User)

Ensure valid login on `LoginProcess.jsx` redirects to the appropriate role-based dashboard (Citizen, Officer, or Admin) based on the user's assigned role.

#### 2.1.3 ST-03 -- Login Flow (Unverified User)

Verify that an unverified user attempting login is redirected to the OTP verification page rather than the dashboard.

#### 2.1.4 ST-04 -- Unauthorized Access Handling

Verify the `ProtectedRoute` component blocks unauthenticated users from accessing protected pages and redirects them to the public/login page.

#### 2.1.5 ST-05 -- Role-Based Route Protection

Ensure that role-specific pages (e.g., admin dashboard, officer command center) are inaccessible to users with incorrect roles, even when authenticated.

#### 2.1.6 ST-06 -- Session Persistence Across Refresh

Verify that refreshing the browser preserves the user's authenticated session via cookie/token validation through `session-check` endpoint.

#### 2.1.7 ST-07 -- Logout and Session Cleanup

Ensure logging out clears the access token from `localStorage`, invalidates the server-side session, and redirects to the public page.

#### 2.1.8 ST-08 -- Token Expiration Handling

Verify that when an access token expires, the Axios interceptor catches the 401 response, clears stored credentials, and redirects the user to the login page.

---




### 2.2 Citizen Workflow System Tests

#### 2.2.1 ST-09 -- Citizen Dashboard Load

Verify `CitizenDashboard.jsx` loads correctly after login, displaying the citizen's overview including recent reports, permit status, and weather information.

#### 2.2.2 ST-10 -- Submit Drone Permit Application

Validate the full permit submission workflow on `DronePermitForm.jsx`: filling all required fields (drone details, flight plan, purpose) -> uploading required documents -> form submission -> confirmation message and permit creation.

#### 2.2.3 ST-11 -- View My Permits

Ensure `MyPermits.jsx` correctly displays all the citizen's submitted drone permits with current status (pending, approved, rejected), filtering options, and detailed view.

#### 2.2.4 ST-12 -- Submit Disaster Report

Ensure the disaster report submission workflow on `DisasterReport.jsx` works correctly: selecting disaster type -> entering location (with map picker) -> adding description and severity -> attaching evidence media -> successful submission.

#### 2.2.5 ST-13 -- Upload Evidence Media

Verify file upload functionality on `DisasterReport.jsx` for both images and videos, including preview display, file size validation, and progress indication.

#### 2.2.6 ST-14 -- View My Disaster Reports

Validate `MyDisasterReports.jsx` displays the citizen's submitted reports with status tracking, media attachments, and status history timeline.

#### 2.2.7 ST-15 -- Video Analysis Workflow

Validate the full workflow on `VideoAnalysis.jsx`: upload video -> view processing status -> view YOLO detection/segmentation results -> stream processed output video.

#### 2.2.8 ST-16 -- Weather Information Display

Verify that weather data is correctly displayed on the citizen dashboard with current conditions, forecasts, and any active weather advisories for the user's district.

---




### 2.3 Officer Workflow System Tests

#### 2.3.1 ST-17 -- Officer Dashboard Access

Ensure `OfficerDashboard.jsx` loads correctly with officer-specific features including pending tasks, active incidents overview, and quick action buttons.

#### 2.3.2 ST-18 -- Review Permit Requests

Validate the permit review workflow on `PermitReview.jsx`: viewing pending permits -> examining submitted documents -> approving or rejecting with comments -> status update confirmation.

#### 2.3.3 ST-19 -- Command Center Monitoring

Verify `CommandCenter.jsx` correctly displays all disaster reports on an interactive map with filtering by type, severity, and status, along with real-time updates via WebSocket.

#### 2.3.4 ST-20 -- Live Surveillance System

Ensure `LiveSurveillance.jsx` establishes a WebSocket connection for real-time video feed processing with YOLO detection overlay, displaying detected objects and alerts.

#### 2.3.5 ST-21 -- Live Dashboard Analytics

Verify `LiveDashboard.jsx` displays real-time disaster statistics, active incident tracking, and auto-refreshing data via WebSocket notifications.

#### 2.3.6 ST-22 -- Disaster Report Status Management

Validate that officers can update disaster report statuses (e.g., "reported" -> "verified" -> "responding" -> "resolved") and that SMS notifications are triggered to the reporting citizen.

#### 2.3.7 ST-23 -- SMS Alert Broadcasting

Ensure officers can compose and send disaster alert SMS messages to affected citizens through the `DisasterAlertSMS.jsx` interface with bulk and targeted sending options.

#### 2.3.8 ST-24 -- Drone Deployment from Command Center

Verify officers can deploy drones to disaster locations from the command center, specifying mission parameters and viewing active drone positions.

#### 2.3.9 ST-40 -- Officer Navigation Active State Theme Color

Verify that the officer role navigation bar in `Navbar.jsx` uses sky blue (`sky-500`) as the active/clicked page indicator color, consistent with the citizen role's blue navigation theme, instead of the previous green/emerald color. Confirm the active state applies correctly on both desktop and mobile navigation for all officer route links.

#### 2.3.10 ST-41 -- Permit Review Page SVG Icons

Verify that all UI elements on `PermitReview.jsx` use inline SVG icons instead of emoji characters. This includes: page header icon, stats card icons (pending reviews, urgent, unique applicants), permit status badges (pending, urgent), action buttons (view details, download, approve, reject), detail modal section headers (drone specs, operator info, address, documents), document viewer buttons, review modal icons (approve/reject header, warning notice, confirm buttons), and the empty state illustration. Ensure all SVG icons render correctly across browsers and maintain proper alignment, sizing, and color theming.

---




### 2.4 Admin Workflow System Tests

#### 2.4.1 ST-25 -- Admin Dashboard Load

Verify `AdminDashboard.jsx` loads correctly with admin-specific features including system overview, user statistics, and administrative actions.

#### 2.4.2 ST-26 -- User Management System

Validate `UserManagement.jsx` functionality: viewing all users with search/filter -> editing user details -> activating/deactivating accounts -> role management.

#### 2.4.3 ST-27 -- Analytics Dashboard

Ensure `AdminAnalytics.jsx` loads all statistical charts and data correctly, including disaster distribution by type, urgency breakdown, location hotspots (heatmap), timeline analysis, and system performance metrics.

#### 2.4.4 ST-28 -- Weather Advisory System

Verify `AdminWeather.jsx` allows admins to generate AI-powered weather advisories and comprehensive weather reports for specific locations and districts.

#### 2.4.5 ST-29 -- Incident Weather Correlation

Validate `IncidentWeather.jsx` correctly correlates disaster incidents with weather data, displaying combined analysis for informed decision-making.

#### 2.4.6 ST-30 -- No-Fly Zone Management

Ensure `NoFlyZone.jsx` allows admins to view, create, and manage no-fly zones on an interactive map, affecting drone permit approvals and flight path validation.

#### 2.4.7 ST-31 -- Admin Permit Oversight

Verify admins have full oversight of all drone permits across all statuses with the ability to override officer decisions when necessary.

---





### 2.5 Cross-System Integration Tests

#### 2.5.1 ST-32 -- Frontend-Backend API Communication

Ensure all Axios API calls from `api.js` correctly communicate with FastAPI backend endpoints, with proper request formatting, authentication headers, and response parsing.

#### 2.5.2 ST-33 -- Database Integration and Persistence

Verify data persistence across the full stack: data entered via frontend forms -> transmitted via API -> stored in PostgreSQL/SQLite -> retrievable and accurately displayed back on the frontend.

#### 2.5.3 ST-34 -- File Storage and Retrieval

Ensure uploaded files (images, videos, documents) are correctly stored in the `uploads/` directory structure, served via the static file mount, and accessible from the frontend via URL.

#### 2.5.4 ST-35 -- Authentication Token Flow

Verify the complete token lifecycle: token issued at login -> stored in `localStorage` -> attached to requests via Axios interceptor -> validated by backend `get_current_user` dependency -> cleared on logout/expiration.

#### 2.5.5 ST-36 -- Cookie-Based Session Management

Validate that session cookies are correctly set with `withCredentials: true`, transmitted with cross-origin requests, and properly validated on the backend.

#### 2.5.6 ST-37 -- Error Handling Across Stack

Verify that backend validation errors, server errors, and network failures are properly caught by the Axios interceptor and displayed to the user with meaningful messages.

#### 2.5.7 ST-38 -- Real-Time Data Synchronization

Ensure WebSocket notifications from the backend trigger appropriate data re-fetches on the frontend, keeping dashboards and views up-to-date without manual refresh.

#### 2.5.8 ST-39 -- Concurrent User Operations

Validate that multiple simultaneous users can interact with the system (submitting reports, reviewing permits, viewing dashboards) without data conflicts or race conditions.

---










## 3. IoT Testing (Firebase / Realtime Communication)\\\\\\\\\\

This section validates real-time communication, notification mechanisms, and IoT data synchronization using Firebase Realtime Database and WebSocket connections.

### 3.1 Firebase Configuration Tests

#### 3.1.1 IT-01 -- Firebase App Initialization

Verify that the Firebase app initializes correctly using the configured credentials (`firebase.js`) and establishes a connection to the Realtime Database instance at the configured URL.

#### 3.1.2 IT-02 -- Firebase Database Connection

Ensure `getDatabase(app)` returns a valid database reference and the app can read/write to the Firebase Realtime Database.

#### 3.1.3 IT-03 -- Firebase Authentication and Security Rules

Validate that Firebase security rules correctly restrict read/write access based on authentication state, preventing unauthorized data manipulation.

---




### 3.2 Realtime Data Synchronization Tests

#### 3.2.1 IT-04 -- Firebase Data Push

Verify that disaster event data is successfully pushed to Firebase Realtime Database and the write operation completes without errors.

#### 3.2.2 IT-05 -- Firebase Data Retrieval

Ensure the frontend correctly retrieves real-time data from Firebase using `onValue` listeners, reflecting the latest state of disaster events.

#### 3.2.3 IT-06 -- Firebase Data Update Propagation

Verify that when data is updated in Firebase, all connected clients receive the update within an acceptable latency threshold (< 2 seconds).

#### 3.2.4 IT-07 -- Firebase Offline Handling

Validate that the application handles Firebase connection loss gracefully, queuing writes and synchronizing when connectivity is restored.

#### 3.2.5 IT-08 -- Firebase Data Consistency

Ensure that concurrent writes to the same Firebase path from multiple clients result in consistent final state without data corruption.

---




### 3.3 WebSocket Communication Tests

#### 3.3.1 IT-09 -- WebSocket Connection Establishment

Verify that the `useWebSocket` hook correctly establishes WebSocket connections to the backend with proper URL transformation (`http` -> `ws`) and channel subscription.

#### 3.3.2 IT-10 -- WebSocket Message Format Validation

Ensure WebSocket messages follow the expected format with channel name, event type, and optional payload data.

#### 3.3.3 IT-11 -- WebSocket Auto-Reconnection

Validate that the WebSocket hook automatically reconnects after unexpected disconnection with exponential backoff, as implemented in `useWebSocket.js`.

#### 3.3.4 IT-12 -- WebSocket Channel Filtering

Verify that clients only receive notifications for channels they have subscribed to, not broadcasts from unrelated channels.

#### 3.3.5 IT-13 -- WebSocket Connection Cleanup

Ensure WebSocket connections are properly closed when components unmount or when the `enabled` option is set to `false`, preventing memory leaks.

---




### 3.4 Notification System Tests

#### 3.4.1 IT-14 -- Real-Time Alert on New Disaster Report

Verify that when a new disaster report is created, all connected officer/admin clients receive a real-time notification through the WebSocket notification channel.

#### 3.4.2 IT-15 -- Report Status Change Notification

Ensure that when a disaster report status is updated (e.g., "verified", "responding"), the reporting citizen receives a real-time notification and optionally an SMS alert.

#### 3.4.3 IT-16 -- Drone Deployment Notification

Validate that drone deployment events trigger real-time notifications to relevant command center viewers.

#### 3.4.4 IT-17 -- Permit Review Notification

Verify that permit approval or rejection triggers a notification to the applicant citizen.

#### 3.4.5 IT-18 -- Dashboard Live Data Update

Ensure the disaster dashboard (`/api/v1/disasters/dashboard/live`) WebSocket correctly broadcasts new disaster events to all connected dashboard viewers in real time.

#### 3.4.6 IT-19 -- Multi-Client Notification Delivery

Validate that notifications are delivered to all connected clients simultaneously without message loss or significant delay variation between clients.

---




### 3.5 SMS Integration Tests

#### 3.5.1 IT-20 -- SMS Delivery on Status Change

Verify that updating a disaster report status triggers an automatic SMS notification to the citizen who filed the report, with the correct message content.

#### 3.5.2 IT-21 -- Bulk SMS Delivery Performance

Ensure bulk SMS broadcasting to all citizens with registered phone numbers completes within acceptable time limits without message loss.

#### 3.5.3 IT-22 -- SMS Failure Handling

Validate that SMS delivery failures (invalid numbers, service unavailable) are handled gracefully with appropriate error logging and retry logic.

---




## 4. Drone Features Testing\\\\\\\\\

This section validates drone-specific functionalities including permit workflows, visualization, no-fly zone enforcement, and deployment operations.

### 4.1 Drone Permit Workflow Tests

#### 4.1.1 DT-01 -- End-to-End Permit Application

Validate the complete permit lifecycle: citizen submits application with drone specifications and flight plan -> officer reviews with document verification -> approval/rejection with comments -> citizen receives notification and updated status.

#### 4.1.2 DT-02 -- Permit Document Upload Validation

Verify that all required permit documents (registration certificate, insurance, flight plan, pilot license) are validated for correct format and file size during submission.

#### 4.1.3 DT-03 -- Permit Status Transitions

Ensure permits follow the correct status flow (submitted -> under_review -> approved/rejected) and that invalid transitions (e.g., rejected -> approved) are prevented.

#### 4.1.4 DT-04 -- Permit Expiration Handling

Validate that approved permits have an expiration mechanism and that expired permits are correctly flagged in the system.

---





### 4.2 Drone Visualization Tests

#### 4.2.1 DT-05 -- Drone Visualization Page Load

Verify `DroneVisualization.jsx` loads correctly with the interactive map, drone position markers, flight path visualization, and control panel.

#### 4.2.2 DT-06 -- Real-Time Drone Position Tracking

Ensure drone positions are updated in real-time on the visualization map using Firebase/WebSocket data feeds with smooth marker transitions.

#### 4.2.3 DT-07 -- Flight Path Rendering

Validate that planned and actual drone flight paths are correctly rendered on the map with proper waypoint markers, altitude indicators, and path coloring.

#### 4.2.4 DT-08 -- Drone Telemetry Display

Verify that drone telemetry data (altitude, speed, battery level, GPS coordinates, signal strength) is correctly displayed and updated in the visualization panel.

#### 4.2.5 DT-09 -- Multiple Drone Tracking

Ensure the visualization correctly handles and displays multiple active drones simultaneously without rendering conflicts or performance degradation.

---

### 4.3 No-Fly Zone Tests

#### 4.3.1 DT-10 -- No-Fly Zone Display

Verify `NoFlyZone.jsx` correctly renders all configured no-fly zones on the interactive map with appropriate visual boundaries (polygons/circles) and zone information tooltips.

#### 4.3.2 DT-11 -- No-Fly Zone Creation

Validate that admins can create new no-fly zones by drawing boundaries on the map, specifying zone type (permanent/temporary), altitude restrictions, and effective dates.

#### 4.3.3 DT-12 -- No-Fly Zone Conflict Detection

Ensure that when a drone permit application includes a flight path intersecting a no-fly zone, the system flags the conflict and alerts the reviewer during the permit review process.

#### 4.3.4 DT-13 -- No-Fly Zone Modification

Verify that existing no-fly zones can be modified (boundary adjustment, status change, expiration update) by authorized admin users.

#### 4.3.5 DT-14 -- Temporary No-Fly Zone Expiration

Validate that temporary no-fly zones (e.g., during active disaster response) are automatically deactivated after their specified end date/time.

---




### 4.4 Drone Deployment Tests

#### 4.4.1 DT-15 -- Drone Deployment from Disaster Report

Verify that officers can deploy a drone directly from a disaster report's detail view, with the target location pre-populated from the report's coordinates.

#### 4.4.2 DT-16 -- Deployment Mission Configuration

Validate that deployment requests include all required mission parameters: target coordinates, mission type (survey, search_rescue, delivery), estimated duration, and assigned operator.

#### 4.4.3 DT-17 -- Active Drone Listing

Ensure the active drones endpoint returns accurate real-time data for all deployed drones including mission status, current position, and estimated return time.

#### 4.4.4 DT-18 -- Drone Mission Status Updates

Verify that drone mission status transitions (deployed -> in_transit -> on_site -> returning -> completed) are tracked and broadcasted to the command center in real-time.

#### 4.4.5 DT-19 -- Drone Feed Integration with Surveillance

Validate that deployed drone video feeds can be accessed through the `LiveSurveillance.jsx` system with YOLO detection overlay for real-time disaster assessment.

---


////

### 4.5 Drone Data and Analytics Tests

#### 4.5.1 DT-20 -- Drone Deployment History

Verify that all completed drone missions are recorded with full details (timestamps, locations, mission outcomes, collected data) and accessible through the admin analytics.

#### 4.5.2 DT-21 -- Drone Coverage Analysis

Validate that the system can generate coverage analysis showing areas surveyed by drones, helping identify gaps in disaster response coverage.

#### 4.5.3 DT-22 -- Drone Imagery Processing

Ensure drone-captured images and videos are processed through the YOLO detection pipeline, with results linked back to the originating disaster report and drone mission.

---




## 5. Test Summary Table

| Testing Category          | Test ID Range  | Total Tests | Key Focus Areas                                        |
|---------------------------|----------------|-------------|--------------------------------------------------------|
| Unit Testing              | UT-01 to UT-103| 103         | API endpoints, services, authentication, data validation|
| System Testing            | ST-01 to ST-41 | 41          | End-to-end workflows, UI integration, cross-system ops |
| IoT / Firebase Testing    | IT-01 to IT-22 | 22          | Realtime sync, WebSocket, notifications, SMS           |
| Drone Features Testing    | DT-01 to DT-22 | 22          | Permits, visualization, no-fly zones, deployment       |
| **Total**                 |                | **188**     |                                                        |

---

## 6. Testing Tools and Environment

| Tool / Technology        | Purpose                                                    |
|--------------------------|------------------------------------------------------------|
| FastAPI Swagger (`/docs`)| Interactive API testing and endpoint validation            |
| Postman                  | Manual API testing with collections and environment setup  |
| Browser DevTools         | Frontend debugging, network monitoring, WebSocket inspection|
| Firebase Console         | Realtime Database monitoring, security rule testing        |
| React Developer Tools    | Component state inspection and props validation            |
| Manual Browser Testing   | UI/UX validation across Chrome, Firefox, Edge              |

---

## 7. Test Environment Configuration

- **Backend**: FastAPI running on `http://localhost:8000`
- **Frontend**: React (Vite) running on `http://localhost:5173`
- **Database**: PostgreSQL/SQLite with auto-created tables
- **Firebase**: Realtime Database at `disaster-management-4c3f6-default-rtdb.asia-southeast1.firebasedatabase.app`
- **WebSocket**: `ws://localhost:8000/api/v1/ws/notifications` and `ws://localhost:8000/api/v1/realtime/detect`
- **ML Model**: YOLOv8 Nano (`yolov8n.pt`) for detection and segmentation
