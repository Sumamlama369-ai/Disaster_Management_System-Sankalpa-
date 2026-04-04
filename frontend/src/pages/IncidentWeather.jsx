import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Navbar from '../components/Navbar';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── SVG Icons (stroke-based, clean) ─────────────────────────────────
const CloudIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
);
const DropletIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
);
const WindIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
);
const ThermometerIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
);
const EyeIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);
const GaugeIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12l4-8"/><circle cx="12" cy="12" r="2"/></svg>
);
const SunIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
);
const ClockIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const ArrowUpIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
);
const ArrowDownIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
);
const AlertTriangleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const MapPinIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
);
const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
);
const ShieldIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const XIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const ArrowRightIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);
const CheckCircleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

// ─── API ──────────────────────────────────────────────────────────────
const API_BASE = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_BASE = "https://archive-api.open-meteo.com/v1/archive";
const MODEL_PARAM = "&models=ecmwf_ifs025";

// ─── Weather Helpers ──────────────────────────────────────────────────
function wcDesc(code) {
  if (code === 0) return "Clear Sky";
  if (code <= 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code <= 49) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain Showers";
  if (code <= 86) return "Snow Showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}

function wcImage(code) {
  if (code === 0) return "https://cdn-icons-png.flaticon.com/512/6974/6974833.png";
  if (code <= 3) return "https://cdn-icons-png.flaticon.com/512/1163/1163661.png";
  if (code <= 49) return "https://cdn-icons-png.flaticon.com/512/1197/1197102.png";
  if (code <= 57) return "https://cdn-icons-png.flaticon.com/512/3313/3313888.png";
  if (code <= 67) return "https://cdn-icons-png.flaticon.com/512/3351/3351979.png";
  if (code <= 77) return "https://cdn-icons-png.flaticon.com/512/642/642102.png";
  if (code <= 86) return "https://cdn-icons-png.flaticon.com/512/642/642102.png";
  if (code <= 99) return "https://cdn-icons-png.flaticon.com/512/1146/1146869.png";
  return "https://cdn-icons-png.flaticon.com/512/1163/1163661.png";
}

function wcSmallImage(code) {
  return wcImage(code);
}

function wcHeaderBg(code) {
  if (code === 0) return "from-[#1a1a2e] via-[#16213e] to-[#0f3460]";
  if (code <= 3) return "from-[#1a1a2e] via-[#2c3e50] to-[#34495e]";
  if (code <= 49) return "from-[#2c3e50] via-[#34495e] to-[#4a6274]";
  if (code <= 67) return "from-[#1a1a2e] via-[#1e3a5f] to-[#2d5f8a]";
  if (code <= 77) return "from-[#1a1a2e] via-[#2c3e50] to-[#5d7d96]";
  if (code <= 99) return "from-[#1a1a2e] via-[#3d1f1f] to-[#5c2e2e]";
  return "from-[#1a1a2e] via-[#2c3e50] to-[#34495e]";
}

function windDir(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function uvLabel(uv) {
  if (uv <= 2) return { text: "Low", color: "#059669", bg: "#ecfdf5" };
  if (uv <= 5) return { text: "Moderate", color: "#d97706", bg: "#fffbeb" };
  if (uv <= 7) return { text: "High", color: "#ea580c", bg: "#fff7ed" };
  if (uv <= 10) return { text: "Very High", color: "#dc2626", bg: "#fef2f2" };
  return { text: "Extreme", color: "#7c3aed", bg: "#f5f3ff" };
}

function formatHour(isoStr) {
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateTime(isoStr) {
  return new Date(isoStr).toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function tempColor(temp) {
  if (temp >= 35) return "#dc2626";
  if (temp >= 28) return "#ea580c";
  if (temp >= 20) return "#d97706";
  if (temp >= 10) return "#059669";
  return "#2563eb";
}

function tempBarGradient(temp) {
  if (temp >= 35) return "from-red-500 to-red-600";
  if (temp >= 28) return "from-orange-400 to-red-500";
  if (temp >= 20) return "from-amber-400 to-orange-500";
  if (temp >= 10) return "from-emerald-400 to-amber-400";
  return "from-blue-400 to-emerald-400";
}

// ─── Risk Assessment ──────────────────────────────────────────────────
function assessDeploymentRisk(weather) {
  if (!weather) return null;
  const risks = [];
  let score = 0;

  const wc = weather.weather_code;
  const wind = weather.wind_speed_10m;
  const precip = weather.precipitation;
  const visibility = weather.visibility;

  if (wc >= 95) { risks.push("Active thunderstorm detected. Suspend all aerial operations."); score += 4; }
  else if (wc >= 80) { risks.push("Heavy showers in area. Visibility will be compromised."); score += 2; }
  else if (wc >= 61) { risks.push("Rainfall may affect outdoor operations."); score += 1; }

  if (wind >= 50) { risks.push("Wind speed exceeds safe flight threshold for drones."); score += 4; }
  else if (wind >= 30) { risks.push("Strong winds. Exercise caution with aerial assets."); score += 2; }
  else if (wind >= 20) { risks.push("Moderate winds. Monitor before deploying drones."); score += 1; }

  if (precip >= 10) { risks.push("Heavy precipitation. Assess for secondary flooding."); score += 3; }
  else if (precip >= 5) { risks.push("Notable precipitation in the area."); score += 1; }

  if (visibility !== undefined && visibility < 1000) { risks.push("Visibility below 1 km. Ground-only operations recommended."); score += 3; }
  else if (visibility !== undefined && visibility < 5000) { risks.push("Reduced visibility. Use instrument-assisted navigation."); score += 1; }

  let level, accent, bg, border, ring;
  if (score === 0) { level = "ALL CLEAR"; accent = "#059669"; bg = "bg-emerald-50"; border = "border-emerald-200"; ring = "ring-emerald-500"; }
  else if (score <= 2) { level = "LOW RISK"; accent = "#2563eb"; bg = "bg-blue-50"; border = "border-blue-200"; ring = "ring-blue-500"; }
  else if (score <= 4) { level = "MODERATE"; accent = "#d97706"; bg = "bg-amber-50"; border = "border-amber-200"; ring = "ring-amber-500"; }
  else { level = "HIGH RISK"; accent = "#dc2626"; bg = "bg-red-50"; border = "border-red-200"; ring = "ring-red-500"; }

  const pct = Math.min(100, (score / 10) * 100);
  return { risks, score, pct, level, accent, bg, border, ring };
}

// ─── Drone Flight Advisory ─────────────────────────────────────────────
function getFlightLimits() {
  try {
    const saved = localStorage.getItem('admin_weather_thresholds');
    if (saved) {
      const f = JSON.parse(saved).flight;
      if (f) return {
        wind: { safe: f.windSafe ?? 15, caution: f.windCaution ?? 25, danger: f.windDanger ?? 38 },
        gusts: { safe: f.gustsSafe ?? 20, caution: f.gustsCaution ?? 35, danger: f.gustsDanger ?? 50 },
        visibility: { safe: f.visibilitySafe ?? 5000, caution: f.visibilityCaution ?? 2000, danger: f.visibilityDanger ?? 1000 },
        precip: { safe: f.precipSafe ?? 0.2, caution: f.precipCaution ?? 2, danger: f.precipDanger ?? 5 },
        temp: { min: f.tempMin ?? -10, max: f.tempMax ?? 45 },
        cloud: { safe: f.cloudSafe ?? 60, caution: f.cloudCaution ?? 85, danger: f.cloudDanger ?? 95 },
      };
    }
  } catch {}
  return {
    wind: { safe: 15, caution: 25, danger: 38 },
    gusts: { safe: 20, caution: 35, danger: 50 },
    visibility: { safe: 5000, caution: 2000, danger: 1000 },
    precip: { safe: 0.2, caution: 2, danger: 5 },
    temp: { min: -10, max: 45 },
    cloud: { safe: 60, caution: 85, danger: 95 },
  };
}

const FLIGHT_LIMITS = getFlightLimits();

function assessFlightConditions(weather) {
  if (!weather) return null;
  const checks = [];
  let worstLevel = 'GO'; // GO, CAUTION, NO_GO

  const setLevel = (lvl) => {
    if (lvl === 'NO_GO') worstLevel = 'NO_GO';
    else if (lvl === 'CAUTION' && worstLevel !== 'NO_GO') worstLevel = 'CAUTION';
  };

  // Wind
  const wind = weather.wind_speed_10m || 0;
  if (wind >= FLIGHT_LIMITS.wind.danger) {
    checks.push({ param: 'Wind Speed', value: `${wind.toFixed(0)} km/h`, status: 'NO_GO', detail: `Exceeds ${FLIGHT_LIMITS.wind.danger} km/h safe limit. Do not launch.`, limit: `< ${FLIGHT_LIMITS.wind.danger} km/h` });
    setLevel('NO_GO');
  } else if (wind >= FLIGHT_LIMITS.wind.caution) {
    checks.push({ param: 'Wind Speed', value: `${wind.toFixed(0)} km/h`, status: 'CAUTION', detail: 'Elevated winds. Reduce altitude, avoid open terrain.', limit: `< ${FLIGHT_LIMITS.wind.danger} km/h` });
    setLevel('CAUTION');
  } else {
    checks.push({ param: 'Wind Speed', value: `${wind.toFixed(0)} km/h`, status: 'GO', detail: 'Within safe operating range.', limit: `< ${FLIGHT_LIMITS.wind.danger} km/h` });
  }

  // Gusts
  const gusts = weather.wind_gusts_10m || 0;
  if (gusts >= FLIGHT_LIMITS.gusts.danger) {
    checks.push({ param: 'Wind Gusts', value: `${gusts.toFixed(0)} km/h`, status: 'NO_GO', detail: `Gust factor exceeds ${FLIGHT_LIMITS.gusts.danger} km/h. Risk of loss of control.`, limit: `< ${FLIGHT_LIMITS.gusts.danger} km/h` });
    setLevel('NO_GO');
  } else if (gusts >= FLIGHT_LIMITS.gusts.caution) {
    checks.push({ param: 'Wind Gusts', value: `${gusts.toFixed(0)} km/h`, status: 'CAUTION', detail: 'Intermittent gusts may cause instability.', limit: `< ${FLIGHT_LIMITS.gusts.danger} km/h` });
    setLevel('CAUTION');
  } else {
    checks.push({ param: 'Wind Gusts', value: `${gusts.toFixed(0)} km/h`, status: 'GO', detail: 'Gust conditions manageable.', limit: `< ${FLIGHT_LIMITS.gusts.danger} km/h` });
  }

  // Visibility
  const vis = weather.visibility;
  if (vis !== undefined) {
    if (vis < FLIGHT_LIMITS.visibility.danger) {
      checks.push({ param: 'Visibility', value: `${(vis/1000).toFixed(1)} km`, status: 'NO_GO', detail: 'Below minimum visual line-of-sight (VLOS) threshold.', limit: `> ${(FLIGHT_LIMITS.visibility.danger/1000).toFixed(0)} km` });
      setLevel('NO_GO');
    } else if (vis < FLIGHT_LIMITS.visibility.caution) {
      checks.push({ param: 'Visibility', value: `${(vis/1000).toFixed(1)} km`, status: 'CAUTION', detail: 'Reduced visibility. Keep drone close, reduce max range.', limit: `> ${(FLIGHT_LIMITS.visibility.danger/1000).toFixed(0)} km` });
      setLevel('CAUTION');
    } else {
      checks.push({ param: 'Visibility', value: `${(vis/1000).toFixed(1)} km`, status: 'GO', detail: 'Clear line-of-sight conditions.', limit: `> ${(FLIGHT_LIMITS.visibility.danger/1000).toFixed(0)} km` });
    }
  }

  // Precipitation
  const precip = weather.precipitation || 0;
  if (precip >= FLIGHT_LIMITS.precip.danger) {
    checks.push({ param: 'Precipitation', value: `${precip.toFixed(1)} mm`, status: 'NO_GO', detail: 'Heavy precipitation. Water ingress risk to aircraft.', limit: `< ${FLIGHT_LIMITS.precip.danger} mm` });
    setLevel('NO_GO');
  } else if (precip >= FLIGHT_LIMITS.precip.caution) {
    checks.push({ param: 'Precipitation', value: `${precip.toFixed(1)} mm`, status: 'CAUTION', detail: 'Light precipitation. Use waterproof drone if available.', limit: `< ${FLIGHT_LIMITS.precip.danger} mm` });
    setLevel('CAUTION');
  } else {
    checks.push({ param: 'Precipitation', value: `${precip.toFixed(1)} mm`, status: 'GO', detail: precip > 0 ? 'Trace amounts only.' : 'No precipitation.', limit: `< ${FLIGHT_LIMITS.precip.danger} mm` });
  }

  // Weather code (thunderstorm/snow)
  const wc = weather.weather_code || 0;
  if (wc >= 95) {
    checks.push({ param: 'Thunderstorm', value: wcDesc(wc), status: 'NO_GO', detail: 'Lightning risk. All flights grounded until clear.', limit: 'No active storms' });
    setLevel('NO_GO');
  } else if (wc >= 71 && wc <= 86) {
    checks.push({ param: 'Snow/Ice', value: wcDesc(wc), status: 'CAUTION', detail: 'Icing conditions possible on propellers and sensors.', limit: 'No icing' });
    setLevel('CAUTION');
  }

  // Temperature
  const temp = weather.temperature_2m;
  if (temp !== undefined) {
    if (temp < FLIGHT_LIMITS.temp.min || temp > FLIGHT_LIMITS.temp.max) {
      checks.push({ param: 'Temperature', value: `${temp.toFixed(1)}°C`, status: 'CAUTION', detail: temp < 0 ? 'Sub-zero temp. Battery capacity reduced ~20%. Shorten flight time.' : 'Extreme heat. Risk of motor overheating.', limit: `${FLIGHT_LIMITS.temp.min}° to ${FLIGHT_LIMITS.temp.max}°C` });
      setLevel('CAUTION');
    } else if (temp < 0) {
      checks.push({ param: 'Temperature', value: `${temp.toFixed(1)}°C`, status: 'CAUTION', detail: 'Cold weather. Battery performance degraded. Pre-warm batteries.', limit: `${FLIGHT_LIMITS.temp.min}° to ${FLIGHT_LIMITS.temp.max}°C` });
      setLevel('CAUTION');
    } else {
      checks.push({ param: 'Temperature', value: `${temp.toFixed(1)}°C`, status: 'GO', detail: 'Within normal operating range.', limit: `${FLIGHT_LIMITS.temp.min}° to ${FLIGHT_LIMITS.temp.max}°C` });
    }
  }

  // Cloud cover
  const cloud = weather.cloud_cover;
  if (cloud !== undefined) {
    if (cloud >= FLIGHT_LIMITS.cloud.danger) {
      checks.push({ param: 'Cloud Cover', value: `${cloud}%`, status: 'CAUTION', detail: 'Overcast sky may reduce GPS signal quality.', limit: `< ${FLIGHT_LIMITS.cloud.danger}%` });
      setLevel('CAUTION');
    } else {
      checks.push({ param: 'Cloud Cover', value: `${cloud}%`, status: 'GO', detail: 'Adequate sky visibility.', limit: `< ${FLIGHT_LIMITS.cloud.danger}%` });
    }
  }

  const goCount = checks.filter(c => c.status === 'GO').length;
  const cautionCount = checks.filter(c => c.status === 'CAUTION').length;
  const noGoCount = checks.filter(c => c.status === 'NO_GO').length;

  let summary, recommendation;
  if (worstLevel === 'GO') {
    summary = 'All parameters within safe operating limits. Flight operations may proceed.';
    recommendation = 'Standard pre-flight checks required. Maintain VLOS at all times. Monitor conditions for changes.';
  } else if (worstLevel === 'CAUTION') {
    summary = 'Some parameters require attention. Flight possible with precautions.';
    recommendation = `${cautionCount} parameter${cautionCount > 1 ? 's' : ''} flagged. Reduce max altitude and range. Increase monitoring frequency. Have return-to-home ready.`;
  } else {
    summary = 'One or more critical thresholds exceeded. Flight operations not recommended.';
    recommendation = `${noGoCount} parameter${noGoCount > 1 ? 's' : ''} failed. Ground all drone assets. Wait for conditions to improve or use ground-based response.`;
  }

  return { checks, level: worstLevel, summary, recommendation, goCount, cautionCount, noGoCount };
}

function assessHourlyFlight(hourlyData, i) {
  if (!hourlyData) return null;
  return assessFlightConditions({
    wind_speed_10m: hourlyData.wind_speed_10m?.[i],
    wind_gusts_10m: hourlyData.wind_gusts_10m?.[i],
    visibility: hourlyData.visibility?.[i],
    precipitation: hourlyData.precipitation?.[i],
    weather_code: hourlyData.weather_code?.[i],
    temperature_2m: hourlyData.temperature_2m?.[i],
    cloud_cover: hourlyData.cloud_cover?.[i],
  });
}

const FLIGHT_STATUS_CONFIG = {
  GO: { label: 'GO', color: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', ring: 'ring-emerald-400' },
  CAUTION: { label: 'CAUTION', color: '#d97706', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', ring: 'ring-amber-400' },
  NO_GO: { label: 'NO-GO', color: '#dc2626', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', ring: 'ring-red-400' },
};

function getTrend(historical, current, key) {
  if (!historical || !current || historical[key] === undefined || current[key] === undefined) return null;
  const diff = current[key] - historical[key];
  if (Math.abs(diff) < 0.1) return { dir: 'stable', text: 'No change' };
  if (diff > 0) return { dir: 'up', text: `+${diff.toFixed(1)}` };
  return { dir: 'down', text: diff.toFixed(1) };
}

function findBestWindow(hourlyData) {
  if (!hourlyData?.time) return null;
  let bestIdx = -1, bestScore = Infinity;
  for (let i = 0; i < hourlyData.time.length; i++) {
    if (new Date(hourlyData.time[i]) < new Date()) continue;
    let s = 0;
    s += (hourlyData.weather_code?.[i] || 0) >= 60 ? 3 : (hourlyData.weather_code?.[i] || 0) >= 40 ? 1 : 0;
    s += (hourlyData.wind_speed_10m?.[i] || 0) >= 30 ? 3 : (hourlyData.wind_speed_10m?.[i] || 0) >= 20 ? 1 : 0;
    s += (hourlyData.precipitation?.[i] || 0) >= 5 ? 3 : (hourlyData.precipitation?.[i] || 0) >= 1 ? 1 : 0;
    if (s < bestScore) { bestScore = s; bestIdx = i; }
  }
  if (bestIdx < 0) return null;
  return {
    time: hourlyData.time[bestIdx], score: bestScore,
    weather_code: hourlyData.weather_code?.[bestIdx],
    temp: hourlyData.temperature_2m?.[bestIdx],
    wind: hourlyData.wind_speed_10m?.[bestIdx],
    precip: hourlyData.precipitation?.[bestIdx],
  };
}

// ─── Reusable Components ──────────────────────────────────────────────

// Circular progress gauge
function CircularGauge({ value, max, size = 72, strokeWidth = 5, color = "#3b82f6", label, unit }) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const offset = circumference * (1 - pct);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-800">{typeof value === 'number' ? Math.round(value) : value}<span className="text-[10px] text-gray-400">{unit}</span></span>
        </div>
      </div>
      {label && <span className="text-[11px] text-gray-500 font-medium">{label}</span>}
    </div>
  );
}

// Arc risk meter
function RiskMeter({ pct, color, level }) {
  const w = 200, h = 110, cx = 100, cy = 100, r = 80;
  const startAngle = Math.PI;
  const endAngle = 0;
  const sweepAngle = startAngle - (startAngle - endAngle) * (pct / 100);
  const nx = cx + r * Math.cos(sweepAngle);
  const ny = cy - r * Math.sin(sweepAngle);
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const totalLen = Math.PI * r;
  const filledLen = totalLen * (pct / 100);

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <path d={arcPath} fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
        <path d={arcPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${filledLen} ${totalLen}`}
          className="transition-all duration-1000 ease-out" />
        <circle cx={nx} cy={ny} r="6" fill={color} className="transition-all duration-1000 ease-out" />
        <circle cx={nx} cy={ny} r="3" fill="white" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="text-center -mt-4">
        <div className="text-xs font-bold tracking-widest" style={{ color }}>{level}</div>
      </div>
    </div>
  );
}

// Wind compass (refined)
function WindCompass({ direction, speed, gusts }) {
  const size = 100, r = 38;
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);
  const cardinals = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r + 6} fill="none" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="1" />
          {ticks.map(deg => {
            const isCardinal = deg % 90 === 0;
            const isMajor = deg % 30 === 0;
            const len = isCardinal ? 8 : isMajor ? 5 : 2;
            const rad = (deg - 90) * Math.PI / 180;
            const x1 = size/2 + (r + 6) * Math.cos(rad);
            const y1 = size/2 + (r + 6) * Math.sin(rad);
            const x2 = size/2 + (r + 6 - len) * Math.cos(rad);
            const y2 = size/2 + (r + 6 - len) * Math.sin(rad);
            return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isCardinal ? "#64748b" : "#cbd5e1"} strokeWidth={isCardinal ? 1.5 : 0.5} />;
          })}
          {Object.entries(cardinals).map(([deg, label]) => {
            const rad = (parseInt(deg) - 90) * Math.PI / 180;
            const x = size/2 + (r - 8) * Math.cos(rad);
            const y = size/2 + (r - 8) * Math.sin(rad);
            return <text key={deg} x={x} y={y} textAnchor="middle" dominantBaseline="central" className="text-[9px] font-bold fill-gray-500">{label}</text>;
          })}
          <line x1={size/2} y1={size/2}
            x2={size/2 + (r - 16) * Math.cos((direction - 90) * Math.PI / 180)}
            y2={size/2 + (r - 16) * Math.sin((direction - 90) * Math.PI / 180)}
            stroke="#1e40af" strokeWidth="2.5" strokeLinecap="round"
            className="transition-all duration-700" />
          <circle cx={size/2} cy={size/2} r="4" fill="#1e40af" />
          <circle cx={size/2} cy={size/2} r="2" fill="white" />
        </svg>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-gray-900">{speed?.toFixed(1)} <span className="text-xs text-gray-400 font-medium">km/h</span></div>
        <div className="text-[11px] text-gray-400">{windDir(direction)} ({direction}°)</div>
        {gusts !== undefined && <div className="text-[11px] text-orange-500 font-medium">Gusts {gusts?.toFixed(0)} km/h</div>}
      </div>
    </div>
  );
}

// Precipitation bar
function PrecipBar({ value, max = 10 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
    </div>
  );
}

// Temperature range indicator
function TempRangeBar({ temp, min = -10, max = 50 }) {
  const pct = Math.min(100, Math.max(0, ((temp - min) / (max - min)) * 100));
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'linear-gradient(90deg, #3b82f6, #06b6d4, #10b981, #f59e0b, #ef4444)' }}>
      <div className="relative h-full">
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-gray-800 rounded-full shadow-sm transition-all duration-700"
          style={{ left: `calc(${pct}% - 6px)` }} />
      </div>
    </div>
  );
}


// ─── Main Component ───────────────────────────────────────────────────
export default function IncidentWeather() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lat = parseFloat(params.get('lat'));
  const lng = parseFloat(params.get('lng'));
  const reportedAt = params.get('reported_at');
  const disasterType = params.get('disaster_type') || 'Unknown';
  const reportId = params.get('report_id') || '?';
  const severity = params.get('severity') || '';
  const address = params.get('address') || '';

  const reportDate = useMemo(() => reportedAt ? new Date(reportedAt) : null, [reportedAt]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [historicalWeather, setHistoricalWeather] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecastHourly, setForecastHourly] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchWeatherData = useCallback(async (isRefresh = false) => {
    if (isNaN(lat) || isNaN(lng)) { setError("Invalid coordinates"); setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const forecastUrl = `${API_BASE}?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,uv_index` +
        `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,uv_index,cloud_cover` +
        `&timezone=Asia%2FKathmandu&forecast_hours=6${MODEL_PARAM}`;

      const forecastRes = await fetch(forecastUrl);
      if (!forecastRes.ok) throw new Error("Failed to fetch forecast");
      const forecastData = await forecastRes.json();
      setCurrentWeather(forecastData.current);
      setForecastHourly(forecastData.hourly);

      if (reportDate) {
        const now = new Date();
        const daysDiff = Math.floor((now - reportDate) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 90) {
          const pastDays = Math.min(daysDiff + 1, 92);
          const histUrl = `${API_BASE}?latitude=${lat}&longitude=${lng}` +
            `&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,uv_index,cloud_cover,pressure_msl` +
            `&timezone=Asia%2FKathmandu&past_days=${pastDays}&forecast_days=0${MODEL_PARAM}`;
          const histRes = await fetch(histUrl);
          if (histRes.ok) {
            const histData = await histRes.json();
            if (histData.hourly?.time) {
              const reportTime = reportDate.getTime();
              let closestIdx = 0, closestDiff = Infinity;
              histData.hourly.time.forEach((t, i) => {
                const diff = Math.abs(new Date(t).getTime() - reportTime);
                if (diff < closestDiff) { closestDiff = diff; closestIdx = i; }
              });
              setHistoricalWeather({
                time: histData.hourly.time[closestIdx],
                temperature_2m: histData.hourly.temperature_2m[closestIdx],
                relative_humidity_2m: histData.hourly.relative_humidity_2m[closestIdx],
                precipitation: histData.hourly.precipitation[closestIdx],
                weather_code: histData.hourly.weather_code[closestIdx],
                wind_speed_10m: histData.hourly.wind_speed_10m[closestIdx],
                wind_direction_10m: histData.hourly.wind_direction_10m[closestIdx],
                wind_gusts_10m: histData.hourly.wind_gusts_10m[closestIdx],
                visibility: histData.hourly.visibility?.[closestIdx],
                uv_index: histData.hourly.uv_index?.[closestIdx],
                cloud_cover: histData.hourly.cloud_cover?.[closestIdx],
                pressure_msl: histData.hourly.pressure_msl?.[closestIdx],
              });
            }
          }
        } else {
          const dateStr = reportDate.toISOString().split('T')[0];
          const archiveUrl = `${ARCHIVE_BASE}?latitude=${lat}&longitude=${lng}` +
            `&start_date=${dateStr}&end_date=${dateStr}` +
            `&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,cloud_cover,pressure_msl` +
            `&timezone=Asia%2FKathmandu`;
          const archRes = await fetch(archiveUrl);
          if (archRes.ok) {
            const archData = await archRes.json();
            if (archData.hourly?.time) {
              const reportTime = reportDate.getTime();
              let closestIdx = 0, closestDiff = Infinity;
              archData.hourly.time.forEach((t, i) => {
                const diff = Math.abs(new Date(t).getTime() - reportTime);
                if (diff < closestDiff) { closestDiff = diff; closestIdx = i; }
              });
              setHistoricalWeather({
                time: archData.hourly.time[closestIdx],
                temperature_2m: archData.hourly.temperature_2m[closestIdx],
                relative_humidity_2m: archData.hourly.relative_humidity_2m[closestIdx],
                precipitation: archData.hourly.precipitation[closestIdx],
                weather_code: archData.hourly.weather_code[closestIdx],
                wind_speed_10m: archData.hourly.wind_speed_10m[closestIdx],
                wind_direction_10m: archData.hourly.wind_direction_10m[closestIdx],
                wind_gusts_10m: archData.hourly.wind_gusts_10m?.[closestIdx],
                visibility: archData.hourly.visibility?.[closestIdx],
                cloud_cover: archData.hourly.cloud_cover?.[closestIdx],
                pressure_msl: archData.hourly.pressure_msl?.[closestIdx],
              });
            }
          }
        }
      }
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError(err.message || "Failed to fetch weather data");
    }
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }, [lat, lng, reportDate]);

  useEffect(() => { fetchWeatherData(); }, [fetchWeatherData]);

  const currentRisk = assessDeploymentRisk(currentWeather);
  const flightAdvisory = assessFlightConditions(currentWeather);
  const bestWindow = findBestWindow(forecastHourly);

  // ─── AI Advisory ─────────────────────────────────────────────────
  const [aiAdvisory, setAiAdvisory] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const aiRequestedRef = useRef(false);

  useEffect(() => {
    if (!flightAdvisory || !currentWeather || aiRequestedRef.current) return;
    aiRequestedRef.current = true;
    setAiLoading(true);

    const isDrone = disasterType === 'Drone Takeoff Zone';

    axios.post(`${BACKEND_URL}/api/v1/weather/ai-advisory`, {
      checks: flightAdvisory.checks,
      level: flightAdvisory.level,
      temperature: currentWeather.temperature_2m,
      wind_speed: currentWeather.wind_speed_10m,
      wind_gusts: currentWeather.wind_gusts_10m,
      visibility: currentWeather.visibility,
      precipitation: currentWeather.precipitation,
      cloud_cover: currentWeather.cloud_cover,
      weather_code: currentWeather.weather_code,
      humidity: currentWeather.relative_humidity_2m,
      pressure: currentWeather.pressure_msl,
      uv_index: currentWeather.uv_index,
      context: isDrone ? 'drone_takeoff' : 'disaster_response',
      disaster_type: disasterType,
      location: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    }).then(res => {
      setAiAdvisory(res.data);
    }).catch(err => {
      console.error('AI advisory error:', err);
    }).finally(() => {
      setAiLoading(false);
    });
  }, [flightAdvisory, currentWeather]);
  const tempTrend = getTrend(historicalWeather, currentWeather, 'temperature_2m');
  const windTrend = getTrend(historicalWeather, currentWeather, 'wind_speed_10m');
  const precipTrend = getTrend(historicalWeather, currentWeather, 'precipitation');
  const humidityTrend = getTrend(historicalWeather, currentWeather, 'relative_humidity_2m');

  const DroneIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
  );

  const TABS = [
    { id: 'overview', label: 'Current Conditions', icon: <SunIcon className="w-4 h-4" /> },
    { id: 'flight', label: 'Flight Advisory', icon: <DroneIcon className="w-4 h-4" /> },
    { id: 'forecast', label: '6-Hour Forecast', icon: <ClockIcon className="w-4 h-4" /> },
    { id: 'comparison', label: 'Then vs Now', icon: <RefreshIcon className="w-4 h-4" /> },
  ];

  const sevConfig = {
    CRITICAL: { color: '#dc2626', bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' },
    HIGH: { color: '#ea580c', bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' },
    MEDIUM: { color: '#d97706', bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
    LOW: { color: '#059669', bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  };
  const sev = sevConfig[severity] || sevConfig.MEDIUM;

  // ─── Error State ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangleIcon className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Retrieve Weather Data</h2>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">{error}</p>
          <button onClick={() => fetchWeatherData()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20">
            <RefreshIcon className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <Navbar />

      {/* ─── HERO HEADER ───────────────────────────────────────────── */}
      <div className={`bg-gradient-to-br ${currentWeather ? wcHeaderBg(currentWeather.weather_code) : 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]'} relative overflow-hidden`}>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          {/* Top bar */}
          <div className="flex items-center justify-between py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white text-xs font-semibold rounded-lg border border-white/[0.08] transition-all">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Back
              </button>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-[11px] text-white/40 font-mono tracking-wider">INCIDENT WEATHER INTELLIGENCE</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-[11px] text-white/40 font-mono">ECMWF IFS 0.25°</span>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdate && <span className="text-[11px] text-white/30 font-mono">{lastUpdate.toLocaleTimeString()}</span>}
              <button onClick={() => fetchWeatherData(true)} disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white/80 text-xs font-medium rounded-lg border border-white/[0.08] transition-all disabled:opacity-40">
                <RefreshIcon className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {/* Main header content */}
          <div className="py-8 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                {severity && (
                  <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md ${sev.bg} ${sev.text} border ${sev.border}`}>
                    {severity}
                  </span>
                )}
                <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md bg-white/[0.06] text-white/50 border border-white/[0.08]">
                  Report #{reportId}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
                {disasterType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                <span className="inline-flex items-center gap-1.5 text-sm text-white/50">
                  <MapPinIcon className="w-4 h-4 text-white/30" />
                  <span className="font-mono text-white/60">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                </span>
                {address && (
                  <span className="text-sm text-white/40">{address}</span>
                )}
                {reportDate && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-white/40">
                    <ClockIcon className="w-3.5 h-3.5 text-white/30" />
                    {formatDateTime(reportedAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Current temp hero (right side) */}
            {currentWeather && !loading && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                className="flex items-center gap-5">
                <img src={wcImage(currentWeather.weather_code)} alt={wcDesc(currentWeather.weather_code)}
                  className="w-20 h-20 object-contain drop-shadow-2xl opacity-90" />
                <div className="text-right">
                  <div className="text-6xl font-bold text-white tracking-tighter leading-none">
                    {currentWeather.temperature_2m?.toFixed(0)}<span className="text-3xl text-white/40">°C</span>
                  </div>
                  <div className="text-sm text-white/50 mt-1">{wcDesc(currentWeather.weather_code)}</div>
                  <div className="text-xs text-white/30 mt-0.5">Feels {currentWeather.apparent_temperature?.toFixed(0)}°C</div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ─── LOADING ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="h-3 w-20 bg-gray-100 rounded mb-4" />
                <div className="h-8 w-24 bg-gray-100 rounded mb-2" />
                <div className="h-2 w-32 bg-gray-50 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ─── TABS ──────────────────────────────────────────────────── */}
          <div className="sticky top-0 z-20 bg-[#f8f9fb]/80 backdrop-blur-xl border-b border-gray-200/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex gap-0 overflow-x-auto scrollbar-hide">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                    }`}>
                    {tab.icon} {tab.label}
                    {activeTab === tab.id && (
                      <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <AnimatePresence mode="wait">

              {/* ═══ OVERVIEW TAB ═══════════════════════════════════════ */}
              {activeTab === 'overview' && (
                <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

                  {/* Risk + Best Window Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                    {/* Risk Assessment */}
                    {currentRisk && (
                      <div className={`lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden`}>
                        <div className="px-6 pt-5 pb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <ShieldIcon className="w-4 h-4 text-gray-400" />
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Deployment Risk Assessment</h3>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-6 px-6 pb-6">
                          <RiskMeter pct={currentRisk.pct} color={currentRisk.accent} level={currentRisk.level} />
                          <div className="flex-1 space-y-2">
                            {currentRisk.risks.length > 0 ? (
                              currentRisk.risks.map((r, i) => (
                                <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: currentRisk.accent }} />
                                  {r}
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-emerald-600">
                                <CheckCircleIcon className="w-4 h-4" /> Conditions favorable for all operations
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Best Window */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <ClockIcon className="w-4 h-4 text-gray-400" />
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Best Deployment Window</h3>
                        </div>
                        {bestWindow ? (
                          <div>
                            <div className="text-2xl font-bold text-gray-900 mb-1">{formatHour(bestWindow.time)}</div>
                            <div className="text-sm text-gray-500 mb-4">{wcDesc(bestWindow.weather_code)}</div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center p-2.5 bg-gray-50 rounded-xl">
                                <div className="text-xs text-gray-400 mb-0.5">Temp</div>
                                <div className="text-sm font-bold text-gray-800">{bestWindow.temp?.toFixed(0)}°C</div>
                              </div>
                              <div className="text-center p-2.5 bg-gray-50 rounded-xl">
                                <div className="text-xs text-gray-400 mb-0.5">Wind</div>
                                <div className="text-sm font-bold text-gray-800">{bestWindow.wind?.toFixed(0)} km/h</div>
                              </div>
                              <div className="text-center p-2.5 bg-gray-50 rounded-xl">
                                <div className="text-xs text-gray-400 mb-0.5">Rain</div>
                                <div className="text-sm font-bold text-gray-800">{bestWindow.precip?.toFixed(1)} mm</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">No suitable window found in the next 6 hours.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Main metrics grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Temperature */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Temperature</span>
                        <ThermometerIcon className="w-4 h-4 text-gray-300" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">{currentWeather?.temperature_2m?.toFixed(1)}<span className="text-lg text-gray-300">°C</span></div>
                      <div className="text-xs text-gray-400 mb-3">Feels like {currentWeather?.apparent_temperature?.toFixed(1)}°C</div>
                      <TempRangeBar temp={currentWeather?.temperature_2m || 0} />
                    </div>

                    {/* Humidity */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center">
                      <div className="flex items-center gap-2 mb-3 self-start">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Humidity</span>
                      </div>
                      <CircularGauge value={currentWeather?.relative_humidity_2m || 0} max={100} color="#06b6d4" label="" unit="%" size={80} strokeWidth={6} />
                    </div>

                    {/* Cloud Cover */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center">
                      <div className="flex items-center gap-2 mb-3 self-start">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Cloud Cover</span>
                      </div>
                      <CircularGauge value={currentWeather?.cloud_cover || 0} max={100} color="#94a3b8" label="" unit="%" size={80} strokeWidth={6} />
                    </div>

                    {/* UV Index */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">UV Index</span>
                        <SunIcon className="w-4 h-4 text-gray-300" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">{currentWeather?.uv_index?.toFixed(1) || '--'}</div>
                      {currentWeather?.uv_index !== undefined && (
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-md" style={{ color: uvLabel(currentWeather.uv_index).color, background: uvLabel(currentWeather.uv_index).bg }}>
                          {uvLabel(currentWeather.uv_index).text}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Wind + Atmo Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Wind */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <WindIcon className="w-4 h-4 text-gray-400" />
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Wind</h3>
                      </div>
                      {currentWeather?.wind_direction_10m !== undefined && (
                        <WindCompass direction={currentWeather.wind_direction_10m} speed={currentWeather.wind_speed_10m} gusts={currentWeather.wind_gusts_10m} />
                      )}
                    </div>

                    {/* Precipitation */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <DropletIcon className="w-4 h-4 text-gray-400" />
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Precipitation</h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-baseline mb-1.5">
                            <span className="text-xs text-gray-400">Rainfall</span>
                            <span className="text-lg font-bold text-gray-900">{currentWeather?.precipitation?.toFixed(1) || 0} <span className="text-xs text-gray-400 font-medium">mm</span></span>
                          </div>
                          <PrecipBar value={currentWeather?.precipitation || 0} />
                        </div>
                        <div>
                          <div className="flex justify-between items-baseline mb-1.5">
                            <span className="text-xs text-gray-400">Rain</span>
                            <span className="text-sm font-semibold text-gray-700">{currentWeather?.rain?.toFixed(1) || 0} mm</span>
                          </div>
                          <PrecipBar value={currentWeather?.rain || 0} max={5} />
                        </div>
                        <div>
                          <div className="flex justify-between items-baseline mb-1.5">
                            <span className="text-xs text-gray-400">Snowfall</span>
                            <span className="text-sm font-semibold text-gray-700">{currentWeather?.snowfall?.toFixed(1) || 0} cm</span>
                          </div>
                          <PrecipBar value={currentWeather?.snowfall || 0} max={5} />
                        </div>
                      </div>
                    </div>

                    {/* Atmospheric */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <GaugeIcon className="w-4 h-4 text-gray-400" />
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Atmospheric</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2.5 border-b border-gray-50">
                          <span className="text-sm text-gray-500">MSL Pressure</span>
                          <span className="text-sm font-bold text-gray-900">{currentWeather?.pressure_msl?.toFixed(0)} hPa</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5 border-b border-gray-50">
                          <span className="text-sm text-gray-500">Surface Pressure</span>
                          <span className="text-sm font-bold text-gray-900">{currentWeather?.surface_pressure?.toFixed(0)} hPa</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <span className="text-sm text-gray-500">Visibility</span>
                          <span className="text-sm font-bold text-gray-900">{currentWeather?.visibility ? (currentWeather.visibility / 1000).toFixed(1) + ' km' : '--'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══ FLIGHT ADVISORY TAB ═══════════════════════════════ */}
              {activeTab === 'flight' && (
                <motion.div key="flight" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

                  {flightAdvisory && (() => {
                    const sc = FLIGHT_STATUS_CONFIG[flightAdvisory.level];
                    const totalChecks = flightAdvisory.goCount + flightAdvisory.cautionCount + flightAdvisory.noGoCount;
                    const passPercent = totalChecks > 0 ? Math.round((flightAdvisory.goCount / totalChecks) * 100) : 0;
                    return (
                      <>
                        {/* Main status banner */}
                        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                          {/* Top gradient bar */}
                          <div className="h-1.5" style={{ background: flightAdvisory.level === 'GO' ? 'linear-gradient(90deg, #10b981, #059669)' : flightAdvisory.level === 'CAUTION' ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #ef4444, #dc2626)' }} />

                          <div className="bg-white px-6 py-5">
                            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5">
                              {/* Status icon + text */}
                              <div className="flex items-center gap-4 flex-1">
                                <div className="relative">
                                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                    style={{ background: `linear-gradient(135deg, ${sc.color}18, ${sc.color}08)`, border: `2px solid ${sc.color}30` }}>
                                    {flightAdvisory.level === 'GO' ? (
                                      <CheckCircleIcon className="w-8 h-8" style={{ color: sc.color }} />
                                    ) : flightAdvisory.level === 'CAUTION' ? (
                                      <AlertTriangleIcon className="w-8 h-8" style={{ color: sc.color }} />
                                    ) : (
                                      <XIcon className="w-8 h-8" style={{ color: sc.color }} />
                                    )}
                                  </div>
                                  <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white`}
                                    style={{ background: sc.color }}>
                                    {flightAdvisory.level === 'GO' ? '✓' : flightAdvisory.level === 'CAUTION' ? '!' : '✕'}
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2.5 mb-1">
                                    <h2 className="text-lg font-bold text-gray-900">
                                      {flightAdvisory.level === 'GO' ? 'Cleared for Flight' :
                                       flightAdvisory.level === 'CAUTION' ? 'Fly with Caution' :
                                       'Flight Not Recommended'}
                                    </h2>
                                    <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border`}
                                      style={{ background: `${sc.color}12`, color: sc.color, borderColor: `${sc.color}30` }}>
                                      {sc.label}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500 max-w-xl leading-relaxed">{flightAdvisory.summary}</p>
                                </div>
                              </div>

                              {/* Stats cards */}
                              <div className="flex items-center gap-2.5 sm:ml-auto">
                                <div className="text-center px-4 py-2.5 rounded-xl border border-emerald-100"
                                  style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)' }}>
                                  <div className="text-xl font-black text-emerald-600">{flightAdvisory.goCount}</div>
                                  <div className="text-[9px] text-emerald-500 uppercase font-bold tracking-wider mt-0.5">Pass</div>
                                </div>
                                <div className="text-center px-4 py-2.5 rounded-xl border border-amber-100"
                                  style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
                                  <div className="text-xl font-black text-amber-600">{flightAdvisory.cautionCount}</div>
                                  <div className="text-[9px] text-amber-500 uppercase font-bold tracking-wider mt-0.5">Warn</div>
                                </div>
                                <div className="text-center px-4 py-2.5 rounded-xl border border-red-100"
                                  style={{ background: 'linear-gradient(135deg, #fef2f2, #fecaca)' }}>
                                  <div className="text-xl font-black text-red-600">{flightAdvisory.noGoCount}</div>
                                  <div className="text-[9px] text-red-500 uppercase font-bold tracking-wider mt-0.5">Fail</div>
                                </div>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Safety Score</span>
                                <span className="text-xs font-bold" style={{ color: sc.color }}>{passPercent}% parameters passed</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                                {flightAdvisory.goCount > 0 && (
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${(flightAdvisory.goCount / totalChecks) * 100}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                                )}
                                {flightAdvisory.cautionCount > 0 && (
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${(flightAdvisory.cautionCount / totalChecks) * 100}%` }}
                                    transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500" />
                                )}
                                {flightAdvisory.noGoCount > 0 && (
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${(flightAdvisory.noGoCount / totalChecks) * 100}%` }}
                                    transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-red-400 to-red-500" />
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center gap-1.5 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-full bg-emerald-500" />Safe</span>
                                <span className="flex items-center gap-1.5 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-full bg-amber-500" />Caution</span>
                                <span className="flex items-center gap-1.5 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-full bg-red-500" />Critical</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Pre-flight checklist */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                            <ShieldIcon className="w-4 h-4 text-gray-400" />
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pre-Flight Parameter Check</h3>
                          </div>
                          <div className="divide-y divide-gray-50">
                            {flightAdvisory.checks.map((check, i) => {
                              const csc = FLIGHT_STATUS_CONFIG[check.status];
                              return (
                                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                                  {/* Status indicator */}
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${csc.bg} border ${csc.border}`}>
                                    {check.status === 'GO' ? <CheckCircleIcon className="w-5 h-5 text-emerald-600" /> :
                                     check.status === 'CAUTION' ? <AlertTriangleIcon className="w-5 h-5 text-amber-600" /> :
                                     <XIcon className="w-5 h-5 text-red-600" />}
                                  </div>
                                  {/* Parameter info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-sm font-bold text-gray-800">{check.param}</span>
                                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${csc.bg} ${csc.text}`}>
                                        {csc.label}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500">{check.detail}</p>
                                  </div>
                                  {/* Values */}
                                  <div className="text-right shrink-0 hidden sm:block">
                                    <div className="text-sm font-bold text-gray-900">{check.value}</div>
                                    <div className="text-[10px] text-gray-400">Limit: {check.limit}</div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Recommendation + 6h flight window timeline */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                          {/* Recommendation */}
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <AlertTriangleIcon className="w-4 h-4 text-gray-400" />
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Operational Recommendation</h3>
                            </div>

                            {/* AI-Powered Recommendation */}
                            {aiLoading ? (
                              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 mb-4">
                                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-blue-600 font-medium">AI analyzing weather conditions...</span>
                              </div>
                            ) : aiAdvisory ? (
                              <div className="mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-md bg-violet-100 text-violet-600 border border-violet-200">AI Powered</span>
                                  {aiAdvisory.risk_level && (
                                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-md border ${
                                      aiAdvisory.risk_level === 'LOW' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                      aiAdvisory.risk_level === 'MODERATE' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                      aiAdvisory.risk_level === 'HIGH' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                      'bg-red-50 text-red-600 border-red-200'
                                    }`}>
                                      Risk: {aiAdvisory.risk_level}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">{aiAdvisory.recommendation}</p>
                                {aiAdvisory.key_concern && (
                                  <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                    <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Key Concern</div>
                                    <p className="text-xs text-amber-800">{aiAdvisory.key_concern}</p>
                                  </div>
                                )}
                                {aiAdvisory.action && (
                                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Recommended Action</div>
                                    <p className="text-xs text-blue-800">{aiAdvisory.action}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-700 leading-relaxed mb-4">{flightAdvisory.recommendation}</p>
                            )}

                            {bestWindow && (
                              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Optimal Launch Time</div>
                                <div className="text-xl font-bold text-emerald-800">{formatHour(bestWindow.time)}</div>
                                <div className="text-sm text-emerald-600 mt-0.5">
                                  {wcDesc(bestWindow.weather_code)}, {bestWindow.temp?.toFixed(0)}°C, Wind {bestWindow.wind?.toFixed(0)} km/h
                                </div>
                              </div>
                            )}
                            {flightAdvisory.level === 'NO_GO' && (
                              <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
                                <div className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Alternate Action</div>
                                <p className="text-sm text-red-700">
                                  {aiAdvisory?.action || 'Deploy ground response teams. If aerial survey is critical, request manned helicopter with instrument flight capability.'}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* 6h flight suitability timeline */}
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <ClockIcon className="w-4 h-4 text-gray-400" />
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">6-Hour Flight Window</h3>
                            </div>
                            {forecastHourly?.time?.length > 0 ? (
                              <div className="space-y-2">
                                {forecastHourly.time.map((t, i) => {
                                  const hourFlight = assessHourlyFlight(forecastHourly, i);
                                  if (!hourFlight) return null;
                                  const hsc = FLIGHT_STATUS_CONFIG[hourFlight.level];
                                  const isPast = new Date(t) < new Date();
                                  const isBest = bestWindow && bestWindow.time === t;
                                  return (
                                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isPast ? 'opacity-40 bg-gray-50 border-gray-100' : isBest ? `${hsc.bg} ${hsc.border}` : 'bg-gray-50 border-gray-100'}`}>
                                      <div className="w-16 shrink-0">
                                        <div className="text-sm font-bold text-gray-800">{formatHour(t)}</div>
                                      </div>
                                      <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 ${hsc.bg} ${hsc.text} border ${hsc.border}`}>
                                        {hsc.label}
                                      </div>
                                      <div className="flex-1 flex items-center gap-3 text-xs text-gray-500">
                                        <span>{forecastHourly.temperature_2m?.[i]?.toFixed(0)}°C</span>
                                        <span className="w-px h-3 bg-gray-200" />
                                        <span>{forecastHourly.wind_speed_10m?.[i]?.toFixed(0)} km/h</span>
                                        <span className="w-px h-3 bg-gray-200" />
                                        <span>{forecastHourly.precipitation?.[i]?.toFixed(1)} mm</span>
                                      </div>
                                      {isBest && !isPast && (
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider shrink-0">Best</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400">No forecast data available.</p>
                            )}
                          </div>
                        </div>

                        {/* Flight limits reference */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <GaugeIcon className="w-4 h-4 text-gray-400" />
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Operating Limits Reference</h3>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            {[
                              { label: 'Max Wind', value: `${FLIGHT_LIMITS.wind.danger} km/h`, icon: <WindIcon className="w-3.5 h-3.5" /> },
                              { label: 'Max Gusts', value: `${FLIGHT_LIMITS.gusts.danger} km/h`, icon: <WindIcon className="w-3.5 h-3.5" /> },
                              { label: 'Min Visibility', value: `${(FLIGHT_LIMITS.visibility.danger/1000).toFixed(0)} km`, icon: <EyeIcon className="w-3.5 h-3.5" /> },
                              { label: 'Max Precip', value: `${FLIGHT_LIMITS.precip.danger} mm`, icon: <DropletIcon className="w-3.5 h-3.5" /> },
                              { label: 'Temp Range', value: `${FLIGHT_LIMITS.temp.min}° / ${FLIGHT_LIMITS.temp.max}°C`, icon: <ThermometerIcon className="w-3.5 h-3.5" /> },
                              { label: 'Max Cloud', value: `${FLIGHT_LIMITS.cloud.danger}%`, icon: <CloudIcon className="w-3.5 h-3.5" /> },
                            ].map((lim, i) => (
                              <div key={i} className="p-3 bg-gray-50 rounded-xl text-center border border-gray-100">
                                <div className="flex items-center justify-center gap-1 text-gray-400 mb-1.5">{lim.icon}</div>
                                <div className="text-xs font-bold text-gray-800 mb-0.5">{lim.value}</div>
                                <div className="text-[10px] text-gray-400">{lim.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              )}

              {/* ═══ FORECAST TAB ═══════════════════════════════════════ */}
              {activeTab === 'forecast' && (
                <motion.div key="forecast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

                  {/* Timeline cards */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">Hourly Conditions</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Next 6 hours at incident location</p>
                      </div>
                      {bestWindow && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-semibold text-emerald-700">Optimal: {formatHour(bestWindow.time)}</span>
                        </div>
                      )}
                    </div>

                    {forecastHourly?.time?.length > 0 ? (
                      <div className="divide-y divide-gray-50">
                        {forecastHourly.time.map((t, i) => {
                          const wc = forecastHourly.weather_code?.[i];
                          const temp = forecastHourly.temperature_2m?.[i];
                          const wind = forecastHourly.wind_speed_10m?.[i];
                          const precip = forecastHourly.precipitation?.[i];
                          const vis = forecastHourly.visibility?.[i];
                          const isPast = new Date(t) < new Date();
                          const isBest = bestWindow && bestWindow.time === t;
                          const hourFlight = assessHourlyFlight(forecastHourly, i);
                          const hfsc = hourFlight ? FLIGHT_STATUS_CONFIG[hourFlight.level] : null;

                          return (
                            <div key={i} className={`flex items-center gap-3 sm:gap-5 px-6 py-4 transition-colors ${isPast ? 'opacity-40' : 'hover:bg-gray-50/50'} ${isBest ? 'bg-emerald-50/30 border-l-2 border-l-emerald-400' : ''}`}>
                              <div className="w-[72px] shrink-0">
                                <div className="text-sm font-bold text-gray-800">{formatHour(t)}</div>
                                {isBest && <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Optimal</div>}
                              </div>
                              <img src={wcSmallImage(wc)} alt="" className="w-9 h-9 object-contain shrink-0" />
                              <div className="w-24 shrink-0">
                                <div className="text-sm font-medium text-gray-700">{wcDesc(wc)}</div>
                              </div>
                              <div className="flex-1 hidden sm:grid grid-cols-5 gap-4">
                                <div>
                                  <div className="text-[10px] text-gray-400 mb-0.5">Temp</div>
                                  <div className="text-sm font-bold" style={{ color: tempColor(temp) }}>{temp?.toFixed(1)}°C</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-gray-400 mb-0.5">Wind</div>
                                  <div className="text-sm font-semibold text-gray-700">{wind?.toFixed(0)} km/h</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-gray-400 mb-0.5">Precip</div>
                                  <div className="text-sm font-semibold text-gray-700">{precip?.toFixed(1)} mm</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-gray-400 mb-0.5">Visibility</div>
                                  <div className="text-sm font-semibold text-gray-700">{vis ? (vis / 1000).toFixed(1) + ' km' : '--'}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-gray-400 mb-0.5">Cloud</div>
                                  <div className="text-sm font-semibold text-gray-700">{forecastHourly.cloud_cover?.[i]}%</div>
                                </div>
                              </div>
                              {/* Flight status badge */}
                              {hfsc && (
                                <div className={`hidden sm:block px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 ${hfsc.bg} ${hfsc.text} border ${hfsc.border}`}>
                                  {hfsc.label}
                                </div>
                              )}
                              {/* Mobile compact view */}
                              <div className="flex-1 sm:hidden flex items-center gap-3">
                                <span className="text-sm font-bold" style={{ color: tempColor(temp) }}>{temp?.toFixed(0)}°</span>
                                <span className="text-xs text-gray-500">{wind?.toFixed(0)} km/h</span>
                                {hfsc && <span className={`text-[9px] font-bold ${hfsc.text}`}>{hfsc.label}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-12 text-center text-gray-400 text-sm">No forecast data available</div>
                    )}
                  </div>

                  {/* Forecast visual summary */}
                  {forecastHourly?.time?.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Temp trend mini chart */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Temperature Trend</h4>
                        <div className="flex items-end gap-1 h-24">
                          {forecastHourly.time.map((t, i) => {
                            const temp = forecastHourly.temperature_2m?.[i] || 0;
                            const minT = Math.min(...(forecastHourly.temperature_2m || [0]));
                            const maxT = Math.max(...(forecastHourly.temperature_2m || [1]));
                            const range = maxT - minT || 1;
                            const h = Math.max(12, ((temp - minT) / range) * 80);
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[10px] font-bold" style={{ color: tempColor(temp) }}>{temp.toFixed(0)}°</span>
                                <motion.div initial={{ height: 0 }} animate={{ height: h }}
                                  transition={{ delay: i * 0.08, duration: 0.5 }}
                                  className={`w-full rounded-t-lg bg-gradient-to-t ${tempBarGradient(temp)} opacity-80`} />
                                <span className="text-[9px] text-gray-400 font-medium">{formatHour(t).replace(/\s?(AM|PM)/i, (m, p) => p[0])}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Precip trend */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Precipitation Outlook</h4>
                        <div className="flex items-end gap-1 h-24">
                          {forecastHourly.time.map((t, i) => {
                            const precip = forecastHourly.precipitation?.[i] || 0;
                            const maxP = Math.max(...(forecastHourly.precipitation || [1]), 1);
                            const h = Math.max(4, (precip / maxP) * 80);
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[10px] font-semibold text-gray-500">{precip.toFixed(1)}</span>
                                <motion.div initial={{ height: 0 }} animate={{ height: precip > 0 ? h : 4 }}
                                  transition={{ delay: i * 0.08, duration: 0.5 }}
                                  className={`w-full rounded-t-lg ${precip > 0 ? 'bg-gradient-to-t from-blue-500 to-cyan-400' : 'bg-gray-100'}`} />
                                <span className="text-[9px] text-gray-400 font-medium">{formatHour(t).replace(/\s?(AM|PM)/i, (m, p) => p[0])}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ COMPARISON TAB ═══════════════════════════════════════ */}
              {activeTab === 'comparison' && (
                <motion.div key="comparison" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

                  {historicalWeather && currentWeather ? (
                    <>
                      {/* Two hero cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Historical */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-between">
                            <div>
                              <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-0.5">When Reported</div>
                              <div className="text-sm text-white/70">{formatDateTime(historicalWeather.time)}</div>
                            </div>
                            <img src={wcImage(historicalWeather.weather_code)} alt="" className="w-12 h-12 object-contain opacity-70" />
                          </div>
                          <div className="p-6">
                            <div className="flex items-baseline gap-2 mb-4">
                              <span className="text-4xl font-bold text-gray-900">{historicalWeather.temperature_2m?.toFixed(1)}°</span>
                              <span className="text-sm text-gray-400">{wcDesc(historicalWeather.weather_code)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                { l: 'Humidity', v: `${historicalWeather.relative_humidity_2m}%` },
                                { l: 'Wind', v: `${historicalWeather.wind_speed_10m?.toFixed(0)} km/h` },
                                { l: 'Rain', v: `${historicalWeather.precipitation?.toFixed(1)} mm` },
                                { l: 'Cloud', v: `${historicalWeather.cloud_cover ?? '--'}%` },
                                { l: 'Visibility', v: historicalWeather.visibility ? `${(historicalWeather.visibility / 1000).toFixed(1)} km` : '--' },
                                { l: 'Pressure', v: `${historicalWeather.pressure_msl?.toFixed(0) ?? '--'} hPa` },
                              ].map((m, i) => (
                                <div key={i} className="p-2.5 bg-gray-50 rounded-xl text-center">
                                  <div className="text-[10px] text-gray-400 mb-0.5">{m.l}</div>
                                  <div className="text-xs font-bold text-gray-800">{m.v}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Current */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className={`px-6 py-4 bg-gradient-to-r ${wcHeaderBg(currentWeather.weather_code)} flex items-center justify-between`}>
                            <div>
                              <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-0.5">Right Now</div>
                              <div className="text-sm text-white/70">{new Date().toLocaleString()}</div>
                            </div>
                            <img src={wcImage(currentWeather.weather_code)} alt="" className="w-12 h-12 object-contain opacity-70" />
                          </div>
                          <div className="p-6">
                            <div className="flex items-baseline gap-2 mb-4">
                              <span className="text-4xl font-bold text-gray-900">{currentWeather.temperature_2m?.toFixed(1)}°</span>
                              <span className="text-sm text-gray-400">{wcDesc(currentWeather.weather_code)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                { l: 'Humidity', v: `${currentWeather.relative_humidity_2m}%` },
                                { l: 'Wind', v: `${currentWeather.wind_speed_10m?.toFixed(0)} km/h` },
                                { l: 'Rain', v: `${currentWeather.precipitation?.toFixed(1)} mm` },
                                { l: 'Cloud', v: `${currentWeather.cloud_cover}%` },
                                { l: 'Visibility', v: currentWeather.visibility ? `${(currentWeather.visibility / 1000).toFixed(1)} km` : '--' },
                                { l: 'Pressure', v: `${currentWeather.pressure_msl?.toFixed(0)} hPa` },
                              ].map((m, i) => (
                                <div key={i} className="p-2.5 bg-gray-50 rounded-xl text-center">
                                  <div className="text-[10px] text-gray-400 mb-0.5">{m.l}</div>
                                  <div className="text-xs font-bold text-gray-800">{m.v}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Delta indicators */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Change Analysis</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {[
                            { label: 'Temperature', trend: tempTrend, unit: '°C', from: historicalWeather.temperature_2m?.toFixed(1), to: currentWeather.temperature_2m?.toFixed(1), upBad: true },
                            { label: 'Wind Speed', trend: windTrend, unit: ' km/h', from: historicalWeather.wind_speed_10m?.toFixed(0), to: currentWeather.wind_speed_10m?.toFixed(0), upBad: true },
                            { label: 'Precipitation', trend: precipTrend, unit: ' mm', from: historicalWeather.precipitation?.toFixed(1), to: currentWeather.precipitation?.toFixed(1), upBad: true },
                            { label: 'Humidity', trend: humidityTrend, unit: '%', from: historicalWeather.relative_humidity_2m, to: currentWeather.relative_humidity_2m, upBad: false },
                          ].map((item, i) => {
                            const isUp = item.trend?.dir === 'up';
                            const isDown = item.trend?.dir === 'down';
                            const bad = item.upBad ? isUp : isDown;
                            const good = item.upBad ? isDown : isUp;
                            return (
                              <div key={i} className={`p-4 rounded-xl border ${bad ? 'bg-red-50/50 border-red-100' : good ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="text-[11px] text-gray-400 font-semibold mb-2">{item.label}</div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm text-gray-400 font-mono">{item.from}</span>
                                  <ArrowRightIcon className="w-3 h-3 text-gray-300" />
                                  <span className="text-sm font-bold text-gray-900 font-mono">{item.to}</span>
                                </div>
                                {item.trend && item.trend.dir !== 'stable' ? (
                                  <div className={`inline-flex items-center gap-1 text-xs font-bold ${bad ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {isUp ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                                    {item.trend.text}{item.unit}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400 font-medium">No change</div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Assessment */}
                        <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-start gap-3">
                            <ShieldIcon className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <h4 className="text-sm font-bold text-gray-700 mb-1">Situation Assessment</h4>
                              <p className="text-sm text-gray-500 leading-relaxed">
                                {(() => {
                                  const tempDiff = (currentWeather.temperature_2m || 0) - (historicalWeather.temperature_2m || 0);
                                  const windDiff = (currentWeather.wind_speed_10m || 0) - (historicalWeather.wind_speed_10m || 0);
                                  const precipDiff = (currentWeather.precipitation || 0) - (historicalWeather.precipitation || 0);
                                  const worsening = (tempDiff > 3 || windDiff > 10 || precipDiff > 2);
                                  const improving = (windDiff < -5 || precipDiff < -1);
                                  if (worsening) return "Conditions have deteriorated since the report was filed. Increased wind, precipitation, or temperature changes may impact rescue operations. Reassess deployment strategy before proceeding.";
                                  if (improving) return "Conditions have improved since the incident was reported. Lower wind speeds and reduced precipitation create a more favorable window for response operations.";
                                  return "Weather conditions have remained stable since the report was filed. No significant changes detected that would alter the operational risk profile.";
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                      <ClockIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-gray-700 mb-2">Historical Data Unavailable</h3>
                      <p className="text-sm text-gray-400 max-w-sm mx-auto">
                        {!reportDate
                          ? "No report timestamp was provided with this incident."
                          : "Weather records for the time this report was filed could not be retrieved from the archive."
                        }
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
            <div className="text-center text-[11px] text-gray-300 pt-4 border-t border-gray-100">
              Data source: Open-Meteo ECMWF IFS 0.25° | Timezone: Asia/Kathmandu | Powered by Sankalpa Disaster Management System
            </div>
          </div>
        </>
      )}
    </div>
  );
}
