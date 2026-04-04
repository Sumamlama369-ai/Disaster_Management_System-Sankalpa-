# Filters Implementation — Interactivity Documentation

## Overview

Filter, search, and tab-switching interactivity exists in 7 pages. Implementations span three distinct approaches: client-side state filtering, server-side API parameter filtering, and a hybrid Leaflet map layer filter. No page uses Redux, React Query, or any shared filter state — every filter is local to its component.

| Page | Filter Type | State Variables | API Re-fetch? | Memo/Debounce |
|---|---|---|---|---|
| `CommandCenter` | Client-side severity filter | `filterSeverity` | No | None |
| `MyDisasterReports` | Server-side status filter | `statusFilter` | Yes — on every change | None |
| `NoFlyZone` | Client-side category filter + Leaflet layer toggle | `selectedCategory`, `filteredZones` | No | None |
| `DisasterAlertSMS` | Client-side type/severity/mode selectors + search | `sendMode`, `selectedType`, `severity`, `citizenSearch` | No | None |
| `AdminAnalytics` | Tab-based view switcher | `activeView` | No | None |
| `LiveDashboard` | Tab-based view switcher | `activeView` | No | None |
| `VideoAnalysis` | Tab switcher + programmatic navigation | `activeTab` | Conditional | None |
| `NepalWeather` | Tab switcher + selection-driven API fetch + memoized search | `activeTab`, `selectedProvince`, `selectedDistrict`, `districtSearch` | Yes — on selection | `useMemo`, `useCallback` |

---

## Part 1: `CommandCenter.jsx` — Severity Filter

File: [frontend/src/pages/CommandCenter.jsx](../frontend/src/pages/CommandCenter.jsx)

### State

```js
const [filterSeverity, setFilterSeverity] = useState('ALL');
```

Initial value: `'ALL'` — all reports visible on load.

### Derivation — Inline Filter

```js
const filteredReports = filterSeverity === 'ALL'
  ? reports
  : reports.filter((r) => r.severity === filterSeverity);
```

Computed inline on every render. No `useMemo`. The full `reports` array is kept in state — `filteredReports` is a derived view, not a stored state. `reports` itself is never mutated.

`r.severity` values come from the API as uppercase strings: `'CRITICAL'`, `'HIGH'`, `'MEDIUM'`, `'LOW'`. The filter options match these exactly.

### UI — Five-Button Strip

```jsx
{['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
  <button
    key={sev}
    onClick={() => setFilterSeverity(sev)}
    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
      filterSeverity === sev
        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
    }`}
  >
    {sev === 'ALL' ? 'All' : sev}
  </button>
))}
```

Active button: green gradient with white text and shadow. Inactive: grey background. Horizontal scrollable row (`overflow-x-auto`) — all 5 buttons always rendered.

### Scope

`filteredReports` is used only for the left panel report list. The map markers (`reports` array) are **not filtered** — all reports remain on the Leaflet map regardless of the active severity filter. The filter only narrows the scrollable list.

### Reset

No explicit reset button. Clicking `'ALL'` resets to all reports. No reset on page navigation or route change — filter state persists while the component is mounted.

---

## Part 2: `MyDisasterReports.jsx` — Server-Side Status Filter

File: [frontend/src/pages/MyDisasterReports.jsx](../frontend/src/pages/MyDisasterReports.jsx)

### State

```js
const [statusFilter, setStatusFilter] = useState('');
const [reports, setReports] = useState([]);
const [total, setTotal] = useState(0);
```

Initial value: `''` (empty string) — all statuses visible. Unlike `CommandCenter`, this filter's empty string means "no filter" rather than a named `'ALL'` value.

### Derivation — Server-Side via Query Parameter

```js
const fetchReports = async () => {
  const params = { page: 1, page_size: 50 };
  if (statusFilter) params.status = statusFilter;
  const res = await axios.get(
    `${API_URL}/api/v1/disaster-reports/reports/my-reports`,
    { headers: { Authorization: `Bearer ${token}` }, params }
  );
  setReports(res.data.reports || res.data || []);
  setTotal(res.data.total || res.data?.length || 0);
};
```

When `statusFilter` is `''`, the `status` param is omitted and the API returns all reports. When set, the API filters server-side and returns only matching reports. The `page_size: 50` cap applies to the filtered result — if a user has more than 50 reports of one status, the excess is not loaded.

### `useEffect` Dependency

```js
useEffect(() => {
  if (token) fetchReports();
}, [token, statusFilter]);
```

Every `statusFilter` change triggers a new API call immediately — no debounce, no batching. A rapid click across multiple filter chips fires one request per click.

### Status Counts — Client-Side Aggregation on Current Page

```js
const statusCounts = reports.reduce(
  (acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; },
  {}
);
```

Counts are derived from the **currently loaded page** (`reports` state), not the full dataset. When `statusFilter` is active, `statusCounts` only sees the filtered subset. The counts shown on filter chips therefore reflect the current page's slice, not totals across all pages.

```js
const activeCount = (statusCounts.PENDING || 0) + (statusCounts.REVIEWING || 0)
                  + (statusCounts.DISPATCHED || 0) + (statusCounts.RESCUING || 0);
```

`activeCount` is a derived sum of the four in-progress statuses — used in the "Active" summary card above the list.

### UI — `FilterChip` Component

```jsx
<div className="bg-white rounded-xl border border-gray-200 p-1.5 flex items-center gap-1 overflow-x-auto mb-6 shadow-sm">
  <FilterChip
    active={!statusFilter}
    onClick={() => setStatusFilter('')}
    label="All"
    count={total}
  />
  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
    <FilterChip
      key={key}
      active={statusFilter === key}
      onClick={() => setStatusFilter(key)}
      label={cfg.label}
      color={cfg.color}
      count={statusCounts[key]}
    />
  ))}
</div>
```

`FilterChip` is a locally-defined component (not exported). `STATUS_CONFIG` defines 6 statuses: `PENDING`, `REVIEWING`, `DISPATCHED`, `RESCUING`, `RESOLVED`, `REJECTED`. The "All" chip uses `!statusFilter` (truthy check on empty string) as its active condition. Clicking "All" sets `statusFilter('')` which clears the server-side filter.

### Reset

Clicking the "All" chip sets `statusFilter('')`, which triggers `useEffect` and fetches all reports. There is no programmatic reset on mount or unmount.

---

## Part 3: `NoFlyZone.jsx` — Category Filter + Leaflet Layer Toggle

File: [frontend/src/pages/NoFlyZone.jsx](../frontend/src/pages/NoFlyZone.jsx)

### State

```js
const [selectedCategory, setSelectedCategory] = useState('all');
const [filteredZones, setFilteredZones] = useState([]);
const [zonesList, setZonesList] = useState([]);
const allMarkersRef = useRef([]);         // persists Leaflet marker refs
```

`zonesList` holds all zones parsed from a local GeoJSON file at component mount. `filteredZones` is the currently visible subset shown in the sidebar list. `allMarkersRef` is a ref (not state) that stores every Leaflet marker instance with a `_category` property attached.

### Category Configuration

```js
const categoryConfig = {
  military:   { color: '#ef4444', label: 'Restricted Military Zones',  icon: '🛡️' },
  airport:    { color: '#f59e0b', label: 'Airport Buffer Zones',        icon: '✈️' },
  protected:  { color: '#22c55e', label: 'Protected Areas',             icon: '🌲' },
  government: { color: '#06b6d4', label: 'Government Buildings',        icon: '🏛️' },
  heritage:   { color: '#8b5cf6', label: 'Heritage & Cultural Sites',   icon: '🏛️' },
};
```

### Filter Function — Dual Effect (List + Map Layers)

```js
const filterByCategory = (category) => {
  setSelectedCategory(category);

  if (category === 'all') {
    setFilteredZones(zonesList);           // restore full list

    // Show all circle overlays
    layerRefs.current.noFlyZoneLayer?.eachLayer((layer) => {
      layer.setStyle({ opacity: 0.8, fillOpacity: 0.25 });
    });

    // Restore all markers to layer group
    allMarkersRef.current.forEach((marker) => {
      if (!layerRefs.current.markersLayer.hasLayer(marker)) {
        layerRefs.current.markersLayer.addLayer(marker);
      }
    });
  } else {
    const filtered = zonesList.filter(z => z.category === category);
    setFilteredZones(filtered);            // narrow sidebar list

    // Hide non-matching circles by setting opacity to 0
    layerRefs.current.noFlyZoneLayer?.eachLayer((layer) => {
      if (layer._category === category) {
        layer.setStyle({ opacity: 0.8, fillOpacity: 0.25 });
      } else {
        layer.setStyle({ opacity: 0, fillOpacity: 0 });  // invisible but still in DOM
      }
    });

    // Remove non-matching markers from layer group; add matching ones
    allMarkersRef.current.forEach((marker) => {
      if (marker._category === category) {
        if (!layerRefs.current.markersLayer.hasLayer(marker)) {
          layerRefs.current.markersLayer.addLayer(marker);
        }
      } else {
        if (layerRefs.current.markersLayer.hasLayer(marker)) {
          layerRefs.current.markersLayer.removeLayer(marker);
        }
      }
    });
  }
};
```

**Two filter surfaces updated simultaneously:**
1. `filteredZones` state — drives the sidebar zone list in React
2. Leaflet layer group — markers physically added/removed; circles made invisible via `opacity: 0` (not removed)

**Circle vs marker distinction:** Circle overlays are hidden by setting style opacity to 0 (they remain in the Leaflet layer). Marker icons are actually added and removed from the layer group. This means the circle shapes are always in the DOM (just transparent), while markers are dynamically attached/detached.

### `_category` Private Property

During map initialisation, each Leaflet marker and circle is stamped with a custom property:

```js
marker._category = category;    // e.g. 'military'
layer._category = category;
```

This is the lookup key used at filter time. It is a non-standard Leaflet property — ECharts' `eachLayer` iterates over all layers and `_category` is read directly from the instance.

### UI — `<select>` Dropdown

```jsx
<select
  value={selectedCategory}
  onChange={(e) => filterByCategory(e.target.value)}
  className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4
             focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
>
  <option value="all">All Categories ({stats.totalZones})</option>
  {Object.entries(categoryConfig).map(([key, config]) => (
    <option key={key} value={key}>{config.label}</option>
  ))}
</select>
```

A native `<select>` — not a custom component. `onChange` calls `filterByCategory` directly with the new value. No intermediate state — the call is synchronous.

### Reset

No explicit reset button. Selecting `'all'` from the dropdown restores all zones and map layers. On initial render, all zones are shown (`selectedCategory: 'all'`).

---

## Part 4: `DisasterAlertSMS.jsx` — Multi-Selector Form Controls

File: [frontend/src/pages/DisasterAlertSMS.jsx](../frontend/src/pages/DisasterAlertSMS.jsx)

This page uses several interactive selectors that control the SMS compose form. None of these filter a data list — they control the composition of an outbound SMS.

### State

```js
const [sendMode, setSendMode] = useState('single');        // 'single' | 'bulk' | 'broadcast'
const [selectedType, setSelectedType] = useState(null);    // alert type name or null
const [severity, setSeverity] = useState('High');          // 'Low' | 'Medium' | 'High' | 'Critical'
const [citizenSearch, setCitizenSearch] = useState('');    // search input string
const [citizens, setCitizens] = useState([]);              // all loaded citizens
const [selectedCitizens, setSelectedCitizens] = useState([]); // multi-selected recipients
```

### Send Mode — Three-Way Toggle

```js
// 'single'    — sends to one phone number (manual input)
// 'bulk'      — sends to a selected subset of citizens (checkbox list)
// 'broadcast' — sends to ALL citizens via API-side fanout
```

Recipient count is derived inline:
```js
const recipientCount =
  sendMode === 'single'    ? (phone.length === 10 ? 1 : 0)
  : sendMode === 'bulk'    ? selectedCitizens.length
  : /* broadcast */          citizens.length;
```

`canSend()` validation depends on `sendMode`:
```js
const canSend = () => {
  if (!message.trim()) return false;
  if (sendMode === 'single'    && phone.length < 10)         return false;
  if (sendMode === 'bulk'      && selectedCitizens.length === 0) return false;
  return true;
};
```

### Alert Type Selection — Template Injection

```js
const ALERT_TYPES = [
  { name: 'Flood',      template: 'FLOOD WARNING: ...' },
  { name: 'Earthquake', template: 'EARTHQUAKE ALERT: ...' },
  { name: 'Landslide',  template: 'LANDSLIDE WARNING: ...' },
  { name: 'Fire',       template: 'FIRE ALERT: ...' },
  { name: 'Storm',      template: 'STORM WARNING: ...' },
  { name: 'Custom',     template: '' },
];

const handleSelectType = (at) => {
  setSelectedType(at.name);
  if (at.template) {
    const prefix = severity !== 'Low' ? `[${severity.toUpperCase()}] ` : '';
    setMessage(prefix + at.template);
  } else {
    setMessage('');                        // Custom clears message
  }
};
```

Selecting an alert type auto-populates `message` with a template string. The prefix `[HIGH]`, `[MEDIUM]`, `[CRITICAL]` is prepended unless severity is `'Low'`. Selecting `'Custom'` clears the message.

### Severity Selection — Message Prefix Mutation

```js
const handleSeverity = (sev) => {
  setSeverity(sev);
  if (selectedType && selectedType !== 'Custom') {
    const t = ALERT_TYPES.find(a => a.name === selectedType);
    if (t?.template) {
      const prefix = sev !== 'Low' ? `[${sev.toUpperCase()}] ` : '';
      setMessage(prefix + t.template);
    }
  }
};
```

Changing severity re-builds the message from the template with the new prefix. If the user has manually edited the message after selecting a template, changing severity **overwrites their changes** — the message is regenerated from the original template.

### Citizen Search — Plain Function Derivation

```js
const getFilteredCitizens = () => {
  if (!citizenSearch.trim()) return citizens;
  const q = citizenSearch.toLowerCase();
  return citizens.filter(c =>
    c.name?.toLowerCase().includes(q) ||
    c.email?.toLowerCase().includes(q) ||
    c.phone?.includes(q)
  );
};

const filteredCitizens = getFilteredCitizens();  // called inline at render
```

No `useMemo`. `getFilteredCitizens()` is a plain function called at render time. Searches across `name`, `email`, and `phone`. `phone` uses `.includes()` without lowercasing (phone numbers are not case-sensitive). No debounce — filters on every keystroke.

### Multi-Select + Select All

```js
const toggleCitizen = (citizen) => {
  setSelectedCitizens(prev =>
    prev.find(c => c.id === citizen.id)
      ? prev.filter(c => c.id !== citizen.id)
      : [...prev, citizen]
  );
};

const selectAllCitizens = () => {
  const filtered = getFilteredCitizens();
  const allSelected = filtered.every(c => selectedCitizens.find(s => s.id === c.id));
  if (allSelected) {
    setSelectedCitizens(prev => prev.filter(c => !filtered.find(f => f.id === c.id)));
  } else {
    const toAdd = filtered.filter(c => !selectedCitizens.find(s => s.id === c.id));
    setSelectedCitizens(prev => [...prev, ...toAdd]);
  }
};
```

`selectAllCitizens` toggles based on the **filtered** list — "select all" only selects the currently visible filtered subset, not all citizens. Previously selected citizens outside the search filter are preserved.

### Character Counter

```js
const charPercent = Math.min((message.length / 160) * 100, 100);
const smsCount = Math.ceil(message.length / 160) || 0;
const totalCredits = smsCount * recipientCount;
```

Derived inline from `message.length` and `recipientCount`. 160-character SMS boundary triggers colour changes: green below 130, amber 130–160, red above 160.

---

## Part 5: `AdminAnalytics.jsx` — Tab-Based View Switcher

File: [frontend/src/pages/AdminAnalytics.jsx](../frontend/src/pages/AdminAnalytics.jsx)

### State

```js
const [activeView, setActiveView] = useState('overview');
```

### Four Tab Values

| `activeView` | Tab Label | Charts Rendered |
|---|---|---|
| `'overview'` | Overview | Radar, timeline, urgency pie, sentiment gauge |
| `'users'` | Users & Permits | User growth, heatmap, permit bar/pie |
| `'incidents'` | Incidents & Reports | Treemap, polar severity bar, hotspot bar, NLP rose |
| `'advanced'` | NLP & Video Intelligence | Stream, bubble, video risk pie, sentiment scatter |

### Conditional Rendering — `AnimatePresence`

```jsx
<AnimatePresence mode="wait">
  {activeView === 'overview' && (
    <motion.div key="ov" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {/* overview charts */}
    </motion.div>
  )}
  {activeView === 'users' && (
    <motion.div key="us" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {/* user charts */}
    </motion.div>
  )}
  {/* ... etc */}
</AnimatePresence>
```

`mode="wait"` — the exiting tab's fade-out completes before the entering tab fades in. Each tab pane gets a unique `key` so Framer Motion tracks enter/exit transitions correctly.

### UI — Dynamic Tab Button Array

```js
const tabs = [
  { id: 'overview',   l: 'Overview',                  ic: <ActivityIcon /> },
  { id: 'users',      l: 'Users & Permits',            ic: <UserIcon /> },
  { id: 'incidents',  l: 'Incidents & Reports',        ic: <AlertIcon /> },
  { id: 'advanced',   l: 'NLP & Video Intelligence',   ic: <GlobeIcon /> },
];

tabs.map(t => (
  <button
    key={t.id}
    onClick={() => setActiveView(t.id)}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
      activeView === t.id
        ? 'bg-sky-500 text-white shadow-lg shadow-sky-200 scale-[1.02]'
        : 'bg-white text-gray-600 hover:bg-gray-50 shadow border border-gray-200'
    }`}
  >
    {t.ic} {t.l}
  </button>
))
```

Active tab: sky-500 background, white text, shadow, `scale-[1.02]` slight pop. Inactive: white background with grey border.

### Behaviour

- Switching tabs does **not** trigger any new API calls — all data is pre-loaded by the initial `Promise.allSettled` batch
- Charts in non-active tabs are **unmounted** (not hidden with CSS) — they re-mount and re-render each time their tab is activated
- The 60-second auto-refresh `setInterval` fires regardless of which tab is active — data updates in the background

---

## Part 6: `LiveDashboard.jsx` — Two-Tab View Switcher

File: [frontend/src/pages/LiveDashboard.jsx](../frontend/src/pages/LiveDashboard.jsx)

### State

```js
const [activeView, setActiveView] = useState('overview');
```

### Two Tab Values

| `activeView` | Content |
|---|---|
| `'overview'` | World map, rose pie, location hotspot bar, recent disasters feed |
| `'advanced'` | Sentiment wave (scatter + trend line), radar chart, bubble scatter |

### UI — Two Buttons

```jsx
<button
  onClick={() => setActiveView('overview')}
  className={`px-6 py-3 rounded-xl font-bold transition-all ${
    activeView === 'overview'
      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
      : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
  }`}
>
  Overview
</button>
<button
  onClick={() => setActiveView('advanced')}
  className={`px-6 py-3 rounded-xl font-bold transition-all ${
    activeView === 'advanced'
      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg scale-105'
      : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
  }`}
>
  Advanced Analytics
</button>
```

Active overview: blue gradient. Active advanced: purple gradient. Both use `scale-105` when active.

### Conditional Rendering — No Animation

```jsx
{activeView === 'overview' && <div className="grid grid-cols-12 gap-6">...</div>}
{activeView === 'advanced' && <div className="grid grid-cols-12 gap-6">...</div>}
```

No `AnimatePresence` — plain conditional rendering with no transition. Contrast with `AdminAnalytics` which uses `AnimatePresence mode="wait"`.

---

## Part 7: `VideoAnalysis.jsx` — Tab Switcher with Programmatic Navigation

File: [frontend/src/pages/VideoAnalysis.jsx](../frontend/src/pages/VideoAnalysis.jsx)

### State

```js
const [activeTab, setActiveTab] = useState('upload');
```

### Three Tab Values

| `activeTab` | Content | Renders When |
|---|---|---|
| `'upload'` | File picker + upload button | Always |
| `'history'` | Analysed video list | Always |
| `'analysis'` | Detection timeline + segmentation area + top detections bar | Only when `selectedVideo && analysisData` are both non-null |

### `useEffect` — Conditional API Fetch on Tab

```js
useEffect(() => {
  if (activeTab === 'history') {
    fetchVideos();
  }
}, [activeTab]);
```

Switching to `'history'` triggers `fetchVideos()` — the only tab switch in the codebase that causes an API call. `'upload'` and `'analysis'` tabs do not fetch on activation.

### Programmatic Tab Navigation

Three places in the code set `activeTab` without user interaction:

```js
// After successful upload — navigate to history to show new entry
setActiveTab('history');                   // line ~131 in upload success handler

// When user clicks "View Analysis" on a history item
setActiveTab('analysis');                  // line ~163 in view-analysis handler

// When "Clear" is pressed in upload tab
setActiveTab('upload');                    // line ~749 (not a navigation, stays on upload)
```

The `'analysis'` tab is the only one that requires two state values (`selectedVideo` and `analysisData`) to be populated — clicking it programmatically implies both have already been set.

### Conditional Render Guard for Analysis Tab

```jsx
{activeTab === 'analysis' && selectedVideo && analysisData && (
  <AnalysisSection />
)}
```

If `activeTab === 'analysis'` but `selectedVideo` or `analysisData` is null (e.g., navigated directly without selecting a video), nothing renders — no error, no fallback UI.

---

## Part 8: `NepalWeather.jsx` — Multi-Level Selection with Memoized Search

File: [frontend/src/pages/NepalWeather.jsx](../frontend/src/pages/NepalWeather.jsx)

This is the most sophisticated filter implementation in the codebase — the only page using `useMemo` and `useCallback` for performance optimisation.

### State

```js
const [activeTab, setActiveTab] = useState('national');
const [selectedProvince, setSelectedProvince] = useState(null);
const [provinceData, setProvinceData] = useState(null);
const [provinceLoading, setProvinceLoading] = useState(false);
const [selectedDistrict, setSelectedDistrict] = useState(null);
const [districtData, setDistrictData] = useState(null);
const [districtLoading, setDistrictLoading] = useState(false);
const [districtSearch, setDistrictSearch] = useState('');
```

### Three Tab Values

| `activeTab` | Content | API Calls |
|---|---|---|
| `'national'` | Nepal-wide weather from hardcoded Kathmandu coordinates | On mount |
| `'province'` | Province list + province weather panel | On province selection |
| `'district'` | District search + district weather panel | On district selection |

### District Search — `useMemo`

```js
const filteredDistricts = useMemo(() => {
  if (!districtSearch.trim()) return DISTRICTS;
  const q = districtSearch.toLowerCase();
  return DISTRICTS.filter(d =>
    d.name.toLowerCase().includes(q) ||
    d.province.toLowerCase().includes(q)
  );
}, [districtSearch]);
```

The only `useMemo` for filtering in the entire codebase. `DISTRICTS` is a module-level constant array (not state) — it never changes, so the only dependency is `districtSearch`. Result count shown live: `{filteredDistricts.length} of {DISTRICTS.length} districts`.

Searches by district name or province name — a user can type `"Bagmati"` to see all districts in Bagmati province.

### Province Selection — API Fetch with `useCallback`

```js
const loadProvince = useCallback(async (prov) => {
  setSelectedProvince(prov);
  setProvinceLoading(true);
  try {
    const provDistricts = DISTRICTS.filter(d => d.province === prov.name);
    const results = await Promise.all(
      provDistricts.map(d =>
        fetch(buildFullUrl(d.lat, d.lng))
          .then(r => r.json())
          .catch(() => null)
      )
    );
    const avgData = buildAveragedData(results.filter(r => r !== null));
    if (avgData) setProvinceData(avgData);
  } catch (err) {
    console.error('Province fetch error:', err);
  }
  setProvinceLoading(false);
}, [buildAveragedData]);
```

Selecting a province fetches weather for **all its districts in parallel** (`Promise.all`), then averages the results via `buildAveragedData`. Failed district fetches return `null` and are filtered out before averaging. `useCallback` with `[buildAveragedData]` dependency prevents unnecessary re-creation.

This calls the **Open-Meteo external API** (`https://api.open-meteo.com/v1/forecast`) — not the backend.

### District Selection — API Fetch with `useCallback`

```js
const loadDistrict = useCallback(async (dist) => {
  setSelectedDistrict(dist);
  setDistrictLoading(true);
  try {
    const res = await fetch(buildFullUrl(dist.lat, dist.lng));
    setDistrictData(await res.json());
  } catch (err) {
    console.error('District fetch error:', err);
  }
  setDistrictLoading(false);
}, []);
```

Single Open-Meteo API call per district selection. Empty dependency array — `loadDistrict` is stable across all renders.

### District Search UI

```jsx
<input
  type="text"
  placeholder="Search district..."
  value={districtSearch}
  onChange={(e) => setDistrictSearch(e.target.value)}
  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5
             text-sm text-gray-900 placeholder-gray-400 outline-none
             focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all"
/>
<p className="text-xs text-gray-500 mt-1.5 px-0.5 font-mono">
  {filteredDistricts.length} of {DISTRICTS.length} districts
</p>
```

The search counter updates on every keystroke. No debounce — `useMemo` recomputes synchronously but is cheap since `DISTRICTS` is a static array.

---

## Part 9: Cross-Cutting Patterns

### Reset Behaviour

| Page | Reset Method | Trigger |
|---|---|---|
| `CommandCenter` | Click `'ALL'` button | Manual only |
| `MyDisasterReports` | Click "All" chip (`setStatusFilter('')`) | Manual only |
| `NoFlyZone` | Select `'all'` from dropdown | Manual only |
| `DisasterAlertSMS` | No reset — form cleared on send | On submit |
| Tab switchers | No reset — tab state persists across sessions in current mount | N/A |

No page auto-resets filters on route change or data refresh. No URL sync — filter state is not persisted to the URL or `localStorage`.

### Memo / Optimisation Usage

| Page | Optimisation | Applied To |
|---|---|---|
| `NepalWeather` | `useMemo` | `filteredDistricts` derivation |
| `NepalWeather` | `useCallback` | `loadProvince`, `loadDistrict` |
| All others | None | Inline computations on every render |

`CommandCenter`, `MyDisasterReports`, and `NoFlyZone` all compute derived data inline without `useMemo`. For the data sizes involved (up to ~100 items), this is unlikely to cause performance issues, but `CommandCenter` in particular re-computes `filteredReports` on every render including unrelated state changes.

### Server-Side vs Client-Side

Only `MyDisasterReports` sends its filter to the server. All other filters operate entirely in the browser on already-loaded data. The consequence is:

- `MyDisasterReports` always shows accurate counts but fires a network request per filter change
- Other pages show counts only within the currently loaded page cap (e.g., 100 records)

### Debounce

No filter or search input in the codebase uses debouncing. The closest patterns to debounce-worthy scenarios:

| Input | Fires | Impact |
|---|---|---|
| `MyDisasterReports` status chip | API call per click | Low — each click is deliberate |
| `DisasterAlertSMS` citizen search | `getFilteredCitizens()` per keystroke | Low — local filter on small citizen list |
| `NepalWeather` district search | `useMemo` recompute per keystroke | Near-zero — static array, memoised |

---

## Related Documentation

- [api_calls_implementation.md](api_calls_implementation.md) — Server-side filter via `params.status` in `MyDisasterReports`
- [react_state_structure.md](react_state_structure.md) — Component-local state architecture; no global filter state
- [error_handling.md](error_handling.md) — How filter-triggered API calls handle failure
