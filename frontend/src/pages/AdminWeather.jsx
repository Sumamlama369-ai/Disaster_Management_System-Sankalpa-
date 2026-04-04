import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import SankalpaLogo from '../logo/FYP_Logo.png';

// Helper: load image as base64 for jsPDF
const loadImageAsBase64 = (src) => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    resolve(canvas.toDataURL('image/png'));
  };
  img.onerror = () => resolve(null);
  img.src = src;
});
import Navbar from '../components/Navbar';
import nepalBorderData from '../data/map.json';

// ─── SVG Icons ──────────────────────────────────────────────────
const MapIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
);
const ChartIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
);
const AlertIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
);
const LayersIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
);
const CrosshairIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
);
const DropletIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
);
const MountainIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l4 8 5-5 7 14H0z"/></svg>
);
const WindIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
);
const ShieldIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);

// ─── Nepal Districts ─────────────────────────────────────────────
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

// ─── River basins (major flood-prone river systems with accurate paths) ──
const RIVER_BASINS = [
  { id: 'koshi', name: "Koshi River Basin", coords: [
    [27.78, 87.08], [27.55, 87.17], [27.30, 87.15], [27.05, 87.05], [26.90, 86.95],
    [26.75, 86.92], [26.62, 86.93], [26.52, 86.90], [26.52, 86.72], [26.53, 86.55],
    [26.54, 86.40], [26.62, 86.50], [26.72, 86.62], [26.80, 86.73], [26.86, 86.92],
  ], color: '#3b82f6', risk: 'high', desc: 'Largest river system in eastern Nepal — high flood risk in Terai' },
  { id: 'narayani', name: "Narayani/Gandaki Basin", coords: [
    [28.60, 84.43], [28.40, 84.38], [28.22, 84.35], [28.00, 84.33], [27.80, 84.30],
    [27.62, 84.35], [27.52, 84.43], [27.42, 84.48], [27.30, 84.55], [27.20, 84.60],
    [27.08, 84.62], [26.95, 84.58], [26.85, 84.50],
  ], color: '#6366f1', risk: 'high', desc: 'Central Nepal major river — feeds Chitwan & Nawalparasi floodplains' },
  { id: 'karnali', name: "Karnali River Basin", coords: [
    [29.95, 81.82], [29.70, 81.75], [29.50, 81.60], [29.30, 81.55], [29.10, 81.60],
    [28.95, 81.55], [28.80, 81.50], [28.60, 81.48], [28.40, 81.45], [28.20, 81.40],
    [28.05, 81.38], [27.95, 81.35],
  ], color: '#8b5cf6', risk: 'medium', desc: 'Longest river in Nepal — western Nepal flood corridor' },
  { id: 'bagmati', name: "Bagmati River Basin", coords: [
    [27.80, 85.40], [27.72, 85.35], [27.68, 85.30], [27.65, 85.28], [27.60, 85.25],
    [27.52, 85.18], [27.45, 85.10], [27.38, 85.02], [27.30, 84.95], [27.20, 84.88],
    [27.10, 84.82], [27.02, 84.78],
  ], color: '#0ea5e9', risk: 'high', desc: 'Flows through Kathmandu Valley — urban flood risk zone' },
  { id: 'rapti', name: "Rapti River Basin", coords: [
    [28.30, 82.65], [28.15, 82.55], [28.05, 82.40], [27.95, 82.30], [27.85, 82.20],
    [27.75, 82.15], [27.65, 82.55], [27.60, 82.80], [27.55, 83.15], [27.52, 83.40],
  ], color: '#14b8a6', risk: 'medium', desc: 'Mid-western Nepal — Dang & Banke flood plain' },
  { id: 'mahakali', name: "Mahakali River Basin", coords: [
    [29.85, 80.55], [29.65, 80.48], [29.45, 80.42], [29.25, 80.35], [29.05, 80.30],
    [28.97, 80.18], [28.90, 80.13], [28.80, 80.10],
  ], color: '#f59e0b', risk: 'low', desc: 'Nepal-India border river — far-western flood zone' },
  { id: 'kankai', name: "Kankai River", coords: [
    [27.10, 87.90], [26.95, 87.85], [26.80, 87.80], [26.65, 87.75], [26.55, 87.65],
  ], color: '#f97316', risk: 'medium', desc: 'Eastern Terai — Jhapa & Ilam flood corridor' },
];

// ─── Tile layers ─────────────────────────────────────────────────
const TILE_LAYERS = {
  positron:  { name: 'Positron',   url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attribution: '&copy; CartoDB' },
  street:    { name: 'Street',     url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap' },
  satellite: { name: 'Satellite',  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri' },
  terrain:   { name: 'Terrain',    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenTopoMap' },
  dark:      { name: 'Dark',       url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; CartoDB' },
};

// ─── Weather API ─────────────────────────────────────────────────
const API_BASE = "https://api.open-meteo.com/v1/forecast";

function buildWeatherUrl(lat, lng) {
  return `${API_BASE}?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,cloud_cover&timezone=Asia%2FKathmandu&models=ecmwf_ifs025`;
}

// ─── Risk calculation helpers (threshold-aware) ─────────────────
function classifyFloodRisk(precip, humidity, elevation, t) {
  const isLowland = elevation < (t?.lowlandElevation ?? 500);
  if (precip > (t?.precipCritical ?? 20) || (precip > (t?.precipComboCritical ?? 10) && humidity > (t?.humidityCritical ?? 85) && isLowland)) return 'critical';
  if (precip > (t?.precipHigh ?? 10) || (precip > (t?.precipComboHigh ?? 5) && humidity > (t?.humidityHigh ?? 80))) return 'high';
  if (precip > (t?.precipModerate ?? 3) || humidity > (t?.humidityModerate ?? 75)) return 'moderate';
  return 'low';
}

function classifyLandslideRisk(precip, humidity, elevation, t) {
  const isHilly = elevation >= (t?.hillyMin ?? 500) && elevation < (t?.hillyMax ?? 3000);
  if (precip > (t?.precipCritical ?? 15) && isHilly) return 'critical';
  if ((precip > (t?.precipHigh ?? 8) && isHilly) || precip > (t?.precipHighAny ?? 20)) return 'high';
  if (precip > (t?.precipModerate ?? 5) && elevation > (t?.moderateElevation ?? 300)) return 'moderate';
  return 'low';
}

function classifyStormRisk(windSpeed, windGusts, weatherCode, t) {
  if (windGusts > (t?.gustsCritical ?? 60) || weatherCode >= (t?.weatherCodeCritical ?? 95)) return 'critical';
  if (windGusts > (t?.gustsHigh ?? 40) || windSpeed > (t?.windHigh ?? 30) || weatherCode >= (t?.weatherCodeHigh ?? 80)) return 'high';
  if (windGusts > (t?.gustsModerate ?? 25) || windSpeed > (t?.windModerate ?? 20)) return 'moderate';
  return 'low';
}

function getOverallRisk(flood, landslide, storm) {
  const levels = { critical: 4, high: 3, moderate: 2, low: 1 };
  const max = Math.max(levels[flood], levels[landslide], levels[storm]);
  return ['low', 'low', 'moderate', 'high', 'critical'][max];
}

// Approximate elevation from lat (Nepal: Terai ~100m, Hills ~1500m, Mountains ~3500m+)
function estimateElevation(lat) {
  if (lat < 27.0) return 150;
  if (lat < 27.5) return 500;
  if (lat < 28.0) return 1200;
  if (lat < 28.5) return 2000;
  if (lat < 29.0) return 3000;
  return 4000;
}

const RISK_COLORS = {
  critical: { bg: '#dc2626', fill: 'rgba(220,38,38,0.35)', border: '#dc2626', text: '#dc2626', label: 'Critical' },
  high:     { bg: '#f97316', fill: 'rgba(249,115,22,0.30)', border: '#f97316', text: '#f97316', label: 'High' },
  moderate: { bg: '#f59e0b', fill: 'rgba(245,158,11,0.25)', border: '#eab308', text: '#d97706', label: 'Moderate' },
  low:      { bg: '#22c55e', fill: 'rgba(34,197,94,0.15)', border: '#22c55e', text: '#16a34a', label: 'Safe' },
};

// CSS animations for radar markers
if (typeof document !== 'undefined' && !document.getElementById('admin-weather-pulse-css')) {
  const style = document.createElement('style');
  style.id = 'admin-weather-pulse-css';
  style.textContent = `
    @keyframes riskRadar { 0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0.7; } 100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; } }
    @keyframes riskGlow { 0%, 100% { box-shadow: 0 0 6px var(--glow-color, rgba(220,38,38,0.5)); } 50% { box-shadow: 0 0 18px var(--glow-color, rgba(220,38,38,0.8)); } }
  `;
  document.head.appendChild(style);
}

function createRiskMarkerIcon(riskLevel) {
  const rc = RISK_COLORS[riskLevel] || RISK_COLORS.low;
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;top:50%;left:50%;width:28px;height:28px;border:2px solid ${rc.bg};border-radius:50%;animation:riskRadar 2s ease-out infinite;"></div>
      <div style="position:absolute;top:50%;left:50%;width:28px;height:28px;border:2px solid ${rc.bg};border-radius:50%;animation:riskRadar 2s ease-out 1s infinite;"></div>
      <div style="position:relative;z-index:2;width:16px;height:16px;background:${rc.bg};border-radius:50%;border:2.5px solid #fff;--glow-color:${rc.bg}80;animation:riskGlow 2s ease-in-out infinite;"></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// ─── Default Thresholds ─────────────────────────────────────────
const DEFAULT_THRESHOLDS = {
  // Disaster Risk Map thresholds
  flood: {
    precipCritical: 20,       // mm - precip above this => critical
    precipHigh: 10,           // mm
    precipModerate: 3,        // mm
    humidityCritical: 85,     // % - combined with precip+lowland
    humidityHigh: 80,         // %
    humidityModerate: 75,     // %
    precipComboCritical: 10,  // mm - precip threshold for combo check
    precipComboHigh: 5,       // mm
    lowlandElevation: 500,    // meters - below this = lowland
  },
  landslide: {
    precipCritical: 15,       // mm - precip above this (hilly) => critical
    precipHigh: 8,            // mm - hilly terrain
    precipHighAny: 20,        // mm - any terrain
    precipModerate: 5,        // mm
    hillyMin: 500,            // meters - hilly terrain lower bound
    hillyMax: 3000,           // meters - hilly terrain upper bound
    moderateElevation: 300,   // meters - moderate threshold elevation
  },
  storm: {
    gustsCritical: 60,        // km/h
    gustsHigh: 40,            // km/h
    gustsModerate: 25,        // km/h
    windHigh: 30,             // km/h
    windModerate: 20,         // km/h
    weatherCodeCritical: 95,  // severe thunderstorm
    weatherCodeHigh: 80,      // heavy showers
  },
  // Drone Flight thresholds
  flight: {
    windSafe: 15,             // km/h
    windCaution: 25,          // km/h
    windDanger: 38,           // km/h
    gustsSafe: 20,            // km/h
    gustsCaution: 35,         // km/h
    gustsDanger: 50,          // km/h
    visibilitySafe: 5000,     // meters
    visibilityCaution: 2000,  // meters
    visibilityDanger: 1000,   // meters
    precipSafe: 0.2,          // mm
    precipCaution: 2,         // mm
    precipDanger: 5,          // mm
    tempMin: -10,             // °C
    tempMax: 45,              // °C
    cloudSafe: 60,            // %
    cloudCaution: 85,         // %
    cloudDanger: 95,          // %
  },
};

function loadThresholds() {
  try {
    const saved = localStorage.getItem('admin_weather_thresholds');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Deep merge with defaults to handle new keys
      return {
        flood: { ...DEFAULT_THRESHOLDS.flood, ...parsed.flood },
        landslide: { ...DEFAULT_THRESHOLDS.landslide, ...parsed.landslide },
        storm: { ...DEFAULT_THRESHOLDS.storm, ...parsed.storm },
        flight: { ...DEFAULT_THRESHOLDS.flight, ...parsed.flight },
      };
    }
  } catch {}
  return { ...DEFAULT_THRESHOLDS };
}

// ─── Seasonal Analytics Constants ────────────────────────────────
const ARCHIVE_BASE = "https://archive-api.open-meteo.com/v1/archive";

const NEPAL_SEASONS = [
  { id: 'pre-monsoon', label: 'Pre-Monsoon', months: [3, 4, 5], color: '#f59e0b', gradient: ['#fbbf24', '#f59e0b'], icon: 'sun', desc: 'Hot & dry. Wildfire risk, heatwaves in Terai.' },
  { id: 'monsoon', label: 'Monsoon', months: [6, 7, 8, 9], color: '#3b82f6', gradient: ['#60a5fa', '#2563eb'], icon: 'rain', desc: 'Heavy rain. Peak flood, landslide, storm risk.' },
  { id: 'post-monsoon', label: 'Post-Monsoon', months: [10, 11], color: '#8b5cf6', gradient: ['#a78bfa', '#7c3aed'], icon: 'cloud', desc: 'Moderate. Residual flood risk, decreasing rain.' },
  { id: 'winter', label: 'Winter', months: [12, 1, 2], color: '#06b6d4', gradient: ['#22d3ee', '#0891b2'], icon: 'snow', desc: 'Cold, fog in Terai. Snowfall in mountains.' },
];

function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  return NEPAL_SEASONS.find(s => s.months.includes(month)) || NEPAL_SEASONS[0];
}

function getSeasonForMonth(m) {
  return NEPAL_SEASONS.find(s => s.months.includes(m)) || NEPAL_SEASONS[0];
}

function getSeasonDateRange(season, year) {
  const months = season.months;
  const startMonth = months[0];
  const endMonth = months[months.length - 1];
  let startYear = year, endYear = year;
  // Handle winter wrapping (Dec-Feb)
  if (startMonth === 12) {
    endYear = year + 1;
  }
  const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
  const endDay = new Date(endMonth <= 2 && startMonth === 12 ? endYear : endYear, endMonth, 0).getDate();
  const endDate = `${endMonth <= 2 && startMonth === 12 ? endYear : endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

// Representative districts for sampling (one per province, geographically spread)
const SAMPLE_DISTRICTS = [
  { name: "Jhapa", province: "Koshi", lat: 26.5400, lng: 87.8500, region: 'Terai' },
  { name: "Kathmandu", province: "Bagmati", lat: 27.7172, lng: 85.3240, region: 'Valley' },
  { name: "Kaski", province: "Gandaki", lat: 28.2096, lng: 83.9856, region: 'Hills' },
  { name: "Chitwan", province: "Bagmati", lat: 27.5291, lng: 84.3542, region: 'Inner Terai' },
  { name: "Surkhet", province: "Karnali", lat: 28.6018, lng: 81.6161, region: 'Mid-Hills' },
  { name: "Kailali", province: "Sudurpashchim", lat: 28.6936, lng: 80.5936, region: 'Far-West Terai' },
  { name: "Solukhumbu", province: "Koshi", lat: 27.6833, lng: 86.6500, region: 'Mountains' },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Resource allocation logic per season
function getResourceRecommendations(season, avgData) {
  const base = {
    'pre-monsoon': {
      priority: 'Preparation Phase',
      level: 'moderate',
      items: [
        { resource: 'Emergency Shelters', action: 'Pre-position in flood-prone Terai districts', priority: 'high', icon: 'shelter' },
        { resource: 'Drone Fleet', action: 'Full maintenance & battery refresh before monsoon', priority: 'high', icon: 'drone' },
        { resource: 'Medical Supplies', action: 'Stock heatstroke & dehydration kits in Terai', priority: 'medium', icon: 'medical' },
        { resource: 'Communication Equipment', action: 'Test satellite phones & backup systems', priority: 'medium', icon: 'comms' },
        { resource: 'Personnel Training', action: 'Conduct monsoon readiness drills', priority: 'high', icon: 'training' },
        { resource: 'Water Rescue Boats', action: 'Deploy to Koshi, Narayani, Karnali basins', priority: 'medium', icon: 'boat' },
      ]
    },
    'monsoon': {
      priority: 'Maximum Alert',
      level: 'critical',
      items: [
        { resource: 'Search & Rescue Teams', action: 'Full deployment in all 7 provinces, 24/7 standby', priority: 'critical', icon: 'rescue' },
        { resource: 'Drone Surveillance', action: 'Continuous river monitoring, restricted flight windows', priority: 'critical', icon: 'drone' },
        { resource: 'Emergency Shelters', action: 'Activate all shelters in flood & landslide zones', priority: 'critical', icon: 'shelter' },
        { resource: 'Medical Teams', action: 'Mobile units in Terai & hilly districts', priority: 'high', icon: 'medical' },
        { resource: 'Road Clearing Crews', action: 'Standby for landslide-blocked highways', priority: 'high', icon: 'road' },
        { resource: 'Food & Water Supply', action: 'Pre-position 30-day reserves per district', priority: 'critical', icon: 'supply' },
      ]
    },
    'post-monsoon': {
      priority: 'Recovery & Assessment',
      level: 'moderate',
      items: [
        { resource: 'Damage Assessment Drones', action: 'Systematic aerial survey of affected areas', priority: 'high', icon: 'drone' },
        { resource: 'Infrastructure Repair', action: 'Bridge & road restoration in hilly districts', priority: 'high', icon: 'road' },
        { resource: 'Medical Camps', action: 'Post-flood disease prevention in Terai', priority: 'medium', icon: 'medical' },
        { resource: 'Shelter Maintenance', action: 'Repair & clean emergency facilities', priority: 'medium', icon: 'shelter' },
        { resource: 'Data Collection', action: 'Document damage for planning next season', priority: 'medium', icon: 'data' },
        { resource: 'Equipment Audit', action: 'Assess drone fleet, communication gear condition', priority: 'medium', icon: 'audit' },
      ]
    },
    'winter': {
      priority: 'Winter Operations',
      level: 'low',
      items: [
        { resource: 'Fog Monitoring', action: 'Deploy visibility sensors along Terai highways', priority: 'high', icon: 'sensor' },
        { resource: 'Mountain Rescue', action: 'Standby for snowfall emergencies above 2500m', priority: 'medium', icon: 'rescue' },
        { resource: 'Cold Weather Kits', action: 'Distribute blankets & heaters to mountain districts', priority: 'high', icon: 'supply' },
        { resource: 'Drone Batteries', action: 'Cold-weather battery protocols, reduced flight times', priority: 'medium', icon: 'drone' },
        { resource: 'Strategic Planning', action: 'Review last monsoon, update response protocols', priority: 'medium', icon: 'planning' },
        { resource: 'Budget Allocation', action: 'Prepare procurement for pre-monsoon supplies', priority: 'high', icon: 'budget' },
      ]
    },
  };
  return base[season.id] || base['pre-monsoon'];
}

// ─── Threshold-aware icons ─────────────────────────────────────
const SlidersIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
);
const DroneIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V9m-3 6h6M5 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm14 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm14 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 6h8M8 18h8"/></svg>
);
const SaveIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);
const ResetIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
);

// ─── Component ───────────────────────────────────────────────────
export default function AdminWeather() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('risk-map');
  const [loading, setLoading] = useState(false);
  const [districtData, setDistrictData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const [activeTile, setActiveTile] = useState('positron');
  const [activeRiskFilter, setActiveRiskFilter] = useState('all');
  const [showRiskOverlay, setShowRiskOverlay] = useState(true);
  const [showRiverBasins, setShowRiverBasins] = useState(true);
  const [visibleRivers, setVisibleRivers] = useState(() => Object.fromEntries(RIVER_BASINS.map(r => [r.id, true])));
  const [riverExpanded, setRiverExpanded] = useState(false);
  const [alertDraft, setAlertDraft] = useState(null);
  const [thresholds, setThresholds] = useState(loadThresholds);
  const [thresholdDraft, setThresholdDraft] = useState(loadThresholds);
  const [thresholdSaved, setThresholdSaved] = useState(false);
  const [activeThresholdSection, setActiveThresholdSection] = useState('disaster');

  // Seasonal Analytics state
  const [seasonalData, setSeasonalData] = useState(null);
  const [seasonalLoading, setSeasonalLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [compareYear, setCompareYear] = useState(new Date().getFullYear() - 1);
  const [selectedProvince, setSelectedProvince] = useState('all');

  // Export & Reporting state
  const [exportDateFrom, setExportDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; });
  const [exportDateTo, setExportDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [aiReportType, setAiReportType] = useState('district_risk');
  const [aiReport, setAiReport] = useState('');
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

  // ─── Formatted AI Report Renderer ──────────────────────────────
  const renderFormattedReport = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    const elements = [];
    let currentSection = null;
    let sectionIndex = 0;

    const sectionColors = [
      { bg: 'bg-blue-50', border: 'border-blue-200', headerBg: 'bg-blue-600', icon: '📋', accent: 'text-blue-700' },
      { bg: 'bg-red-50', border: 'border-red-200', headerBg: 'bg-red-600', icon: '🚨', accent: 'text-red-700' },
      { bg: 'bg-amber-50', border: 'border-amber-200', headerBg: 'bg-amber-600', icon: '⚠️', accent: 'text-amber-700' },
      { bg: 'bg-emerald-50', border: 'border-emerald-200', headerBg: 'bg-emerald-600', icon: '🌍', accent: 'text-emerald-700' },
      { bg: 'bg-purple-50', border: 'border-purple-200', headerBg: 'bg-purple-600', icon: '✅', accent: 'text-purple-700' },
      { bg: 'bg-indigo-50', border: 'border-indigo-200', headerBg: 'bg-indigo-600', icon: '🛩️', accent: 'text-indigo-700' },
    ];

    const sectionIcons = {
      'EXECUTIVE SUMMARY': '📋', 'SITUATION SUMMARY': '📋', 'SEASONAL OVERVIEW': '📋', 'FLEET STATUS': '📋',
      'CRITICAL ZONES': '🚨', 'KEY RISK': '🚨', 'RISK ANALYSIS': '⚠️', 'KEY TRENDS': '📈',
      'REGIONAL PATTERNS': '🌍', 'MONSOON': '🌧️', 'WEATHER IMPACT': '🌦️',
      'RECOMMENDATIONS': '✅', 'ACTION': '✅', 'PRIORITY': '✅', 'RESOURCE': '📦',
      'DRONE': '🛩️', 'MISSION': '🎯', 'EQUIPMENT': '🔧', 'FORECAST': '🔮', 'OUTLOOK': '🔮',
      'FLIGHT WINDOWS': '🕐', 'RISK MITIGATION': '🛡️',
    };

    const getIconForHeader = (headerText) => {
      const upper = headerText.toUpperCase();
      for (const [key, icon] of Object.entries(sectionIcons)) {
        if (upper.includes(key)) return icon;
      }
      return '📌';
    };

    // Collect sections
    const sections = [];
    let currentLines = [];
    let currentHeader = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (currentLines.length > 0) currentLines.push('');
        continue;
      }

      // Detect section headers: "1. TITLE", "2. TITLE —", "TITLE:", numbered sections
      const sectionMatch = trimmed.match(/^(\d+)\.\s+([A-Z][A-Z\s&/,\-—–]+)/);
      const altHeaderMatch = !sectionMatch && trimmed.match(/^([A-Z][A-Z\s&/,\-—–]{4,}?)(?:\s*[—–:\-]|$)/);

      if (sectionMatch || altHeaderMatch) {
        if (currentHeader || currentLines.length > 0) {
          sections.push({ header: currentHeader, lines: [...currentLines] });
          currentLines = [];
        }
        const headerText = sectionMatch ? sectionMatch[2].replace(/[—–\-:]+$/, '').trim() : altHeaderMatch[1].replace(/[—–\-:]+$/, '').trim();
        const afterHeader = sectionMatch
          ? trimmed.slice(trimmed.indexOf(sectionMatch[2]) + sectionMatch[2].length).replace(/^[—–:\-\s]+/, '').trim()
          : trimmed.slice(altHeaderMatch[1].length).replace(/^[—–:\-\s]+/, '').trim();
        currentHeader = headerText;
        if (afterHeader) currentLines.push(afterHeader);
      } else {
        currentLines.push(trimmed);
      }
    }
    if (currentHeader || currentLines.length > 0) {
      sections.push({ header: currentHeader, lines: [...currentLines] });
    }

    return (
      <div className="space-y-4 font-[Inter,system-ui,sans-serif]">
        {sections.map((section, idx) => {
          if (!section.header && section.lines.length > 0) {
            // Intro text before first section
            return (
              <div key={idx} className="text-[13px] leading-[1.7] text-gray-600 italic px-1">
                {section.lines.filter(l => l).map((l, i) => <p key={i} className="mb-1">{l}</p>)}
              </div>
            );
          }
          if (!section.header) return null;

          const colorScheme = sectionColors[idx % sectionColors.length];
          const icon = getIconForHeader(section.header);

          return (
            <div key={idx} className={`rounded-xl border ${colorScheme.border} overflow-hidden shadow-sm`}>
              {/* Section Header */}
              <div className={`${colorScheme.headerBg} px-4 py-2.5 flex items-center gap-2.5`}>
                <span className="text-base">{icon}</span>
                <h3 className="text-[13px] font-bold text-white tracking-wide uppercase">
                  {section.header}
                </h3>
              </div>
              {/* Section Body */}
              <div className={`${colorScheme.bg} px-4 py-3.5`}>
                <div className="space-y-1.5">
                  {section.lines.filter(l => l).map((line, li) => {
                    // Bullet / dash items
                    const bulletMatch = line.match(/^[-•●]\s+(.*)/);
                    if (bulletMatch) {
                      // Check for bold key: "- District: details"
                      const kvMatch = bulletMatch[1].match(/^([^:]{2,40}):\s*(.*)/);
                      return (
                        <div key={li} className="flex items-start gap-2 pl-1">
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${colorScheme.headerBg} flex-shrink-0`} />
                          {kvMatch ? (
                            <p className="text-[12.5px] leading-[1.7] text-gray-700">
                              <span className={`font-semibold ${colorScheme.accent}`}>{kvMatch[1]}:</span> {kvMatch[2]}
                            </p>
                          ) : (
                            <p className="text-[12.5px] leading-[1.7] text-gray-700">{bulletMatch[1]}</p>
                          )}
                        </div>
                      );
                    }

                    // Numbered sub-items like "a)", "i)", "(1)"
                    const numberedMatch = line.match(/^(?:\(?[a-z\d]+[.)]\s?|[a-z]\.\s)(.*)/i);
                    if (numberedMatch) {
                      return (
                        <div key={li} className="flex items-start gap-2 pl-3">
                          <span className="text-[11px] text-gray-400 font-mono mt-0.5 w-5 flex-shrink-0">
                            {line.match(/^[^\s]+/)?.[0]}
                          </span>
                          <p className="text-[12.5px] leading-[1.7] text-gray-700">{numberedMatch[1]}</p>
                        </div>
                      );
                    }

                    // Key-value lines "RISK_LEVEL: HIGH", "Score: 8/10"
                    const kvLineMatch = line.match(/^([A-Z][A-Za-z_\s]{2,30}):\s*(.*)/);
                    if (kvLineMatch) {
                      const val = kvLineMatch[2].trim();
                      const isHighRisk = /critical|high|severe|extreme|no.go/i.test(val);
                      const isLowRisk = /low|minimal|go(?!\s)|good|stable/i.test(val);
                      return (
                        <div key={li} className="flex items-center gap-2 py-0.5">
                          <span className={`text-[12px] font-semibold ${colorScheme.accent} min-w-[120px]`}>{kvLineMatch[1]}:</span>
                          <span className={`text-[12px] font-bold px-2 py-0.5 rounded-md ${isHighRisk ? 'bg-red-100 text-red-700' : isLowRisk ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                            {val}
                          </span>
                        </div>
                      );
                    }

                    // Regular paragraph
                    return (
                      <p key={li} className="text-[12.5px] leading-[1.75] text-gray-700">{line}</p>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const circlesLayerRef = useRef(null);
  const riverLayerRef = useRef(null);
  const nepalBorderRef = useRef(null);

  // ─── Fetch weather for all districts ──────────────────────────
  const fetchAllWeather = useCallback(async () => {
    setLoading(true);
    try {
      // Batch districts: fetch in groups of 10 to avoid rate limits
      const results = [];
      const batchSize = 10;
      for (let i = 0; i < DISTRICTS.length; i += batchSize) {
        const batch = DISTRICTS.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (d) => {
            try {
              const res = await fetch(buildWeatherUrl(d.lat, d.lng));
              const data = await res.json();
              const c = data.current || {};
              const elev = estimateElevation(d.lat);
              const flood = classifyFloodRisk(c.precipitation || 0, c.relative_humidity_2m || 0, elev, thresholds.flood);
              const landslide = classifyLandslideRisk(c.precipitation || 0, c.relative_humidity_2m || 0, elev, thresholds.landslide);
              const storm = classifyStormRisk(c.wind_speed_10m || 0, c.wind_gusts_10m || 0, c.weather_code || 0, thresholds.storm);
              const overall = getOverallRisk(flood, landslide, storm);
              return {
                ...d, elev, weather: c,
                risk: { flood, landslide, storm, overall },
                temp: c.temperature_2m, precip: c.precipitation,
                humidity: c.relative_humidity_2m, wind: c.wind_speed_10m,
                gusts: c.wind_gusts_10m, weatherCode: c.weather_code,
              };
            } catch {
              return { ...d, elev: estimateElevation(d.lat), weather: {}, risk: { flood: 'low', landslide: 'low', storm: 'low', overall: 'low' } };
            }
          })
        );
        results.push(...batchResults);
      }
      setDistrictData(results);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch weather data:', err);
    } finally {
      setLoading(false);
    }
  }, [thresholds]);

  // ─── Fetch seasonal/historical weather data ───────────────────
  const fetchSeasonalData = useCallback(async (year, cmpYear) => {
    setSeasonalLoading(true);
    try {
      const allMonthlyData = {};
      // Fetch monthly aggregated data for both years using sample districts
      for (const yr of [year, cmpYear]) {
        allMonthlyData[yr] = [];
        // For each month, fetch daily data from a few sample districts
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        for (let month = 1; month <= 12; month++) {
          // Don't fetch future months
          if (yr === currentYear && month > currentMonth) {
            allMonthlyData[yr].push({ month, temp: null, precip: null, humidity: null, wind: null, gusts: null, weatherCode: null });
            continue;
          }
          if (yr > currentYear) {
            allMonthlyData[yr].push({ month, temp: null, precip: null, humidity: null, wind: null, gusts: null, weatherCode: null });
            continue;
          }
          const startDate = `${yr}-${String(month).padStart(2, '0')}-01`;
          const lastDay = new Date(yr, month, 0).getDate();
          const endDate = `${yr}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          // Clamp end date to today if needed
          const endClamp = new Date(endDate) > today ? today.toISOString().split('T')[0] : endDate;

          // Fetch from 3 representative districts (Terai, Valley, Hills) to get national average
          const samplePoints = SAMPLE_DISTRICTS.slice(0, 3);
          const monthResults = await Promise.all(
            samplePoints.map(async (d) => {
              try {
                const url = `${ARCHIVE_BASE}?latitude=${d.lat}&longitude=${d.lng}&start_date=${startDate}&end_date=${endClamp}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,weather_code&timezone=Asia%2FKathmandu`;
                const res = await fetch(url);
                const data = await res.json();
                const daily = data.daily || {};
                const days = daily.time?.length || 1;
                const avgTemp = daily.temperature_2m_max && daily.temperature_2m_min
                  ? daily.temperature_2m_max.reduce((s, v, i) => s + ((v + daily.temperature_2m_min[i]) / 2), 0) / days : null;
                const totalPrecip = daily.precipitation_sum?.reduce((s, v) => s + (v || 0), 0) || 0;
                const avgWind = daily.wind_speed_10m_max?.reduce((s, v) => s + (v || 0), 0) / days || 0;
                const avgGusts = daily.wind_gusts_10m_max?.reduce((s, v) => s + (v || 0), 0) / days || 0;
                const maxCode = Math.max(...(daily.weather_code || [0]));
                return { avgTemp, totalPrecip, avgWind, avgGusts, maxCode, days };
              } catch {
                return null;
              }
            })
          );
          const valid = monthResults.filter(Boolean);
          if (valid.length > 0) {
            allMonthlyData[yr].push({
              month,
              temp: +(valid.reduce((s, v) => s + v.avgTemp, 0) / valid.length).toFixed(1),
              precip: +(valid.reduce((s, v) => s + v.totalPrecip, 0) / valid.length).toFixed(1),
              wind: +(valid.reduce((s, v) => s + v.avgWind, 0) / valid.length).toFixed(1),
              gusts: +(valid.reduce((s, v) => s + v.avgGusts, 0) / valid.length).toFixed(1),
              weatherCode: Math.max(...valid.map(v => v.maxCode)),
              days: valid[0].days,
            });
          } else {
            allMonthlyData[yr].push({ month, temp: null, precip: null, humidity: null, wind: null, gusts: null, weatherCode: null });
          }
        }
      }

      // Compute season aggregates
      const seasonAggregates = {};
      for (const yr of [year, cmpYear]) {
        seasonAggregates[yr] = {};
        for (const season of NEPAL_SEASONS) {
          const monthlySlice = allMonthlyData[yr].filter(m => season.months.includes(m.month) && m.temp !== null);
          if (monthlySlice.length > 0) {
            seasonAggregates[yr][season.id] = {
              avgTemp: +(monthlySlice.reduce((s, m) => s + m.temp, 0) / monthlySlice.length).toFixed(1),
              totalPrecip: +(monthlySlice.reduce((s, m) => s + m.precip, 0)).toFixed(1),
              avgWind: +(monthlySlice.reduce((s, m) => s + m.wind, 0) / monthlySlice.length).toFixed(1),
              avgGusts: +(monthlySlice.reduce((s, m) => s + m.gusts, 0) / monthlySlice.length).toFixed(1),
              maxWeatherCode: Math.max(...monthlySlice.map(m => m.weatherCode)),
              months: monthlySlice.length,
            };
          }
        }
      }

      setSeasonalData({ monthly: allMonthlyData, seasons: seasonAggregates });
    } catch (err) {
      console.error('Seasonal fetch error:', err);
    } finally {
      setSeasonalLoading(false);
    }
  }, []);

  // ─── Initialize map ───────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [28.3949, 84.124],
      zoom: 7,
      zoomControl: false,
      scrollWheelZoom: true,
      minZoom: 6,
      maxZoom: 18,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    tileLayerRef.current = L.tileLayer(TILE_LAYERS.positron.url, {
      attribution: TILE_LAYERS.positron.attribution, maxZoom: 19,
    }).addTo(map);

    // Nepal border
    if (nepalBorderData?.features) {
      nepalBorderRef.current = L.geoJSON(nepalBorderData, {
        style: { color: '#94a3b8', weight: 2, opacity: 0.6, fillColor: '#94a3b8', fillOpacity: 0.03 },
      }).addTo(map);
      const bounds = nepalBorderRef.current.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
    }

    markersLayerRef.current = L.layerGroup().addTo(map);
    circlesLayerRef.current = L.layerGroup().addTo(map);
    riverLayerRef.current = L.layerGroup().addTo(map);

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, []);

  // ─── Fetch on mount ───────────────────────────────────────────
  useEffect(() => { fetchAllWeather(); }, [fetchAllWeather]);

  // ─── Draw river basins ────────────────────────────────────────
  useEffect(() => {
    if (!riverLayerRef.current) return;
    riverLayerRef.current.clearLayers();
    if (!showRiverBasins) return;

    RIVER_BASINS.forEach(basin => {
      if (!visibleRivers[basin.id]) return;
      const line = L.polyline(basin.coords, {
        color: basin.color, weight: 3.5, opacity: 0.75, dashArray: '10, 6', lineCap: 'round',
      });
      line.bindTooltip(`<div style="font-weight:700;">${basin.name}</div><div style="font-size:10px;color:#64748b;margin-top:2px;">${basin.desc}</div>`, {
        sticky: true, className: 'risk-tooltip', direction: 'top', maxWidth: 220,
      });
      riverLayerRef.current.addLayer(line);
    });
  }, [showRiverBasins, visibleRivers]);

  // ─── Update markers & circles on data / filter change ─────────
  useEffect(() => {
    if (!markersLayerRef.current || !circlesLayerRef.current || districtData.length === 0) return;
    markersLayerRef.current.clearLayers();
    circlesLayerRef.current.clearLayers();

    if (!showRiskOverlay) return;

    const filtered = activeRiskFilter === 'all'
      ? districtData
      : districtData.filter(d => d.risk.overall === activeRiskFilter);

    filtered.forEach(d => {
      const rc = RISK_COLORS[d.risk.overall] || RISK_COLORS.low;

      // Risk circle
      const radius = d.risk.overall === 'critical' ? 18000 : d.risk.overall === 'high' ? 14000 : d.risk.overall === 'moderate' ? 10000 : 7000;
      const circle = L.circle([d.lat, d.lng], {
        radius,
        color: rc.border,
        weight: 1.5,
        opacity: 0.6,
        fillColor: rc.bg,
        fillOpacity: d.risk.overall === 'critical' ? 0.3 : d.risk.overall === 'high' ? 0.22 : 0.12,
      });
      circlesLayerRef.current.addLayer(circle);

      // Marker
      const marker = L.marker([d.lat, d.lng], { icon: createRiskMarkerIcon(d.risk.overall) });
      marker.bindPopup(`
        <div style="font-family:Inter,system-ui,sans-serif;min-width:220px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <strong style="font-size:14px;">${d.name}</strong>
            <span style="background:${rc.bg};color:#fff;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;text-transform:uppercase;">${rc.label}</span>
          </div>
          <div style="font-size:12px;color:#64748b;margin-bottom:6px;">${d.province} Province</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;">
            <div style="background:#f1f5f9;padding:4px 8px;border-radius:6px;"><span style="color:#94a3b8;">Temp</span> <b>${d.temp ?? '--'}°C</b></div>
            <div style="background:#f1f5f9;padding:4px 8px;border-radius:6px;"><span style="color:#94a3b8;">Rain</span> <b>${d.precip ?? 0}mm</b></div>
            <div style="background:#f1f5f9;padding:4px 8px;border-radius:6px;"><span style="color:#94a3b8;">Wind</span> <b>${d.wind ?? 0}km/h</b></div>
            <div style="background:#f1f5f9;padding:4px 8px;border-radius:6px;"><span style="color:#94a3b8;">Humidity</span> <b>${d.humidity ?? 0}%</b></div>
          </div>
          <div style="margin-top:8px;display:flex;gap:4px;">
            <span style="background:${RISK_COLORS[d.risk.flood].bg}25;color:${RISK_COLORS[d.risk.flood].text};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">Flood: ${d.risk.flood}</span>
            <span style="background:${RISK_COLORS[d.risk.landslide].bg}25;color:${RISK_COLORS[d.risk.landslide].text};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">Slide: ${d.risk.landslide}</span>
            <span style="background:${RISK_COLORS[d.risk.storm].bg}25;color:${RISK_COLORS[d.risk.storm].text};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">Storm: ${d.risk.storm}</span>
          </div>
        </div>
      `, { maxWidth: 280 });

      marker.on('click', () => setSelectedDistrict(d));
      markersLayerRef.current.addLayer(marker);
    });
  }, [districtData, activeRiskFilter, showRiskOverlay]);

  // ─── Tile layer change ────────────────────────────────────────
  const changeTile = (key) => {
    if (!mapInstance.current || !TILE_LAYERS[key]) return;
    if (tileLayerRef.current) mapInstance.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(TILE_LAYERS[key].url, { attribution: TILE_LAYERS[key].attribution, maxZoom: 19 }).addTo(mapInstance.current);
    setActiveTile(key);
  };

  const centerMap = () => {
    if (mapInstance.current && nepalBorderRef.current) {
      const bounds = nepalBorderRef.current.getBounds();
      if (bounds.isValid()) mapInstance.current.fitBounds(bounds, { padding: [30, 30] });
    }
  };

  const flyToDistrict = (d) => {
    if (mapInstance.current) mapInstance.current.flyTo([d.lat, d.lng], 11, { duration: 0.8 });
    setSelectedDistrict(d);
  };

  // ─── Derived stats ────────────────────────────────────────────
  const riskStats = useMemo(() => {
    const counts = { critical: 0, high: 0, moderate: 0, low: 0 };
    districtData.forEach(d => { counts[d.risk.overall]++; });
    return counts;
  }, [districtData]);

  const criticalDistricts = useMemo(() =>
    districtData.filter(d => d.risk.overall === 'critical' || d.risk.overall === 'high')
      .sort((a, b) => {
        const levels = { critical: 2, high: 1 };
        return (levels[b.risk.overall] || 0) - (levels[a.risk.overall] || 0);
      }),
    [districtData]
  );

  // ─── Seasonal chart configurations ────────────────────────────
  const currentSeason = useMemo(() => getCurrentSeason(), []);
  const recommendations = useMemo(() => getResourceRecommendations(currentSeason, null), [currentSeason]);

  // Build ECharts options
  const precipChartOption = useMemo(() => {
    if (!seasonalData) return {};
    const d1 = seasonalData.monthly[selectedYear] || [];
    const d2 = seasonalData.monthly[compareYear] || [];
    return {
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { fontSize: 11, color: '#374151' },
        formatter: (params) => {
          let html = `<div style="font-weight:700;margin-bottom:4px;">${params[0]?.axisValue}</div>`;
          params.forEach(p => { html += `<div style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>${p.seriesName}: <b>${p.value ?? '--'} mm</b></div>`; });
          return html;
        }
      },
      legend: { bottom: 0, textStyle: { fontSize: 11, color: '#6b7280' }, itemWidth: 12, itemHeight: 8 },
      grid: { left: '6%', right: '4%', top: '12%', bottom: '16%', containLabel: true },
      xAxis: { type: 'category', data: MONTH_NAMES, axisLabel: { fontSize: 10, color: '#9ca3af' }, axisLine: { lineStyle: { color: '#e5e7eb' } } },
      yAxis: { type: 'value', name: 'Precipitation (mm)', nameTextStyle: { fontSize: 10, color: '#9ca3af', padding: [0, 0, 0, 0] }, nameGap: 30, axisLabel: { fontSize: 10, color: '#9ca3af' }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
      series: [
        {
          name: `${selectedYear}`,
          type: 'bar',
          data: d1.map(m => m.precip),
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#60a5fa' }, { offset: 1, color: '#3b82f6' }])
          },
          barMaxWidth: 24,
        },
        {
          name: `${compareYear}`,
          type: 'bar',
          data: d2.map(m => m.precip),
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#c4b5fd' }, { offset: 1, color: '#8b5cf6' }])
          },
          barMaxWidth: 24,
        },
      ],
    };
  }, [seasonalData, selectedYear, compareYear]);

  const tempChartOption = useMemo(() => {
    if (!seasonalData) return {};
    const d1 = seasonalData.monthly[selectedYear] || [];
    const d2 = seasonalData.monthly[compareYear] || [];
    return {
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { fontSize: 11, color: '#374151' },
        formatter: (params) => {
          let html = `<div style="font-weight:700;margin-bottom:4px;">${params[0]?.axisValue}</div>`;
          params.forEach(p => { html += `<div style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>${p.seriesName}: <b>${p.value ?? '--'}°C</b></div>`; });
          return html;
        }
      },
      legend: { bottom: 0, textStyle: { fontSize: 11, color: '#6b7280' }, itemWidth: 12, itemHeight: 8 },
      grid: { left: '6%', right: '4%', top: '12%', bottom: '16%', containLabel: true },
      xAxis: { type: 'category', data: MONTH_NAMES, axisLabel: { fontSize: 10, color: '#9ca3af' }, axisLine: { lineStyle: { color: '#e5e7eb' } } },
      yAxis: { type: 'value', name: 'Temperature (°C)', nameTextStyle: { fontSize: 10, color: '#9ca3af', padding: [0, 0, 0, 0] }, nameGap: 30, axisLabel: { fontSize: 10, color: '#9ca3af' }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
      series: [
        {
          name: `${selectedYear}`,
          type: 'line', smooth: true,
          data: d1.map(m => m.temp),
          lineStyle: { width: 2.5, color: '#f97316' },
          itemStyle: { color: '#f97316' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(249,115,22,0.2)' }, { offset: 1, color: 'rgba(249,115,22,0)' }]) },
          symbol: 'circle', symbolSize: 6,
        },
        {
          name: `${compareYear}`,
          type: 'line', smooth: true,
          data: d2.map(m => m.temp),
          lineStyle: { width: 2, color: '#06b6d4', type: 'dashed' },
          itemStyle: { color: '#06b6d4' },
          symbol: 'circle', symbolSize: 5,
        },
      ],
    };
  }, [seasonalData, selectedYear, compareYear]);

  const windChartOption = useMemo(() => {
    if (!seasonalData) return {};
    const d1 = seasonalData.monthly[selectedYear] || [];
    const d2 = seasonalData.monthly[compareYear] || [];
    return {
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { fontSize: 11, color: '#374151' },
        formatter: (params) => {
          let html = `<div style="font-weight:700;margin-bottom:4px;">${params[0]?.axisValue}</div>`;
          params.forEach(p => { html += `<div style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>${p.seriesName}: <b>${p.value ?? '--'} km/h</b></div>`; });
          return html;
        }
      },
      legend: { bottom: 0, textStyle: { fontSize: 11, color: '#6b7280' }, itemWidth: 12, itemHeight: 8 },
      grid: { left: '6%', right: '4%', top: '12%', bottom: '16%', containLabel: true },
      xAxis: { type: 'category', data: MONTH_NAMES, axisLabel: { fontSize: 10, color: '#9ca3af' }, axisLine: { lineStyle: { color: '#e5e7eb' } } },
      yAxis: { type: 'value', name: 'Wind (km/h)', nameTextStyle: { fontSize: 10, color: '#9ca3af', padding: [0, 0, 0, 0] }, nameGap: 30, axisLabel: { fontSize: 10, color: '#9ca3af' }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
      series: [
        {
          name: `Wind ${selectedYear}`,
          type: 'line', smooth: true,
          data: d1.map(m => m.wind),
          lineStyle: { width: 2.5, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(16,185,129,0.15)' }, { offset: 1, color: 'rgba(16,185,129,0)' }]) },
          symbol: 'circle', symbolSize: 5,
        },
        {
          name: `Gusts ${selectedYear}`,
          type: 'line', smooth: true,
          data: d1.map(m => m.gusts),
          lineStyle: { width: 2, color: '#ef4444' },
          itemStyle: { color: '#ef4444' },
          symbol: 'diamond', symbolSize: 5,
        },
        {
          name: `Wind ${compareYear}`,
          type: 'line', smooth: true,
          data: d2.map(m => m.wind),
          lineStyle: { width: 1.5, color: '#6ee7b7', type: 'dashed' },
          itemStyle: { color: '#6ee7b7' },
          symbol: 'circle', symbolSize: 4,
        },
      ],
    };
  }, [seasonalData, selectedYear, compareYear]);

  // Seasonal risk heatmap option
  const seasonRiskHeatmapOption = useMemo(() => {
    if (!seasonalData) return {};
    const d1 = seasonalData.monthly[selectedYear] || [];
    // Calculate a composite risk score per month (0-100)
    const riskScores = d1.map(m => {
      if (m.temp === null) return null;
      let score = 0;
      // Precipitation factor (0-40)
      score += Math.min((m.precip || 0) / 15, 1) * 40;
      // Wind factor (0-30)
      score += Math.min((m.wind || 0) / 50, 1) * 30;
      // Temperature extremity factor (0-30)
      const tempDev = Math.abs((m.temp || 20) - 22);
      score += Math.min(tempDev / 20, 1) * 30;
      return Math.round(score);
    });
    return {
      tooltip: {
        formatter: (p) => {
          const score = p.data[1];
          const level = score >= 70 ? 'Critical' : score >= 50 ? 'High' : score >= 30 ? 'Moderate' : 'Low';
          return `<div style="font-weight:700">${MONTH_NAMES[p.data[0]]}</div><div>Risk Score: <b>${score}/100</b> (${level})</div>`;
        }
      },
      grid: { left: '2%', right: '6%', top: '4%', bottom: '4%', containLabel: true },
      xAxis: { type: 'category', data: MONTH_NAMES, axisLabel: { fontSize: 10, color: '#9ca3af' }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'category', data: [`${selectedYear}`], axisLabel: { fontSize: 10, color: '#9ca3af' }, axisLine: { show: false }, axisTick: { show: false } },
      visualMap: { min: 0, max: 100, calculable: false, orient: 'horizontal', left: 'center', bottom: -5, show: false,
        inRange: { color: ['#dcfce7', '#86efac', '#fde68a', '#fb923c', '#ef4444'] }
      },
      series: [{
        type: 'heatmap',
        data: riskScores.map((score, i) => [i, 0, score]).filter(d => d[2] !== null),
        label: { show: true, fontSize: 11, fontWeight: 700, color: '#374151',
          formatter: (p) => p.data[2]
        },
        itemStyle: { borderWidth: 3, borderColor: '#fff', borderRadius: 6 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.15)' } },
      }],
    };
  }, [seasonalData, selectedYear]);

  // ─── Tab definitions ──────────────────────────────────────────
  const TABS = [
    { id: 'risk-map', label: 'Disaster Risk Weather Map', icon: <MapIcon className="w-4 h-4" /> },
    { id: 'alert-mgmt', label: 'Alert Management', icon: <SlidersIcon className="w-4 h-4" /> },
    { id: 'seasonal', label: 'Seasonal Analytics', icon: <ChartIcon className="w-4 h-4" /> },
    { id: 'export', label: 'Export & Reporting', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      <Navbar />

      <div className="max-w-[1920px] mx-auto px-6 py-5">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Weather Intelligence</h1>
              <p className="text-sm text-gray-500">Real-time disaster risk analysis across Nepal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-400">
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button onClick={fetchAllWeather} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition disabled:opacity-50">
              <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Fetching...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Tab Toggle (AdminAnalytics style) */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveView(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeView === t.id
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-200 scale-[1.02]'
                  : 'bg-white text-gray-600 hover:bg-gray-50 shadow border border-gray-200'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ─── TAB 1: Disaster Risk Weather Map ──────────────────── */}
          {activeView === 'risk-map' && (
            <motion.div key="risk-map"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}>

              {/* Risk Summary Cards */}
              <div className="grid grid-cols-5 gap-4 mb-5">
                {[
                  { label: 'Total Districts', value: districtData.length, color: 'from-slate-500 to-slate-600', sub: '77 monitored' },
                  { label: 'Critical Zones', value: riskStats.critical, color: 'from-red-500 to-rose-600', sub: 'Immediate action' },
                  { label: 'High Risk', value: riskStats.high, color: 'from-orange-500 to-amber-600', sub: 'Close monitoring' },
                  { label: 'Moderate Risk', value: riskStats.moderate, color: 'from-yellow-500 to-amber-500', sub: 'Watch status' },
                  { label: 'Safe Zones', value: riskStats.low, color: 'from-emerald-500 to-green-600', sub: 'Normal operations' },
                ].map((card, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color}`} />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{card.label}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-gray-800 tabular-nums">{card.value}</span>
                      <span className="text-[10px] text-gray-400">{card.sub}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Main Layout: Sidebar + Map */}
              <div className="flex gap-4" style={{ height: 'calc(100vh - 340px)' }}>

                {/* Left Sidebar */}
                <div className="w-[340px] flex-shrink-0 space-y-4 overflow-y-auto pr-1">

                  {/* Risk Filter */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Filter by Risk Level</h3>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'all', label: 'All', count: districtData.length, color: 'bg-gray-100 text-gray-700' },
                        { id: 'critical', label: 'Critical', count: riskStats.critical, color: 'bg-red-50 text-red-600 border-red-200' },
                        { id: 'high', label: 'High', count: riskStats.high, color: 'bg-orange-50 text-orange-600 border-orange-200' },
                        { id: 'moderate', label: 'Moderate', count: riskStats.moderate, color: 'bg-amber-50 text-amber-600 border-amber-200' },
                        { id: 'low', label: 'Safe', count: riskStats.low, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
                      ].map(f => (
                        <button key={f.id} onClick={() => setActiveRiskFilter(f.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            activeRiskFilter === f.id ? 'ring-2 ring-sky-400 ring-offset-1 scale-[1.02]' : ''
                          } ${f.color}`}>
                          {f.label} ({f.count})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Map Layers */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Map Layers</h3>
                    <div className="space-y-1">

                      {/* Risk Level Overlay */}
                      <label className="flex items-center gap-3 cursor-pointer py-2 px-2 rounded-lg hover:bg-gray-50 transition">
                        <input type="checkbox" checked={showRiskOverlay} onChange={() => setShowRiskOverlay(!showRiskOverlay)}
                          className="w-4 h-4 rounded text-sky-500 border-gray-300 accent-sky-500" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700">District Risk Levels</span>
                          <p className="text-[10px] text-gray-400">Radar markers & risk zones</p>
                        </div>
                        <span className={`w-2 h-2 rounded-full ${showRiskOverlay ? 'bg-sky-500' : 'bg-gray-300'}`} />
                      </label>

                      {/* River Basins - with expand toggle */}
                      <div className="border-t border-gray-100 pt-1">
                        <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 transition">
                          <input type="checkbox" checked={showRiverBasins}
                            onChange={() => {
                              const next = !showRiverBasins;
                              setShowRiverBasins(next);
                              if (next) setVisibleRivers(Object.fromEntries(RIVER_BASINS.map(r => [r.id, true])));
                            }}
                            className="w-4 h-4 rounded text-sky-500 border-gray-300 accent-sky-500 cursor-pointer" />
                          <div className="flex-1 cursor-pointer" onClick={() => setRiverExpanded(!riverExpanded)}>
                            <span className="text-sm font-medium text-gray-700">River Basins</span>
                            <p className="text-[10px] text-gray-400">{RIVER_BASINS.filter(r => visibleRivers[r.id] && showRiverBasins).length} of {RIVER_BASINS.length} visible</p>
                          </div>
                          <button onClick={() => setRiverExpanded(!riverExpanded)}
                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition">
                            <svg className={`w-3.5 h-3.5 transition-transform ${riverExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* Sub-items: individual rivers */}
                        <AnimatePresence>
                          {riverExpanded && showRiverBasins && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-7 pl-3 border-l-2 border-gray-100 space-y-0.5 pb-1">
                                {RIVER_BASINS.map(basin => (
                                  <label key={basin.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-gray-50 cursor-pointer transition">
                                    <input type="checkbox" checked={visibleRivers[basin.id]}
                                      onChange={() => setVisibleRivers(prev => ({ ...prev, [basin.id]: !prev[basin.id] }))}
                                      className="w-3.5 h-3.5 rounded border-gray-300 accent-sky-500" />
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: basin.color }} />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-medium text-gray-700 block truncate">{basin.name}</span>
                                      <span className="text-[9px] text-gray-400 block truncate">{basin.desc}</span>
                                    </div>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                      basin.risk === 'high' ? 'bg-red-50 text-red-500' :
                                      basin.risk === 'medium' ? 'bg-amber-50 text-amber-500' :
                                      'bg-green-50 text-green-500'
                                    }`}>{basin.risk}</span>
                                  </label>
                                ))}
                                <div className="flex gap-2 px-2 pt-1">
                                  <button onClick={() => setVisibleRivers(Object.fromEntries(RIVER_BASINS.map(r => [r.id, true])))}
                                    className="text-[10px] text-sky-500 font-semibold hover:text-sky-600 transition">Show All</button>
                                  <span className="text-gray-300">|</span>
                                  <button onClick={() => setVisibleRivers(Object.fromEntries(RIVER_BASINS.map(r => [r.id, false])))}
                                    className="text-[10px] text-gray-400 font-semibold hover:text-gray-600 transition">Hide All</button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Critical Alerts */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <AlertIcon className="w-4 h-4 text-red-500" />
                      High-Risk Districts ({criticalDistricts.length})
                    </h3>
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {criticalDistricts.length === 0 && !loading && (
                        <p className="text-xs text-gray-400 py-4 text-center">No high-risk districts detected</p>
                      )}
                      {loading && districtData.length === 0 && (
                        <div className="flex items-center justify-center py-6">
                          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {criticalDistricts.map((d, i) => {
                        const rc = RISK_COLORS[d.risk.overall];
                        return (
                          <button key={i} onClick={() => flyToDistrict(d)}
                            className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm ${
                              selectedDistrict?.name === d.name ? 'bg-sky-50 border-sky-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: rc.bg }} />
                                <span className="text-sm font-semibold text-gray-800">{d.name}</span>
                              </div>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: rc.bg }}>
                                {rc.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 ml-4.5 text-[10px] text-gray-500">
                              <span>{d.precip ?? 0}mm rain</span>
                              <span>{d.wind ?? 0}km/h wind</span>
                              <span>{d.humidity ?? 0}% hum</span>
                            </div>
                            <div className="flex gap-1.5 mt-2 ml-4.5">
                              {['flood', 'landslide', 'storm'].map(type => (
                                <span key={type} className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                                  style={{ background: RISK_COLORS[d.risk[type]].bg + '20', color: RISK_COLORS[d.risk[type]].text }}>
                                  {type === 'landslide' ? 'Slide' : type.charAt(0).toUpperCase() + type.slice(1)}: {d.risk[type]}
                                </span>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Issue Alert */}
                  {selectedDistrict && (selectedDistrict.risk.overall === 'critical' || selectedDistrict.risk.overall === 'high') && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-4 text-white shadow-lg">
                      <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                        <AlertIcon className="w-4 h-4" />
                        Issue Alert for {selectedDistrict.name}
                      </h3>
                      <p className="text-xs text-white/80 mb-3">
                        Current risk level: <strong className="uppercase">{selectedDistrict.risk.overall}</strong>.
                        Flood: {selectedDistrict.risk.flood}, Landslide: {selectedDistrict.risk.landslide}, Storm: {selectedDistrict.risk.storm}
                      </p>
                      <button onClick={() => {
                          const risks = selectedDistrict.risk;
                          const riskLevels = { critical: 4, high: 3, moderate: 2, low: 1 };
                          let primaryType = 'Storm'; let maxRisk = 0;
                          if (riskLevels[risks.flood] > maxRisk) { maxRisk = riskLevels[risks.flood]; primaryType = 'Flood'; }
                          if (riskLevels[risks.landslide] > maxRisk) { maxRisk = riskLevels[risks.landslide]; primaryType = 'Landslide'; }
                          if (riskLevels[risks.storm] > maxRisk) { primaryType = 'Storm'; }
                          const severityMap = { critical: 'Critical', high: 'High', moderate: 'Medium', low: 'Low' };
                          navigate('/sms-alerts', { state: { weatherAlert: {
                            district: selectedDistrict.name, province: selectedDistrict.province,
                            alertType: primaryType, severity: severityMap[risks.overall] || 'High',
                            riskOverall: risks.overall, riskFlood: risks.flood, riskLandslide: risks.landslide, riskStorm: risks.storm,
                            temp: selectedDistrict.temp, precip: selectedDistrict.precip, wind: selectedDistrict.wind, humidity: selectedDistrict.humidity,
                          }}});
                        }}
                        className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-all backdrop-blur-sm">
                        Draft SMS Alert via SMS Alerts Page
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Right: Map */}
                <div className="flex-1 relative">
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full border border-gray-200 flex flex-col">
                    {/* Map Header */}
                    <div className="flex justify-between items-center px-5 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-200 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                          <MapIcon className="w-4.5 h-4.5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-gray-800">Disaster Risk Weather Map</h2>
                          <p className="text-[10px] text-gray-400 uppercase tracking-[2px]">
                            {districtData.length} districts{riskStats.critical > 0 ? ` • ${riskStats.critical} critical` : ''}{riskStats.high > 0 ? ` • ${riskStats.high} high risk` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={centerMap}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition">
                          <CrosshairIcon className="w-3.5 h-3.5" />Reset
                        </button>
                      </div>
                    </div>

                    {/* Map */}
                    <div className="flex-1 relative">
                      <div ref={mapRef} className="w-full h-full" />

                      {/* Layer Switcher */}
                      <div className="absolute top-3 left-3 z-[500]">
                        <button onClick={() => setLayerMenuOpen(!layerMenuOpen)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all text-xs font-medium text-gray-600">
                          <LayersIcon className="w-3.5 h-3.5" />Map Style
                        </button>
                        {layerMenuOpen && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            className="absolute top-10 left-0 bg-white/98 backdrop-blur-sm rounded-xl border border-gray-200 shadow-xl py-1.5 min-w-[150px]">
                            {Object.entries(TILE_LAYERS).map(([key, layer]) => (
                              <button key={key} onClick={() => { changeTile(key); setLayerMenuOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-xs font-medium transition-all ${
                                  activeTile === key ? 'bg-sky-50 text-sky-600 font-bold' : 'text-gray-600 hover:bg-gray-50'
                                }`}>
                                {layer.name}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </div>

                      {/* Compass */}
                      <div className="absolute top-3 right-3 z-[500]">
                        <div className="w-14 h-14 bg-white/95 backdrop-blur-sm rounded-full border border-gray-200 shadow-lg flex items-center justify-center">
                          <svg width="40" height="40" viewBox="0 0 40 40">
                            <circle cx="20" cy="20" r="18" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                            <text x="20" y="8" textAnchor="middle" fontSize="7" fontWeight="700" fill="#ef4444">N</text>
                            <text x="20" y="37" textAnchor="middle" fontSize="6" fontWeight="600" fill="#9ca3af">S</text>
                            <text x="4" y="22.5" textAnchor="middle" fontSize="6" fontWeight="600" fill="#9ca3af">W</text>
                            <text x="36" y="22.5" textAnchor="middle" fontSize="6" fontWeight="600" fill="#9ca3af">E</text>
                            <polygon points="20,10 17,20 23,20" fill="#ef4444" />
                            <polygon points="20,30 17,20 23,20" fill="#cbd5e1" />
                            <circle cx="20" cy="20" r="2.5" fill="white" stroke="#94a3b8" strokeWidth="1" />
                          </svg>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-4 shadow-lg text-xs text-gray-600 font-medium">
                        {Object.entries(RISK_COLORS).map(([key, rc]) => (
                          <div key={key} className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: rc.bg, boxShadow: `0 0 6px ${rc.bg}40` }} />
                            {rc.label}
                          </div>
                        ))}
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-gray-400 opacity-50 border-2 border-gray-300" />
                          Nepal Border
                        </div>
                      </div>

                      {/* Loading Overlay */}
                      {loading && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[600]">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-3 border-sky-400 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-semibold text-gray-600">Fetching weather data for 77 districts...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom: Data Table */}
              {districtData.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="mt-5 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800">District Risk Assessment Overview</h3>
                    <span className="text-xs text-gray-400">{districtData.length} districts analyzed</span>
                  </div>
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="text-left text-gray-500 uppercase tracking-wider">
                          <th className="px-4 py-2.5 font-semibold">District</th>
                          <th className="px-4 py-2.5 font-semibold">Province</th>
                          <th className="px-4 py-2.5 font-semibold text-center">Temp</th>
                          <th className="px-4 py-2.5 font-semibold text-center">Rain</th>
                          <th className="px-4 py-2.5 font-semibold text-center">Wind</th>
                          <th className="px-4 py-2.5 font-semibold text-center">Humidity</th>
                          <th className="px-4 py-2.5 font-semibold text-center">Flood</th>
                          <th className="px-4 py-2.5 font-semibold text-center">Landslide</th>
                          <th className="px-4 py-2.5 font-semibold text-center">Storm</th>
                          <th className="px-4 py-2.5 font-semibold text-center">Overall</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {districtData
                          .filter(d => activeRiskFilter === 'all' || d.risk.overall === activeRiskFilter)
                          .sort((a, b) => {
                            const lv = { critical: 4, high: 3, moderate: 2, low: 1 };
                            return (lv[b.risk.overall] || 0) - (lv[a.risk.overall] || 0);
                          })
                          .map((d, i) => {
                            const rc = RISK_COLORS[d.risk.overall];
                            return (
                              <tr key={i} onClick={() => flyToDistrict(d)}
                                className={`cursor-pointer transition-colors ${
                                  selectedDistrict?.name === d.name ? 'bg-sky-50' : 'hover:bg-gray-50'
                                }`}>
                                <td className="px-4 py-2.5 font-semibold text-gray-800">{d.name}</td>
                                <td className="px-4 py-2.5 text-gray-500">{d.province}</td>
                                <td className="px-4 py-2.5 text-center font-mono">{d.temp ?? '--'}°C</td>
                                <td className="px-4 py-2.5 text-center font-mono">{d.precip ?? 0}mm</td>
                                <td className="px-4 py-2.5 text-center font-mono">{d.wind ?? 0}km/h</td>
                                <td className="px-4 py-2.5 text-center font-mono">{d.humidity ?? 0}%</td>
                                {['flood', 'landslide', 'storm'].map(type => {
                                  const trc = RISK_COLORS[d.risk[type]];
                                  return (
                                    <td key={type} className="px-4 py-2.5 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: trc.bg + '20', color: trc.text }}>
                                        {d.risk[type]}
                                      </span>
                                    </td>
                                  );
                                })}
                                <td className="px-4 py-2.5 text-center">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: rc.bg }}>
                                    {rc.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ─── TAB 2: Alert Management ─────────────────────────── */}
          {activeView === 'alert-mgmt' && (
            <motion.div key="alert-mgmt"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}>

              {/* Section Toggle */}
              <div className="flex gap-3 mb-5">
                {[
                  { id: 'disaster', label: 'Disaster Risk Thresholds', icon: <AlertIcon className="w-4 h-4" />, desc: 'Flood, Landslide & Storm risk levels' },
                  { id: 'flight', label: 'Drone Flight Thresholds', icon: <DroneIcon className="w-4 h-4" />, desc: 'GO / CAUTION / NO-GO limits' },
                ].map(s => (
                  <button key={s.id} onClick={() => setActiveThresholdSection(s.id)}
                    className={`flex-1 flex items-center gap-3 px-5 py-4 rounded-xl border transition-all ${
                      activeThresholdSection === s.id
                        ? 'bg-sky-50 border-sky-300 shadow-md shadow-sky-100 ring-1 ring-sky-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50 shadow-sm'
                    }`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      activeThresholdSection === s.id ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>{s.icon}</div>
                    <div className="text-left">
                      <p className={`text-sm font-bold ${activeThresholdSection === s.id ? 'text-sky-700' : 'text-gray-700'}`}>{s.label}</p>
                      <p className="text-[11px] text-gray-400">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between mb-5 bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <SlidersIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-800">Threshold Configuration</h2>
                    <p className="text-[11px] text-gray-400">Adjust values to control risk classification sensitivity across the system</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {thresholdSaved && (
                    <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                      Saved successfully
                    </motion.span>
                  )}
                  <button onClick={() => { setThresholdDraft({ ...DEFAULT_THRESHOLDS }); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition">
                    <ResetIcon className="w-3.5 h-3.5" /> Reset Defaults
                  </button>
                  <button onClick={() => {
                    setThresholds({ ...thresholdDraft });
                    localStorage.setItem('admin_weather_thresholds', JSON.stringify(thresholdDraft));
                    setThresholdSaved(true);
                    setTimeout(() => setThresholdSaved(false), 3000);
                    fetchAllWeather();
                  }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 text-white rounded-lg text-xs font-bold hover:bg-sky-600 shadow-sm shadow-sky-200 transition">
                    <SaveIcon className="w-3.5 h-3.5" /> Save & Apply
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {/* ─── Disaster Risk Thresholds ──────────────────── */}
                {activeThresholdSection === 'disaster' && (
                  <motion.div key="disaster-thresholds"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="space-y-5">

                    {/* Flood Risk */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-200/50">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                          <DropletIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-blue-800">Flood Risk Thresholds</h3>
                          <p className="text-[10px] text-blue-500">Precipitation + humidity + low elevation (Terai plains)</p>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { key: 'precipCritical', label: 'Precip Critical', unit: 'mm', desc: 'Above this = Critical risk', color: 'red' },
                            { key: 'precipHigh', label: 'Precip High', unit: 'mm', desc: 'Above this = High risk', color: 'orange' },
                            { key: 'precipModerate', label: 'Precip Moderate', unit: 'mm', desc: 'Above this = Moderate risk', color: 'amber' },
                            { key: 'humidityCritical', label: 'Humidity Critical', unit: '%', desc: 'Combined with precip + lowland', color: 'red' },
                            { key: 'humidityHigh', label: 'Humidity High', unit: '%', desc: 'Combined with precip for high', color: 'orange' },
                            { key: 'humidityModerate', label: 'Humidity Moderate', unit: '%', desc: 'Above this = Moderate risk', color: 'amber' },
                            { key: 'precipComboCritical', label: 'Precip Combo Critical', unit: 'mm', desc: 'Precip threshold for combo check', color: 'red' },
                            { key: 'precipComboHigh', label: 'Precip Combo High', unit: 'mm', desc: 'Precip threshold for high combo', color: 'orange' },
                            { key: 'lowlandElevation', label: 'Lowland Elevation', unit: 'm', desc: 'Below this = lowland terrain', color: 'blue' },
                          ].map(field => (
                            <div key={field.key} className="relative">
                              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{field.label}</label>
                              <div className="relative">
                                <input type="number" step="any"
                                  value={thresholdDraft.flood[field.key]}
                                  onChange={e => setThresholdDraft(prev => ({ ...prev, flood: { ...prev.flood, [field.key]: parseFloat(e.target.value) || 0 } }))}
                                  className={`w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-${field.color}-300 focus:border-${field.color}-400 transition`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">{field.unit}</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">{field.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Landslide Risk */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-amber-50 to-amber-100/50 border-b border-amber-200/50">
                        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                          <MountainIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-amber-800">Landslide Risk Thresholds</h3>
                          <p className="text-[10px] text-amber-500">Precipitation + humidity + hilly terrain (500-3000m)</p>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { key: 'precipCritical', label: 'Precip Critical (Hilly)', unit: 'mm', desc: 'Above this in hilly = Critical', color: 'red' },
                            { key: 'precipHigh', label: 'Precip High (Hilly)', unit: 'mm', desc: 'Above this in hilly = High', color: 'orange' },
                            { key: 'precipHighAny', label: 'Precip High (Any)', unit: 'mm', desc: 'Above this any terrain = High', color: 'orange' },
                            { key: 'precipModerate', label: 'Precip Moderate', unit: 'mm', desc: 'Above this + elevation = Moderate', color: 'amber' },
                            { key: 'hillyMin', label: 'Hilly Min Elevation', unit: 'm', desc: 'Lower bound for hilly terrain', color: 'amber' },
                            { key: 'hillyMax', label: 'Hilly Max Elevation', unit: 'm', desc: 'Upper bound for hilly terrain', color: 'amber' },
                            { key: 'moderateElevation', label: 'Moderate Elevation', unit: 'm', desc: 'Min elevation for moderate risk', color: 'amber' },
                          ].map(field => (
                            <div key={field.key}>
                              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{field.label}</label>
                              <div className="relative">
                                <input type="number" step="any"
                                  value={thresholdDraft.landslide[field.key]}
                                  onChange={e => setThresholdDraft(prev => ({ ...prev, landslide: { ...prev.landslide, [field.key]: parseFloat(e.target.value) || 0 } }))}
                                  className="w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">{field.unit}</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">{field.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Storm Risk */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-teal-50 to-teal-100/50 border-b border-teal-200/50">
                        <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                          <WindIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-teal-800">Storm Risk Thresholds</h3>
                          <p className="text-[10px] text-teal-500">Wind speed + gusts + severe weather codes</p>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { key: 'gustsCritical', label: 'Gusts Critical', unit: 'km/h', desc: 'Above this = Critical storm', color: 'red' },
                            { key: 'gustsHigh', label: 'Gusts High', unit: 'km/h', desc: 'Above this = High risk', color: 'orange' },
                            { key: 'gustsModerate', label: 'Gusts Moderate', unit: 'km/h', desc: 'Above this = Moderate risk', color: 'amber' },
                            { key: 'windHigh', label: 'Wind Speed High', unit: 'km/h', desc: 'Sustained wind for High risk', color: 'orange' },
                            { key: 'windModerate', label: 'Wind Speed Moderate', unit: 'km/h', desc: 'Sustained wind for Moderate', color: 'amber' },
                            { key: 'weatherCodeCritical', label: 'Weather Code Critical', unit: 'code', desc: '>= this = Critical (95 = thunderstorm)', color: 'red' },
                            { key: 'weatherCodeHigh', label: 'Weather Code High', unit: 'code', desc: '>= this = High (80 = heavy showers)', color: 'orange' },
                          ].map(field => (
                            <div key={field.key}>
                              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{field.label}</label>
                              <div className="relative">
                                <input type="number" step="any"
                                  value={thresholdDraft.storm[field.key]}
                                  onChange={e => setThresholdDraft(prev => ({ ...prev, storm: { ...prev.storm, [field.key]: parseFloat(e.target.value) || 0 } }))}
                                  className="w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 transition"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">{field.unit}</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">{field.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Risk Level Legend */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                      <h3 className="text-sm font-bold text-gray-800 mb-3">Risk Classification Logic</h3>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { level: 'critical', label: 'Critical', desc: 'Immediate danger. Emergency protocols activate.', color: 'bg-red-500' },
                          { level: 'high', label: 'High', desc: 'Significant risk. Close monitoring required.', color: 'bg-orange-500' },
                          { level: 'moderate', label: 'Moderate', desc: 'Elevated conditions. Watch status active.', color: 'bg-amber-500' },
                          { level: 'low', label: 'Safe', desc: 'Normal operations. Standard monitoring.', color: 'bg-emerald-500' },
                        ].map(r => (
                          <div key={r.level} className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className={`w-3 h-3 rounded-full ${r.color} mt-0.5 flex-shrink-0`} />
                            <div>
                              <p className="text-xs font-bold text-gray-700">{r.label}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{r.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-3 bg-gray-50 px-3 py-2 rounded-lg">
                        <strong>Overall Risk</strong> = worst (highest severity) among Flood, Landslide, and Storm for each district. Changes apply after clicking "Save & Apply" and automatically re-fetch weather data.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* ─── Drone Flight Thresholds ───────────────────── */}
                {activeThresholdSection === 'flight' && (
                  <motion.div key="flight-thresholds"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="space-y-5">

                    {/* Flight parameter cards */}
                    {[
                      {
                        title: 'Wind Speed', icon: <WindIcon className="w-4 h-4 text-white" />, gradient: 'from-cyan-50 to-cyan-100/50', borderColor: 'border-cyan-200/50', iconBg: 'bg-cyan-500', titleColor: 'text-cyan-800', descColor: 'text-cyan-500',
                        desc: 'Sustained wind speed thresholds for drone operations',
                        fields: [
                          { key: 'windSafe', label: 'Safe Limit', unit: 'km/h', desc: 'Below this = GO', tag: 'GO', tagColor: 'bg-emerald-100 text-emerald-700' },
                          { key: 'windCaution', label: 'Caution Limit', unit: 'km/h', desc: 'Above safe, below danger = CAUTION', tag: 'CAUTION', tagColor: 'bg-amber-100 text-amber-700' },
                          { key: 'windDanger', label: 'Danger Limit', unit: 'km/h', desc: 'At or above = NO GO', tag: 'NO GO', tagColor: 'bg-red-100 text-red-700' },
                        ]
                      },
                      {
                        title: 'Wind Gusts', icon: <WindIcon className="w-4 h-4 text-white" />, gradient: 'from-violet-50 to-violet-100/50', borderColor: 'border-violet-200/50', iconBg: 'bg-violet-500', titleColor: 'text-violet-800', descColor: 'text-violet-500',
                        desc: 'Intermittent gust thresholds — sudden loss of control risk',
                        fields: [
                          { key: 'gustsSafe', label: 'Safe Limit', unit: 'km/h', desc: 'Below this = GO', tag: 'GO', tagColor: 'bg-emerald-100 text-emerald-700' },
                          { key: 'gustsCaution', label: 'Caution Limit', unit: 'km/h', desc: 'Intermittent instability', tag: 'CAUTION', tagColor: 'bg-amber-100 text-amber-700' },
                          { key: 'gustsDanger', label: 'Danger Limit', unit: 'km/h', desc: 'Risk of loss of control', tag: 'NO GO', tagColor: 'bg-red-100 text-red-700' },
                        ]
                      },
                      {
                        title: 'Visibility', icon: <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
                        gradient: 'from-sky-50 to-sky-100/50', borderColor: 'border-sky-200/50', iconBg: 'bg-sky-500', titleColor: 'text-sky-800', descColor: 'text-sky-500',
                        desc: 'Visual line-of-sight (VLOS) distance thresholds',
                        fields: [
                          { key: 'visibilitySafe', label: 'Safe Distance', unit: 'm', desc: 'Clear VLOS conditions', tag: 'GO', tagColor: 'bg-emerald-100 text-emerald-700' },
                          { key: 'visibilityCaution', label: 'Caution Distance', unit: 'm', desc: 'Reduced range required', tag: 'CAUTION', tagColor: 'bg-amber-100 text-amber-700' },
                          { key: 'visibilityDanger', label: 'Min VLOS Distance', unit: 'm', desc: 'Below minimum VLOS threshold', tag: 'NO GO', tagColor: 'bg-red-100 text-red-700' },
                        ]
                      },
                      {
                        title: 'Precipitation', icon: <DropletIcon className="w-4 h-4 text-white" />,
                        gradient: 'from-blue-50 to-blue-100/50', borderColor: 'border-blue-200/50', iconBg: 'bg-blue-500', titleColor: 'text-blue-800', descColor: 'text-blue-500',
                        desc: 'Rainfall thresholds — water ingress risk to aircraft',
                        fields: [
                          { key: 'precipSafe', label: 'Safe Limit', unit: 'mm', desc: 'Trace amounts only', tag: 'GO', tagColor: 'bg-emerald-100 text-emerald-700' },
                          { key: 'precipCaution', label: 'Caution Limit', unit: 'mm', desc: 'Light precipitation', tag: 'CAUTION', tagColor: 'bg-amber-100 text-amber-700' },
                          { key: 'precipDanger', label: 'Danger Limit', unit: 'mm', desc: 'Heavy precip — ground drones', tag: 'NO GO', tagColor: 'bg-red-100 text-red-700' },
                        ]
                      },
                      {
                        title: 'Temperature', icon: <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>,
                        gradient: 'from-rose-50 to-rose-100/50', borderColor: 'border-rose-200/50', iconBg: 'bg-rose-500', titleColor: 'text-rose-800', descColor: 'text-rose-500',
                        desc: 'Operating temperature range — battery and motor performance',
                        fields: [
                          { key: 'tempMin', label: 'Min Temperature', unit: '°C', desc: 'Below = battery degradation', tag: 'MIN', tagColor: 'bg-blue-100 text-blue-700' },
                          { key: 'tempMax', label: 'Max Temperature', unit: '°C', desc: 'Above = motor overheating risk', tag: 'MAX', tagColor: 'bg-red-100 text-red-700' },
                        ]
                      },
                      {
                        title: 'Cloud Cover', icon: <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>,
                        gradient: 'from-slate-50 to-slate-100/50', borderColor: 'border-slate-200/50', iconBg: 'bg-slate-500', titleColor: 'text-slate-800', descColor: 'text-slate-500',
                        desc: 'Sky coverage thresholds — GPS signal quality impact',
                        fields: [
                          { key: 'cloudSafe', label: 'Safe Coverage', unit: '%', desc: 'Adequate sky visibility', tag: 'GO', tagColor: 'bg-emerald-100 text-emerald-700' },
                          { key: 'cloudCaution', label: 'Caution Coverage', unit: '%', desc: 'Reduced GPS quality', tag: 'CAUTION', tagColor: 'bg-amber-100 text-amber-700' },
                          { key: 'cloudDanger', label: 'Overcast Limit', unit: '%', desc: 'GPS signal degradation risk', tag: 'CAUTION', tagColor: 'bg-amber-100 text-amber-700' },
                        ]
                      },
                    ].map(section => (
                      <div key={section.title} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className={`flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r ${section.gradient} border-b ${section.borderColor}`}>
                          <div className={`w-8 h-8 ${section.iconBg} rounded-lg flex items-center justify-center`}>{section.icon}</div>
                          <div>
                            <h3 className={`text-sm font-bold ${section.titleColor}`}>{section.title}</h3>
                            <p className={`text-[10px] ${section.descColor}`}>{section.desc}</p>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className={`grid grid-cols-${section.fields.length} gap-4`}>
                            {section.fields.map(field => (
                              <div key={field.key}>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <label className="text-xs font-semibold text-gray-600">{field.label}</label>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${field.tagColor}`}>{field.tag}</span>
                                </div>
                                <div className="relative">
                                  <input type="number" step="any"
                                    value={thresholdDraft.flight[field.key]}
                                    onChange={e => setThresholdDraft(prev => ({ ...prev, flight: { ...prev.flight, [field.key]: parseFloat(e.target.value) || 0 } }))}
                                    className="w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">{field.unit}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">{field.desc}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Flight Status Legend */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                      <h3 className="text-sm font-bold text-gray-800 mb-3">Flight Status Classification</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { tag: 'GO', color: 'bg-emerald-500', desc: 'All parameters safe. Standard operations.', tagBg: 'bg-emerald-100 text-emerald-700' },
                          { tag: 'CAUTION', color: 'bg-amber-500', desc: 'Reduced altitude/range. Increased monitoring.', tagBg: 'bg-amber-100 text-amber-700' },
                          { tag: 'NO GO', color: 'bg-red-500', desc: 'Flight grounded. Do not launch.', tagBg: 'bg-red-100 text-red-700' },
                        ].map(s => (
                          <div key={s.tag} className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className={`w-3 h-3 rounded-full ${s.color} mt-0.5 flex-shrink-0`} />
                            <div>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.tagBg}`}>{s.tag}</span>
                              <p className="text-[10px] text-gray-400 mt-1">{s.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-3 bg-gray-50 px-3 py-2 rounded-lg">
                        <strong>Flight Decision</strong> = worst status among all parameters. These thresholds apply to drone operations in Disaster Report submissions and the Drone Visualization live flight system. Changes apply after clicking "Save & Apply".
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ─── TAB 3: Seasonal Analytics ──────────────────────── */}
          {activeView === 'seasonal' && (
            <motion.div key="seasonal"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}>

              {/* Current Season Banner */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(90deg, ${currentSeason.gradient[0]}, ${currentSeason.gradient[1]})` }} />
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${currentSeason.gradient[0]}, ${currentSeason.gradient[1]})` }}>
                      {currentSeason.icon === 'sun' && <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>}
                      {currentSeason.icon === 'rain' && <DropletIcon className="w-7 h-7 text-white" />}
                      {currentSeason.icon === 'cloud' && <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>}
                      {currentSeason.icon === 'snow' && <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/></svg>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-gray-800">Current: {currentSeason.label} Season</h2>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg text-white" style={{ backgroundColor: currentSeason.color }}>
                          {currentSeason.months.map(m => MONTH_NAMES[m - 1]).join(' - ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{currentSeason.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Risk Priority</p>
                      <p className={`text-lg font-extrabold ${
                        recommendations.level === 'critical' ? 'text-red-500' :
                        recommendations.level === 'moderate' ? 'text-amber-500' : 'text-emerald-500'
                      }`}>{recommendations.priority}</p>
                    </div>
                  </div>
                </div>

                {/* Season Timeline */}
                <div className="mt-5 flex gap-2">
                  {NEPAL_SEASONS.map(s => (
                    <div key={s.id} className={`flex-1 rounded-lg p-2.5 border transition-all ${
                      s.id === currentSeason.id ? 'border-2 shadow-md' : 'border-gray-200 opacity-60'
                    }`} style={s.id === currentSeason.id ? { borderColor: s.color, background: `${s.color}08` } : {}}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-xs font-bold text-gray-700">{s.label}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">{s.months.map(m => MONTH_NAMES[m - 1]).join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls Bar */}
              <div className="flex items-center justify-between mb-5 bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-500">Year</label>
                    <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300">
                      {[2026, 2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-500">Compare with</label>
                    <select value={compareYear} onChange={e => setCompareYear(parseInt(e.target.value))}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300">
                      {[2025, 2024, 2023, 2022, 2021].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => fetchSeasonalData(selectedYear, compareYear)} disabled={seasonalLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-bold hover:bg-sky-600 shadow-sm shadow-sky-200 transition disabled:opacity-50">
                  <RefreshIcon className={`w-4 h-4 ${seasonalLoading ? 'animate-spin' : ''}`} />
                  {seasonalLoading ? 'Fetching Historical Data...' : 'Load Analytics'}
                </button>
              </div>

              {/* Loading State */}
              {seasonalLoading && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center mb-5">
                  <div className="w-12 h-12 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm font-semibold text-gray-600">Fetching historical weather data from Open-Meteo Archive...</p>
                  <p className="text-xs text-gray-400 mt-1">Analyzing {SAMPLE_DISTRICTS.length} representative locations across Nepal for {selectedYear} & {compareYear}</p>
                </div>
              )}

              {/* No Data State */}
              {!seasonalData && !seasonalLoading && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center mb-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ChartIcon className="w-8 h-8 text-sky-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Load Seasonal Analytics</h3>
                  <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                    Click "Load Analytics" above to fetch historical weather data and generate year-over-year comparison charts, seasonal risk heatmaps, and resource allocation insights.
                  </p>
                </div>
              )}

              {/* Charts & Analytics - shown when data is loaded */}
              {seasonalData && !seasonalLoading && (
                <div className="space-y-5">

                  {/* Season Comparison Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    {NEPAL_SEASONS.map(season => {
                      const curr = seasonalData.seasons[selectedYear]?.[season.id];
                      const prev = seasonalData.seasons[compareYear]?.[season.id];
                      const precipChange = curr && prev ? ((curr.totalPrecip - prev.totalPrecip) / (prev.totalPrecip || 1) * 100).toFixed(0) : null;
                      const tempChange = curr && prev ? (curr.avgTemp - prev.avgTemp).toFixed(1) : null;
                      return (
                        <motion.div key={season.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: NEPAL_SEASONS.indexOf(season) * 0.05 }}
                          className={`bg-white rounded-xl border shadow-sm p-4 relative overflow-hidden ${
                            season.id === currentSeason.id ? 'border-2 ring-1 ring-offset-1' : 'border-gray-200'
                          }`} style={season.id === currentSeason.id ? { borderColor: season.color, ringColor: season.color } : {}}>
                          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${season.gradient[0]}, ${season.gradient[1]})` }} />
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: season.color }} />
                            <span className="text-sm font-bold text-gray-800">{season.label}</span>
                            {season.id === currentSeason.id && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-600 ml-auto">CURRENT</span>
                            )}
                          </div>
                          {curr ? (
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Avg Temp</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-gray-800">{curr.avgTemp}°C</span>
                                  {tempChange && (
                                    <span className={`text-[9px] font-bold ${parseFloat(tempChange) > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                      {parseFloat(tempChange) > 0 ? '+' : ''}{tempChange}°
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Total Rain</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-gray-800">{curr.totalPrecip}mm</span>
                                  {precipChange && (
                                    <span className={`text-[9px] font-bold ${parseInt(precipChange) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                      {parseInt(precipChange) > 0 ? '+' : ''}{precipChange}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Avg Wind</span>
                                <span className="font-bold text-gray-800">{curr.avgWind} km/h</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Max Gusts</span>
                                <span className="font-bold text-gray-800">{curr.avgGusts} km/h</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 py-3 text-center">No data yet</p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Monthly Risk Heatmap */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-red-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">Monthly Risk Score Heatmap — {selectedYear}</h3>
                        <p className="text-[10px] text-gray-400">Composite risk score (0-100) based on precipitation, wind, and temperature extremity</p>
                      </div>
                      <div className="ml-auto flex items-center gap-2 text-[10px]">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200" />Low</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-300" />Moderate</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400" />High</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" />Critical</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <ReactECharts option={seasonRiskHeatmapOption} style={{ height: 80 }} />
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-2 gap-5">
                    {/* Precipitation Chart */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                          <DropletIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-800">Monthly Precipitation</h3>
                          <p className="text-[10px] text-gray-400">{selectedYear} vs {compareYear} total rainfall comparison</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <ReactECharts option={precipChartOption} style={{ height: 280 }} />
                      </div>
                    </div>

                    {/* Temperature Chart */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-rose-500 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-800">Average Temperature</h3>
                          <p className="text-[10px] text-gray-400">{selectedYear} vs {compareYear} monthly temperature trends</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <ReactECharts option={tempChartOption} style={{ height: 280 }} />
                      </div>
                    </div>
                  </div>

                  {/* Wind Chart - Full Width */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center">
                        <WindIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">Wind Speed & Gusts Analysis</h3>
                        <p className="text-[10px] text-gray-400">Monthly sustained wind and gust patterns — critical for drone flight planning</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <ReactECharts option={windChartOption} style={{ height: 280 }} />
                    </div>
                  </div>

                  {/* Year-over-Year Season Comparison Table */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
                      <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-purple-600 rounded-lg flex items-center justify-center">
                        <ChartIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">Year-over-Year Season Comparison</h3>
                        <p className="text-[10px] text-gray-400">{selectedYear} vs {compareYear} — key metrics per season</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr className="text-left text-gray-500 uppercase tracking-wider">
                            <th className="px-4 py-3 font-semibold">Season</th>
                            <th className="px-4 py-3 font-semibold text-center">Period</th>
                            <th className="px-4 py-3 font-semibold text-center">Avg Temp ({selectedYear})</th>
                            <th className="px-4 py-3 font-semibold text-center">Avg Temp ({compareYear})</th>
                            <th className="px-4 py-3 font-semibold text-center">Change</th>
                            <th className="px-4 py-3 font-semibold text-center">Precip ({selectedYear})</th>
                            <th className="px-4 py-3 font-semibold text-center">Precip ({compareYear})</th>
                            <th className="px-4 py-3 font-semibold text-center">Change</th>
                            <th className="px-4 py-3 font-semibold text-center">Max Wind ({selectedYear})</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {NEPAL_SEASONS.map(season => {
                            const curr = seasonalData.seasons[selectedYear]?.[season.id];
                            const prev = seasonalData.seasons[compareYear]?.[season.id];
                            const tempDiff = curr && prev ? (curr.avgTemp - prev.avgTemp).toFixed(1) : null;
                            const precipDiff = curr && prev ? ((curr.totalPrecip - prev.totalPrecip) / (prev.totalPrecip || 1) * 100).toFixed(0) : null;
                            return (
                              <tr key={season.id} className={season.id === currentSeason.id ? 'bg-sky-50/50' : ''}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: season.color }} />
                                    <span className="font-semibold text-gray-800">{season.label}</span>
                                    {season.id === currentSeason.id && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-sky-100 text-sky-600">NOW</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center text-gray-500">{season.months.map(m => MONTH_NAMES[m - 1]).join(', ')}</td>
                                <td className="px-4 py-3 text-center font-mono font-semibold">{curr?.avgTemp ?? '--'}°C</td>
                                <td className="px-4 py-3 text-center font-mono text-gray-500">{prev?.avgTemp ?? '--'}°C</td>
                                <td className="px-4 py-3 text-center">
                                  {tempDiff !== null ? (
                                    <span className={`font-bold ${parseFloat(tempDiff) > 0 ? 'text-red-500' : parseFloat(tempDiff) < 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                                      {parseFloat(tempDiff) > 0 ? '+' : ''}{tempDiff}°
                                    </span>
                                  ) : '--'}
                                </td>
                                <td className="px-4 py-3 text-center font-mono font-semibold">{curr?.totalPrecip ?? '--'}mm</td>
                                <td className="px-4 py-3 text-center font-mono text-gray-500">{prev?.totalPrecip ?? '--'}mm</td>
                                <td className="px-4 py-3 text-center">
                                  {precipDiff !== null ? (
                                    <span className={`font-bold ${parseInt(precipDiff) > 10 ? 'text-red-500' : parseInt(precipDiff) < -10 ? 'text-emerald-500' : 'text-gray-500'}`}>
                                      {parseInt(precipDiff) > 0 ? '+' : ''}{precipDiff}%
                                    </span>
                                  ) : '--'}
                                </td>
                                <td className="px-4 py-3 text-center font-mono font-semibold">{curr?.avgGusts ?? '--'} km/h</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Resource Allocation Recommendations — always visible */}
              <div className="mt-5 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100" style={{ background: `linear-gradient(135deg, ${currentSeason.color}08, ${currentSeason.color}15)` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: `linear-gradient(135deg, ${currentSeason.gradient[0]}, ${currentSeason.gradient[1]})` }}>
                    <ShieldIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Resource Allocation — {currentSeason.label} Season</h3>
                    <p className="text-[10px] text-gray-400">Recommended resource deployment based on seasonal risk profile and current conditions</p>
                  </div>
                  <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-lg ${
                    recommendations.level === 'critical' ? 'bg-red-100 text-red-700' :
                    recommendations.level === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {recommendations.priority}
                  </span>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-4">
                    {recommendations.items.map((item, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            item.priority === 'critical' ? 'bg-red-100' :
                            item.priority === 'high' ? 'bg-amber-100' : 'bg-sky-100'
                          }`}>
                            {item.icon === 'drone' && <DroneIcon className={`w-3.5 h-3.5 ${item.priority === 'critical' ? 'text-red-600' : item.priority === 'high' ? 'text-amber-600' : 'text-sky-600'}`} />}
                            {item.icon === 'shelter' && <svg className={`w-3.5 h-3.5 ${item.priority === 'critical' ? 'text-red-600' : item.priority === 'high' ? 'text-amber-600' : 'text-sky-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>}
                            {item.icon === 'medical' && <svg className={`w-3.5 h-3.5 ${item.priority === 'critical' ? 'text-red-600' : item.priority === 'high' ? 'text-amber-600' : 'text-sky-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
                            {item.icon === 'comms' && <svg className={`w-3.5 h-3.5 ${item.priority === 'critical' ? 'text-red-600' : item.priority === 'high' ? 'text-amber-600' : 'text-sky-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5.5 16.5l-1.5 5 5-1.5L22 7 17 2z"/></svg>}
                            {item.icon === 'training' && <svg className={`w-3.5 h-3.5 ${item.priority === 'critical' ? 'text-red-600' : item.priority === 'high' ? 'text-amber-600' : 'text-sky-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                            {item.icon === 'boat' && <DropletIcon className={`w-3.5 h-3.5 ${item.priority === 'critical' ? 'text-red-600' : item.priority === 'high' ? 'text-amber-600' : 'text-sky-600'}`} />}
                            {item.icon === 'rescue' && <AlertIcon className={`w-3.5 h-3.5 ${item.priority === 'critical' ? 'text-red-600' : item.priority === 'high' ? 'text-amber-600' : 'text-sky-600'}`} />}
                            {item.icon === 'road' && <svg className={`w-3.5 h-3.5 ${item.priority === 'critical' ? 'text-red-600' : item.priority === 'high' ? 'text-amber-600' : 'text-sky-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
                            {item.icon === 'supply' && <svg className={`w-3.5 h-3.5 ${item.priority === 'critical' ? 'text-red-600' : item.priority === 'high' ? 'text-amber-600' : 'text-sky-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>}
                            {item.icon === 'data' && <ChartIcon className={`w-3.5 h-3.5 ${item.priority === 'critical' ? 'text-red-600' : item.priority === 'high' ? 'text-amber-600' : 'text-sky-600'}`} />}
                            {item.icon === 'audit' && <ShieldIcon className={`w-3.5 h-3.5 ${item.priority === 'critical' ? 'text-red-600' : item.priority === 'high' ? 'text-amber-600' : 'text-sky-600'}`} />}
                            {item.icon === 'sensor' && <svg className={`w-3.5 h-3.5 ${item.priority === 'critical' ? 'text-red-600' : item.priority === 'high' ? 'text-amber-600' : 'text-sky-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                            {item.icon === 'planning' && <MapIcon className={`w-3.5 h-3.5 ${item.priority === 'critical' ? 'text-red-600' : item.priority === 'high' ? 'text-amber-600' : 'text-sky-600'}`} />}
                            {item.icon === 'budget' && <svg className={`w-3.5 h-3.5 ${item.priority === 'critical' ? 'text-red-600' : item.priority === 'high' ? 'text-amber-600' : 'text-sky-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                          </div>
                          <span className="text-xs font-bold text-gray-800">{item.resource}</span>
                          <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            item.priority === 'critical' ? 'bg-red-100 text-red-600' :
                            item.priority === 'high' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'
                          }`}>{item.priority.toUpperCase()}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">{item.action}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* ─── TAB 4: Export & Reporting ──────────────────────── */}
          {activeView === 'export' && (
            <motion.div key="export"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}>

              <div className="grid grid-cols-3 gap-5">

                {/* Left Column: Export Tools */}
                <div className="col-span-1 space-y-5">

                  {/* Date Range Selector */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      Date Range
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">From</label>
                        <input type="date" value={exportDateFrom} onChange={e => setExportDateFrom(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">To</label>
                        <input type="date" value={exportDateTo} onChange={e => setExportDateTo(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                      </div>
                    </div>
                  </div>

                  {/* Quick Export Actions */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Quick Exports
                    </h3>
                    <div className="space-y-2">
                      {/* CSV Export - District Weather Data */}
                      <button onClick={() => {
                        if (districtData.length === 0) return;
                        setExportStatus('Generating CSV...');
                        const headers = ['District', 'Province', 'Elevation (m)', 'Temperature (°C)', 'Precipitation (mm)', 'Wind (km/h)', 'Gusts (km/h)', 'Humidity (%)', 'Weather Code', 'Flood Risk', 'Landslide Risk', 'Storm Risk', 'Overall Risk'];
                        const rows = districtData.map(d => [d.name, d.province, d.elev, d.temp ?? '', d.precip ?? 0, d.wind ?? 0, d.gusts ?? 0, d.humidity ?? 0, d.weatherCode ?? 0, d.risk.flood, d.risk.landslide, d.risk.storm, d.risk.overall]);
                        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                        saveAs(blob, `nepal_district_weather_${exportDateFrom}_to_${exportDateTo}.csv`);
                        setExportStatus('CSV exported!');
                        setTimeout(() => setExportStatus(''), 3000);
                      }}
                        className="w-full flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-left hover:bg-emerald-100 transition group">
                        <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-800">District Weather Data (CSV)</p>
                          <p className="text-[10px] text-emerald-600">All 77 districts — weather + risk levels</p>
                        </div>
                      </button>

                      {/* JSON Export */}
                      <button onClick={() => {
                        if (districtData.length === 0) return;
                        setExportStatus('Generating JSON...');
                        const data = districtData.map(d => ({ district: d.name, province: d.province, lat: d.lat, lng: d.lng, elevation: d.elev, weather: { temperature: d.temp, precipitation: d.precip, windSpeed: d.wind, windGusts: d.gusts, humidity: d.humidity, weatherCode: d.weatherCode }, risk: d.risk }));
                        const blob = new Blob([JSON.stringify({ exportDate: new Date().toISOString(), dateRange: { from: exportDateFrom, to: exportDateTo }, districts: data }, null, 2)], { type: 'application/json' });
                        saveAs(blob, `nepal_weather_data_${exportDateFrom}.json`);
                        setExportStatus('JSON exported!');
                        setTimeout(() => setExportStatus(''), 3000);
                      }}
                        className="w-full flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition group">
                        <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-blue-800">Weather + Risk Data (JSON)</p>
                          <p className="text-[10px] text-blue-600">Structured data for integrations</p>
                        </div>
                      </button>

                      {/* PDF Risk Report */}
                      <button onClick={async () => {
                        if (districtData.length === 0) return;
                        setExportStatus('Generating PDF...');
                        try {
                          const doc = new jsPDF();
                          // Logo
                          const logoBase64 = await loadImageAsBase64(SankalpaLogo);
                          if (logoBase64) doc.addImage(logoBase64, 'PNG', 14, 8, 14, 14);
                          // Title
                          doc.setFontSize(18);
                          doc.setTextColor(15, 23, 42);
                          doc.text('Nepal District Risk Assessment Report', 30, 16);
                          doc.setFontSize(10);
                          doc.setTextColor(107, 114, 128);
                          doc.text(`Generated: ${new Date().toLocaleString()} | Period: ${exportDateFrom} to ${exportDateTo}`, 30, 22);

                          // Summary
                          doc.setFontSize(12);
                          doc.setTextColor(15, 23, 42);
                          doc.text('Risk Summary', 14, 42);
                          doc.setFontSize(10);
                          doc.setTextColor(55, 65, 81);
                          doc.text(`Total Districts: ${districtData.length} | Critical: ${riskStats.critical} | High: ${riskStats.high} | Moderate: ${riskStats.moderate} | Safe: ${riskStats.low}`, 14, 50);

                          // Table
                          autoTable(doc, {
                            startY: 58,
                            head: [['District', 'Province', 'Temp °C', 'Rain mm', 'Wind km/h', 'Flood', 'Landslide', 'Storm', 'Overall']],
                            body: districtData
                              .sort((a, b) => { const lv = { critical: 4, high: 3, moderate: 2, low: 1 }; return (lv[b.risk.overall] || 0) - (lv[a.risk.overall] || 0); })
                              .map(d => [d.name, d.province, d.temp ?? '--', d.precip ?? 0, d.wind ?? 0, d.risk.flood, d.risk.landslide, d.risk.storm, d.risk.overall]),
                            styles: { fontSize: 7, cellPadding: 2 },
                            headStyles: { fillColor: [14, 165, 233], fontSize: 7, fontStyle: 'bold' },
                            alternateRowStyles: { fillColor: [248, 250, 252] },
                            didParseCell: (data) => {
                              if (data.section === 'body' && data.column.index >= 5) {
                                const val = data.cell.raw;
                                if (val === 'critical') data.cell.styles.textColor = [220, 38, 38];
                                else if (val === 'high') data.cell.styles.textColor = [249, 115, 22];
                                else if (val === 'moderate') data.cell.styles.textColor = [217, 119, 6];
                                else data.cell.styles.textColor = [22, 163, 74];
                              }
                            },
                          });

                          // Footer
                          const pageCount = doc.internal.getNumberOfPages();
                          for (let i = 1; i <= pageCount; i++) {
                            doc.setPage(i);
                            doc.setFontSize(8);
                            doc.setTextColor(156, 163, 175);
                            doc.text(`Nepal Disaster Management System — Weather Intelligence | Page ${i}/${pageCount}`, 14, doc.internal.pageSize.height - 10);
                          }

                          doc.save(`nepal_risk_report_${exportDateFrom}.pdf`);
                          setExportStatus('PDF exported!');
                        } catch (e) {
                          console.error('PDF error:', e);
                          setExportStatus('PDF export failed');
                        }
                        setTimeout(() => setExportStatus(''), 3000);
                      }}
                        className="w-full flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-left hover:bg-red-100 transition group">
                        <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-red-800">Risk Assessment Report (PDF)</p>
                          <p className="text-[10px] text-red-600">Full district table with risk color coding</p>
                        </div>
                      </button>

                      {/* Threshold Config Export */}
                      <button onClick={() => {
                        setExportStatus('Exporting thresholds...');
                        const blob = new Blob([JSON.stringify({ exportDate: new Date().toISOString(), thresholds }, null, 2)], { type: 'application/json' });
                        saveAs(blob, `threshold_config_${new Date().toISOString().split('T')[0]}.json`);
                        setExportStatus('Config exported!');
                        setTimeout(() => setExportStatus(''), 3000);
                      }}
                        className="w-full flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-lg text-left hover:bg-violet-100 transition group">
                        <div className="w-9 h-9 bg-violet-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <SlidersIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-violet-800">Threshold Configuration (JSON)</p>
                          <p className="text-[10px] text-violet-600">Backup current disaster & flight thresholds</p>
                        </div>
                      </button>

                      {/* Critical Alerts Only CSV */}
                      <button onClick={() => {
                        const critical = districtData.filter(d => d.risk.overall === 'critical' || d.risk.overall === 'high');
                        if (critical.length === 0) { setExportStatus('No critical districts'); setTimeout(() => setExportStatus(''), 3000); return; }
                        setExportStatus('Generating alert CSV...');
                        const headers = ['District', 'Province', 'Risk Level', 'Primary Threat', 'Precipitation (mm)', 'Wind (km/h)', 'Gusts (km/h)', 'Temperature (°C)'];
                        const rows = critical.map(d => {
                          const riskLevels = { critical: 4, high: 3, moderate: 2, low: 1 };
                          let primary = 'Storm';
                          if (riskLevels[d.risk.flood] >= riskLevels[d.risk.landslide] && riskLevels[d.risk.flood] >= riskLevels[d.risk.storm]) primary = 'Flood';
                          else if (riskLevels[d.risk.landslide] >= riskLevels[d.risk.storm]) primary = 'Landslide';
                          return [d.name, d.province, d.risk.overall.toUpperCase(), primary, d.precip ?? 0, d.wind ?? 0, d.gusts ?? 0, d.temp ?? ''];
                        });
                        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                        saveAs(blob, `critical_alerts_${new Date().toISOString().split('T')[0]}.csv`);
                        setExportStatus('Alert CSV exported!');
                        setTimeout(() => setExportStatus(''), 3000);
                      }}
                        className="w-full flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left hover:bg-amber-100 transition group">
                        <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <AlertIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-amber-800">Critical Alerts Only (CSV)</p>
                          <p className="text-[10px] text-amber-600">High & critical risk districts for rapid response</p>
                        </div>
                      </button>
                    </div>

                    {/* Export Status */}
                    {exportStatus && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 text-center">
                        {exportStatus}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Right Column: AI Report Generator */}
                <div className="col-span-2 space-y-5">

                  {/* AI Report Generator */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200/50">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/><path d="M12 19v3m-4 0h8"/><path d="M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/></svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-indigo-800">AI-Powered Report Generator</h3>
                        <p className="text-[10px] text-indigo-500">Powered by DeepSeek via HuggingFace — generates professional weather & risk reports</p>
                      </div>
                    </div>

                    <div className="p-5">
                      {/* Report Type Selector */}
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        {[
                          { id: 'district_risk', label: 'District Risk Assessment', icon: <MapIcon className="w-4 h-4" />, desc: 'Full district-level analysis' },
                          { id: 'seasonal', label: 'Seasonal Analysis', icon: <ChartIcon className="w-4 h-4" />, desc: 'Current season patterns' },
                          { id: 'drone_readiness', label: 'Drone Readiness', icon: <DroneIcon className="w-4 h-4" />, desc: 'Fleet operations brief' },
                          { id: 'executive', label: 'Executive Briefing', icon: <ShieldIcon className="w-4 h-4" />, desc: 'Leadership summary' },
                        ].map(rt => (
                          <button key={rt.id} onClick={() => setAiReportType(rt.id)}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              aiReportType === rt.id
                                ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200 shadow-sm'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${
                              aiReportType === rt.id ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>{rt.icon}</div>
                            <p className={`text-xs font-bold ${aiReportType === rt.id ? 'text-indigo-700' : 'text-gray-700'}`}>{rt.label}</p>
                            <p className="text-[9px] text-gray-400 mt-0.5">{rt.desc}</p>
                          </button>
                        ))}
                      </div>

                      {/* Generate Button */}
                      <button onClick={async () => {
                        setAiReportLoading(true);
                        setAiReport('');
                        try {
                          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                          const payload = {
                            report_type: aiReportType,
                            date_range: `${exportDateFrom} to ${exportDateTo}`,
                          };
                          if (aiReportType === 'district_risk' || aiReportType === 'executive') {
                            payload.districts = districtData.map(d => ({
                              name: d.name, province: d.province, overall: d.risk.overall,
                              flood: d.risk.flood, landslide: d.risk.landslide, storm: d.risk.storm,
                              precip: d.precip, wind: d.wind, temp: d.temp,
                            }));
                          }
                          if (aiReportType === 'seasonal' && seasonalData) {
                            payload.season_data = seasonalData.seasons[selectedYear] || {};
                          }
                          const currentSeasonInfo = getCurrentSeason();
                          payload.additional_context = `Current season: ${currentSeasonInfo.label} (${currentSeasonInfo.desc}). Risk stats: Critical=${riskStats.critical}, High=${riskStats.high}, Moderate=${riskStats.moderate}, Safe=${riskStats.low}.`;

                          const res = await fetch(`${API_URL}/api/v1/weather/generate-report`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                          });
                          if (!res.ok) throw new Error(`API error: ${res.status}`);
                          const data = await res.json();
                          setAiReport(data.report || 'No report generated.');
                        } catch (err) {
                          console.error('Report generation error:', err);
                          setAiReport(`Error generating report: ${err.message}. Make sure the backend server is running.`);
                        } finally {
                          setAiReportLoading(false);
                        }
                      }} disabled={aiReportLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-200 transition disabled:opacity-50 mb-4">
                        {aiReportLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Generating Report with AI...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                            Generate {aiReportType === 'district_risk' ? 'District Risk' : aiReportType === 'seasonal' ? 'Seasonal' : aiReportType === 'drone_readiness' ? 'Drone Readiness' : 'Executive'} Report
                          </>
                        )}
                      </button>

                      {/* Report Output */}
                      {aiReportLoading && (
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-12 text-center">
                          <div className="w-10 h-10 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                          <p className="text-sm font-semibold text-gray-600">AI is analyzing weather data...</p>
                          <p className="text-xs text-gray-400 mt-1">DeepSeek is generating your {aiReportType.replace('_', ' ')} report</p>
                        </div>
                      )}

                      {aiReport && !aiReportLoading && (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg shadow-gray-100/50">
                          {/* Report Header */}
                          <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 px-5 py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                  <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-white tracking-wide">AI Generated Report</h3>
                                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                                      {aiReportType.replace('_', ' ').toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Generated on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between px-5 py-2.5 bg-gray-50 border-b border-gray-200">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                              <span className="text-[10px] text-gray-500 font-medium">Analysis complete</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Copy to clipboard */}
                              <button onClick={() => { navigator.clipboard.writeText(aiReport); setExportStatus('Copied to clipboard!'); setTimeout(() => setExportStatus(''), 2000); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-gray-200 transition">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                Copy
                              </button>
                              {/* Export as PDF */}
                              <button onClick={async () => {
                                try {
                                  const doc = new jsPDF();
                                  const pageW = doc.internal.pageSize.width;
                                  const pageH = doc.internal.pageSize.height;
                                  const marginL = 20;
                                  const marginR = 20;
                                  const contentW = pageW - marginL - marginR;
                                  const fontSize = 12;
                                  const lineH = fontSize * 0.3528 * 1.5; // 12pt Times with 1.5 line spacing (~6.35mm)
                                  const font = 'times';

                                  // Clean markdown symbols from text
                                  const cleanText = (t) => t
                                    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
                                    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
                                    .replace(/~~([^~]+)~~/g, '$1')
                                    .replace(/^#{1,6}\s+/gm, '')
                                    .replace(/```[\s\S]*?```/g, '')
                                    .replace(/`([^`]+)`/g, '$1');

                                  const titleMap = {
                                    district_risk: { title: 'District Risk Assessment Report', subtitle: 'AI-Generated District-Level Analysis', color: [37, 99, 235] },
                                    seasonal: { title: 'Seasonal Weather Analysis Report', subtitle: 'Climate Pattern Assessment', color: [5, 150, 105] },
                                    drone_readiness: { title: 'Drone Fleet Readiness Report', subtitle: 'Operational Weather Assessment', color: [124, 58, 237] },
                                    executive: { title: 'Executive Briefing', subtitle: 'Leadership Summary Report', color: [15, 23, 42] },
                                  };
                                  const meta = titleMap[aiReportType] || { title: 'Weather Report', subtitle: 'AI Analysis', color: [37, 99, 235] };

                                  // ─── Page 1: Cover Header ───
                                  // Dark header band
                                  doc.setFillColor(15, 23, 42);
                                  doc.rect(0, 0, pageW, 52, 'F');
                                  // Accent stripe
                                  doc.setFillColor(...meta.color);
                                  doc.rect(0, 52, pageW, 2.5, 'F');

                                  // Logo in header
                                  const logoBase64 = await loadImageAsBase64(SankalpaLogo);
                                  const logoOffset = logoBase64 ? 20 : 0;
                                  if (logoBase64) doc.addImage(logoBase64, 'PNG', marginL, 8, 16, 16);

                                  // Title
                                  doc.setFont(font, 'bold');
                                  doc.setFontSize(22);
                                  doc.setTextColor(255, 255, 255);
                                  doc.text(meta.title, marginL + logoOffset, 24);

                                  // Subtitle
                                  doc.setFont(font, 'italic');
                                  doc.setFontSize(12);
                                  doc.setTextColor(160, 174, 192);
                                  doc.text(meta.subtitle, marginL + logoOffset, 33);

                                  // Meta line
                                  doc.setFont(font, 'normal');
                                  doc.setFontSize(10);
                                  doc.setTextColor(148, 163, 184);
                                  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, marginL, 43);
                                  doc.text(`Period: ${exportDateFrom} to ${exportDateTo}`, pageW - marginR, 43, { align: 'right' });

                                  // ─── Parse report into sections ───
                                  const rawText = cleanText(aiReport);
                                  const reportLines = rawText.split('\n');
                                  const sections = [];
                                  let curHeader = null;
                                  let curLines = [];

                                  for (const line of reportLines) {
                                    const trimmed = line.trim();
                                    if (!trimmed) { if (curLines.length > 0) curLines.push(''); continue; }
                                    const sMatch = trimmed.match(/^(\d+)\.\s+([A-Z][A-Z\s&/,\-—–]+)/);
                                    const altMatch = !sMatch && trimmed.match(/^([A-Z][A-Z\s&/,\-—–]{4,}?)(?:\s*[—–:\-]|$)/);
                                    if (sMatch || altMatch) {
                                      if (curHeader || curLines.length > 0) sections.push({ header: curHeader, lines: [...curLines] });
                                      curLines = [];
                                      const hText = sMatch ? sMatch[2].replace(/[—–\-:]+$/, '').trim() : altMatch[1].replace(/[—–\-:]+$/, '').trim();
                                      const after = sMatch
                                        ? trimmed.slice(trimmed.indexOf(sMatch[2]) + sMatch[2].length).replace(/^[—–:\-\s]+/, '').trim()
                                        : trimmed.slice(altMatch[1].length).replace(/^[—–:\-\s]+/, '').trim();
                                      curHeader = hText;
                                      if (after) curLines.push(after);
                                    } else {
                                      curLines.push(trimmed);
                                    }
                                  }
                                  if (curHeader || curLines.length > 0) sections.push({ header: curHeader, lines: [...curLines] });

                                  // Section color themes
                                  const sectionThemes = [
                                    { hBg: [37, 99, 235], lBg: [240, 246, 255], accent: [29, 78, 216] },
                                    { hBg: [220, 38, 38], lBg: [255, 245, 245], accent: [185, 28, 28] },
                                    { hBg: [217, 119, 6], lBg: [255, 252, 240], accent: [180, 83, 9] },
                                    { hBg: [5, 150, 105], lBg: [240, 253, 248], accent: [4, 120, 87] },
                                    { hBg: [124, 58, 237], lBg: [248, 245, 255], accent: [109, 40, 217] },
                                    { hBg: [79, 70, 229], lBg: [242, 243, 255], accent: [67, 56, 202] },
                                  ];

                                  let y = 64;

                                  const checkPage = (needed) => {
                                    if (y + needed > pageH - 22) { doc.addPage(); y = 25; return true; }
                                    return false;
                                  };

                                  // Helper: write wrapped text with 1.5 line spacing, left-justified
                                  const writeWrapped = (text, x, maxW, fStyle = 'normal', fSize = fontSize, color = [40, 40, 40]) => {
                                    doc.setFont(font, fStyle);
                                    doc.setFontSize(fSize);
                                    doc.setTextColor(...color);
                                    const wrapped = doc.splitTextToSize(text, maxW);
                                    const lh = fSize * 0.3528 * 1.5;
                                    for (const wl of wrapped) {
                                      checkPage(lh + 1);
                                      doc.text(wl, x, y);
                                      y += lh;
                                    }
                                  };

                                  for (let si = 0; si < sections.length; si++) {
                                    const section = sections[si];
                                    const theme = sectionThemes[si % sectionThemes.length];

                                    // Preamble (no header)
                                    if (!section.header && section.lines.length > 0) {
                                      for (const ln of section.lines.filter(l => l)) {
                                        writeWrapped(ln, marginL, contentW, 'italic', fontSize, [80, 80, 80]);
                                      }
                                      y += lineH * 0.5;
                                      continue;
                                    }
                                    if (!section.header) continue;

                                    // ─── Section Header Bar ───
                                    checkPage(lineH * 3);
                                    y += 3; // gap before section

                                    const headerH = 9;
                                    doc.setFillColor(...theme.hBg);
                                    doc.roundedRect(marginL - 1, y - 1, contentW + 2, headerH, 1.5, 1.5, 'F');

                                    // Section number + title
                                    const sectionNum = si + (sections[0]?.header ? 1 : 0);
                                    const headerLabel = sections[0]?.header ? `${sectionNum}. ${section.header}` : section.header;
                                    doc.setFont(font, 'bold');
                                    doc.setFontSize(13);
                                    doc.setTextColor(255, 255, 255);
                                    doc.text(headerLabel, marginL + 3, y + 6);
                                    y += headerH + 2;

                                    // ─── Section Body with light background ───
                                    const bodyStartY = y;
                                    // Pre-calculate body height for background
                                    doc.setFont(font, 'normal');
                                    doc.setFontSize(fontSize);
                                    let estimateY = 0;
                                    const bodyLines = section.lines.filter(l => l);
                                    for (const ln of bodyLines) {
                                      const clean = ln.replace(/^[-•●]\s+/, '');
                                      const wrapped = doc.splitTextToSize(clean, contentW - 14);
                                      estimateY += wrapped.length * lineH + 1;
                                    }
                                    const bodyH = Math.max(estimateY + 6, 8);

                                    // Draw background (only for what fits this page)
                                    const bgEnd = Math.min(bodyStartY + bodyH, pageH - 22);
                                    doc.setFillColor(...theme.lBg);
                                    doc.roundedRect(marginL - 1, bodyStartY, contentW + 2, bgEnd - bodyStartY, 1.5, 1.5, 'F');
                                    // Left accent bar
                                    doc.setFillColor(...theme.hBg);
                                    doc.rect(marginL - 1, bodyStartY, 2, bgEnd - bodyStartY, 'F');

                                    y = bodyStartY + 4;

                                    for (const ln of bodyLines) {
                                      const isBullet = /^[-•●]\s+/.test(ln);
                                      const content = ln.replace(/^[-•●]\s+/, '');

                                      if (isBullet) {
                                        checkPage(lineH + 1);
                                        // Bullet dot
                                        doc.setFillColor(...theme.hBg);
                                        doc.circle(marginL + 5, y - 1.2, 1, 'F');

                                        // Check for key: value
                                        const kvMatch = content.match(/^([^:]{2,40}):\s*(.*)/);
                                        if (kvMatch) {
                                          // Bold key
                                          doc.setFont(font, 'bold');
                                          doc.setFontSize(fontSize);
                                          doc.setTextColor(...theme.accent);
                                          doc.text(kvMatch[1] + ':', marginL + 9, y);
                                          const keyW = doc.getTextWidth(kvMatch[1] + ': ');

                                          // Value
                                          const val = kvMatch[2];
                                          const isHighRisk = /critical|high|severe|extreme|no.go/i.test(val);
                                          const isLowRisk = /low|minimal|good|stable/i.test(val);
                                          doc.setFont(font, 'normal');
                                          if (isHighRisk) doc.setTextColor(200, 30, 30);
                                          else if (isLowRisk) doc.setTextColor(16, 140, 60);
                                          else doc.setTextColor(40, 40, 40);

                                          const valWrapped = doc.splitTextToSize(val, contentW - 14 - keyW);
                                          for (let vi = 0; vi < valWrapped.length; vi++) {
                                            if (vi === 0) {
                                              doc.text(valWrapped[vi], marginL + 9 + keyW, y);
                                            } else {
                                              y += lineH;
                                              checkPage(lineH);
                                              doc.text(valWrapped[vi], marginL + 9, y);
                                            }
                                          }
                                        } else {
                                          writeWrapped(content, marginL + 9, contentW - 14, 'normal', fontSize, [40, 40, 40]);
                                          y -= lineH; // writeWrapped already advanced y
                                        }
                                        y += lineH + 1;
                                      } else {
                                        // Regular paragraph
                                        writeWrapped(content, marginL + 5, contentW - 10, 'normal', fontSize, [40, 40, 40]);
                                        y += 2;
                                      }
                                    }
                                    y += lineH; // space after section
                                  }

                                  // ─── Footer on all pages ───
                                  const totalPages = doc.internal.getNumberOfPages();
                                  for (let i = 1; i <= totalPages; i++) {
                                    doc.setPage(i);
                                    // Footer separator
                                    doc.setDrawColor(200, 200, 200);
                                    doc.line(marginL, pageH - 16, pageW - marginR, pageH - 16);
                                    // Branding
                                    doc.setFont(font, 'italic');
                                    doc.setFontSize(9);
                                    doc.setTextColor(140, 140, 140);
                                    doc.text('Nepal Disaster Management System  |  AI-Powered Weather Intelligence', marginL, pageH - 10);
                                    // Page number
                                    doc.setFont(font, 'normal');
                                    doc.setFontSize(9);
                                    doc.setTextColor(100, 100, 100);
                                    doc.text(`Page ${i} of ${totalPages}`, pageW - marginR, pageH - 10, { align: 'right' });
                                    // Bottom accent line
                                    doc.setFillColor(...meta.color);
                                    doc.rect(0, pageH - 3, pageW, 3, 'F');
                                  }

                                  doc.save(`${aiReportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
                                  setExportStatus('Report PDF saved!');
                                  setTimeout(() => setExportStatus(''), 3000);
                                } catch (e) {
                                  console.error('PDF error:', e);
                                }
                              }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg text-[10px] font-bold text-red-600 hover:bg-red-100 transition">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                Save PDF
                              </button>
                              {/* Export as TXT */}
                              <button onClick={() => {
                                const blob = new Blob([`${aiReportType.replace('_', ' ').toUpperCase()} REPORT\nGenerated: ${new Date().toLocaleString()}\nPeriod: ${exportDateFrom} to ${exportDateTo}\n${'='.repeat(60)}\n\n${aiReport}`], { type: 'text/plain;charset=utf-8' });
                                saveAs(blob, `${aiReportType}_report_${new Date().toISOString().split('T')[0]}.txt`);
                                setExportStatus('TXT saved!');
                                setTimeout(() => setExportStatus(''), 3000);
                              }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-gray-200 transition">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                Save TXT
                              </button>
                            </div>
                          </div>
                          {/* Report Body */}
                          <div className="p-5 max-h-[650px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                            {renderFormattedReport(aiReport)}
                          </div>
                        </div>
                      )}

                      {!aiReport && !aiReportLoading && (
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-10 text-center">
                          <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <svg className="w-7 h-7 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                          </div>
                          <p className="text-sm font-semibold text-gray-600 mb-1">Select a Report Type & Generate</p>
                          <p className="text-xs text-gray-400 max-w-sm mx-auto">Choose from district risk, seasonal analysis, drone readiness, or executive briefing. AI will analyze current weather data to create a professional report.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats for Context */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Districts Monitored', value: districtData.length, sub: 'Active weather feeds', color: 'from-sky-500 to-blue-600' },
                      { label: 'Critical Alerts', value: riskStats.critical, sub: 'Require immediate action', color: 'from-red-500 to-rose-600' },
                      { label: 'High Risk Areas', value: riskStats.high, sub: 'Close monitoring needed', color: 'from-orange-500 to-amber-600' },
                      { label: 'Reports Available', value: '4 Types', sub: 'AI-generated reports', color: 'from-indigo-500 to-purple-600' },
                    ].map((card, i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 relative overflow-hidden">
                        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.color}`} />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{card.label}</p>
                        <p className="text-xl font-extrabold text-gray-800 tabular-nums">{card.value}</p>
                        <p className="text-[9px] text-gray-400">{card.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .risk-tooltip {
          background: white !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          padding: 4px 10px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
        .risk-tooltip::before { display: none !important; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; border-radius: 12px !important; overflow: hidden; }
        .leaflet-control-zoom a { border: none !important; width: 36px !important; height: 36px !important; line-height: 36px !important; font-size: 18px !important; }
        .leaflet-control-zoom a:first-child { border-radius: 12px 12px 0 0 !important; }
        .leaflet-control-zoom a:last-child { border-radius: 0 0 12px 12px !important; }
      `}</style>
    </div>
  );
}
