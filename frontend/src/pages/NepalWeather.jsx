import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../components/Navbar';
import nepalBorderData from '../data/map.json';

// ─── SVG Icons ────────────────────────────────────────────────────────
const CloudIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
);
const DropletIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
);
const WindIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
);
const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
);
const SearchIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const MapPinIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
);
const CompassIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
);
const GaugeIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12l4-8"/><circle cx="12" cy="12" r="2"/></svg>
);
const ClockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const ChevronRightIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);
const XIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const GlobeIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);
const LayersIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
);

// ─── Data ─────────────────────────────────────────────────────────────
const PROVINCES = [
  { id: 1, name: "Koshi", capital: "Biratnagar", lat: 26.4525, lng: 87.2718, color: "#3b82f6" },
  { id: 2, name: "Madhesh", capital: "Janakpur", lat: 26.7105, lng: 85.9240, color: "#06b6d4" },
  { id: 3, name: "Bagmati", capital: "Kathmandu", lat: 27.7172, lng: 85.3240, color: "#10b981" },
  { id: 4, name: "Gandaki", capital: "Pokhara", lat: 28.2096, lng: 83.9856, color: "#f59e0b" },
  { id: 5, name: "Lumbini", capital: "Butwal", lat: 27.7006, lng: 83.4484, color: "#8b5cf6" },
  { id: 6, name: "Karnali", capital: "Surkhet", lat: 28.6018, lng: 81.6161, color: "#ef4444" },
  { id: 7, name: "Sudurpashchim", capital: "Dhangadhi", lat: 28.6936, lng: 80.5936, color: "#f97316" },
];

const DISTRICTS = [
  { name: "Taplejung", province: "Koshi", lat: 27.3500, lng: 87.6667 },
  { name: "Panchthar", province: "Koshi", lat: 27.1500, lng: 87.8000 },
  { name: "Ilam", province: "Koshi", lat: 26.9100, lng: 87.9300 },
  { name: "Jhapa", province: "Koshi", lat: 26.5400, lng: 87.8500 },
  { name: "Morang", province: "Koshi", lat: 26.6500, lng: 87.4000 },
  { name: "Sunsari", province: "Koshi", lat: 26.7000, lng: 87.1667 },
  { name: "Dhankuta", province: "Koshi", lat: 27.0667, lng: 87.3500 },
  { name: "Terhathum", province: "Koshi", lat: 27.1167, lng: 87.5333 },
  { name: "Sankhuwasabha", province: "Koshi", lat: 27.5500, lng: 87.2333 },
  { name: "Bhojpur", province: "Koshi", lat: 27.1667, lng: 87.0500 },
  { name: "Solukhumbu", province: "Koshi", lat: 27.6833, lng: 86.6500 },
  { name: "Okhaldhunga", province: "Koshi", lat: 27.3167, lng: 86.5000 },
  { name: "Khotang", province: "Koshi", lat: 27.0333, lng: 86.8333 },
  { name: "Udayapur", province: "Koshi", lat: 26.8333, lng: 86.5167 },
  { name: "Saptari", province: "Madhesh", lat: 26.6500, lng: 86.9000 },
  { name: "Siraha", province: "Madhesh", lat: 26.6500, lng: 86.2000 },
  { name: "Dhanusha", province: "Madhesh", lat: 26.8167, lng: 85.9333 },
  { name: "Mahottari", province: "Madhesh", lat: 26.6500, lng: 85.6667 },
  { name: "Sarlahi", province: "Madhesh", lat: 26.9667, lng: 85.3833 },
  { name: "Rautahat", province: "Madhesh", lat: 27.0500, lng: 85.1000 },
  { name: "Bara", province: "Madhesh", lat: 27.0000, lng: 84.9167 },
  { name: "Parsa", province: "Madhesh", lat: 27.1333, lng: 84.7500 },
  { name: "Sindhupalchok", province: "Bagmati", lat: 27.9500, lng: 85.6833 },
  { name: "Kavrepalanchok", province: "Bagmati", lat: 27.5500, lng: 85.5333 },
  { name: "Lalitpur", province: "Bagmati", lat: 27.6667, lng: 85.3333 },
  { name: "Bhaktapur", province: "Bagmati", lat: 27.6720, lng: 85.4298 },
  { name: "Kathmandu", province: "Bagmati", lat: 27.7172, lng: 85.3240 },
  { name: "Nuwakot", province: "Bagmati", lat: 27.9000, lng: 85.1667 },
  { name: "Rasuwa", province: "Bagmati", lat: 28.1000, lng: 85.3667 },
  { name: "Dhading", province: "Bagmati", lat: 27.8667, lng: 84.9167 },
  { name: "Makwanpur", province: "Bagmati", lat: 27.4500, lng: 85.0000 },
  { name: "Ramechhap", province: "Bagmati", lat: 27.3333, lng: 86.0833 },
  { name: "Dolakha", province: "Bagmati", lat: 27.6833, lng: 86.0833 },
  { name: "Sindhuli", province: "Bagmati", lat: 27.2500, lng: 85.9667 },
  { name: "Chitwan", province: "Bagmati", lat: 27.5291, lng: 84.3542 },
  { name: "Kaski", province: "Gandaki", lat: 28.2096, lng: 83.9856 },
  { name: "Gorkha", province: "Gandaki", lat: 28.0000, lng: 84.6333 },
  { name: "Manang", province: "Gandaki", lat: 28.6667, lng: 84.0167 },
  { name: "Mustang", province: "Gandaki", lat: 28.9833, lng: 83.8667 },
  { name: "Myagdi", province: "Gandaki", lat: 28.4667, lng: 83.4833 },
  { name: "Baglung", province: "Gandaki", lat: 28.2667, lng: 83.5833 },
  { name: "Parbat", province: "Gandaki", lat: 28.2167, lng: 83.7000 },
  { name: "Syangja", province: "Gandaki", lat: 28.0833, lng: 83.8833 },
  { name: "Tanahun", province: "Gandaki", lat: 27.9333, lng: 84.2500 },
  { name: "Lamjung", province: "Gandaki", lat: 28.2500, lng: 84.4167 },
  { name: "Nawalpur", province: "Gandaki", lat: 27.7000, lng: 84.1167 },
  { name: "Rupandehi", province: "Lumbini", lat: 27.6000, lng: 83.4833 },
  { name: "Kapilvastu", province: "Lumbini", lat: 27.5667, lng: 83.0500 },
  { name: "Arghakhanchi", province: "Lumbini", lat: 27.9500, lng: 83.1667 },
  { name: "Gulmi", province: "Lumbini", lat: 28.0667, lng: 83.2833 },
  { name: "Palpa", province: "Lumbini", lat: 27.8667, lng: 83.5500 },
  { name: "Parasi", province: "Lumbini", lat: 27.7000, lng: 83.6333 },
  { name: "Pyuthan", province: "Lumbini", lat: 28.0833, lng: 82.8333 },
  { name: "Rolpa", province: "Lumbini", lat: 28.3333, lng: 82.6500 },
  { name: "Eastern Rukum", province: "Lumbini", lat: 28.5500, lng: 82.6000 },
  { name: "Banke", province: "Lumbini", lat: 28.0500, lng: 81.6000 },
  { name: "Bardiya", province: "Lumbini", lat: 28.3833, lng: 81.4500 },
  { name: "Dang", province: "Lumbini", lat: 28.1144, lng: 82.3004 },
  { name: "Dolpa", province: "Karnali", lat: 29.0000, lng: 82.8333 },
  { name: "Mugu", province: "Karnali", lat: 29.5000, lng: 82.1667 },
  { name: "Humla", province: "Karnali", lat: 29.9500, lng: 81.8167 },
  { name: "Jumla", province: "Karnali", lat: 29.2833, lng: 82.1667 },
  { name: "Kalikot", province: "Karnali", lat: 29.0833, lng: 81.6333 },
  { name: "Dailekh", province: "Karnali", lat: 28.8333, lng: 81.7167 },
  { name: "Jajarkot", province: "Karnali", lat: 28.7000, lng: 82.2167 },
  { name: "Western Rukum", province: "Karnali", lat: 28.5833, lng: 82.0500 },
  { name: "Salyan", province: "Karnali", lat: 28.3833, lng: 82.1667 },
  { name: "Surkhet", province: "Karnali", lat: 28.6018, lng: 81.6161 },
  { name: "Bajura", province: "Sudurpashchim", lat: 29.5000, lng: 81.3000 },
  { name: "Bajhang", province: "Sudurpashchim", lat: 29.5500, lng: 81.1000 },
  { name: "Achham", province: "Sudurpashchim", lat: 29.1000, lng: 81.2167 },
  { name: "Doti", province: "Sudurpashchim", lat: 29.2667, lng: 80.9667 },
  { name: "Kailali", province: "Sudurpashchim", lat: 28.6936, lng: 80.5936 },
  { name: "Kanchanpur", province: "Sudurpashchim", lat: 28.9667, lng: 80.1333 },
  { name: "Dadeldhura", province: "Sudurpashchim", lat: 29.3000, lng: 80.5833 },
  { name: "Baitadi", province: "Sudurpashchim", lat: 29.5333, lng: 80.4167 },
  { name: "Darchula", province: "Sudurpashchim", lat: 29.8500, lng: 80.5500 },
];

const MAJOR_CITIES = [
  { name: "Kathmandu", province: "Bagmati", lat: 27.7172, lng: 85.3240, accent: "#10b981" },
  { name: "Pokhara", province: "Gandaki", lat: 28.2096, lng: 83.9856, accent: "#f59e0b" },
  { name: "Biratnagar", province: "Koshi", lat: 26.4525, lng: 87.2718, accent: "#3b82f6" },
  { name: "Dhangadhi", province: "Sudurpashchim", lat: 28.6936, lng: 80.5936, accent: "#f97316" },
  { name: "Bharatpur", province: "Bagmati", lat: 27.6833, lng: 84.4333, accent: "#8b5cf6" },
  { name: "Butwal", province: "Lumbini", lat: 27.7006, lng: 83.4484, accent: "#06b6d4" },
  { name: "Janakpur", province: "Madhesh", lat: 26.7105, lng: 85.9240, accent: "#ef4444" },
  { name: "Nepalgunj", province: "Lumbini", lat: 28.0500, lng: 81.6167, accent: "#ec4899" },
];

const PROVINCE_COLORS = {};
PROVINCES.forEach(p => { PROVINCE_COLORS[p.name] = p.color; });

const MAP_TILES = {
  street: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "&copy; OpenStreetMap" },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "&copy; Esri" },
  terrain: { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attr: "&copy; OpenTopoMap" },
  dark: { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attr: "&copy; CartoDB" },
  positron: { url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", attr: "&copy; CartoDB" },
};

const TOPO_URL = "https://raw.githubusercontent.com/mesaugat/geoJSON-Nepal/master/nepal-districts.topojson";

// District name normalization for matching TopoJSON names
const NAME_ALIASES = {
  "KAVREPALANCHOWK": "Bagmati", "KAVREPALANCHOK": "Bagmati",
  "SINDHUPALCHOWK": "Bagmati", "SINDHUPALCHOK": "Bagmati",
  "NAWALPARASI_EAST": "Gandaki", "NAWALPARASI EAST": "Gandaki",
  "NAWALPARASI_WEST": "Lumbini", "NAWALPARASI WEST": "Lumbini",
  "NAWALPUR": "Gandaki", "NAWALPARASI W": "Lumbini", "NAWALPARASIW": "Lumbini",
  "RUKUM_EAST": "Lumbini", "RUKUM EAST": "Lumbini", "EASTERN RUKUM": "Lumbini", "EASTERNRUKUM": "Lumbini",
  "RUKUM_WEST": "Karnali", "RUKUM WEST": "Karnali", "WESTERN RUKUM": "Karnali", "WESTERNRUKUM": "Karnali",
  "CHITAWAN": "Bagmati", "CHITWAN": "Bagmati", "TANAHAU": "Gandaki",
  "TANAHU": "Gandaki", "TERHATHUM": "Koshi", "TERATHUM": "Koshi",
  "KAPILBASTU": "Lumbini", "KAPILVASTU": "Lumbini",
  "DANG": "Lumbini", "DANG DEUKHURI": "Lumbini",
  "PARASI": "Lumbini", "PARSA": "Madhesh",
  "DHANUSHA": "Madhesh", "DHANUSA": "Madhesh",
  "KANCHANPUR": "Sudurpashchim", "MAHOTTARI": "Madhesh",
};
const DISTRICT_TO_PROVINCE = {};
DISTRICTS.forEach(d => {
  DISTRICT_TO_PROVINCE[d.name.toUpperCase()] = d.province;
  DISTRICT_TO_PROVINCE[d.name.replace(/\s/g, "").toUpperCase()] = d.province;
});
Object.entries(NAME_ALIASES).forEach(([k, v]) => { DISTRICT_TO_PROVINCE[k] = v; });

function getProvince(name) {
  const up = name.toUpperCase().trim();
  return DISTRICT_TO_PROVINCE[up] || DISTRICT_TO_PROVINCE[up.replace(/\s/g, "")] || null;
}

// ─── API ──────────────────────────────────────────────────────────────
const API_BASE = "https://api.open-meteo.com/v1/forecast";
const MODEL_PARAM = "&models=ecmwf_ifs025";

function buildFullUrl(lat, lng) {
  return `${API_BASE}?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,uv_index&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max,precipitation_probability_max&timezone=Asia%2FKathmandu&forecast_days=7${MODEL_PARAM}`;
}

function buildSimpleUrl(lat, lng) {
  return `${API_BASE}?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,uv_index,apparent_temperature,cloud_cover&timezone=Asia%2FKathmandu${MODEL_PARAM}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────
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
function wcTextColor(code) {
  if (code === 0) return "text-amber-500";
  if (code <= 3) return "text-slate-500";
  if (code <= 49) return "text-slate-400";
  if (code <= 67) return "text-blue-500";
  if (code <= 77) return "text-sky-400";
  if (code <= 99) return "text-red-500";
  return "text-gray-500";
}
function windDir(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}
function dewPoint(t, rh) {
  const a = 17.271, b = 237.7;
  const gamma = (a * t / (b + t)) + Math.log(rh / 100);
  return (b * gamma / (a - gamma)).toFixed(1);
}
function formatTime(iso) {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
}
function dayName(offset) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = new Date(); d.setDate(d.getDate() + offset);
  return offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : days[d.getDay()];
}
function tempBarColor(temp) {
  if (temp >= 35) return "linear-gradient(90deg, #ef4444, #dc2626)";
  if (temp >= 28) return "linear-gradient(90deg, #f97316, #ef4444)";
  if (temp >= 20) return "linear-gradient(90deg, #f59e0b, #f97316)";
  if (temp >= 10) return "linear-gradient(90deg, #10b981, #f59e0b)";
  return "linear-gradient(90deg, #3b82f6, #06b6d4)";
}
function uvLabel(uv) {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

// ─── Reusable Components ──────────────────────────────────────────────
function GaugeBar({ label, value, displayValue, max, colorFrom, colorTo }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="mb-3.5 last:mb-0">
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className="text-xs font-semibold text-gray-800 font-mono">{displayValue}</span>
      </div>
      <div className="h-[5px] bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function WindCompass({ direction, size = 72 }) {
  return (
    <div className="rounded-full border-2 border-gray-200 relative flex-shrink-0" style={{ width: size, height: size, background: "radial-gradient(circle, rgba(59,130,246,0.06), #f8fafc)" }}>
      {["N", "S", "E", "W"].map(d => (
        <div key={d} className={`absolute text-xs font-mono font-bold text-gray-400 ${d === 'N' ? 'top-1 left-1/2 -translate-x-1/2' : d === 'S' ? 'bottom-1 left-1/2 -translate-x-1/2' : d === 'E' ? 'right-1.5 top-1/2 -translate-y-1/2' : 'left-1.5 top-1/2 -translate-y-1/2'}`}>{d}</div>
      ))}
      <div className="absolute top-1/2 left-1/2 w-0.5 rounded-sm origin-bottom transition-transform duration-700" style={{ height: size * 0.36, background: "linear-gradient(to top, #3b82f6, transparent)", transform: `translateX(-50%) translateY(-100%) rotate(${direction}deg)` }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
    </div>
  );
}

function SunArc({ sunrise, sunset }) {
  if (!sunrise || !sunset) return null;
  const sr = new Date(sunrise), ss = new Date(sunset);
  const now = new Date();
  const pct = Math.max(0, Math.min(1, (now - sr) / (ss - sr)));
  const angle = Math.PI * (1 - pct);
  const cx = 110, cy = 105, r = 90;
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  const dayH = ((ss - sr) / 3600000).toFixed(1);
  const litLen = Math.PI * r * pct;
  const totalLen = Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: 220, height: 120 }}>
        <svg viewBox="0 0 220 120" fill="none" className="w-full h-full">
          <path d="M 20 105 A 90 90 0 0 1 200 105" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" strokeDasharray="4 4" />
          <path d="M 20 105 A 90 90 0 0 1 200 105" stroke="rgba(255,200,60,0.45)" strokeWidth="2.5" fill="none" strokeDasharray={`${litLen} ${totalLen}`} strokeLinecap="round" />
          <circle cx={x} cy={y} r="7" fill="#ffd43b" filter="url(#sunGlowF)" />
          <defs><filter id="sunGlowF" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
          <line x1="20" y1="105" x2="200" y2="105" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        </svg>
      </div>
      <div className="flex justify-between w-full px-2.5 font-mono text-xs text-white/50">
        <span>{formatTime(sunrise)}</span>
        <span>{formatTime(sunset)}</span>
      </div>
      <div className="text-xs text-white/35 font-mono"><span className="text-white/55 font-semibold">{dayH}</span> hrs daylight</div>
    </div>
  );
}

// ─── Weather Map Component ────────────────────────────────────────────
function WeatherMap({ mapId, onDistrictClick, onProvinceClick, selectedItem, selectionType, showAllProvinces = false, className = "" }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const tileRef = useRef(null);
  const geoLayerRef = useRef(null);
  const highlightedRef = useRef([]);
  const pulseRef = useRef(null);
  const markersRef = useRef({});
  const [activeLayer, setActiveLayer] = useState('positron');
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: [28.3949, 84.1240], zoom: 7,
      zoomControl: false, scrollWheelZoom: true, minZoom: 6, maxZoom: 18,
    });
    tileRef.current = L.tileLayer(MAP_TILES.positron.url, { attribution: MAP_TILES.positron.attr, maxZoom: 19 }).addTo(map);
    mapInstance.current = map;

    // Nepal border
    if (nepalBorderData?.features) {
      L.geoJSON(nepalBorderData, { style: { color: '#94a3b8', weight: 2, opacity: 0.6, fillColor: '#94a3b8', fillOpacity: 0.03 } }).addTo(map);
    }

    // District boundaries from TopoJSON
    (async () => {
      try {
        const resp = await fetch(TOPO_URL);
        const topo = await resp.json();
        // topojson is loaded from CDN script in index.html, but in React we handle it:
        // We need to convert topojson to geojson. Since topojson-client is not a dependency,
        // we'll do a simple manual approach using the topojson structure
        let geojson;
        if (window.topojson) {
          geojson = window.topojson.feature(topo, topo.objects.nepal || topo.objects[Object.keys(topo.objects)[0]]);
        } else {
          // Dynamically load topojson-client
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/topojson-client@3.1.0/dist/topojson-client.min.js';
          document.head.appendChild(script);
          await new Promise(resolve => { script.onload = resolve; });
          geojson = window.topojson.feature(topo, topo.objects.nepal || topo.objects[Object.keys(topo.objects)[0]]);
        }

        geoLayerRef.current = L.geoJSON(geojson, {
          style: (feature) => {
            const prov = getProvince(feature.properties?.name || feature.id || "");
            const color = prov ? (PROVINCE_COLORS[prov] || "#3b82f6") : "#94a3b8";
            if (showAllProvinces) {
              return { fillColor: color, fillOpacity: 0.2, color: color, weight: 1.5, opacity: 0.5 };
            }
            return { fillColor: color, fillOpacity: 0.1, color: color, weight: 1, opacity: 0.35 };
          },
          onEachFeature: (feature, layer) => {
            const name = feature.properties?.name || feature.id || "Unknown";
            const prov = getProvince(name) || "Unknown";
            layer.bindTooltip(
              `<div style="font-family:Inter,system-ui,sans-serif"><b style="font-size:12px;color:#1e293b">${name}</b><br/><span style="color:#64748b;font-size:10px">${prov} Province</span></div>`,
              { sticky: true, className: 'weather-district-tooltip', direction: 'top', offset: [0, -8] }
            );
            layer.on('mouseover', function () {
              if (highlightedRef.current.includes(this)) return;
              this.setStyle({ fillOpacity: 0.25, weight: 2 });
            });
            layer.on('mouseout', function () {
              if (highlightedRef.current.includes(this)) return;
              const p = getProvince(name);
              const c = p ? (PROVINCE_COLORS[p] || "#3b82f6") : "#94a3b8";
              this.setStyle({ fillOpacity: showAllProvinces ? 0.2 : 0.1, weight: showAllProvinces ? 1.5 : 1, color: c });
            });
            layer.on('click', function () {
              if (onDistrictClick) {
                const dist = DISTRICTS.find(d => d.name.toUpperCase().replace(/\s/g, "") === name.toUpperCase().replace(/\s/g, ""));
                if (dist) onDistrictClick(dist);
              }
              if (onProvinceClick) {
                const provName = getProvince(name);
                const p = PROVINCES.find(pr => pr.name === provName);
                if (p) onProvinceClick(p);
              }
            });
          }
        }).addTo(map);

        // Province capital markers with pulse animation
        if (!onDistrictClick) {
          PROVINCES.forEach(p => {
            const icon = L.divIcon({
              className: "",
              html: `<div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center">
                <div style="position:absolute;inset:0;border-radius:50%;background:${p.color};opacity:0.25;animation:capitalPulse 2s ease-in-out infinite"></div>
                <div style="position:absolute;inset:4px;border-radius:50%;background:${p.color};opacity:0.15;animation:capitalPulse 2s ease-in-out 0.3s infinite"></div>
                <div style="position:relative;width:12px;height:12px;border-radius:50%;background:${p.color};border:3px solid #ffffff;box-shadow:0 2px 10px rgba(0,0,0,0.3);animation:capitalBounce 3s ease-in-out infinite;z-index:2"></div>
              </div>`,
              iconSize: [28, 28], iconAnchor: [14, 14]
            });
            L.marker([p.lat, p.lng], { icon }).addTo(map)
              .bindPopup(`<div style="font-family:Inter,sans-serif;padding:2px"><b style="color:#1e293b;font-size:13px">${p.name}</b><br/><span style="color:#64748b;font-size:11px">${p.capital}</span></div>`);
          });
        }

        // District circle markers for district tab
        if (onDistrictClick) {
          DISTRICTS.forEach(d => {
            const provColor = PROVINCE_COLORS[d.province] || "#3b82f6";
            const marker = L.circleMarker([d.lat, d.lng], {
              radius: 4, fillColor: provColor, color: "#ffffff",
              weight: 2, fillOpacity: 0.85, stroke: true
            }).addTo(map);
            marker.on("click", () => {
              onDistrictClick(d);
              map.setView([d.lat, d.lng], 10, { animate: true });
            });
            marker.bindTooltip(d.name, { direction: 'top', offset: [0, -6], className: 'weather-district-tooltip' });
            markersRef.current[d.name] = marker;
          });
        }
      } catch (e) {
        console.warn("Failed to load district boundaries:", e);
      }
    })();

    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  // Handle selection highlighting
  useEffect(() => {
    if (!geoLayerRef.current || !mapInstance.current) return;

    // Clear previous
    if (pulseRef.current) { clearInterval(pulseRef.current); pulseRef.current = null; }
    highlightedRef.current.forEach(layer => {
      const name = layer.feature?.properties?.name || layer.feature?.id || "";
      const prov = getProvince(name);
      const color = prov ? (PROVINCE_COLORS[prov] || "#3b82f6") : "#94a3b8";
      layer.setStyle({ fillColor: color, fillOpacity: showAllProvinces ? 0.2 : 0.1, color: color, weight: showAllProvinces ? 1.5 : 1, opacity: showAllProvinces ? 0.5 : 0.35 });
    });
    // Also restore any dimmed layers
    if (geoLayerRef.current) {
      geoLayerRef.current.eachLayer(layer => {
        if (!highlightedRef.current.includes(layer)) {
          const nm = layer.feature?.properties?.name || layer.feature?.id || "";
          const pr = getProvince(nm);
          const cl = pr ? (PROVINCE_COLORS[pr] || "#3b82f6") : "#94a3b8";
          layer.setStyle({ fillColor: cl, fillOpacity: showAllProvinces ? 0.2 : 0.1, color: cl, weight: showAllProvinces ? 1.5 : 1, opacity: showAllProvinces ? 0.5 : 0.35 });
        }
      });
    }
    highlightedRef.current = [];

    // Reset all markers
    Object.values(markersRef.current).forEach(m => {
      const d = DISTRICTS.find(dd => dd.name === Object.keys(markersRef.current).find(k => markersRef.current[k] === m));
      if (d) m.setStyle({ fillColor: PROVINCE_COLORS[d.province] || "#3b82f6", radius: 4, weight: 2, color: "#ffffff" });
    });

    if (!selectedItem) return;

    if (selectionType === 'district') {
      // Dim all districts first, then highlight selected
      geoLayerRef.current.eachLayer(layer => {
        const name = layer.feature?.properties?.name || layer.feature?.id || "";
        const prov = getProvince(name);
        const color = prov ? (PROVINCE_COLORS[prov] || "#3b82f6") : "#94a3b8";
        if (name.toUpperCase().replace(/\s/g, "") === selectedItem.name.toUpperCase().replace(/\s/g, "")) {
          highlightedRef.current.push(layer);
          const selColor = PROVINCE_COLORS[selectedItem.province] || "#3b82f6";
          layer.setStyle({ fillColor: selColor, fillOpacity: 0.45, color: "#ffffff", weight: 3.5, opacity: 1 });
          layer.bringToFront();
        } else {
          layer.setStyle({ fillColor: color, fillOpacity: 0.06, color: color, weight: 0.8, opacity: 0.2 });
        }
      });

      // Highlight marker
      const marker = markersRef.current[selectedItem.name];
      if (marker) marker.setStyle({ fillColor: "#ffffff", radius: 8, weight: 3, color: PROVINCE_COLORS[selectedItem.province] || "#3b82f6", fillOpacity: 1 });

      // Pulse effect
      let pulse = true;
      pulseRef.current = setInterval(() => {
        highlightedRef.current.forEach(l => {
          const selColor = PROVINCE_COLORS[selectedItem.province] || "#3b82f6";
          l.setStyle({ fillOpacity: pulse ? 0.5 : 0.25, weight: pulse ? 4 : 2.5, color: pulse ? "#ffffff" : selColor });
        });
        pulse = !pulse;
      }, 900);

      mapInstance.current.setView([selectedItem.lat, selectedItem.lng], 10, { animate: true });
    } else if (selectionType === 'province') {
      // Dim unselected provinces, strongly highlight selected
      geoLayerRef.current.eachLayer(layer => {
        const name = layer.feature?.properties?.name || layer.feature?.id || "";
        const prov = getProvince(name);
        if (prov === selectedItem.name) {
          highlightedRef.current.push(layer);
          layer.setStyle({ fillColor: selectedItem.color, fillOpacity: 0.4, color: selectedItem.color, weight: 3, opacity: 1 });
          layer.bringToFront();
        } else {
          const color = prov ? (PROVINCE_COLORS[prov] || "#94a3b8") : "#94a3b8";
          layer.setStyle({ fillColor: color, fillOpacity: 0.05, color: color, weight: 0.8, opacity: 0.15 });
        }
      });

      let pulse = true;
      pulseRef.current = setInterval(() => {
        highlightedRef.current.forEach(l => {
          l.setStyle({ fillOpacity: pulse ? 0.45 : 0.2, weight: pulse ? 3.5 : 2 });
        });
        pulse = !pulse;
      }, 800);

      mapInstance.current.setView([selectedItem.lat, selectedItem.lng], 6, { animate: true });
    }

    return () => { if (pulseRef.current) { clearInterval(pulseRef.current); pulseRef.current = null; } };
  }, [selectedItem, selectionType]);

  const switchLayer = (name) => {
    if (!mapInstance.current || !MAP_TILES[name]) return;
    if (tileRef.current) mapInstance.current.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(MAP_TILES[name].url, { attribution: MAP_TILES[name].attr, maxZoom: 19 }).addTo(mapInstance.current);
    setActiveLayer(name);
    setLayerMenuOpen(false);
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm group ${className}`}>
      <div ref={mapRef} id={mapId} className="w-full h-full" style={{ minHeight: 420 }} />

      {/* Layer Switcher */}
      <div className="absolute top-3 left-3 z-[500]">
        <button
          onClick={() => setLayerMenuOpen(!layerMenuOpen)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all text-xs font-medium text-gray-600"
        >
          <LayersIcon className="w-3.5 h-3.5" />
          Map Style
        </button>
        {layerMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-10 left-0 bg-white/98 backdrop-blur-sm rounded-xl border border-gray-200 shadow-xl py-1.5 min-w-[150px]"
          >
            {Object.entries(MAP_TILES).map(([key, tile]) => (
              <button
                key={key}
                onClick={() => switchLayer(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors ${activeLayer === key ? 'text-blue-600 bg-blue-50/60' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${activeLayer === key ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                  {activeLayer === key && <div className="w-1 h-1 rounded-full bg-white" />}
                </div>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Compass */}
      <div className="absolute bottom-4 right-4 z-[500] w-14 h-14 rounded-full bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg flex items-center justify-center">
        <div className="w-11 h-11 rounded-full relative" style={{ background: "radial-gradient(circle, #f8faff, #edf2f8)" }}>
          <div className="absolute left-1/2 top-1/2 w-[3px] h-10 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: "16px solid #ef4444" }} />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: 0, height: 0, borderLeft: "3px solid transparent", borderRight: "3px solid transparent", borderTop: "14px solid #94a3b8" }} />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border-[1.5px] border-blue-500 z-10" />
          <span className="absolute top-[1px] left-1/2 -translate-x-1/2 text-xs font-bold text-red-500 font-mono">N</span>
          <span className="absolute bottom-[1px] left-1/2 -translate-x-1/2 text-xs font-bold text-gray-400 font-mono">S</span>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel (shared by Province & District) ─────────────────────
function WeatherDetail({ data, daily, hourly, title, subtitle, onClose }) {
  const c = data;
  const d = daily;
  const dh = hourly;
  const nowHour = new Date().getHours();
  if (!c) return null;

  return (
    <div>
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight">{title}</h3>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{subtitle}</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900 tracking-tight">{Math.round(c.temperature_2m)}<sup className="text-xs text-gray-500 font-normal ml-0.5">C</sup></span>
              <span className={`text-sm font-medium ${wcTextColor(c.weather_code)}`}>{wcDesc(c.weather_code)}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 hover:border-gray-300 transition-all">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards Row 1 */}
      <div className="px-5 pt-5 pb-3">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { title: "Temperature", val: Math.round(c.temperature_2m), unit: "C", sub: `High ${Math.round(d?.temperature_2m_max?.[0])} / Low ${Math.round(d?.temperature_2m_min?.[0])}`, grad: "from-red-500 to-orange-400", gauge: { v: ((c.temperature_2m + 10) / 60) * 100, f: "#ef4444", t: "#f97316" } },
            { title: "Feels Like", val: Math.round(c.apparent_temperature), unit: "C", sub: c.apparent_temperature > c.temperature_2m ? "Warmer than actual" : "Cooler than actual", grad: "from-amber-500 to-yellow-400", gauge: { v: ((c.apparent_temperature + 10) / 60) * 100, f: "#f59e0b", t: "#fbbf24" } },
            { title: "Cloud Cover", val: c.cloud_cover, unit: "%", sub: c.cloud_cover > 80 ? "Heavy cloud" : c.cloud_cover > 40 ? "Partly cloudy" : "Mostly clear", grad: "from-blue-500 to-cyan-400", gauge: { v: c.cloud_cover, f: "#3b82f6", t: "#22d3ee" } },
            { title: "Wind", val: null, unit: "", sub: "", grad: "from-teal-500 to-cyan-400", isWind: true },
          ].map((card, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06, duration: 0.35 }}
              className="relative bg-white rounded-xl border border-gray-100 p-4 overflow-hidden hover:-translate-y-0.5 hover:shadow-lg hover:border-gray-200 transition-all duration-300 group/card"
            >
              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${card.grad} opacity-80 group-hover/card:opacity-100 transition-opacity`} />
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">{card.title}</div>
              {card.isWind ? (
                <div className="flex items-center gap-3">
                  <WindCompass direction={c.wind_direction_10m} size={50} />
                  <div>
                    <div className="text-xl font-bold text-gray-900 leading-none">{c.wind_speed_10m.toFixed(1)}<span className="text-xs font-normal text-gray-400 ml-0.5">km/h</span></div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{windDir(c.wind_direction_10m)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Gusts: {c.wind_gusts_10m?.toFixed(0)} km/h</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-gray-900 leading-none">{card.val}<span className="text-xs font-normal text-gray-400 ml-0.5">{card.unit}</span></div>
                  <div className="text-xs text-gray-500 mt-1.5">{card.sub}</div>
                  {card.gauge && (
                    <div className="h-[4px] bg-gray-100 rounded-full overflow-hidden mt-3">
                      <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${card.gauge.f}, ${card.gauge.t})` }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, card.gauge.v)}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Metric Cards Row 2 */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { title: "Precipitation", val: (c.precipitation || 0).toFixed(1), unit: "mm", grad: "from-blue-500 to-blue-400", gauge: { v: Math.min(100, (c.precipitation || 0) * 10), f: "#3b82f6", t: "#60a5fa" } },
            { title: "Humidity", val: c.relative_humidity_2m, unit: "%", sub: `Dew: ${dewPoint(c.temperature_2m, c.relative_humidity_2m)}C`, grad: "from-emerald-500 to-green-400", gauge: { v: c.relative_humidity_2m, f: "#10b981", t: "#4ade80" } },
            { title: "Pressure", val: Math.round(c.pressure_msl), unit: "hPa", grad: "from-violet-500 to-purple-400" },
            { title: "Sun", val: null, unit: "", grad: "from-amber-500 to-orange-400", isSun: true },
          ].map((card, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + idx * 0.06, duration: 0.35 }}
              className="relative bg-white rounded-xl border border-gray-100 p-4 overflow-hidden hover:-translate-y-0.5 hover:shadow-lg hover:border-gray-200 transition-all duration-300 group/card"
            >
              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${card.grad} opacity-80 group-hover/card:opacity-100 transition-opacity`} />
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">{card.title}</div>
              {card.isSun ? (
                <div className="flex items-center gap-4">
                  <div className="text-center"><div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">Sunrise</div><div className="text-lg font-bold text-gray-900 leading-none">{formatTime(d?.sunrise?.[0])}</div></div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="text-center"><div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">Sunset</div><div className="text-lg font-bold text-gray-900 leading-none">{formatTime(d?.sunset?.[0])}</div></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-gray-900 leading-none">{card.val}<span className="text-xs font-normal text-gray-400 ml-0.5">{card.unit}</span></div>
                  {card.sub && <div className="text-xs text-gray-500 mt-1.5">{card.sub}</div>}
                  {card.gauge && (
                    <div className="h-[4px] bg-gray-100 rounded-full overflow-hidden mt-3">
                      <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${card.gauge.f}, ${card.gauge.t})` }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, card.gauge.v)}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Two-column: Overview + Condition */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Today's Overview</div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Temp Range", val: <><span className="text-amber-500">{Math.round(d?.temperature_2m_max?.[0])}</span><span className="text-gray-300 mx-1">/</span><span className="text-blue-400">{Math.round(d?.temperature_2m_min?.[0])}</span></> },
                { label: "Total Precip", val: <>{(d?.precipitation_sum?.[0] || 0).toFixed(1)}<span className="text-xs text-gray-500 ml-0.5">mm</span></> },
                { label: "Max Wind", val: <>{Math.round(d?.wind_speed_10m_max?.[0])}<span className="text-xs text-gray-500 ml-0.5">km/h</span></> },
                { label: "Rain Hours", val: <>{d?.precipitation_hours?.[0] || 0}<span className="text-xs text-gray-500 ml-0.5">hrs</span></> },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-lg border border-gray-100 p-3 hover:-translate-y-0.5 hover:shadow-sm hover:border-gray-200 transition-all">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">{item.label}</div>
                  <div className="text-lg font-bold text-gray-900 leading-none">{item.val}</div>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Condition Index</div>
            <GaugeBar label="Humidity" value={c.relative_humidity_2m} displayValue={`${c.relative_humidity_2m}%`} max={100} colorFrom="#3b82f6" colorTo="#06b6d4" />
            <GaugeBar label="Cloud Cover" value={c.cloud_cover} displayValue={`${c.cloud_cover}%`} max={100} colorFrom="#10b981" colorTo="#22c55e" />
            <GaugeBar label="UV Index" value={c.uv_index || 0} displayValue={`${(c.uv_index || 0).toFixed(1)}/11 ${uvLabel(c.uv_index || 0)}`} max={11} colorFrom="#f59e0b" colorTo="#f97316" />
            <GaugeBar label="Wind Speed" value={c.wind_speed_10m} displayValue={`${c.wind_speed_10m.toFixed(1)} km/h`} max={100} colorFrom="#3b82f6" colorTo="#2563eb" />
          </motion.div>
        </div>
      </div>

      {/* Hourly */}
      {dh?.temperature_2m && (
        <div className="px-5 pb-3">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hourly Forecast</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="flex overflow-x-auto scrollbar-hide relative">
              {(() => {
                const temps = [];
                for (let i = nowHour; i < nowHour + 24 && i < dh.temperature_2m.length; i++) temps.push(dh.temperature_2m[i] || 0);
                const tMin = Math.min(...temps), tMax = Math.max(...temps), tRange = Math.max(tMax - tMin, 1);
                const cols = [];
                for (let i = nowHour; i < nowHour + 24 && i < dh.temperature_2m.length; i++) {
                  const temp = dh.temperature_2m[i] || 0;
                  const barH = Math.max(6, ((temp - tMin) / tRange) * 36);
                  const isNow = i === nowHour;
                  cols.push(
                    <div key={i} className={`flex-shrink-0 w-[62px] py-2.5 text-center flex flex-col items-center gap-1 border-r border-gray-50 hover:bg-blue-50/40 transition-colors cursor-default ${isNow ? 'bg-blue-50/60 border-t-2 border-t-blue-500' : ''}`}>
                      <span className="text-xs font-mono text-gray-400 font-medium">{isNow ? 'Now' : `${i % 24}:00`}</span>
                      <span className="text-sm font-bold text-gray-900">{Math.round(temp)}</span>
                      <div className="w-1.5 h-9 rounded-sm bg-gray-100 overflow-hidden flex items-end"><div className="w-full rounded-sm" style={{ height: barH, background: tempBarColor(Math.round(temp)) }} /></div>
                      <span className="text-xs font-mono text-blue-500 font-semibold">{dh.precipitation_probability?.[i] || 0}%</span>
                    </div>
                  );
                }
                return cols;
              })()}
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />
            </div>
          </motion.div>
        </div>
      )}

      {/* 7-Day Forecast */}
      {d?.temperature_2m_min && (
        <div className="px-5 pb-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">7-Day Forecast</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            {(() => {
              const allMin = [], allMax = [];
              for (let i = 0; i < 7; i++) { allMin.push(d.temperature_2m_min[i] || 0); allMax.push(d.temperature_2m_max[i] || 0); }
              const absMin = Math.min(...allMin), absMax = Math.max(...allMax), absRange = Math.max(absMax - absMin, 1);
              return Array.from({ length: 7 }, (_, i) => {
                const mn = d.temperature_2m_min[i] || 0, mx = d.temperature_2m_max[i] || 0;
                const leftPct = ((mn - absMin) / absRange) * 100;
                const widthPct = Math.max(8, ((mx - mn) / absRange) * 100);
                let barGrad = "linear-gradient(90deg, #3b82f6, #10b981)";
                if (mx > 32) barGrad = "linear-gradient(90deg, #f59e0b, #ef4444)";
                else if (mx > 25) barGrad = "linear-gradient(90deg, #10b981, #f59e0b)";
                else if (mx < 10) barGrad = "linear-gradient(90deg, #93c5fd, #3b82f6)";
                return (
                  <div key={i} className="grid grid-cols-[70px_1fr_42px_1fr] items-center gap-2.5 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                    <span className="text-sm font-bold text-gray-900">{dayName(i)}</span>
                    <span className={`text-xs font-medium truncate ${wcTextColor(d.weather_code?.[i])}`}>{wcDesc(d.weather_code?.[i])}</span>
                    <span className="text-xs font-mono font-semibold text-blue-500 text-center">{d.precipitation_probability_max?.[i] || 0}%</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-semibold text-blue-500 w-6 text-right">{Math.round(mn)}</span>
                      <div className="flex-1 h-[5px] bg-gray-100 rounded-full relative overflow-hidden">
                        <div className="absolute h-full rounded-full transition-all" style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: barGrad }} />
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-500 w-6">{Math.round(mx)}</span>
                    </div>
                  </div>
                );
              });
            })()}
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function NepalWeather() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('national');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown] = useState(300);
  const [refreshing, setRefreshing] = useState(false);
  const [nationalData, setNationalData] = useState(null);
  const [cityWeathers, setCityWeathers] = useState({});
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [provinceData, setProvinceData] = useState(null);
  const [provinceLoading, setProvinceLoading] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [districtData, setDistrictData] = useState(null);
  const [districtLoading, setDistrictLoading] = useState(false);

  // Helper: average results for current, hourly, daily — rounds to 1 decimal
  const buildAveragedData = useCallback((validResults) => {
    const n = validResults.length;
    if (n === 0) return null;
    const r1 = (v) => Math.round(v * 10) / 10;

    // Average current values
    const avgCur = (key) => r1(validResults.reduce((s, r) => s + (r.current?.[key] || 0), 0) / n);
    // Most common weather code
    const wcCounts = {};
    validResults.forEach(r => { const wc = r.current?.weather_code || 0; wcCounts[wc] = (wcCounts[wc] || 0) + 1; });
    const dominantWC = Number(Object.entries(wcCounts).sort((a, b) => b[1] - a[1])[0][0]);

    // Average hourly arrays element-wise
    const hourlyKeys = ['temperature_2m', 'precipitation_probability', 'precipitation', 'wind_speed_10m', 'visibility'];
    const avgHourly = { time: validResults[0]?.hourly?.time || [], weather_code: validResults[0]?.hourly?.weather_code || [] };
    hourlyKeys.forEach(key => {
      const len = validResults[0]?.hourly?.[key]?.length || 0;
      avgHourly[key] = Array.from({ length: len }, (_, i) =>
        r1(validResults.reduce((s, r) => s + (r.hourly?.[key]?.[i] || 0), 0) / n)
      );
    });

    // Average daily arrays element-wise
    const dailyNumKeys = ['temperature_2m_max', 'temperature_2m_min', 'uv_index_max', 'precipitation_sum', 'precipitation_hours', 'wind_speed_10m_max', 'wind_gusts_10m_max', 'precipitation_probability_max'];
    const avgDaily = {
      time: validResults[0]?.daily?.time || [],
      sunrise: validResults[0]?.daily?.sunrise || [],
      sunset: validResults[0]?.daily?.sunset || [],
      weather_code: validResults[0]?.daily?.weather_code || [],
    };
    dailyNumKeys.forEach(key => {
      const len = validResults[0]?.daily?.[key]?.length || 0;
      avgDaily[key] = Array.from({ length: len }, (_, i) =>
        r1(validResults.reduce((s, r) => s + (r.daily?.[key]?.[i] || 0), 0) / n)
      );
    });

    return {
      current: {
        temperature_2m: avgCur('temperature_2m'), relative_humidity_2m: avgCur('relative_humidity_2m'),
        apparent_temperature: avgCur('apparent_temperature'), precipitation: avgCur('precipitation'),
        weather_code: dominantWC, cloud_cover: avgCur('cloud_cover'),
        pressure_msl: avgCur('pressure_msl'), surface_pressure: avgCur('surface_pressure'),
        wind_speed_10m: avgCur('wind_speed_10m'), wind_direction_10m: avgCur('wind_direction_10m'),
        wind_gusts_10m: avgCur('wind_gusts_10m'), uv_index: avgCur('uv_index'),
        visibility: avgCur('visibility'), rain: avgCur('rain'), snowfall: avgCur('snowfall'),
      },
      daily: avgDaily,
      hourly: avgHourly,
    };
  }, []);

  const fetchNational = useCallback(async () => {
    try {
      // Fetch weather for ALL 77 districts
      const allDistrictResults = await Promise.all(
        DISTRICTS.map(d => fetch(buildFullUrl(d.lat, d.lng)).then(r => r.json()).catch(() => null))
      );

      // Group results by province and compute province averages
      const provinceAverages = PROVINCES.map(prov => {
        const provDistrictIndices = DISTRICTS.map((d, i) => d.province === prov.name ? i : -1).filter(i => i >= 0);
        const provResults = provDistrictIndices.map(i => allDistrictResults[i]).filter(r => r !== null);
        return buildAveragedData(provResults);
      }).filter(r => r !== null);

      // National = average of 7 province averages
      if (provinceAverages.length > 0) {
        const nationalAvg = buildAveragedData(provinceAverages);
        if (nationalAvg) setNationalData(nationalAvg);
      }

      // Also fetch major cities for city cards
      const cityPromises = MAJOR_CITIES.map(async (city) => {
        try { const r = await fetch(buildSimpleUrl(city.lat, city.lng)); return { name: city.name, data: await r.json() }; }
        catch { return { name: city.name, data: null }; }
      });
      const cities = await Promise.all(cityPromises);
      const map = {};
      cities.forEach(c => { if (c.data) map[c.name] = c.data; });
      setCityWeathers(map);
    } catch (err) { console.error("Failed to fetch national weather:", err); }
  }, [buildAveragedData]);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    await fetchNational();
    setLastUpdate(new Date());
    setCountdown(300);
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }, [fetchNational]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { fetchAll(true); return 300; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchAll]);

  const loadProvince = useCallback(async (prov) => {
    setSelectedProvince(prov);
    setProvinceLoading(true);
    try {
      // Fetch ALL districts belonging to this province (no slice limit)
      const provDistricts = DISTRICTS.filter(d => d.province === prov.name);
      const results = await Promise.all(
        provDistricts.map(d => fetch(buildFullUrl(d.lat, d.lng)).then(r => r.json()).catch(() => null))
      );
      const validResults = results.filter(r => r !== null);
      const avgData = buildAveragedData(validResults);
      if (avgData) setProvinceData(avgData);
    } catch (err) { console.error("Province fetch error:", err); }
    setProvinceLoading(false);
  }, [buildAveragedData]);

  const loadDistrict = useCallback(async (dist) => {
    setSelectedDistrict(dist);
    setDistrictLoading(true);
    try {
      const res = await fetch(buildFullUrl(dist.lat, dist.lng));
      setDistrictData(await res.json());
    } catch (err) { console.error("District fetch error:", err); }
    setDistrictLoading(false);
  }, []);

  const filteredDistricts = useMemo(() => {
    if (!districtSearch.trim()) return DISTRICTS;
    const q = districtSearch.toLowerCase();
    return DISTRICTS.filter(d => d.name.toLowerCase().includes(q) || d.province.toLowerCase().includes(q));
  }, [districtSearch]);

  const TABS = [
    { id: 'national', label: 'National', icon: <GlobeIcon className="w-3.5 h-3.5" /> },
    { id: 'province', label: 'Provinces', icon: <MapPinIcon className="w-3.5 h-3.5" /> },
    { id: 'district', label: 'Districts', icon: <CompassIcon className="w-3.5 h-3.5" /> },
  ];

  const c = nationalData?.current;
  const d = nationalData?.daily;
  const h = nationalData?.hourly;
  const nowHour = new Date().getHours();

  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Navbar />

      {/* ─── Combined Hero + Tab Bar ─── */}
      <div className="relative" style={{ background: "linear-gradient(135deg, #0c1220 0%, #162544 35%, #1e3a6e 65%, #2563eb 100%)" }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 700px 500px at 80% 20%, rgba(59,130,246,0.15), transparent), radial-gradient(ellipse 400px 300px at 15% 85%, rgba(6,182,212,0.08), transparent)" }} />
        </div>
        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
          {/* Top bar: brand + status */}
          <div className="flex items-center justify-between pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center">
                <CloudIcon className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Nepal Weather Intelligence</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-white/35 tracking-wider uppercase">ECMWF IFS 0.25</span>
                  <span className="text-white/15">|</span>
                  <span className="text-xs font-mono text-white/35 tracking-wider uppercase">Updated every 15 min</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-2 text-xs text-white/35 font-mono">
                <ClockIcon className="w-3 h-3 text-white/30" />
                {lastUpdate ? lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                <span className="text-white/15">|</span>
                <span>{Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</span>
              </div>
              <button onClick={() => fetchAll(true)} disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 border border-white/12 text-xs font-medium text-white/60 hover:bg-white/14 hover:text-white/80 transition-all disabled:opacity-50"
              >
                <RefreshIcon className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Updating' : 'Refresh'}
              </button>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/12 border border-emerald-500/25">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase font-mono">Live</span>
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-0 -mb-px">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold tracking-wide uppercase border-b-2 transition-all ${
                  activeTab === tab.id ? 'text-white border-white/80' : 'text-white/35 border-transparent hover:text-white/60'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />
      </div>

      {/* ─── Loading ─── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
          <p className="text-xs text-gray-500 font-mono tracking-wider uppercase">Fetching weather data</p>
          <div className="w-48 h-0.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: '60%', animation: 'pulse 1.5s ease infinite' }} />
          </div>
        </div>
      )}

      {/* ─── Content ─── */}
      {!loading && (
        <AnimatePresence mode="wait">

          {/* ═══ NATIONAL TAB ═══ */}
          {activeTab === 'national' && c && (
            <motion.div key="national" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

              {/* Hero Banner - current weather */}
              <section className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #1e3a6e 0%, #162544 100%)" }}>
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 500px 350px at 70% 40%, rgba(59,130,246,0.12), transparent)" }} />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#f0f2f5] to-transparent" />
                <div className="relative z-10 max-w-[1600px] mx-auto px-6 lg:px-10 py-8 lg:py-12">
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                    <div className="flex-1">
                      <p className="text-xs font-mono text-white/35 tracking-[3px] uppercase mb-3">Nepal — National Average (All 7 Provinces)</p>
                      <div className="text-6xl lg:text-[88px] font-bold text-white leading-[0.9] tracking-tight mb-1">
                        {Math.round(c.temperature_2m)}<sup className="text-2xl lg:text-3xl text-white/30 font-normal align-super ml-1">C</sup>
                      </div>
                      <p className="text-base lg:text-lg font-medium text-white/70 mb-5">{wcDesc(c.weather_code)}</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "Feels Like", value: `${Math.round(c.apparent_temperature)}C` },
                          { label: "Humidity", value: `${c.relative_humidity_2m}%` },
                          { label: "Visibility", value: `${(c.visibility / 1000).toFixed(1)} km` },
                          { label: "UV Index", value: `${(c.uv_index || 0).toFixed(1)}` },
                          { label: "Wind", value: `${c.wind_speed_10m.toFixed(0)} km/h` },
                          { label: "Pressure", value: `${Math.round(c.pressure_msl)} hPa` },
                        ].map((item, i) => (
                          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
                            className="flex flex-col gap-0.5 px-3.5 py-2 rounded-xl bg-white/6 backdrop-blur-sm border border-white/8 hover:bg-white/10 hover:border-white/15 transition-all cursor-default min-w-[80px]"
                          >
                            <span className="text-sm font-mono font-semibold text-white/90">{item.value}</span>
                            <span className="text-xs text-white/30 uppercase tracking-[1px]">{item.label}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0 hidden lg:block">
                      <SunArc sunrise={d?.sunrise?.[0]} sunset={d?.sunset?.[0]} />
                    </div>
                  </div>
                </div>
              </section>

              <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">

                {/* ─── Visual Weather Cards Grid ─── */}
                <section className="mt-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Current Conditions</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">

                    {/* Temperature Card */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}
                      className="bg-white rounded-2xl border border-gray-200 p-5 hover:-translate-y-0.5 hover:shadow-xl hover:border-gray-300 transition-all duration-300 group"
                    >
                      <div className="text-sm font-semibold text-gray-600 mb-4">Temperature</div>
                      {/* Temperature bar visualization */}
                      <div className="relative h-3 rounded-full overflow-hidden mb-4" style={{ background: 'linear-gradient(90deg, #3b82f6, #06b6d4, #10b981, #f59e0b, #ef4444)' }}>
                        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-lg transition-all duration-700" style={{ left: `${Math.max(2, Math.min(95, ((c.temperature_2m + 10) / 60) * 100))}%` }} />
                      </div>
                      <div className="text-center mb-3">
                        <span className="text-[42px] font-bold text-gray-900 leading-none tracking-tight">{Math.round(c.temperature_2m)}</span>
                        <span className="text-lg text-gray-400 ml-0.5">C</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-700 mb-0.5">
                        {c.temperature_2m === (d?.temperature_2m_max?.[0] || 0) ? 'At peak' : c.temperature_2m > ((d?.temperature_2m_max?.[0] || 0) + (d?.temperature_2m_min?.[0] || 0)) / 2 ? 'Rising' : 'Steady'}
                      </div>
                      <div className="text-xs text-gray-500 leading-relaxed">
                        High of {Math.round(d?.temperature_2m_max?.[0])}C / Low of {Math.round(d?.temperature_2m_min?.[0])}C expected today.
                      </div>
                    </motion.div>

                    {/* Feels Like Card */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
                      className="bg-white rounded-2xl border border-gray-200 p-5 hover:-translate-y-0.5 hover:shadow-xl hover:border-gray-300 transition-all duration-300"
                    >
                      <div className="text-sm font-semibold text-gray-600 mb-4">Feels like</div>
                      {/* Feels-like curved bar */}
                      <div className="flex justify-center mb-3">
                        <svg viewBox="0 0 200 120" className="w-[200px] h-[120px]">
                          <defs>
                            <linearGradient id="feelsGrad" x1="0" x2="1" y1="0" y2="0">
                              <stop offset="0%" stopColor="#ef4444" /><stop offset="50%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#94a3b8" />
                            </linearGradient>
                          </defs>
                          <path d="M 15 105 A 85 85 0 0 1 185 105" stroke="#e5e7eb" strokeWidth="7" fill="none" strokeLinecap="round" />
                          <path d="M 15 105 A 85 85 0 0 1 185 105" stroke="url(#feelsGrad)" strokeWidth="7" fill="none" strokeLinecap="round" />
                          {(() => {
                            const pct = Math.min(1, Math.max(0, (c.apparent_temperature + 10) / 60));
                            const angle = Math.PI * (1 - pct);
                            const cx = 100 + 85 * Math.cos(angle);
                            const cy = 105 - 85 * Math.sin(angle);
                            return <circle cx={cx} cy={cy} r="7" fill="#ef4444" stroke="white" strokeWidth="3" />;
                          })()}
                          <circle cx="15" cy="105" r="3" fill="#d1d5db" /><circle cx="185" cy="105" r="3" fill="#d1d5db" />
                          <line x1="15" y1="105" x2="185" y2="105" stroke="#f1f5f9" strokeWidth="1" />
                        </svg>
                      </div>
                      <div className="text-xs text-gray-500 text-center mb-3">Dominant factor: {c.relative_humidity_2m > 70 ? 'humidity' : c.wind_speed_10m > 20 ? 'wind chill' : 'temperature'}</div>
                      <div className="flex justify-center gap-6">
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Feels like:</div>
                          <span className="text-[28px] font-bold text-gray-900">{Math.round(c.apparent_temperature)}<span className="text-sm text-gray-400">C</span></span>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Temperature:</div>
                          <span className="text-[28px] font-bold text-gray-900">{Math.round(c.temperature_2m)}<span className="text-sm text-gray-400">C</span></span>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-700 mt-2">{c.apparent_temperature >= c.temperature_2m ? 'Comfortable' : 'Cooler'}</div>
                      <div className="text-xs text-gray-500 leading-relaxed">{c.apparent_temperature >= c.temperature_2m ? 'Feels warmer than actual temperature due to humidity.' : 'Wind chill makes it feel cooler.'}</div>
                    </motion.div>

                    {/* Cloud Cover Card */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}
                      className="bg-white rounded-2xl border border-gray-200 p-5 hover:-translate-y-0.5 hover:shadow-xl hover:border-gray-300 transition-all duration-300"
                    >
                      <div className="text-sm font-semibold text-gray-600 mb-3">Cloud cover</div>
                      {/* Circular cloud visualization */}
                      <div className="flex justify-center mb-3">
                        <div className="relative w-[110px] h-[110px]">
                          <svg viewBox="0 0 110 110" className="w-full h-full">
                            <circle cx="55" cy="55" r="48" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                            <circle cx="55" cy="55" r="48" stroke="#94a3b8" strokeWidth="8" fill="none"
                              strokeDasharray={`${(c.cloud_cover / 100) * 301.6} 301.6`}
                              strokeLinecap="round" transform="rotate(-90 55 55)"
                              className="transition-all duration-1000"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <CloudIcon className="w-6 h-6 text-gray-400 mb-0.5" />
                            <span className="text-xs font-medium text-gray-500">{c.cloud_cover > 80 ? 'Cloudy' : c.cloud_cover > 40 ? 'Partial' : 'Clear'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-semibold text-gray-700">Cloudy ({c.cloud_cover}%)</span>
                        <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                          {c.cloud_cover > 80 ? 'Heavy cloud cover. Overcast sky expected.' : c.cloud_cover > 40 ? 'Partly cloudy skies with some sun.' : 'Mostly clear skies with good visibility.'}
                        </div>
                      </div>
                    </motion.div>

                    {/* Precipitation Card */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
                      className="bg-white rounded-2xl border border-gray-200 p-5 hover:-translate-y-0.5 hover:shadow-xl hover:border-gray-300 transition-all duration-300"
                    >
                      <div className="text-sm font-semibold text-gray-600 mb-3">Precipitation</div>
                      {/* Raindrop visualization */}
                      <div className="flex justify-center mb-3">
                        <div className="relative w-[100px] h-[100px]">
                          <svg viewBox="0 0 100 100" className="w-full h-full">
                            <defs>
                              <clipPath id="dropClip">
                                <path d="M50 8 C50 8 20 45 20 65 C20 82 33 95 50 95 C67 95 80 82 80 65 C80 45 50 8 50 8Z" />
                              </clipPath>
                            </defs>
                            <path d="M50 8 C50 8 20 45 20 65 C20 82 33 95 50 95 C67 95 80 82 80 65 C80 45 50 8 50 8Z" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="1.5" />
                            <rect x="0" y={95 - Math.min(87, Math.max(5, (d?.precipitation_sum?.[0] || 0) * 6))} width="100" height="100" fill="#38bdf8" opacity="0.5" clipPath="url(#dropClip)" className="transition-all duration-1000" />
                            <text x="50" y="60" textAnchor="middle" fill="#0369a1" fontSize="18" fontWeight="bold" fontFamily="monospace">{(d?.precipitation_sum?.[0] || 0).toFixed(1)}</text>
                            <text x="50" y="74" textAnchor="middle" fill="#0369a1" fontSize="8" fontFamily="monospace">mm</text>
                            <text x="50" y="86" textAnchor="middle" fill="#7dd3fc" fontSize="7" fontFamily="sans-serif">In next 24h</text>
                          </svg>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-700">{c.precipitation > 0 ? 'Rain' : c.snowfall > 0 ? 'Snow' : 'Dry'}</div>
                      <div className="text-xs text-gray-500 leading-relaxed">
                        {c.precipitation > 0 ? `Currently raining. ${(d?.precipitation_hours?.[0] || 0)} hours of rain expected today.` : 'No precipitation right now.'}
                      </div>
                    </motion.div>

                    {/* Wind Card */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                      className="bg-white rounded-2xl border border-gray-200 p-5 hover:-translate-y-0.5 hover:shadow-xl hover:border-gray-300 transition-all duration-300"
                    >
                      <div className="text-sm font-semibold text-gray-600 mb-3">Wind</div>
                      <div className="flex items-center gap-5">
                        {/* Wind compass */}
                        <div className="flex-shrink-0">
                          <div className="w-[100px] h-[100px] rounded-full border-2 border-gray-200 relative" style={{ background: "radial-gradient(circle, #f0f9ff, #e0f2fe, #f8fafc)" }}>
                            {["N", "E", "S", "W"].map(dir => (
                              <span key={dir} className={`absolute text-xs font-bold font-mono ${dir === 'N' ? 'top-1.5 left-1/2 -translate-x-1/2 text-gray-600' : dir === 'S' ? 'bottom-1.5 left-1/2 -translate-x-1/2 text-gray-400' : dir === 'E' ? 'right-2 top-1/2 -translate-y-1/2 text-gray-400' : 'left-2 top-1/2 -translate-y-1/2 text-gray-400'}`}>{dir}</span>
                            ))}
                            {/* Direction wedge */}
                            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ transform: `rotate(${c.wind_direction_10m}deg)` }}>
                              <path d="M50 14 L58 50 L50 46 L42 50 Z" fill="#3b82f6" opacity="0.7" />
                            </svg>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-blue-500 z-10" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 mb-0.5">From {windDir(c.wind_direction_10m)} ({c.wind_direction_10m})</div>
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-[28px] font-bold text-gray-900">{c.wind_speed_10m.toFixed(0)}</span>
                            <div><span className="text-xs text-gray-500">km/h</span><br/><span className="text-xs text-gray-500">Wind Speed</span></div>
                          </div>
                          <div className="flex items-baseline gap-1 mb-3">
                            <span className="text-[28px] font-bold text-gray-900">{(c.wind_gusts_10m || 0).toFixed(0)}</span>
                            <div><span className="text-xs text-gray-500">km/h</span><br/><span className="text-xs text-gray-500">Wind Gust</span></div>
                          </div>
                          {(() => { const bf = c.wind_speed_10m < 2 ? 0 : c.wind_speed_10m < 6 ? 1 : c.wind_speed_10m < 12 ? 2 : c.wind_speed_10m < 20 ? 3 : c.wind_speed_10m < 29 ? 4 : 5; const bfNames = ['Calm', 'Light Air', 'Light Breeze', 'Gentle Breeze', 'Moderate Breeze', 'Fresh Breeze']; return <div className="text-sm font-semibold text-gray-700">Force: {bf} ({bfNames[bf]})</div>; })()}
                        </div>
                      </div>
                    </motion.div>

                    {/* Humidity Card */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
                      className="bg-white rounded-2xl border border-gray-200 p-5 hover:-translate-y-0.5 hover:shadow-xl hover:border-gray-300 transition-all duration-300"
                    >
                      <div className="text-sm font-semibold text-gray-600 mb-3">Humidity</div>
                      <div className="flex items-center gap-5">
                        {/* Vertical bars visualization */}
                        <div className="flex items-end gap-[3px] h-[80px]">
                          {Array.from({ length: 10 }, (_, i) => {
                            const filled = i < Math.round(c.relative_humidity_2m / 10);
                            return (
                              <div key={i} className="w-[7px] rounded-sm transition-all duration-500" style={{
                                height: `${30 + i * 5}px`,
                                background: filled ? `rgba(59,130,246,${0.4 + i * 0.06})` : '#e5e7eb'
                              }} />
                            );
                          })}
                        </div>
                        <div>
                          <div className="text-[38px] font-bold text-gray-900 leading-none">{c.relative_humidity_2m}<span className="text-lg text-gray-400">%</span></div>
                          <div className="text-xs text-gray-500 mt-0.5">Relative Humidity</div>
                          <div className="flex items-end gap-[2px] h-[32px] mt-3">
                            {Array.from({ length: 8 }, (_, i) => {
                              const dp = parseFloat(dewPoint(c.temperature_2m, c.relative_humidity_2m));
                              const filled = i < Math.round(dp / 5);
                              return <div key={i} className="w-[5px] rounded-sm transition-all" style={{ height: `${12 + i * 2.5}px`, background: filled ? '#60a5fa' : '#e5e7eb' }} />;
                            })}
                          </div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-lg font-bold text-gray-900">{dewPoint(c.temperature_2m, c.relative_humidity_2m)}<span className="text-xs text-gray-500">C</span></span>
                            <span className="text-xs text-gray-500">Dew point</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-700 mt-2">{c.relative_humidity_2m > 80 ? 'High' : c.relative_humidity_2m > 50 ? 'Normal' : 'Low'}</div>
                      <div className="text-xs text-gray-500">{c.relative_humidity_2m > 80 ? 'Muggy conditions.' : 'Comfortable humidity level.'}</div>
                    </motion.div>

                    {/* UV Index Card */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
                      className="bg-white rounded-2xl border border-gray-200 p-5 hover:-translate-y-0.5 hover:shadow-xl hover:border-gray-300 transition-all duration-300"
                    >
                      <div className="text-sm font-semibold text-gray-600 mb-3">UV</div>
                      {/* Arc gauge */}
                      <div className="flex justify-center mb-2">
                        <svg viewBox="0 0 160 100" className="w-[160px] h-[100px]">
                          <defs>
                            <linearGradient id="uvArc" x1="0" x2="1">
                              <stop offset="0%" stopColor="#10b981" /><stop offset="30%" stopColor="#f59e0b" /><stop offset="60%" stopColor="#f97316" /><stop offset="100%" stopColor="#ef4444" />
                            </linearGradient>
                          </defs>
                          <path d="M 15 85 A 65 65 0 0 1 145 85" stroke="#e5e7eb" strokeWidth="12" fill="none" strokeLinecap="round" />
                          <path d="M 15 85 A 65 65 0 0 1 145 85" stroke="url(#uvArc)" strokeWidth="12" fill="none" strokeLinecap="round"
                            strokeDasharray={`${Math.min(204, ((c.uv_index || 0) / 11) * 204)} 204`} />
                          {/* Indicator dot */}
                          {(() => { const pct = Math.min(1, (c.uv_index || 0) / 11); const angle = Math.PI * (1 - pct); const cx = 80 + 65 * Math.cos(angle); const cy = 85 - 65 * Math.sin(angle); return <circle cx={cx} cy={cy} r="5" fill={(c.uv_index || 0) <= 2 ? "#10b981" : (c.uv_index || 0) <= 5 ? "#f59e0b" : "#ef4444"} stroke="white" strokeWidth="2" />; })()}
                          <text x="80" y="78" textAnchor="middle" fill="#1e293b" fontSize="32" fontWeight="bold" fontFamily="system-ui">{Math.round(c.uv_index || 0)}</text>
                        </svg>
                      </div>
                      <div className="text-sm font-semibold text-gray-700">{uvLabel(c.uv_index || 0)}</div>
                      <div className="text-xs text-gray-500 leading-relaxed">
                        Maximum UV exposure for today will be {uvLabel(c.uv_index || 0).toLowerCase()}, expected at {new Date().getHours() < 12 ? '12:00 PM' : `${new Date().getHours()}:00`}.
                      </div>
                    </motion.div>

                    {/* Visibility Card */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30 }}
                      className="bg-white rounded-2xl border border-gray-200 p-5 hover:-translate-y-0.5 hover:shadow-xl hover:border-gray-300 transition-all duration-300"
                    >
                      <div className="text-sm font-semibold text-gray-600 mb-3">Visibility</div>
                      {/* Horizontal bars visualization */}
                      <div className="space-y-2 mb-4">
                        {[100, 85, 70, 50, 30].map((w, i) => {
                          const visKm = (c.visibility || 0) / 1000;
                          const filled = i < Math.min(5, Math.round(visKm / 3));
                          return (
                            <div key={i} className="h-[6px] rounded-full transition-all duration-500" style={{ width: `${w}%`, background: filled ? 'linear-gradient(90deg, #10b981, #059669)' : '#e5e7eb' }} />
                          );
                        })}
                      </div>
                      <div className="text-center mb-3">
                        <span className="text-[38px] font-bold text-gray-900 leading-none">{((c.visibility || 0) / 1000).toFixed(0)}</span>
                        <span className="text-lg text-gray-400 ml-1">km</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-700">
                        {(c.visibility || 0) > 10000 ? 'Excellent' : (c.visibility || 0) > 5000 ? 'Good' : (c.visibility || 0) > 2000 ? 'Moderate' : 'Poor'}
                      </div>
                      <div className="text-xs text-gray-500 leading-relaxed">
                        {(c.visibility || 0) > 10000 ? 'Excellent visibility. Clear conditions.' : (c.visibility || 0) > 5000 ? 'Good visibility expected.' : 'Reduced visibility due to weather.'}
                      </div>
                    </motion.div>

                    {/* Pressure Card */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}
                      className="bg-white rounded-2xl border border-gray-200 p-5 hover:-translate-y-0.5 hover:shadow-xl hover:border-gray-300 transition-all duration-300"
                    >
                      <div className="text-sm font-semibold text-gray-600 mb-3">Pressure</div>
                      {/* Curved pressure gauge */}
                      <div className="flex justify-center mb-3">
                        <svg viewBox="0 0 180 70" className="w-[180px] h-[70px]">
                          <path d="M 10 55 Q 90 -5 170 55" stroke="#e5e7eb" strokeWidth="6" fill="none" strokeLinecap="round" />
                          <path d="M 10 55 Q 90 -5 170 55" stroke="url(#pressGrad)" strokeWidth="6" fill="none" strokeLinecap="round"
                            strokeDasharray={`${Math.min(195, ((c.pressure_msl - 980) / 60) * 195)} 195`} />
                          <defs><linearGradient id="pressGrad" x1="0" x2="1"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#6d28d9" /></linearGradient></defs>
                          {/* Indicator dot */}
                          {(() => { const pct = Math.min(1, Math.max(0, (c.pressure_msl - 980) / 60)); const x = 10 + pct * 160; const y = 55 - 60 * Math.sin(Math.PI * pct); return <circle cx={x} cy={y} r="5" fill="#8b5cf6" stroke="white" strokeWidth="2.5" />; })()}
                        </svg>
                      </div>
                      <div className="text-center">
                        <span className="text-[38px] font-bold text-gray-900 leading-none">{Math.round(c.pressure_msl)}</span>
                        <span className="text-sm text-gray-400 ml-1">mb</span>
                        <div className="text-xs text-gray-500 mt-0.5">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (Now)</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-700 mt-2">
                        {c.pressure_msl > 1020 ? 'High' : c.pressure_msl > 1010 ? 'Normal' : 'Low'}
                      </div>
                      <div className="text-xs text-gray-500 leading-relaxed">
                        {c.pressure_msl > 1020 ? 'High pressure system. Generally fair weather.' : c.pressure_msl > 1010 ? 'Normal atmospheric pressure.' : 'Low pressure. Possible weather changes.'}
                      </div>
                    </motion.div>

                    {/* Sun Card */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
                      className="bg-white rounded-2xl border border-gray-200 p-5 hover:-translate-y-0.5 hover:shadow-xl hover:border-gray-300 transition-all duration-300"
                    >
                      <div className="text-sm font-semibold text-gray-600 mb-2">Sun</div>
                      {/* Sun arc */}
                      <div className="flex justify-center">
                        <svg viewBox="0 0 200 110" className="w-[200px] h-[110px]">
                          {/* Base arc */}
                          <path d="M 20 95 A 80 80 0 0 1 180 95" stroke="#e5e7eb" strokeWidth="5" fill="none" strokeLinecap="round" />
                          {/* Lit portion */}
                          {(() => {
                            const sr = new Date(d?.sunrise?.[0]), ss = new Date(d?.sunset?.[0]);
                            const now = new Date();
                            const pct = Math.max(0, Math.min(1, (now - sr) / (ss - sr)));
                            const litLen = Math.PI * 80 * pct;
                            const totalLen = Math.PI * 80;
                            const isDaytime = now >= sr && now <= ss;
                            // Sun position
                            const sunAngle = Math.PI * (1 - pct);
                            const sunX = 100 + 80 * Math.cos(sunAngle);
                            const sunY = 95 - 80 * Math.sin(sunAngle);
                            const dayH = Math.round((ss - sr) / 3600000);
                            const dayM = Math.round(((ss - sr) % 3600000) / 60000);
                            return (
                              <>
                                <path d="M 20 95 A 80 80 0 0 1 180 95" stroke={isDaytime ? "#ef4444" : "#6b7280"} strokeWidth="5" fill="none" strokeLinecap="round"
                                  strokeDasharray={`${litLen} ${totalLen}`} />
                                <path d="M 20 95 A 80 80 0 0 1 180 95" stroke="#4b5563" strokeWidth="5" fill="none" strokeLinecap="round"
                                  strokeDasharray={`0 ${litLen} ${totalLen}`} />
                                {isDaytime && (
                                  <>
                                    <circle cx={sunX} cy={sunY} r="8" fill="#fbbf24" />
                                    <circle cx={sunX} cy={sunY} r="12" fill="#fbbf24" opacity="0.2" className="animate-pulse" />
                                    <circle cx={sunX} cy={sunY} r="3" fill="white" opacity="0.6" />
                                  </>
                                )}
                                <circle cx="20" cy="95" r="3.5" fill="#d1d5db" stroke="white" strokeWidth="1.5" />
                                <circle cx="180" cy="95" r="3.5" fill="#d1d5db" stroke="white" strokeWidth="1.5" />
                                <line x1="20" y1="95" x2="180" y2="95" stroke="#e5e7eb" strokeWidth="1" />
                                <text x="100" y="106" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="system-ui">{dayH} hrs {dayM} mins</text>
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                      <div className="flex justify-between mt-2 px-2">
                        <div>
                          <span className="text-[22px] font-bold text-gray-900">{formatTime(d?.sunrise?.[0])}</span>
                          <span className="text-xs text-gray-500 ml-1">AM</span>
                          <div className="text-xs text-gray-500">Sunrise</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[22px] font-bold text-gray-900">{formatTime(d?.sunset?.[0])}</span>
                          <span className="text-xs text-gray-500 ml-1">PM</span>
                          <div className="text-xs text-gray-500">Sunset</div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Rain Probability Card */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
                      className="bg-white rounded-2xl border border-gray-200 p-5 hover:-translate-y-0.5 hover:shadow-xl hover:border-gray-300 transition-all duration-300"
                    >
                      <div className="text-sm font-semibold text-gray-600 mb-3">Rain Probability</div>
                      {/* Circular gauge */}
                      <div className="flex justify-center mb-3">
                        <div className="relative w-[100px] h-[100px]">
                          <svg viewBox="0 0 100 100" className="w-full h-full">
                            <circle cx="50" cy="50" r="42" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                            <circle cx="50" cy="50" r="42" stroke={(() => { const p = h?.precipitation_probability?.[nowHour] || 0; return p > 70 ? '#ef4444' : p > 40 ? '#f59e0b' : '#10b981'; })()} strokeWidth="8" fill="none"
                              strokeDasharray={`${((h?.precipitation_probability?.[nowHour] || 0) / 100) * 263.9} 263.9`}
                              strokeLinecap="round" transform="rotate(-90 50 50)" className="transition-all duration-1000" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[24px] font-bold text-gray-900">{h?.precipitation_probability?.[nowHour] || 0}</span>
                            <span className="text-xs text-gray-500">%</span>
                          </div>
                        </div>
                      </div>
                      {/* Hourly probability bars */}
                      <div className="flex items-end gap-[2px] h-[28px] justify-center mb-2">
                        {Array.from({ length: 12 }, (_, i) => {
                          const idx = nowHour + i;
                          const prob = h?.precipitation_probability?.[idx] || 0;
                          return <div key={i} className="w-[8px] rounded-t-sm transition-all" style={{ height: `${Math.max(2, prob * 0.28)}px`, background: prob > 50 ? '#3b82f6' : prob > 20 ? '#93c5fd' : '#e5e7eb' }} />;
                        })}
                      </div>
                      <div className="text-xs text-gray-500 text-center mb-2">Next 12 hours</div>
                      <div className="text-sm font-semibold text-gray-700">{(h?.precipitation_probability?.[nowHour] || 0) > 50 ? 'Likely rain' : 'Low chance'}</div>
                      <div className="text-xs text-gray-500">{d?.precipitation_hours?.[0] || 0} hours of precipitation expected today.</div>
                    </motion.div>

                  </div>
                </section>

                {/* Hourly Forecast - Enhanced */}
                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm mt-5 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Next 24 Hours</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  {/* Temperature curve SVG chart */}
                  {(() => {
                    const hours = [];
                    for (let i = nowHour; i < nowHour + 24 && i < (h?.temperature_2m?.length || 0); i++) hours.push(i);
                    const temps = hours.map(i => h.temperature_2m[i] || 0);
                    const tMin = Math.min(...temps), tMax = Math.max(...temps), tRange = Math.max(tMax - tMin, 1);
                    const W = hours.length * 82, chartH = 80, padT = 28, padB = 0;
                    const points = hours.map((hr, idx) => {
                      const x = idx * 82 + 41;
                      const y = padT + chartH - ((temps[idx] - tMin) / tRange) * chartH;
                      return { x, y, temp: temps[idx], hr };
                    });
                    const linePath = points.map((p, i) => {
                      if (i === 0) return `M ${p.x} ${p.y}`;
                      const prev = points[i - 1];
                      const cpx1 = prev.x + (p.x - prev.x) * 0.4;
                      const cpx2 = p.x - (p.x - prev.x) * 0.4;
                      return `C ${cpx1} ${prev.y} ${cpx2} ${p.y} ${p.x} ${p.y}`;
                    }).join(' ');
                    const areaPath = linePath + ` L ${points[points.length - 1].x} ${padT + chartH + 5} L ${points[0].x} ${padT + chartH + 5} Z`;
                    return (
                      <div className="overflow-x-auto scrollbar-hide relative">
                        <svg width={W} height={padT + chartH + padB + 180} className="block min-w-full">
                          <defs>
                            <linearGradient id="tempLineGrad" x1="0" x2="1"><stop offset="0%" stopColor="#3b82f6" /><stop offset="50%" stopColor="#10b981" /><stop offset="100%" stopColor="#f59e0b" /></linearGradient>
                            <linearGradient id="tempAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" /></linearGradient>
                          </defs>
                          {/* Grid lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
                            <line key={i} x1="0" y1={padT + chartH * (1 - f)} x2={W} y2={padT + chartH * (1 - f)} stroke="#f1f5f9" strokeWidth="1" />
                          ))}
                          {/* Area fill */}
                          <path d={areaPath} fill="url(#tempAreaGrad)" />
                          {/* Temperature curve */}
                          <path d={linePath} fill="none" stroke="url(#tempLineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          {/* Data points and columns */}
                          {points.map((p, idx) => {
                            const isNow = hours[idx] === nowHour;
                            const prob = h.precipitation_probability?.[hours[idx]] || 0;
                            const wc = h.weather_code?.[hours[idx]];
                            const wind = h.wind_speed_10m?.[hours[idx]] || 0;
                            const vis = h.visibility?.[hours[idx]] || 0;
                            return (
                              <g key={idx}>
                                {/* Vertical hover zone */}
                                {isNow && <rect x={p.x - 41} y="0" width="82" height={padT + chartH + padB + 160} fill="#eff6ff" opacity="0.5" />}
                                {/* Dot on curve */}
                                <circle cx={p.x} cy={p.y} r={isNow ? 5 : 3.5} fill={isNow ? '#3b82f6' : 'white'} stroke={isNow ? '#ffffff' : '#3b82f6'} strokeWidth={isNow ? 2.5 : 1.5} />
                                {/* Temp label above dot */}
                                <text x={p.x} y={p.y - 12} textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="bold" fontFamily="system-ui">{Math.round(p.temp)}°</text>
                                {/* Time label */}
                                <text x={p.x} y={padT + chartH + 20} textAnchor="middle" fill={isNow ? '#3b82f6' : '#6b7280'} fontSize="12" fontWeight={isNow ? 'bold' : '500'} fontFamily="monospace">{isNow ? 'Now' : `${hours[idx] % 24}:00`}</text>
                                {/* Weather condition */}
                                <text x={p.x} y={padT + chartH + 37} textAnchor="middle" fill={wc <= 3 ? '#64748b' : wc <= 67 ? '#3b82f6' : '#ef4444'} fontSize="10" fontWeight="500" fontFamily="system-ui">{wcDesc(wc)}</text>
                                {/* Rain probability bar */}
                                <rect x={p.x - 14} y={padT + chartH + 47} width="28" height="5" rx="2.5" fill="#e5e7eb" />
                                <rect x={p.x - 14} y={padT + chartH + 47} width={Math.max(3, prob * 0.28)} height="5" rx="2.5" fill={prob > 50 ? '#3b82f6' : '#93c5fd'} />
                                <text x={p.x} y={padT + chartH + 66} textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="600" fontFamily="monospace">{prob}%</text>
                                {/* Wind speed */}
                                <text x={p.x} y={padT + chartH + 84} textAnchor="middle" fill="#475569" fontSize="11" fontFamily="monospace">{wind.toFixed(0)}</text>
                                <text x={p.x} y={padT + chartH + 96} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="system-ui">km/h</text>
                                {/* Vertical separator */}
                                <line x1={p.x + 41} y1={padT + chartH + 10} x2={p.x + 41} y2={padT + chartH + 95} stroke="#f1f5f9" strokeWidth="1" />
                              </g>
                            );
                          })}
                          {/* Row labels on the left */}
                          <rect x="0" y={padT + chartH + 40} width={W} height="1" fill="#f1f5f9" />
                          <rect x="0" y={padT + chartH + 68} width={W} height="1" fill="#f1f5f9" />
                        </svg>
                        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent pointer-events-none" />
                      </div>
                    );
                  })()}
                </section>

                {/* City Cards */}
                <section className="mt-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Major Cities</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {MAJOR_CITIES.map((city, idx) => {
                      const cw = cityWeathers[city.name]?.current;
                      return (
                        <motion.div key={city.name} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: idx * 0.04 }}
                          className="relative bg-white rounded-2xl border border-gray-200 p-4 overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:border-gray-300 transition-all duration-300 cursor-default"
                        >
                          <div className="absolute top-0 left-0 right-0 h-[3px] transition-all group-hover:h-1" style={{ background: city.accent }} />
                          <div className="text-sm font-bold text-gray-900 mb-0.5">{city.name}</div>
                          <div className="text-xs font-mono text-gray-400 tracking-wider uppercase mb-3">{city.province}</div>
                          {cw ? (
                            <>
                              <div className="text-[28px] font-bold text-gray-900 leading-none mb-1">{Math.round(cw.temperature_2m)}<span className="text-sm font-normal text-gray-300 ml-0.5">C</span></div>
                              <div className={`text-xs font-medium ${wcTextColor(cw.weather_code)}`}>{wcDesc(cw.weather_code)}</div>
                              <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-gray-100">
                                <span className="text-xs text-gray-500 flex items-center gap-0.5"><DropletIcon className="w-3 h-3" />{cw.relative_humidity_2m}%</span>
                                <span className="text-xs text-gray-500 flex items-center gap-0.5"><WindIcon className="w-3 h-3" />{cw.wind_speed_10m?.toFixed(0)} km/h</span>
                              </div>
                            </>
                          ) : (
                            <div className="space-y-2"><div className="h-8 w-16 bg-gray-100 rounded animate-pulse" /><div className="h-3 w-20 bg-gray-100 rounded animate-pulse" /></div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </section>

                {/* Nepal Map */}
                <section className="mt-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Nepal Weather Map</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <WeatherMap mapId="national-map" className="h-[480px] hover:shadow-xl transition-shadow duration-300" />
                </section>

                {/* 7-Day Forecast - Enhanced Card Design */}
                <section className="mt-5 pb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">7-Day Forecast</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {d?.temperature_2m_min && (() => {
                    const allMin = [], allMax = [];
                    for (let i = 0; i < 7; i++) { allMin.push(d.temperature_2m_min[i] || 0); allMax.push(d.temperature_2m_max[i] || 0); }
                    const absMin = Math.min(...allMin), absMax = Math.max(...allMax), absRange = Math.max(absMax - absMin, 1);

                    return (
                      <>
                        {/* Temperature range chart spanning all 7 days */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-3.5 overflow-hidden">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Temperature Range</div>
                          {(() => {
                            const svgW = 900, chartTop = 25, chartBH = 90, padL = 50, padR = 50;
                            const spacing = (svgW - padL - padR) / 6;
                            const getX = (i) => padL + i * spacing;
                            const getMaxY = (i) => chartTop + chartBH - ((allMax[i] - absMin) / absRange) * chartBH;
                            const getMinY = (i) => chartTop + chartBH - ((allMin[i] - absMin) / absRange) * chartBH;
                            const buildSmooth = (pts) => pts.map((p, i) => {
                              if (i === 0) return `M ${p.x} ${p.y}`;
                              const prev = pts[i - 1];
                              const dx = (p.x - prev.x) * 0.35;
                              return `C ${prev.x + dx} ${prev.y} ${p.x - dx} ${p.y} ${p.x} ${p.y}`;
                            }).join(' ');
                            const maxPts = Array.from({ length: 7 }, (_, i) => ({ x: getX(i), y: getMaxY(i) }));
                            const minPts = Array.from({ length: 7 }, (_, i) => ({ x: getX(i), y: getMinY(i) }));
                            const maxPath = buildSmooth(maxPts);
                            const minRevPath = buildSmooth([...minPts].reverse());
                            const areaPath = `${maxPath} L ${minPts[6].x} ${minPts[6].y} ${minRevPath.replace('M', 'L')} Z`;
                            // Y-axis labels
                            const ySteps = 5;
                            const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
                              const temp = absMin + (absRange * i / ySteps);
                              const y = chartTop + chartBH - (i / ySteps) * chartBH;
                              return { temp: Math.round(temp), y };
                            });

                            return (
                              <svg viewBox={`0 0 ${svgW} 155`} className="w-full h-[155px]">
                                <defs>
                                  <linearGradient id="maxLineG" x1="0" x2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#ef4444" /></linearGradient>
                                  <linearGradient id="minLineG" x1="0" x2="1"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient>
                                  <linearGradient id="rangeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.1" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.06" /></linearGradient>
                                </defs>
                                {/* Y-axis grid lines & labels */}
                                {yLabels.map((yl, i) => (
                                  <g key={`yg${i}`}>
                                    <line x1={padL - 10} y1={yl.y} x2={svgW - padR + 10} y2={yl.y} stroke="#f1f5f9" strokeWidth="1" />
                                    <text x={padL - 16} y={yl.y + 4} textAnchor="end" fill="#cbd5e1" fontSize="10" fontFamily="monospace">{yl.temp}°</text>
                                  </g>
                                ))}
                                {/* Area fill */}
                                <path d={areaPath} fill="url(#rangeFill)" />
                                {/* Max line */}
                                <path d={maxPath} fill="none" stroke="url(#maxLineG)" strokeWidth="2.5" strokeLinecap="round" />
                                {maxPts.map((p, i) => (
                                  <g key={`mx${i}`}>
                                    <circle cx={p.x} cy={p.y} r="5" fill="#f59e0b" stroke="white" strokeWidth="2.5" />
                                    <text x={p.x} y={p.y - 12} textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="bold" fontFamily="system-ui">{Math.round(allMax[i])}°</text>
                                  </g>
                                ))}
                                {/* Min line */}
                                <path d={buildSmooth(minPts)} fill="none" stroke="url(#minLineG)" strokeWidth="2.5" strokeLinecap="round" />
                                {minPts.map((p, i) => (
                                  <g key={`mn${i}`}>
                                    <circle cx={p.x} cy={p.y} r="5" fill="#3b82f6" stroke="white" strokeWidth="2.5" />
                                    <text x={p.x} y={p.y + 18} textAnchor="middle" fill="#3b82f6" fontSize="13" fontWeight="bold" fontFamily="system-ui">{Math.round(allMin[i])}°</text>
                                  </g>
                                ))}
                                {/* Day labels */}
                                {Array.from({ length: 7 }, (_, i) => (
                                  <text key={`dl${i}`} x={getX(i)} y="150" textAnchor="middle" fill={i === 0 ? '#1e293b' : '#6b7280'} fontSize="12" fontWeight={i === 0 ? 'bold' : '500'} fontFamily="system-ui">{dayName(i)}</text>
                                ))}
                              </svg>
                            );
                          })()}
                          <div className="flex items-center justify-center gap-6 mt-2">
                            <div className="flex items-center gap-1.5"><div className="w-3 h-[3px] rounded-full bg-amber-500" /><span className="text-xs text-gray-500">High</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-[3px] rounded-full bg-blue-500" /><span className="text-xs text-gray-500">Low</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gradient-to-b from-amber-100 to-blue-100 border border-gray-200" /><span className="text-xs text-gray-500">Range</span></div>
                          </div>
                        </div>

                        {/* Day cards grid */}
                        <div className="grid grid-cols-7 gap-2.5">
                          {Array.from({ length: 7 }, (_, i) => {
                            const mn = d.temperature_2m_min[i] || 0, mx = d.temperature_2m_max[i] || 0;
                            const precipProb = d.precipitation_probability_max?.[i] || 0;
                            const precipSum = d.precipitation_sum?.[i] || 0;
                            const windMax = d.wind_speed_10m_max?.[i] || 0;
                            const wc = d.weather_code?.[i];
                            const isToday = i === 0;
                            const uvMax = d.uv_index_max?.[i] || 0;
                            // Temperature range bar
                            const leftPct = ((mn - absMin) / absRange) * 100;
                            const widthPct = Math.max(12, ((mx - mn) / absRange) * 100);
                            let barGrad = "linear-gradient(90deg, #3b82f6, #10b981)";
                            if (mx > 32) barGrad = "linear-gradient(90deg, #f59e0b, #ef4444)";
                            else if (mx > 25) barGrad = "linear-gradient(90deg, #10b981, #f59e0b)";
                            else if (mx < 10) barGrad = "linear-gradient(90deg, #93c5fd, #3b82f6)";

                            return (
                              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className={`relative bg-white rounded-2xl border p-4 overflow-hidden group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-default ${isToday ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}
                              >
                                {isToday && <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 to-cyan-500" />}
                                {/* Day name */}
                                <div className="text-center mb-3">
                                  <div className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>{dayName(i)}</div>
                                  <div className="text-xs text-gray-500 font-mono mt-0.5">{(() => { const dd = new Date(); dd.setDate(dd.getDate() + i); return `${dd.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dd.getMonth()]}`; })()}</div>
                                </div>

                                {/* Weather condition - circular badge */}
                                <div className="flex justify-center mb-3">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${wc <= 2 ? 'bg-amber-50' : wc <= 3 ? 'bg-gray-100' : wc <= 67 ? 'bg-blue-50' : wc <= 77 ? 'bg-sky-50' : 'bg-red-50'}`}>
                                    {wc <= 2 ? (
                                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-amber-400" fill="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M18.36 5.64l1.41-1.41" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
                                    ) : wc <= 49 ? (
                                      <CloudIcon className={`w-6 h-6 ${wc <= 3 ? 'text-gray-400' : 'text-gray-500'}`} />
                                    ) : wc <= 67 ? (
                                      <DropletIcon className="w-6 h-6 text-blue-400" />
                                    ) : wc <= 77 ? (
                                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="8" y1="20" x2="8.01" y2="20"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="12" y1="22" x2="12.01" y2="22"/><line x1="16" y1="16" x2="16.01" y2="16"/><line x1="16" y1="20" x2="16.01" y2="20"/></svg>
                                    ) : (
                                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>
                                    )}
                                  </div>
                                </div>
                                <div className={`text-xs font-medium text-center mb-3 ${wcTextColor(wc)}`}>{wcDesc(wc)}</div>

                                {/* Temperature high/low */}
                                <div className="flex justify-center gap-2 mb-2.5">
                                  <span className="text-[18px] font-bold text-amber-500">{Math.round(mx)}°</span>
                                  <span className="text-[18px] font-bold text-blue-400">{Math.round(mn)}°</span>
                                </div>

                                {/* Temperature range bar */}
                                <div className="h-[5px] bg-gray-100 rounded-full relative overflow-hidden mb-4">
                                  <motion.div className="absolute h-full rounded-full" style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: barGrad }} initial={{ width: 0 }} animate={{ width: `${widthPct}%` }} transition={{ duration: 0.6, delay: 0.1 + i * 0.05 }} />
                                </div>

                                {/* Mini metrics */}
                                <div className="space-y-2">
                                  {/* Precipitation */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      <DropletIcon className="w-3 h-3 text-blue-400" />
                                      <span className="text-xs text-gray-500">Rain</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-[40px] h-[3px] bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${Math.min(100, precipProb)}%` }} />
                                      </div>
                                      <span className="text-xs font-mono font-semibold text-blue-500 w-7 text-right">{precipProb}%</span>
                                    </div>
                                  </div>
                                  {/* Wind */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      <WindIcon className="w-3 h-3 text-teal-400" />
                                      <span className="text-xs text-gray-500">Wind</span>
                                    </div>
                                    <span className="text-xs font-mono font-semibold text-gray-600">{Math.round(windMax)}<span className="text-xs text-gray-500 ml-0.5">km/h</span></span>
                                  </div>
                                  {/* UV */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      <GaugeIcon className="w-3 h-3 text-amber-400" />
                                      <span className="text-xs text-gray-500">UV</span>
                                    </div>
                                    <span className="text-xs font-mono font-semibold text-gray-600">{uvMax.toFixed(0)}<span className="text-xs text-gray-500 ml-0.5">/11</span></span>
                                  </div>
                                  {/* Precipitation amount */}
                                  {precipSum > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-500">Total rain</span>
                                      <span className="text-xs font-mono font-semibold text-blue-500">{precipSum.toFixed(1)}<span className="text-xs text-gray-500 ml-0.5">mm</span></span>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </section>
                {/* Bottom spacer */}
                <div className="h-4 bg-[#f0f2f5]" />
              </div>
            </motion.div>
          )}

          {/* ═══ PROVINCE TAB ═══ */}
          {activeTab === 'province' && (
            <motion.div key="province" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[1600px] mx-auto flex min-h-[calc(100vh-140px)]">
              {/* Sidebar */}
              <div className="w-[280px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-4 py-3 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900">Provinces</h3>
                  <p className="text-sm text-gray-500 mt-0.5">7 provinces -- averaged from districts</p>
                </div>
                {PROVINCES.map(prov => (
                  <button key={prov.id} onClick={() => loadProvince(prov)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-all text-left group ${
                      selectedProvince?.id === prov.id ? 'bg-blue-50/70 border-l-[3px] border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: prov.color }} />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{prov.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Capital: {prov.capital}</div>
                        <div className="text-xs text-gray-400">{DISTRICTS.filter(dd => dd.province === prov.name).length} districts</div>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
                  </button>
                ))}
              </div>

              {/* Main area */}
              <div className="flex-1 overflow-y-auto bg-[#f0f2f5]">
                {/* Province Map - always visible */}
                <div className="px-5 pt-5">
                  <div className="relative">
                    <WeatherMap mapId="province-map" onProvinceClick={loadProvince} selectedItem={selectedProvince} selectionType="province" showAllProvinces={true} className="h-[420px]" />
                    {/* Province legend overlay */}
                    {!selectedProvince && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg px-4 py-3"
                      >
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Select a Province</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          {PROVINCES.map(p => (
                            <button key={p.id} onClick={() => loadProvince(p)} className="flex items-center gap-2 text-left hover:bg-gray-50 rounded px-1.5 py-1 transition-colors">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm" style={{ background: p.color }} />
                              <span className="text-xs font-medium text-gray-700">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    {selectedProvince && !provinceLoading && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute top-4 right-4 z-[500] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg px-4 py-3 flex items-center gap-3"
                      >
                        <div className="w-3 h-3 rounded-full ring-2 ring-white shadow-sm" style={{ background: selectedProvince.color }} />
                        <div>
                          <div className="text-sm font-bold text-gray-900">{selectedProvince.name} Province</div>
                          <div className="text-xs text-gray-500">{DISTRICTS.filter(dd => dd.province === selectedProvince.name).length} districts | Capital: {selectedProvince.capital}</div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {provinceLoading && (
                  <div className="flex flex-col items-center justify-center gap-4 py-16">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center"><div className="w-4 h-4 rounded-full bg-blue-100" /></div>
                    </div>
                    <p className="text-xs text-gray-500 font-mono tracking-wider uppercase">Averaging district data</p>
                  </div>
                )}

                {!selectedProvince && !provinceLoading && (
                  <div className="px-5 pt-5 pb-6">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Province Quick Overview</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {PROVINCES.map((prov, idx) => (
                        <motion.button
                          key={prov.id}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => loadProvince(prov)}
                          className="relative bg-white rounded-2xl border border-gray-200 p-4 text-left overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:border-gray-300 transition-all duration-300"
                        >
                          <div className="absolute top-0 left-0 right-0 h-[3px] transition-all group-hover:h-1.5" style={{ background: prov.color }} />
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${prov.color}15`, border: `1px solid ${prov.color}30` }}>
                              <span className="text-sm font-bold" style={{ color: prov.color }}>{prov.id}</span>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{prov.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">Capital: {prov.capital}</div>
                              <div className="text-xs text-gray-400">{DISTRICTS.filter(dd => dd.province === prov.name).length} districts</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mt-3 text-xs font-medium group-hover:translate-x-1 transition-transform" style={{ color: prov.color }}>
                            View weather data <ChevronRightIcon className="w-3 h-3" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProvince && !provinceLoading && provinceData && (
                  <WeatherDetail
                    data={provinceData.current}
                    daily={provinceData.daily}
                    hourly={provinceData.hourly}
                    title={`${selectedProvince.name} Province`}
                    subtitle={`${DISTRICTS.filter(dd => dd.province === selectedProvince.name).length} districts averaged`}
                    onClose={() => { setSelectedProvince(null); setProvinceData(null); }}
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ DISTRICT TAB ═══ */}
          {activeTab === 'district' && (
            <motion.div key="district" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[1600px] mx-auto flex min-h-[calc(100vh-140px)]">
              {/* Sidebar */}
              <div className="w-[280px] flex-shrink-0 bg-white border-r border-gray-200 overflow-hidden flex flex-col">
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 p-3 border-b border-gray-100">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                    <input type="text" placeholder="Search district..." value={districtSearch} onChange={(e) => setDistrictSearch(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 px-0.5 font-mono">{filteredDistricts.length} of {DISTRICTS.length} districts</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredDistricts.map(dist => {
                    const provColor = PROVINCE_COLORS[dist.province] || "#6b7280";
                    return (
                      <button key={dist.name} onClick={() => loadDistrict(dist)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-all text-left ${
                          selectedDistrict?.name === dist.name ? 'bg-blue-50/70 border-l-[3px] border-l-blue-500' : ''
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{dist.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: provColor }} />
                            {dist.province}
                          </div>
                        </div>
                        <ChevronRightIcon className="w-3.5 h-3.5 text-gray-300" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main area */}
              <div className="flex-1 overflow-y-auto bg-[#f0f2f5]">
                {/* District Map - always visible */}
                <div className="px-5 pt-5">
                  <div className="relative">
                    <WeatherMap mapId="district-map" onDistrictClick={loadDistrict} selectedItem={selectedDistrict} selectionType="district" showAllProvinces={true} className="h-[420px]" />
                    {!selectedDistrict && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg px-4 py-3"
                      >
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Click any district on the map</div>
                        <div className="flex flex-wrap gap-2">
                          {PROVINCES.map(p => (
                            <div key={p.id} className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                              <span className="text-xs text-gray-500">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    {selectedDistrict && !districtLoading && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute top-4 right-4 z-[500] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg px-4 py-3 flex items-center gap-3"
                      >
                        <div className="w-3 h-3 rounded-full ring-2 ring-white shadow-sm" style={{ background: PROVINCE_COLORS[selectedDistrict.province] || '#3b82f6' }} />
                        <div>
                          <div className="text-sm font-bold text-gray-900">{selectedDistrict.name}</div>
                          <div className="text-xs text-gray-500">{selectedDistrict.province} Province</div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {districtLoading && (
                  <div className="flex flex-col items-center justify-center gap-4 py-16">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center"><div className="w-4 h-4 rounded-full bg-blue-100" /></div>
                    </div>
                    <p className="text-xs text-gray-500 font-mono tracking-wider uppercase">Loading weather data</p>
                  </div>
                )}

                {!selectedDistrict && !districtLoading && (
                  <div className="px-5 pt-5 pb-6">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Districts by Province</div>
                    {PROVINCES.map((prov, pIdx) => {
                      const provDistricts = DISTRICTS.filter(d => d.province === prov.name);
                      return (
                        <motion.div key={prov.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pIdx * 0.04 }} className="mb-4 last:mb-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: prov.color }} />
                            <span className="text-sm font-bold text-gray-800">{prov.name}</span>
                            <span className="text-xs text-gray-500">{provDistricts.length} districts</span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                            {provDistricts.map((dist, dIdx) => (
                              <button
                                key={dist.name}
                                onClick={() => loadDistrict(dist)}
                                className="relative bg-white rounded-xl border border-gray-200 px-3 py-2.5 text-left overflow-hidden group hover:-translate-y-0.5 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
                              >
                                <div className="absolute top-0 left-0 right-0 h-[2px] opacity-70 group-hover:opacity-100 transition-opacity" style={{ background: prov.color }} />
                                <div className="text-sm font-semibold text-gray-900">{dist.name}</div>
                                <div className="flex items-center gap-1 mt-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: prov.color }}>
                                  View weather <ChevronRightIcon className="w-2.5 h-2.5" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {selectedDistrict && !districtLoading && districtData && (
                  <WeatherDetail
                    data={districtData.current}
                    daily={districtData.daily}
                    hourly={districtData.hourly}
                    title={selectedDistrict.name}
                    subtitle={`${selectedDistrict.province} Province`}
                    onClose={() => { setSelectedDistrict(null); setDistrictData(null); }}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Custom tooltip styles */}
      <style>{`
        .weather-district-tooltip {
          background: rgba(255,255,255,0.97) !important;
          border: 1px solid rgba(0,0,0,0.08) !important;
          border-radius: 10px !important;
          padding: 8px 12px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
          font-family: Inter, system-ui, sans-serif !important;
        }
        .weather-district-tooltip::before {
          border-top-color: rgba(255,255,255,0.97) !important;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes capitalPulse {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes capitalBounce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-3px); }
          50% { transform: translateY(0); }
          75% { transform: translateY(-1.5px); }
        }
        .leaflet-control-zoom { display: none !important; }
      `}</style>
    </div>
  );
}
