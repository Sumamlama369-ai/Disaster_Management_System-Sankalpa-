# Responsive Testing Documentation

## Overview

The frontend uses **Tailwind CSS v3** with default breakpoints and no custom breakpoint configuration. Responsive coverage is uneven — some pages have thorough multi-breakpoint layouts while three pages have zero responsive prefixes at all. Most map-based pages assume a wide desktop screen via `calc(100vh - Xpx)` height and fixed-width sidebars.

**Tailwind breakpoints in use** (all default, none custom):

| Prefix | Min-width | Usage in codebase |
|---|---|---|
| `sm:` | 640px | Padding scaling (`sm:px-6`), text scaling, occasional grid changes |
| `md:` | 768px | Grid column transitions (most common breakpoint used) |
| `lg:` | 1024px | Layout splits, show/hide decisions, flex-direction flips |
| `xl:` | 1280px | Grid column expansion (NepalWeather only) |
| `2xl:` | 1536px | Not used anywhere |

`tailwind.config.js` adds only a custom colour palette and `fontFamily: { sans: ['Inter', ...] }`. No `screens` override.

---

## 1. Navbar — Mobile Menu

**File:** [Navbar.jsx](frontend/src/components/Navbar.jsx)

### State

```js
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
```

### Hamburger Button (mobile/tablet only)

```jsx
<button
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
  className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
>
  <svg ...>
    {mobileMenuOpen
      ? <path d="M6 18L18 6M6 6l12 12" />   {/* X icon */}
      : <path d="M4 6h16M4 12h16M4 18h16" /> {/* Hamburger icon */}
    }
  </svg>
</button>
```

- Visible only below `lg` (< 1024px). The SVG path switches inline based on state — no icon component swap.

### Desktop Navigation

```jsx
<div className="hidden lg:flex items-center gap-0.5 mx-4">
  {navItems.map(...)}
</div>
```

- `hidden` on all screens below lg; `flex` at lg+.
- Desktop user profile dropdown sits alongside this — also `hidden lg:flex`.

### Mobile Menu (conditional render)

```jsx
{mobileMenuOpen && (
  <div className="lg:hidden border-t border-gray-100 bg-white">
    <div className="px-4 py-4 space-y-2">
      {/* User info, nav items, logout */}
    </div>
  </div>
)}
```

- Conditionally rendered (DOM-removed when closed), unlike desktop nav which always exists in DOM.
- No animation on the mobile dropdown — plain conditional render, no `AnimatePresence`.
- The `lg:hidden` class means the mobile menu is still hidden on lg+ even if `mobileMenuOpen` is true — so if a user resizes from mobile (opens menu) to desktop, the menu becomes invisible without state reset. `mobileMenuOpen` stays `true`.

### Navbar Padding Scaling

```jsx
<div className="px-4 sm:px-6 lg:px-8">
```

- 16px → 24px → 32px as screen widens.
- This pattern is replicated on nearly every page's main content container.

---

## 2. Pages — Responsive Coverage by Level

### Level 1 — No Responsive Prefixes (Fixed Layout)

#### `NoFlyZone.jsx`

Zero responsive prefixes. Layout is a `flex` row with a fixed-width sidebar and full-height map:

```jsx
<div className="max-w-[1920px] mx-auto p-4">
  <div className="flex gap-4" style={{ height: 'calc(100vh - 160px)' }}>
    {/* Sidebar */}
    {/* Map — flex-1 */}
  </div>
</div>
```

- No fixed sidebar pixel width in class (sidebar uses `flex-shrink-0` implicitly via content). Sidebar width is determined by content at all screen sizes.
- `calc(100vh - 160px)` locks the layout height to viewport minus a 160px header offset. On small screens this can produce a very short map area.
- The zone detail popup is `w-[320px]` fixed via an absolute-positioned div.

#### `OTPVerification.jsx`

Zero responsive prefixes. Centred card layout using `flex items-center justify-center min-h-screen`. The card has no `max-w` constraint — it stretches to full width on very small screens.

#### `LoginProcess.jsx`

Zero responsive prefixes. Uses `flex`, `gap`, and fixed internal sizes. No stacking or padding adjustments across viewports.

---

### Level 2 — Minimal (1 breakpoint)

#### `LiveDashboard.jsx`

Only one responsive prefix in the entire 1,474-line file:

```jsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
  {/* 4 stat cards */}
</div>
```

Everything else — the 12-column chart grid, the map container, the sidebar — uses no breakpoint prefixes:

```jsx
<div className="grid grid-cols-12 gap-6">
  {/* All col-span-X values have no lg: prefix */}
</div>
```

- At < 768px: stat cards stack to 1 column. Charts stay in their 12-column grid regardless.
- `max-w-[1800px] mx-auto` — optimised for very wide screens.
- The 30-second auto-refresh countdown display panel uses fixed inner layout with no breakpoint handling.

#### `RoleSelection.jsx`

```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {/* Citizen / Officer / Admin role cards */}
</div>
```

- Single mobile→desktop transition at `md`. Below 768px: cards stack vertically.

---

### Level 3 — Moderate (Standard grid + direction flips)

#### `DronePermitForm.jsx`

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Form fields */}
</div>
```

- 4-step wizard form. Each step uses `md:grid-cols-2` for field pairs. No `lg:` or `xl:` usage.
- The multi-step progress bar uses `flex` with no breakpoint adjustments — on narrow screens the step labels can crowd.

#### `MyPermits.jsx`

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Permit cards */}
</div>
```

- Progressive 1→2→3 column grid.

#### `PermitReview.jsx`

```jsx
{/* Header stat cards */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

{/* Detail panel */}
<div className="flex flex-col lg:flex-row gap-6">
  <div className="lg:col-span-4">
    {/* Permit list */}
  </div>
  <div className="lg:col-span-4">
    {/* Detail view */}
  </div>
</div>
```

- `lg:flex-row` flips the detail panel from stacked to side-by-side at 1024px.

#### `VideoAnalysis.jsx`

```jsx
{/* Stats row */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

{/* Results layout */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```

- All `ReactECharts` instances use **fixed pixel heights** via `style` prop:
  ```jsx
  style={{ height: '350px' }}   // Detection timeline
  style={{ height: '350px' }}   // Segmentation area
  style={{ height: '400px' }}   // Top detections bar
  ```
  Charts do not resize with container width changes — they maintain fixed height at all screen widths.

#### `LiveSurveillance.jsx`

```jsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {/* Stats */}
  </div>
  <div className="flex flex-col lg:flex-row gap-6">
    {/* Camera feed + controls */}
  </div>
</div>
```

- `lg:flex-row` flips camera feed + control panel from stacked to side-by-side.
- Uses `max-w-7xl` (1280px) — narrower than most other pages.

#### `DisasterReport.jsx`

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
  {/* Evidence media thumbnails */}
</div>
```

- Most granular progression: 1→2→3 columns across sm/md.
- Disaster type selector and severity selector use `flex flex-wrap` — buttons wrap naturally without explicit breakpoints.

#### `DisasterAlertSMS.jsx`

```jsx
<div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Left form panel + Right citizen list/history */}
  </div>
</div>
```

- Single `md:` breakpoint splits the two-panel layout. Below 768px both panels stack.

---

### Level 4 — Good (Multiple breakpoints, show/hide patterns)

#### `OfficerDashboard.jsx`

```jsx
{/* Stat cards */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5">

{/* Hero section */}
<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

{/* Date display — desktop only */}
<div className="hidden md:flex items-center gap-2">
  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
</div>
```

- `hidden md:flex` hides the date badge on mobile — no equivalent mobile label.

#### `CommandCenter.jsx`

The 3-column map layout uses `calc(100vh)` and fixed pixel widths:

```jsx
<div className="flex gap-4" style={{ height: 'calc(100vh - 180px)' }}>

  {/* Left sidebar — FIXED 380px */}
  <motion.div className="w-[380px] flex-shrink-0 ...">
    <div className="flex gap-1.5 px-4 py-3 overflow-x-auto">
      {/* Severity filter buttons — overflow-x-auto for narrow screens */}
      <button className="... whitespace-nowrap">ALL</button>
    </div>
  </motion.div>

  {/* Map — flex-1 fills remaining space */}
  <div className="flex-1 relative">...</div>

  {/* Right sidebar — FIXED 380px */}
  <motion.div className="w-[380px] flex-shrink-0 overflow-y-auto ...">
```

- At < 760px the two sidebars (760px total) + map overflow the viewport horizontally with no fallback.
- `overflow-x-auto` on the severity filter strip handles narrow sidebar widths within the fixed 380px.
- `flex-1 min-w-0` on detail text prevents text from overflowing the right sidebar.
- The evidence grid inside report details is the only responsive subgrid:
  ```jsx
  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
  ```

#### `NepalWeather.jsx`

Most breakpoints use `xl:` (1280px), making it the only page to do so:

```jsx
{/* Current weather stats */}
<div className="grid grid-cols-2 xl:grid-cols-4 gap-3">

{/* Forecast panels */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
```

Province and District tabs use a `calc(100vh)` sidebar layout similar to CommandCenter:

```jsx
{/* Province tab */}
<div className="max-w-[1600px] mx-auto flex min-h-[calc(100vh-140px)]">
  <div className="w-[280px] flex-shrink-0 bg-white border-r overflow-y-auto">
    {/* Province list */}
  </div>
  <div className="flex-1 overflow-y-auto">
    {/* Province detail */}
  </div>
</div>

{/* District tab — identical structure */}
<div className="max-w-[1600px] mx-auto flex min-h-[calc(100vh-140px)]">
  <div className="w-[280px] flex-shrink-0 ...">
```

- `w-[280px]` fixed sidebar — smaller than CommandCenter's 380px but still fixed.
- `min-h-[calc(100vh-140px)]` sets minimum height, not exact. Province/district content can scroll past this.
- `hidden lg:block` hides the province sidebar on < 1024px:
  The sidebar is visible only on lg+; below that only the map panel remains.

---

### Level 5 — Thorough (12-column grid with multiple splits)

#### `AdminAnalytics.jsx`

Uses a 12-column grid system with per-tab layout splits:

```jsx
{/* Stat cards — 3-step progression */}
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">

{/* Tab bar — horizontal scroll on narrow screens */}
<div className="flex gap-2 mb-5 overflow-x-auto pb-1">
```

**Overview tab:**

```jsx
<div className="grid grid-cols-12 gap-5">
  <div className="col-span-12 lg:col-span-5">  {/* Radar chart */}
  <div className="col-span-12 lg:col-span-7">  {/* Timeline */}
  <div className="col-span-12 lg:col-span-4">  {/* Urgency pie */}
  <div className="col-span-12 lg:col-span-4">  {/* Sentiment gauge */}
  <div className="col-span-12 lg:col-span-4">  {/* System status */}
```

Below `lg` every panel is `col-span-12` — full width. At `lg` the row splits into 5+7, then 4+4+4.

**Users tab:**

```jsx
<div className="col-span-12">         {/* Growth chart — always full width */}
<div className="col-span-12">         {/* Heatmap — always full width */}
<div className="col-span-12 lg:col-span-6">  {/* Permit queue */}
<div className="col-span-12 lg:col-span-6">  {/* Recent users */}
```

User grid inside the recent users panel:
```jsx
<div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
```

**Incidents tab:**

```jsx
<div className="col-span-12 lg:col-span-7">  {/* Treemap */}
<div className="col-span-12 lg:col-span-5">  {/* Polar chart */}
<div className="col-span-12">                {/* Hotspots bar */}
<div className="col-span-12">                {/* Severity cards — grid inside */}
```

Severity cards:
```jsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
```

**Advanced tab:**

```jsx
<div className="col-span-12">                {/* NLP Stream — always full */}
<div className="col-span-12 lg:col-span-6">  {/* Scatter */}
<div className="col-span-12 lg:col-span-6">  {/* Bubble */}
<div className="col-span-12 lg:col-span-5">  {/* Rose chart */}
<div className="col-span-12 lg:col-span-7">  {/* Hotspots bar */}
```

**ECharts heights** — all fixed px, not responsive:

| Chart | Fixed height |
|---|---|
| Radar | 420px |
| 24h Timeline | 380px |
| Urgency pie | 330px |
| Sentiment gauge | 330px |
| User growth | 340px |
| Heatmap | 340px |
| Treemap | 400px |
| Polar bar | 400px |

Heading scales at `md:`:
```jsx
<h1 className="text-3xl md:text-4xl font-extrabold text-white">
```

Hero section direction flips at `lg:`:
```jsx
<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
```

#### `MyDisasterReports.jsx`

Most sophisticated show/hide pattern in the codebase — a table/card dual view:

```jsx
{/* Desktop table header — hidden on mobile */}
<div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3 ...">
  <div className="col-span-1">Type</div>
  <div className="col-span-4">Description</div>
  ...
</div>

{/* Per-row cells — some desktop-only */}
<div className="col-span-2 hidden lg:flex items-center">  {/* Status */}
<div className="col-span-1 hidden lg:flex items-center">  {/* Severity */}
<div className="col-span-2 hidden lg:flex flex-col">      {/* Date */}

{/* Mobile badges — desktop hidden */}
<div className="flex lg:hidden items-center gap-2">
  {/* Compact status + severity badges */}
</div>

{/* Time ago — visible only on sm but hidden on lg */}
<span className="text-xs text-gray-400 hidden sm:block lg:hidden">
  {timeAgo(report.created_at)}
</span>
```

- The `hidden sm:block lg:hidden` pattern on the time-ago span creates a small-only visible element: hidden on xs, visible on sm/md, hidden again on lg+.
- Status, severity, and date columns collapse on mobile — replaced by compact inline badges.

```jsx
{/* Stats grid */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">

{/* Page container */}
<div className="max-w-[1440px] mx-auto px-4 lg:px-10 py-8 lg:py-10">
```

#### `CitizenDashboard.jsx`

Most use of responsive prefixes (26 instances). Hero section has explicit desktop-only content:

```jsx
{/* Drone image — hidden on mobile */}
<motion.div className="hidden lg:block lg:col-span-5">
  <img style={{ height: '400px' }} className="w-full object-cover" />
</motion.div>

{/* Heading text scales */}
<h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold">

{/* Subtext scales */}
<p className="text-base sm:text-lg text-slate-400">
```

Stats section:
```jsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
```

Hero layout:
```jsx
<div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
  <div className="lg:col-span-7"> {/* Text content */}
  <div className="hidden lg:block lg:col-span-5"> {/* Drone image */}
```

Container:
```jsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

Services and features section use progressive grids:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

---

## 3. Viewport Height Patterns

Three pages use `calc(100vh - X)` to fill the viewport:

| Page | Pattern | Offset | Impact |
|---|---|---|---|
| `CommandCenter.jsx` | `style={{ height: 'calc(100vh - 180px)' }}` | 180px (header) | Layout height fixed to viewport; no scroll on main content area |
| `NoFlyZone.jsx` | `style={{ height: 'calc(100vh - 160px)' }}` | 160px (header) | Same — map fills remaining viewport |
| `NepalWeather.jsx` | `min-h-[calc(100vh-140px)]` | 140px (header + tabs) | Minimum height only; content can grow |

- The hardcoded pixel offsets assume a fixed navbar height. If the navbar wraps (e.g., on narrow screens with many nav items), the offset becomes incorrect and the layout overflows or creates a gap.
- `CommandCenter.jsx` and `NoFlyZone.jsx` use exact height (`height:`) not minimum — content inside cannot scroll beyond the viewport height without `overflow-y-auto` on sub-containers.

---

## 4. Fixed-Width Sidebars (Non-Responsive)

| Page | Sidebar width | Responsive fallback |
|---|---|---|
| `CommandCenter.jsx` | `w-[380px]` (left) + `w-[380px]` (right) | None — layout breaks below ~780px |
| `NepalWeather.jsx` | `w-[280px]` (province/district sidebar) | `hidden lg:block` hides sidebar below lg |
| `NoFlyZone.jsx` | Sidebar width is content-driven (no fixed class) | None |

- CommandCenter's two 380px sidebars occupy 760px total + gaps + padding. On viewports narrower than ~850px, horizontal overflow occurs.
- NepalWeather's fixed `w-[280px]` sidebar is hidden below `lg` — at < 1024px the province/district detail fills full width and the sidebar-based navigation disappears entirely with no alternative navigation provided.

---

## 5. ECharts Responsive Behaviour

All `ReactECharts` components in the codebase use **fixed pixel heights** via inline `style`:

```jsx
<ReactECharts option={...} style={{ height: '420px' }} opts={{ renderer: 'svg' }} />
```

ECharts internally respects container **width** automatically via its own resize observer. Chart width adapts as the column layout changes. Chart **height** is always the fixed value — never adjusts.

Consequences:
- On mobile a 420px-tall radar chart occupies significant vertical space.
- On ultra-wide screens a 340px-tall heatmap spanning full container width creates a very short, wide heatmap that distorts visual proportions.
- No `echarts.resize()` calls on breakpoint changes — ECharts handles width changes internally via ResizeObserver.

---

## 6. Overflow and Text Truncation Patterns

| Pattern | Used in | Purpose |
|---|---|---|
| `overflow-x-auto` | AdminAnalytics tab bar, CommandCenter filter strip | Horizontal scroll for button rows that exceed container width |
| `whitespace-nowrap` | CommandCenter severity buttons, tab labels | Prevent button text wrapping inside flex rows |
| `overflow-y-auto` | CommandCenter right sidebar, NepalWeather sidebars | Vertical scroll within fixed-height containers |
| `min-w-0` | CommandCenter detail text, AdminAnalytics flex items | Prevent flex children from overflowing parent in row layouts |
| `truncate` | CommandCenter `InfoItem`, AdminAnalytics user names | Single-line text with ellipsis when overflow |
| `max-w-[200px]` | CommandCenter `InfoItem` value | Cap long values (coordinates, long names) |
| `flex-shrink-0` | CommandCenter sidebars, NepalWeather sidebars | Prevent fixed-width sidebars from compressing |

---

## 7. Max-Width Container Hierarchy

Pages use varying max-width containers — wider values indicate more desktop-oriented pages:

| Max-width | Pages |
|---|---|
| `max-w-7xl` (1280px) | CitizenDashboard, LiveSurveillance, AdminDashboard (hero) |
| `max-w-[1440px]` | MyDisasterReports, DisasterAlertSMS |
| `max-w-[1600px]` | AdminAnalytics, NepalWeather |
| `max-w-[1800px]` | LiveDashboard |
| `max-w-[1920px]` | CommandCenter, NoFlyZone |

- `max-w-[1920px]` pages are designed for ultra-wide monitors (4K displays).
- `max-w-7xl` (Tailwind standard) is the most mobile-friendly ceiling.
- No page uses `max-w-sm`, `max-w-md`, or similar tight constraints on the main layout — all pages are designed to fill wide screens.

---

## 8. Known Issues Summary

| Issue | Page | Detail |
|---|---|---|
| Zero responsive prefixes | `NoFlyZone.jsx` | Fixed layout — breaks below ~768px |
| Zero responsive prefixes | `OTPVerification.jsx` | Card stretches full width on small screens |
| Zero responsive prefixes | `LoginProcess.jsx` | No stacking or padding adjustments |
| Fixed 380px sidebars | `CommandCenter.jsx` | Two sidebars = 760px; overflows viewport on mobile |
| `calc(100vh - 180px)` | `CommandCenter.jsx` | Breaks if navbar wraps on narrow screens |
| `calc(100vh - 160px)` | `NoFlyZone.jsx` | Same navbar height assumption |
| Only 1 responsive prefix | `LiveDashboard.jsx` | Chart grid never responds to screen size |
| Fixed sidebar, no mobile fallback | `NepalWeather.jsx` | Province/district nav disappears on < 1024px with no alternative |
| All ECharts heights fixed | All chart pages | Charts maintain fixed height across all viewport widths |
| Mobile menu state not reset on resize | `Navbar.jsx` | `mobileMenuOpen` stays `true` if user resizes from mobile to desktop |
| `hidden sm:block lg:hidden` span | `MyDisasterReports.jsx` | Time-ago invisible on xs and lg+ — only visible on sm/md |
| Hero image hidden below lg | `CitizenDashboard.jsx` | No alternative content fills the `lg:col-span-5` slot on mobile |
| `2xl:` never used | All pages | No layouts optimise for ≥ 1536px screens despite `max-w-[1920px]` containers |
| Navbar wrapping not accounted for | `CommandCenter.jsx`, `NoFlyZone.jsx`, `NepalWeather.jsx` | `calc(100vh - Xpx)` hardcodes header height |
