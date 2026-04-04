import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import * as THREE from 'three';
import nepalBorderData from '../data/map.json';
import useWebSocket from '../hooks/useWebSocket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

const MAP_TILES = {
  street:   { name: 'Street',    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',    attr: '&copy; OpenStreetMap' },
  satellite:{ name: 'Satellite',  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri' },
  terrain:  { name: 'Terrain',    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',     attr: '&copy; OpenTopoMap' },
  dark:     { name: 'Dark',       url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '&copy; CartoDB' },
  positron: { name: 'Positron',   url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attr: '&copy; CartoDB' },
};

const LayersIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
);
const CrosshairIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
);

// ─── SVG Icons ────────────────────────────────────────────────────────
const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);
const AltitudeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20M7 7l5-5 5 5M7 17l5 5 5-5"/></svg>
);
const SpeedIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12l4-8"/><circle cx="12" cy="12" r="2"/></svg>
);
// ─── Helpers ──────────────────────────────────────────────────────────
function compassDirection(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(((deg % 360 + 360) % 360) / 22.5) % 16];
}

function normalizeAngle(deg) {
  while (deg > 180)  deg -= 360;
  while (deg < -180) deg += 360;
  return deg;
}

function tieredResponse(angle) {
  const abs = Math.abs(angle);
  const sign = angle >= 0 ? 1 : -1;
  if (abs < 5)  return 0;
  if (abs < 15) return sign * (abs - 5) * 0.3;
  if (abs < 45) return sign * (3 + (abs - 15) * 0.6);
  return sign * (21 + (abs - 45) * 1.0);
}

// ─── 3D Drone Builder ─────────────────────────────────────────────────
function buildDrone() {
  const drone = new THREE.Group();

  // Materials
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1a2e, metalness: 0.85, roughness: 0.15, reflectivity: 1, clearcoat: 1, clearcoatRoughness: 0.1 });
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0x16213e, metalness: 0.9, roughness: 0.2 });
  const armMat = new THREE.MeshPhysicalMaterial({ color: 0x0f3460, metalness: 0.8, roughness: 0.25 });
  const darkMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a1a, metalness: 0.9, roughness: 0.3 });
  const rotorMat = new THREE.MeshPhysicalMaterial({ color: 0x0a1628, metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.7 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x00c8ff, transparent: true, opacity: 0.6 });
  const redGlowMat = new THREE.MeshBasicMaterial({ color: 0xff3d5a, transparent: true, opacity: 0.9 });
  const greenGlowMat = new THREE.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.9 });

  // Body (hexagonal)
  const hexShape = new THREE.Shape();
  const bodyR = 0.32;
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * bodyR, y = Math.sin(a) * bodyR;
    i === 0 ? hexShape.moveTo(x, y) : hexShape.lineTo(x, y);
  }
  const bodyGeo = new THREE.ExtrudeGeometry(hexShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = -Math.PI / 2;
  body.position.y = 0.06;
  body.castShadow = true;
  drone.add(body);

  // Top plate
  const topPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.04, 6), frameMat);
  topPlate.position.y = 0.15;
  drone.add(topPlate);

  // GPS module
  const gpsBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 16), darkMat);
  gpsBase.position.y = 0.2;
  drone.add(gpsBase);
  const gpsMast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 8), armMat);
  gpsMast.position.y = 0.29;
  drone.add(gpsMast);
  const gpsAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.025, 16), new THREE.MeshPhysicalMaterial({ color: 0x2a2a4e, metalness: 0.7, roughness: 0.3 }));
  gpsAnt.position.y = 0.39;
  drone.add(gpsAnt);

  // Status LED
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), glowMat);
  led.position.set(0.12, 0.18, 0);
  drone.add(led);
  drone.userData.led = led;

  // Front direction indicator
  const frontMark = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), new THREE.MeshBasicMaterial({ color: 0xff3d5a }));
  frontMark.position.set(0, 0.16, 0.42);
  frontMark.rotation.x = Math.PI / 2;
  drone.add(frontMark);

  // Camera gimbal
  const gimbalArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8), darkMat);
  gimbalArm.position.set(0, -0.08, 0.05);
  drone.add(gimbalArm);
  const gimbalHousing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.14), darkMat);
  gimbalHousing.position.set(0, -0.18, 0.05);
  drone.add(gimbalHousing);
  const cameraLens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.06, 16), new THREE.MeshPhysicalMaterial({ color: 0x000811, metalness: 1, roughness: 0.1 }));
  cameraLens.rotation.x = Math.PI / 2;
  cameraLens.position.set(0, -0.19, 0.12);
  drone.add(cameraLens);
  const lensGlass = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: 0x1a0a3a }));
  lensGlass.position.set(0, -0.19, 0.153);
  drone.add(lensGlass);

  // Landing skids
  const skidMat = new THREE.MeshPhysicalMaterial({ color: 0x222244, metalness: 0.7, roughness: 0.3 });
  [-0.25, 0.25].forEach(xOff => {
    [-0.2, 0.2].forEach(zOff => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8), skidMat);
      leg.position.set(xOff, -0.28, zOff);
      drone.add(leg);
    });
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 8), skidMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(xOff, -0.45, 0);
    drone.add(skid);
  });

  // Battery
  const batt = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.35), new THREE.MeshPhysicalMaterial({ color: 0x1a1a3e, metalness: 0.6, roughness: 0.4 }));
  batt.position.set(0, -0.06, -0.05);
  drone.add(batt);
  const battLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.04), new THREE.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.3 }));
  battLabel.position.set(0.112, -0.06, -0.05);
  battLabel.rotation.y = Math.PI / 2;
  drone.add(battLabel);

  // Antennas
  [-0.15, 0.15].forEach(xOff => {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6), darkMat);
    ant.position.set(xOff, 0.25, -0.35);
    ant.rotation.x = -0.2;
    drone.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), redGlowMat);
    tip.position.set(xOff, 0.32, -0.38);
    drone.add(tip);
  });

  // Arms and motors
  const armEndPositions = [
    { x: 1.2, z: 1.2 }, { x: -1.2, z: 1.2 },
    { x: 1.2, z: -1.2 }, { x: -1.2, z: -1.2 },
  ];
  const rotors = [];
  const rotorSpeeds = [1, -1, -1, 1];

  armEndPositions.forEach((ap, i) => {
    const armLen = Math.sqrt(ap.x * ap.x + ap.z * ap.z);
    const angle = Math.atan2(ap.x, ap.z);

    // Arm
    const armGeo = new THREE.BoxGeometry(0.06, 0.045, armLen);
    const armMesh = new THREE.Mesh(armGeo, armMat);
    armMesh.position.set(ap.x / 2, 0.04, ap.z / 2);
    armMesh.rotation.y = -angle;
    armMesh.castShadow = true;
    drone.add(armMesh);

    // Arm glow stripe
    const stripeGeo = new THREE.BoxGeometry(0.02, 0.005, armLen - 0.3);
    const stripeMat = new THREE.MeshBasicMaterial({ color: i < 2 ? 0xff3d5a : 0x00ff9d, transparent: true, opacity: 0.5 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(ap.x / 2, 0.068, ap.z / 2);
    stripe.rotation.y = -angle;
    drone.add(stripe);

    // Motor housing
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.14, 16), bodyMat);
    motor.position.set(ap.x, 0.04, ap.z);
    motor.castShadow = true;
    drone.add(motor);

    // Motor cap
    const motorCap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.04, 16), darkMat);
    motorCap.position.set(ap.x, 0.13, ap.z);
    drone.add(motorCap);

    // LED ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 24), i < 2 ? redGlowMat : greenGlowMat);
    ring.position.set(ap.x, -0.02, ap.z);
    ring.rotation.x = Math.PI / 2;
    drone.add(ring);

    // Prop guard
    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.01, 6, 32), new THREE.MeshPhysicalMaterial({ color: 0x3a4a5e, metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0.4 }));
    guard.position.set(ap.x, 0.04, ap.z);
    guard.rotation.x = Math.PI / 2;
    drone.add(guard);

    // Propeller
    const propGroup = new THREE.Group();
    propGroup.position.set(ap.x, 0.16, ap.z);
    for (let b = 0; b < 2; b++) {
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(0, -0.02);
      bladeShape.lineTo(0.45, -0.015);
      bladeShape.lineTo(0.5, 0);
      bladeShape.lineTo(0.45, 0.015);
      bladeShape.lineTo(0, 0.02);
      bladeShape.lineTo(0, -0.02);
      const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.008, bevelEnabled: false });
      const blade = new THREE.Mesh(bladeGeo, rotorMat);
      blade.rotation.y = (b / 2) * Math.PI;
      const pivot = new THREE.Group();
      pivot.rotation.y = (b / 2) * Math.PI;
      pivot.add(blade);
      propGroup.add(pivot);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12), darkMat);
    propGroup.add(hub);
    drone.add(propGroup);
    rotors.push({ group: propGroup, speed: rotorSpeeds[i] });
  });

  drone.userData.rotors = rotors;
  return drone;
}


// ─── Sub-Components ───────────────────────────────────────────────────
function DataRow({ label, value, unit = '', className = '' }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">{label}</span>
      <span className={`text-sm font-bold font-mono ${className || 'text-gray-800'}`}>{value}{unit && <span className="text-[10px] text-gray-400 ml-0.5">{unit}</span>}</span>
    </div>
  );
}

function GaugeBar({ label, value, max, color = '#0078d4', unit = '' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</span>
        <span className="text-[11px] font-bold font-mono text-[#0078d4]">{typeof value === 'number' ? value.toFixed(2) : value}{unit}</span>
      </div>
      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
      </div>
    </div>
  );
}

function SensorPill({ label, active }) {
  return (
    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 ${
      active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-500 border-red-200'
    }`}>
      <span className={`w-[5px] h-[5px] rounded-full ${active ? 'bg-emerald-500' : 'bg-red-400'}`} />
      {label}
    </span>
  );
}

// Attitude Indicator (SVG)
function AttitudeIndicator({ roll, pitch }) {
  const size = 140;
  const cx = size / 2, cy = size / 2;
  const pitchOffset = pitch * 1.2;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-full overflow-hidden border-2 border-gray-200 shadow-inner">
        <defs>
          <clipPath id="atti-clip"><circle cx={cx} cy={cy} r={cx - 2} /></clipPath>
        </defs>
        <g clipPath="url(#atti-clip)" transform={`rotate(${-roll}, ${cx}, ${cy})`}>
          <rect x="0" y={-size} width={size} height={size * 2} fill="#5b9bd5" transform={`translate(0, ${pitchOffset})`} />
          <rect x="0" y={cy + pitchOffset} width={size} height={size} fill="#8B6914" />
          <line x1="0" y1={cy + pitchOffset} x2={size} y2={cy + pitchOffset} stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
          {[-30, -20, -10, 10, 20, 30].map(p => (
            <line key={p} x1={cx - 20} y1={cy + pitchOffset - p * 1.2} x2={cx + 20} y2={cy + pitchOffset - p * 1.2}
              stroke="white" strokeWidth="0.5" opacity="0.5" />
          ))}
        </g>
        <line x1={cx - 20} y1={cy} x2={cx - 5} y2={cy} stroke="#e67e00" strokeWidth="2" />
        <line x1={cx + 5} y1={cy} x2={cx + 20} y2={cy} stroke="#e67e00" strokeWidth="2" />
        <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="#e67e00" strokeWidth="2" />
      </svg>
    </div>
  );
}

// Compass (SVG)
function Compass({ heading }) {
  const size = 120;
  const cx = size / 2, cy = size / 2, r = 46;
  const cardinals = [
    { deg: 0, label: 'N', color: '#d93025' }, { deg: 90, label: 'E', color: '#4a5568' },
    { deg: 180, label: 'S', color: '#4a5568' }, { deg: 270, label: 'W', color: '#4a5568' },
  ];
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="compass-bg"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#e8ecf0" /></radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="#c0d0e0" strokeWidth="2" />
        <circle cx={cx} cy={cy} r={r} fill="url(#compass-bg)" stroke="#c0d0e0" strokeWidth="1" />
        {Array.from({ length: 36 }, (_, i) => i * 10).map(deg => {
          const isCard = deg % 90 === 0;
          const len = isCard ? 8 : deg % 30 === 0 ? 5 : 3;
          const rad = (deg - 90) * Math.PI / 180;
          return <line key={deg} x1={cx + (r) * Math.cos(rad)} y1={cy + (r) * Math.sin(rad)}
            x2={cx + (r - len) * Math.cos(rad)} y2={cy + (r - len) * Math.sin(rad)}
            stroke={isCard ? '#475569' : '#cbd5e1'} strokeWidth={isCard ? 1.5 : 0.5} />;
        })}
        {cardinals.map(c => {
          const rad = (c.deg - 90) * Math.PI / 180;
          return <text key={c.deg} x={cx + (r - 14) * Math.cos(rad)} y={cy + (r - 14) * Math.sin(rad)}
            textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" fill={c.color}>{c.label}</text>;
        })}
        <g transform={`rotate(${heading}, ${cx}, ${cy})`}>
          <polygon points={`${cx},${cy - r + 12} ${cx - 1.5},${cy} ${cx + 1.5},${cy}`} fill="#d93025" />
          <polygon points={`${cx},${cy + r - 12} ${cx - 1.5},${cy} ${cx + 1.5},${cy}`} fill="#4a5568" opacity="0.5" />
        </g>
        <circle cx={cx} cy={cy} r="4" fill="#0078d4" />
      </svg>
      <div className="text-center font-mono">
        <span className="text-base font-bold text-[#0078d4]">{Math.round(((heading % 360) + 360) % 360)}°</span>
        <span className="text-xs text-gray-400 ml-1">{compassDirection(heading)}</span>
      </div>
    </div>
  );
}

// Accel/Gyro sensor bar
function SensorBar({ label, value, max = 20, unit = '', color = '#0078d4' }) {
  const pct = Math.min(100, (Math.abs(value) / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">{label}</span>
        <span className="text-[11px] font-bold font-mono text-[#0078d4]">{value?.toFixed(3)}{unit}</span>
      </div>
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}


// ─── Main Component ───────────────────────────────────────────────────
export default function DroneVisualization() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const [imuData, setImuData] = useState(null);
  const [gpsData, setGpsData] = useState(null);
  const [droneOnline, setDroneOnline] = useState(false);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const lastDataTime = useRef(Date.now());
  const [logs, setLogs] = useState([]);
  const [calibration, setCalibration] = useState({ offsetRoll: 0, offsetPitch: 0, swapAxes: false, flipRoll: false, flipPitch: false });
  const [headingOffset, setHeadingOffset] = useState(0);
  const [levelSetFeedback, setLevelSetFeedback] = useState(false);
  const animRef = useRef(null);

  // ─── Map State ─────────────────────────────────────────────────────
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const droneMarkerRef = useRef(null);
  const droneTrailRef = useRef(null);
  const incidentMarkersRef = useRef([]);
  const routeLinesRef = useRef([]);
  const highlightLineRef = useRef(null);
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [activeMapLayer, setActiveMapLayer] = useState('positron');
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);

  // ─── Live Stream State ─────────────────────────────────────────────
  const streamCanvasRef = useRef(null);
  const wsRef = useRef(null);
  const fpsTimestamps = useRef([]);
  const [streamStatus, setStreamStatus] = useState('offline');
  const [streaming, setStreaming] = useState(false);
  const [streamFps, setStreamFps] = useState(0);

  const addLog = useCallback((msg, type = 'ok') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{ time, msg, type }, ...prev.slice(0, 19)]);
  }, []);

  const calibrateSensor = useCallback((rawRoll, rawPitch) => {
    // Step 1: Subtract level offset (zero reference)
    let roll  = normalizeAngle(rawRoll  - calibration.offsetRoll);
    let pitch = normalizeAngle(rawPitch - calibration.offsetPitch);

    // Step 2: Swap axes if sensor is rotated 90deg on breadboard
    if (calibration.swapAxes) {
      const temp = roll;
      roll = pitch;
      pitch = temp;
    }

    // Step 3: Invert sign if axis direction is reversed
    if (calibration.flipRoll)  roll  = -roll;
    if (calibration.flipPitch) pitch = -pitch;

    return { roll, pitch };
  }, [calibration]);

  const calibrateLevel = useCallback(() => {
    if (imuData) {
      setCalibration(prev => ({
        ...prev,
        offsetRoll: imuData.roll || 0,
        offsetPitch: imuData.pitch || 0,
      }));
      setLevelSetFeedback(true);
      setTimeout(() => setLevelSetFeedback(false), 2000);
      addLog(`Calibrated: roll offset=${(imuData.roll || 0).toFixed(1)}° pitch offset=${(imuData.pitch || 0).toFixed(1)}°`, 'ok');
    }
  }, [imuData, addLog]);

  const toggleAxisSwap = useCallback(() => {
    setCalibration(prev => {
      const newVal = !prev.swapAxes;
      addLog(`Axis mapping: ${newVal ? 'SWAPPED (roll↔pitch)' : 'NORMAL'}`, 'ok');
      return { ...prev, swapAxes: newVal };
    });
  }, [addLog]);

  const toggleFlipRoll = useCallback(() => {
    setCalibration(prev => {
      const newVal = !prev.flipRoll;
      addLog(`Roll sign: ${newVal ? 'INVERTED' : 'NORMAL'}`, 'ok');
      return { ...prev, flipRoll: newVal };
    });
  }, [addLog]);

  const toggleFlipPitch = useCallback(() => {
    setCalibration(prev => {
      const newVal = !prev.flipPitch;
      addLog(`Pitch sign: ${newVal ? 'INVERTED' : 'NORMAL'}`, 'ok');
      return { ...prev, flipPitch: newVal };
    });
  }, [addLog]);

  const resetCalibration = useCallback(() => {
    setCalibration({ offsetRoll: 0, offsetPitch: 0, swapAxes: false, flipRoll: false, flipPitch: false });
    setHeadingOffset(0);
    addLog('Calibration reset to defaults', 'warn');
  }, [addLog]);

  const applyHeadingOffset = useCallback((rawHeading) => {
    let corrected = (rawHeading + headingOffset) % 360;
    if (corrected < 0) corrected += 360;
    return corrected;
  }, [headingOffset]);

  // ─── THREE.js Setup (Light theme) ──────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const container = canvasRef.current;
    const w = container.clientWidth, h = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    scene.fog = new THREE.FogExp2(0xeef2f7, 0.025);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    camera.position.set(3, 3, -6);
    camera.lookAt(0, 0, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x8ba5d6, 0.8);
    rimLight.position.set(-5, 3, -5);
    scene.add(rimLight);
    const fillLight = new THREE.PointLight(0xccddff, 0.6, 15);
    fillLight.position.set(0, -2, 3);
    scene.add(fillLight);

    // Grid
    const grid = new THREE.GridHelper(30, 30, 0xc0d0e0, 0xd8e0ea);
    grid.position.y = -3;
    scene.add(grid);

    // Background particles
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(1000 * 3);
    for (let i = 0; i < 1000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x8899aa, size: 0.06, transparent: true, opacity: 0.3 });
    scene.add(new THREE.Points(particleGeo, particleMat));

    // Glow rings
    const glowRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.02, 8, 80), new THREE.MeshBasicMaterial({ color: 0x0078d4, transparent: true, opacity: 0.15 }));
    glowRing1.rotation.x = Math.PI / 2;
    glowRing1.position.y = -0.5;
    scene.add(glowRing1);
    const glowRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.015, 8, 64), new THREE.MeshBasicMaterial({ color: 0x6b3fa0, transparent: true, opacity: 0.1 }));
    glowRing2.rotation.x = Math.PI / 2;
    glowRing2.position.y = -0.5;
    scene.add(glowRing2);

    // Shadow blob
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -2.8;
    scene.add(shadow);

    // Telemetry lines
    const lineMat = new THREE.LineBasicMaterial({ color: 0x8899bb, transparent: true, opacity: 0.08 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const pts = [
        new THREE.Vector3(Math.cos(a) * 2.2, -3, Math.sin(a) * 2.2),
        new THREE.Vector3(Math.cos(a) * 2.2, 0.5, Math.sin(a) * 2.2)
      ];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }

    // Orbit rings
    [1.8, 2.5, 3.4].forEach((r, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.008, 8, 80),
        new THREE.MeshBasicMaterial({ color: [0x0078d4, 0x6b3fa0, 0x00a86b][i], transparent: true, opacity: [0.1, 0.07, 0.05][i] })
      );
      ring.rotation.x = [0.3, 0.8, 0.5][i];
      ring.rotation.z = [0.1, 0.4, 0.2][i];
      scene.add(ring);
    });

    // Drone
    const drone = buildDrone();
    scene.add(drone);

    sceneRef.current = { renderer, scene, camera, drone, glowRing1, glowRing2, shadow };

    // Resize
    const ro = new ResizeObserver(() => {
      const nw = container.clientWidth, nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(container);

    // Animation loop
    let frame = 0;
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      frame++;

      // Rotor spin
      drone.userData.rotors?.forEach(r => {
        r.group.rotation.y += 0.4 * r.speed;
      });

      // Hover bob
      const hover = Math.sin(frame * 0.025) * 0.12;
      drone.position.y = hover;
      glowRing1.position.y = -0.5 + hover;
      glowRing2.position.y = -0.5 + hover;

      // Glow pulse
      glowRing1.material.opacity = 0.08 + Math.sin(frame * 0.04) * 0.04;
      glowRing2.material.opacity = 0.06 + Math.sin(frame * 0.06 + 1) * 0.03;

      // LED pulse
      if (drone.userData.led) {
        drone.userData.led.material.opacity = 0.4 + Math.sin(frame * 0.08) * 0.4;
      }

      // Shadow scale with altitude
      const altBaro = drone.userData._lastAltBaro || 0;
      const altScale = Math.max(0.3, 1 - (altBaro / 500));
      shadow.scale.set(altScale, altScale, altScale);
      shadow.material.opacity = altScale * 0.25;

      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // ─── Apply telemetry to 3D model ───────────────────────────────────
  useEffect(() => {
    const drone = sceneRef.current.drone;
    if (!drone || !imuData) return;

    const { roll, pitch } = calibrateSensor(imuData.roll || 0, imuData.pitch || 0);
    const tRoll = tieredResponse(roll);
    const tPitch = tieredResponse(pitch);

    // Smooth lerp — same logic as HTML reference
    drone.rotation.z += (THREE.MathUtils.degToRad(-tRoll) - drone.rotation.z) * 0.03;
    drone.rotation.x += (THREE.MathUtils.degToRad(tPitch) - drone.rotation.x) * 0.03;
    drone.rotation.y = 0;

    // Store altitude for shadow scaling
    drone.userData._lastAltBaro = imuData.altitude_baro || 0;
  }, [imuData, calibrateSensor]);

  // ─── Firebase Listeners ────────────────────────────────────────────
  useEffect(() => {
    const imuRef = ref(db, 'drone_imu');
    const gpsRef = ref(db, 'drone');

    const unsubIMU = onValue(imuRef, (snap) => {
      const d = snap.val();
      if (d) {
        setImuData(d);
        lastDataTime.current = Date.now();
        setDroneOnline(true);
        setFirebaseConnected(true);
      }
    }, (err) => {
      addLog(`Firebase IMU error: ${err.message}`, 'err');
      setFirebaseConnected(false);
    });

    const unsubGPS = onValue(gpsRef, (snap) => {
      const d = snap.val();
      if (d) {
        setGpsData(d);
        lastDataTime.current = Date.now();
      }
    }, (err) => {
      addLog(`Firebase GPS error: ${err.message}`, 'err');
    });

    setFirebaseConnected(true);
    addLog('System initialized', 'ok');
    addLog('Three.js renderer active', 'ok');
    addLog('Connecting to Firebase...', '');

    // Offline detection
    const interval = setInterval(() => {
      if (Date.now() - lastDataTime.current > 10000) {
        setDroneOnline(false);
      }
    }, 5000);

    return () => {
      unsubIMU();
      unsubGPS();
      clearInterval(interval);
    };
  }, [addLog]);

  // ─── Fetch incidents for map ────────────────────────────────────────
  const fetchIncidents = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/v1/disaster-reports/map/markers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIncidents(res.data);
    } catch (e) { console.error('Error fetching incidents:', e); }
  }, [token]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // WebSocket: re-fetch incidents when backend notifies data changed
  const handleWsNotify = useCallback((channel) => {
    if (channel === 'reports') {
      fetchIncidents();
    }
  }, [fetchIncidents]);

  useWebSocket(['reports'], handleWsNotify, { enabled: !!token });

  // ─── Map initialization ────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.3949, 84.1240], zoom: 7,
      zoomControl: false, scrollWheelZoom: true, minZoom: 6, maxZoom: 18,
    });
    tileLayerRef.current = L.tileLayer(MAP_TILES.positron.url, { attribution: MAP_TILES.positron.attr, maxZoom: 19 }).addTo(map);
    mapInstanceRef.current = map;

    // Nepal border
    if (nepalBorderData?.features) {
      L.geoJSON(nepalBorderData, { style: { color: '#94a3b8', weight: 2, opacity: 0.6, fillColor: '#94a3b8', fillOpacity: 0.03 } }).addTo(map);
    }

    // Inject CSS animations for markers
    if (!document.getElementById('drone-map-pulse-css')) {
      const style = document.createElement('style');
      style.id = 'drone-map-pulse-css';
      style.textContent = `
        @keyframes droneRadar { 0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0.8; } 100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; } }
        @keyframes droneGlow { 0%, 100% { box-shadow: 0 0 8px rgba(37,99,235,0.6); } 50% { box-shadow: 0 0 20px rgba(37,99,235,0.9), 0 0 40px rgba(37,99,235,0.3); } }
        @keyframes incRadar { 0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0.7; } 100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; } }
        @keyframes incGlow { 0%, 100% { box-shadow: 0 0 6px rgba(220,38,38,0.5); } 50% { box-shadow: 0 0 16px rgba(220,38,38,0.8); } }
      `;
      document.head.appendChild(style);
    }

    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  // ─── Update drone marker on map ────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !gpsData) return;
    const lat = parseFloat(gpsData.latitude);
    const lng = parseFloat(gpsData.longitude);
    if (isNaN(lat) || isNaN(lng) || gpsData.latitude === 'Not Fixed') return;

    const droneIcon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;top:50%;left:50%;width:40px;height:40px;border:2px solid #2563eb;border-radius:50%;animation:droneRadar 2s ease-out infinite;"></div>
        <div style="position:absolute;top:50%;left:50%;width:40px;height:40px;border:2px solid #2563eb;border-radius:50%;animation:droneRadar 2s ease-out 0.7s infinite;"></div>
        <div style="position:absolute;top:50%;left:50%;width:40px;height:40px;border:2px solid #2563eb;border-radius:50%;animation:droneRadar 2s ease-out 1.4s infinite;"></div>
        <div style="position:relative;z-index:2;width:28px;height:28px;background:linear-gradient(135deg,#2563eb,#0891b2);border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;animation:droneGlow 2s ease-in-out infinite;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
      </div>`,
      iconSize: [44, 44], iconAnchor: [22, 22],
    });

    if (droneMarkerRef.current) {
      droneMarkerRef.current.setLatLng([lat, lng]);
    } else {
      droneMarkerRef.current = L.marker([lat, lng], { icon: droneIcon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);
    }

    // Update popup
    droneMarkerRef.current.bindPopup(`
      <div style="font-family:Inter,system-ui,sans-serif;min-width:180px">
        <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px">🛩 Live Drone</div>
        <div style="font-size:11px;color:#64748b;line-height:1.7">
          <b>Lat:</b> ${lat.toFixed(6)}<br/>
          <b>Lng:</b> ${lng.toFixed(6)}<br/>
          <b>Alt:</b> ${gpsData.altitude || '--'} m<br/>
          <b>Speed:</b> ${gpsData.speed || '--'} m/s<br/>
          <b>Satellites:</b> ${gpsData.satellites || '--'}
        </div>
      </div>
    `);

    // Update trail
    if (!droneTrailRef.current) {
      droneTrailRef.current = L.polyline([[lat, lng]], {
        color: '#2563eb', weight: 2.5, opacity: 0.5, dashArray: '8,6',
      }).addTo(mapInstanceRef.current);
    } else {
      droneTrailRef.current.addLatLng([lat, lng]);
    }
  }, [gpsData]);

  // ─── Update incident markers + route lines on map ──────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers & route lines
    incidentMarkersRef.current.forEach(m => map.removeLayer(m));
    incidentMarkersRef.current = [];
    routeLinesRef.current.forEach(l => map.removeLayer(l));
    routeLinesRef.current = [];
    if (highlightLineRef.current) { map.removeLayer(highlightLineRef.current); highlightLineRef.current = null; }

    // Get drone position
    const droneLat = gpsData ? parseFloat(gpsData.latitude) : NaN;
    const droneLng = gpsData ? parseFloat(gpsData.longitude) : NaN;
    const hasDrone = !isNaN(droneLat) && !isNaN(droneLng) && gpsData?.latitude !== 'Not Fixed';

    incidents.forEach(r => {
      const lat = parseFloat(r.latitude);
      const lng = parseFloat(r.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const sevColor = r.severity === 'CRITICAL' ? '#dc2626' : r.severity === 'HIGH' ? '#ea580c' : r.severity === 'MEDIUM' ? '#d97706' : '#059669';

      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;top:50%;left:50%;width:32px;height:32px;border:2px solid ${sevColor};border-radius:50%;animation:incRadar 2s ease-out infinite;"></div>
          <div style="position:absolute;top:50%;left:50%;width:32px;height:32px;border:2px solid ${sevColor};border-radius:50%;animation:incRadar 2s ease-out 1s infinite;"></div>
          <div style="position:relative;z-index:2;width:20px;height:20px;background:${sevColor};border-radius:50%;border:3px solid #fff;animation:incGlow 2s ease-in-out infinite;">
          </div>
        </div>`,
        iconSize: [36, 36], iconAnchor: [18, 18],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:Inter,system-ui,sans-serif;min-width:180px">
          <div style="font-size:13px;font-weight:700;color:#1e293b;text-transform:capitalize;margin-bottom:4px">${r.metadata?.disaster_type || 'Incident'}</div>
          <div style="display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${sevColor}20;color:${sevColor};margin-bottom:6px">${r.severity}</div>
          <div style="font-size:11px;color:#64748b;line-height:1.6">${r.metadata?.description ? (r.metadata.description.length > 100 ? r.metadata.description.slice(0,100)+'...' : r.metadata.description) : 'No description'}</div>
        </div>
      `);

      // Click to highlight this specific route
      marker.on('click', () => setSelectedIncidentId(prev => prev === r.id ? null : r.id));

      incidentMarkersRef.current.push(marker);

      // Default faint route line from drone to this incident
      if (hasDrone) {
        const line = L.polyline([[droneLat, droneLng], [lat, lng]], {
          color: '#94a3b8', weight: 1.5, opacity: 0.35, dashArray: '6,4',
        }).addTo(map);
        line._incidentId = r.id;
        routeLinesRef.current.push(line);
      }
    });
  }, [incidents, gpsData]);

  // ─── Highlight selected route ──────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Reset all default lines to faint
    routeLinesRef.current.forEach(l => l.setStyle({ color: '#94a3b8', weight: 1.5, opacity: 0.35, dashArray: '6,4' }));

    // Remove previous highlight
    if (highlightLineRef.current) { map.removeLayer(highlightLineRef.current); highlightLineRef.current = null; }

    if (!selectedIncidentId || !gpsData) return;
    const droneLat = parseFloat(gpsData.latitude);
    const droneLng = parseFloat(gpsData.longitude);
    if (isNaN(droneLat) || isNaN(droneLng) || gpsData.latitude === 'Not Fixed') return;

    const incident = incidents.find(r => r.id === selectedIncidentId);
    if (!incident) return;

    const lat = parseFloat(incident.latitude);
    const lng = parseFloat(incident.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    // Dim the default line for this incident
    const defaultLine = routeLinesRef.current.find(l => l._incidentId === selectedIncidentId);
    if (defaultLine) defaultLine.setStyle({ opacity: 0 });

    // Draw highlighted route
    const sevColor = incident.severity === 'CRITICAL' ? '#dc2626' : incident.severity === 'HIGH' ? '#ea580c' : incident.severity === 'MEDIUM' ? '#d97706' : '#059669';
    highlightLineRef.current = L.polyline([[droneLat, droneLng], [lat, lng]], {
      color: sevColor, weight: 3.5, opacity: 0.85, dashArray: '10,6',
    }).addTo(map);

    // Open popup on marker
    const idx = incidents.findIndex(r => r.id === selectedIncidentId);
    if (idx >= 0 && incidentMarkersRef.current[idx]) {
      incidentMarkersRef.current[idx].openPopup();
    }
  }, [selectedIncidentId, gpsData, incidents]);

  // ─── Map layer switch ──────────────────────────────────────────────
  const switchMapLayer = useCallback((name) => {
    if (!mapInstanceRef.current || !MAP_TILES[name]) return;
    if (tileLayerRef.current) mapInstanceRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(MAP_TILES[name].url, { attribution: MAP_TILES[name].attr, maxZoom: 19 }).addTo(mapInstanceRef.current);
    setActiveMapLayer(name);
    setLayerMenuOpen(false);
  }, []);

  const resetMapView = useCallback(() => {
    if (mapInstanceRef.current) mapInstanceRef.current.setView([28.3949, 84.1240], 7, { animate: true });
  }, []);

  const flyToDrone = useCallback(() => {
    if (!mapInstanceRef.current || !gpsData) return;
    const lat = parseFloat(gpsData.latitude);
    const lng = parseFloat(gpsData.longitude);
    if (!isNaN(lat) && !isNaN(lng)) mapInstanceRef.current.setView([lat, lng], 14, { animate: true });
  }, [gpsData]);

  // ─── Live Stream Functions ─────────────────────────────────────────
  const drawStreamFrame = useCallback((blob) => {
    const canvas = streamCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(blob);
  }, []);

  const updateStreamFps = useCallback(() => {
    const now = performance.now();
    fpsTimestamps.current.push(now);
    if (fpsTimestamps.current.length > 30) fpsTimestamps.current.shift();
    const stamps = fpsTimestamps.current;
    if (stamps.length >= 2) {
      const elapsed = (stamps[stamps.length - 1] - stamps[0]) / 1000;
      setStreamFps(Math.round((stamps.length - 1) / elapsed));
    }
  }, []);

  const startStream = useCallback(() => {
    if (!token) return;
    // Use device webcam by default for drone page
    const wsUrl = `${WS_BASE}/api/v1/realtime/detect?token=${token}&confidence=0.45&use_webcam=true`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setStreamStatus('connecting');

    ws.onopen = () => {
      setStreamStatus('connected');
      setStreaming(true);
      fpsTimestamps.current = [];
    };

    ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        drawStreamFrame(event.data);
        updateStreamFps();
      }
    };

    ws.onerror = () => setStreamStatus('error');
    ws.onclose = () => {
      setStreaming(false);
      setStreamStatus('offline');
      setStreamFps(0);
    };
  }, [token, drawStreamFrame, updateStreamFps]);

  const stopStream = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setStreaming(false);
    setStreamStatus('offline');
    setStreamFps(0);
  }, []);

  const toggleStream = useCallback(() => {
    if (streaming) stopStream();
    else startStream();
  }, [streaming, startStream, stopStream]);

  useEffect(() => {
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  // ─── Live clock ────────────────────────────────────────────────────
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Derived values ────────────────────────────────────────────────
  const cal = imuData ? calibrateSensor(imuData.roll || 0, imuData.pitch || 0) : { roll: 0, pitch: 0 };
  const correctedHeading = applyHeadingOffset(imuData?.heading || 0);
  const altBaro = imuData?.altitude_baro?.toFixed(1) || '----';
  const vSpeed = imuData?.vertical_speed?.toFixed(3) || '0.000';
  const vStatus = imuData?.vertical_status || 'Hovering';

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-gray-800">
      <Navbar />

      {/* ─── Top Status Bar ────────────────────────────────────────── */}
      <div className="bg-white/95 border-b border-gray-200/60 px-4 sm:px-6 backdrop-blur-xl shadow-sm">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#0078d4] to-[#6b3fa0] flex items-center justify-center text-white text-xs font-bold"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
              D
            </div>
            <div>
              <div className="text-base font-extrabold tracking-[4px] bg-gradient-to-r from-[#0078d4] to-[#6b3fa0] bg-clip-text text-transparent" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>DRONEOPS</div>
              <div className="text-[9px] text-gray-400 tracking-[3px] uppercase -mt-0.5">Live Telemetry System</div>
            </div>
          </div>
          <div className="hidden sm:block text-[11px] text-gray-400 tracking-[2px] uppercase font-mono">DISASTER MANAGEMENT</div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono font-medium text-[#0078d4] tracking-wider">{clock}</span>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-bold tracking-wider font-mono uppercase ${
              firebaseConnected ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : 'border-red-300 text-red-500 bg-red-50'
            }`}>
              <span className={`w-[7px] h-[7px] rounded-full ${firebaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
              {firebaseConnected ? 'FIREBASE' : 'DISCONNECTED'}
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-bold tracking-wider font-mono uppercase ${
              droneOnline ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : 'border-red-300 text-red-500 bg-red-50'
            }`}>
              <span className={`w-[7px] h-[7px] rounded-full ${droneOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
              {droneOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Layout ───────────────────────────────────────────── */}
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-3 min-h-[calc(100vh-140px)]">

          {/* ═══ LEFT PANEL ═══════════════════════════════════════════ */}
          <div className="space-y-3 order-2 lg:order-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>

            {/* GPS Position */}
            <div className="bg-white/92 backdrop-blur-2xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <GlobeIcon className="w-4 h-4 text-[#0078d4]" />
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[3px]">GPS Position</h3>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 font-mono text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-[10px] text-gray-400 tracking-wider">LAT</span><span className="text-emerald-600 font-medium">{gpsData?.latitude || '---.------'}</span></div>
                <div className="flex justify-between"><span className="text-[10px] text-gray-400 tracking-wider">LNG</span><span className="text-emerald-600 font-medium">{gpsData?.longitude || '---.------'}</span></div>
                <div className="flex justify-between"><span className="text-[10px] text-gray-400 tracking-wider">ALT GPS</span><span className="text-emerald-600 font-medium">{gpsData?.altitude ? `${gpsData.altitude} m` : '--- m'}</span></div>
                <div className="flex justify-between"><span className="text-[10px] text-gray-400 tracking-wider">STATUS</span><span className={`font-medium ${gpsData?.status === 'Fixed' ? 'text-emerald-600' : 'text-amber-500'}`}>{gpsData?.status === 'Fixed' ? 'FIXED' : 'SEARCHING'}</span></div>
              </div>
            </div>

            {/* GPS Metrics */}
            <div className="bg-white/92 backdrop-blur-2xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <SpeedIcon className="w-4 h-4 text-[#0078d4]" />
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[3px]">GPS Metrics</h3>
              </div>
              <div className="space-y-3">
                <GaugeBar label="Ground Speed" value={parseFloat(gpsData?.speed) || 0} max={50} unit=" km/h" />
                <GaugeBar label="Satellites" value={parseInt(gpsData?.satellites) || 0} max={12} color="#00a86b" unit=" / 12" />
                <GaugeBar label="HDOP Accuracy" value={parseFloat(gpsData?.hdop) || 99.99} max={10} color="#e67e00" />
                <div className="flex justify-between pt-1 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Last Fix</span>
                  <span className="text-sm font-mono text-[#0078d4]">{gpsData?.time || '--:--:--'}</span>
                </div>
              </div>
            </div>

            {/* Altitude */}
            <div className="bg-white/92 backdrop-blur-2xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AltitudeIcon className="w-4 h-4 text-[#0078d4]" />
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[3px]">Altitude</h3>
              </div>
              <div className="text-center py-2">
                <div className="text-5xl font-extrabold bg-gradient-to-br from-[#0078d4] to-[#6b3fa0] bg-clip-text text-transparent tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", filter: 'drop-shadow(0 0 6px rgba(0,120,212,0.15))' }}>{altBaro}</div>
                <div className="text-[11px] text-gray-400 tracking-wider uppercase mt-1">Meters ASL · Barometric</div>
              </div>
              <div className="space-y-0 divide-y divide-gray-100">
                <DataRow label="Pressure" value={imuData?.pressure?.toFixed(2) || '---'} unit=" hPa" />
                <DataRow label="Temperature" value={imuData?.temperature?.toFixed(1) || '--.-'} unit=" °C" className="text-amber-500" />
                <DataRow label="Vertical Speed" value={vSpeed} unit=" m/s" className={parseFloat(vSpeed) > 0 ? 'text-emerald-500' : parseFloat(vSpeed) < 0 ? 'text-red-500' : 'text-gray-600'} />
                <DataRow label="Status" value={vStatus.toUpperCase()} className={vStatus === 'Climbing' ? 'text-emerald-500' : vStatus === 'Descending' ? 'text-red-500' : 'text-amber-500'} />
              </div>
            </div>

            {/* Sensor Calibration */}
            <div className="bg-white/92 backdrop-blur-2xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[3px]">Sensor Calibration</h3>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400 tracking-wider">RAW ROLL</span>
                  <span className="font-mono font-bold text-[#0078d4]">{(imuData?.roll || 0).toFixed(1)}°</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400 tracking-wider">RAW PITCH</span>
                  <span className="font-mono font-bold text-[#0078d4]">{(imuData?.pitch || 0).toFixed(1)}°</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400 tracking-wider">OFFSET ROLL</span>
                  <span className="font-mono font-bold text-[#0078d4]">{calibration.offsetRoll.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400 tracking-wider">OFFSET PITCH</span>
                  <span className="font-mono font-bold text-[#0078d4]">{calibration.offsetPitch.toFixed(1)}°</span>
                </div>

                <button onClick={calibrateLevel}
                  className={`w-full py-2 text-[11px] font-bold uppercase tracking-wider rounded border transition-all font-mono ${
                    levelSetFeedback
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-600'
                      : 'bg-[#0078d4]/8 border-[#0078d4]/30 text-[#0078d4] hover:bg-[#0078d4]/15'
                  }`}>
                  {levelSetFeedback ? '✓ LEVEL SET' : '▸ SET CURRENT AS LEVEL'}
                </button>

                {/* Axis Mapping */}
                <div className="pt-2">
                  <span className="text-[10px] text-gray-400 tracking-wider font-semibold">AXIS MAPPING</span>
                  <div className="flex gap-1.5 mt-1.5">
                    <button onClick={() => calibration.swapAxes && toggleAxisSwap()}
                      className={`flex-1 py-1.5 text-[9px] font-mono font-bold rounded border transition-all ${
                        !calibration.swapAxes ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-gray-200 text-gray-400 bg-gray-50 hover:bg-gray-100'
                      }`}>NORMAL</button>
                    <button onClick={() => !calibration.swapAxes && toggleAxisSwap()}
                      className={`flex-1 py-1.5 text-[9px] font-mono font-bold rounded border transition-all ${
                        calibration.swapAxes ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-gray-200 text-gray-400 bg-gray-50 hover:bg-gray-100'
                      }`}>SWAP R↔P</button>
                  </div>
                </div>

                {/* Sign Inversion */}
                <div>
                  <span className="text-[10px] text-gray-400 tracking-wider font-semibold">SIGN INVERSION</span>
                  <div className="flex gap-1.5 mt-1.5">
                    <button onClick={toggleFlipRoll}
                      className={`flex-1 py-1.5 text-[9px] font-mono font-bold rounded border transition-all ${
                        calibration.flipRoll ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-gray-200 text-gray-400 bg-gray-50 hover:bg-gray-100'
                      }`}>FLIP ROLL</button>
                    <button onClick={toggleFlipPitch}
                      className={`flex-1 py-1.5 text-[9px] font-mono font-bold rounded border transition-all ${
                        calibration.flipPitch ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-gray-200 text-gray-400 bg-gray-50 hover:bg-gray-100'
                      }`}>FLIP PITCH</button>
                  </div>
                </div>

                {/* Reset */}
                <button onClick={resetCalibration}
                  className="w-full py-2 mt-1 text-[11px] font-bold uppercase tracking-wider rounded border border-red-300 text-red-500 bg-red-50/50 hover:bg-red-50 transition-all font-mono">
                  ✕ RESET CALIBRATION
                </button>
              </div>
            </div>

            {/* Sensor Health */}
            <div className="bg-white/92 backdrop-blur-2xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[3px]">Sensor Health</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <SensorPill label="GPS" active={!!(gpsData?.latitude && gpsData.latitude !== 'Not Fixed')} />
                <SensorPill label="MPU9250" active={!!(imuData && (imuData.accelX !== 0 || imuData.accelY !== 0))} />
                <SensorPill label="BMP280" active={imuData?.pressure !== undefined && imuData?.pressure > 0} />
                <SensorPill label="FIREBASE" active={firebaseConnected} />
                <SensorPill label="WIFI" active={firebaseConnected} />
              </div>
            </div>
          </div>

          {/* ═══ CENTER - 3D CANVAS ═══════════════════════════════════ */}
          <div className="relative order-1 lg:order-2 min-h-[400px] lg:min-h-0 rounded-xl overflow-hidden" style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 60%, rgba(0,60,120,0.04) 0%, transparent 70%)' }}>
            <div ref={canvasRef} className="absolute inset-0" />

            {/* HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-10 h-10 border-t border-l border-gray-300/50" />
              <div className="absolute top-4 right-4 w-10 h-10 border-t border-r border-gray-300/50" />
              <div className="absolute bottom-4 left-4 w-10 h-10 border-b border-l border-gray-300/50" />
              <div className="absolute bottom-4 right-4 w-10 h-10 border-b border-r border-gray-300/50" />

              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-[60px] h-[60px] border border-[#0078d4]/15 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-[1px] bg-[#0078d4]/20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-5 bg-[#0078d4]/20" />
              </div>

              {/* Top label */}
              <div className="absolute top-5 left-1/2 -translate-x-1/2 text-[13px] tracking-[6px] text-[#00c8ff]/30 uppercase" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                DRONE · ORIENTATION · LIVE
              </div>

              {/* Alt tape (left) */}
              <div className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-[140px] bg-white/85 border border-gray-200 rounded shadow-sm flex flex-col items-center justify-center">
                <div className="text-xl font-bold text-[#0078d4]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{imuData?.altitude_baro ? Math.round(imuData.altitude_baro) : '0'}</div>
                <div className="text-[9px] text-gray-400 tracking-wider font-mono">ALT M</div>
              </div>

              {/* V/S tape (right) */}
              <div className="absolute right-5 top-1/2 -translate-y-1/2 w-9 h-[140px] bg-white/85 border border-gray-200 rounded shadow-sm relative overflow-hidden">
                <div className="absolute top-1/2 w-full h-[1px] bg-[#0078d4]/40" />
                <div className="absolute left-0 right-0 h-0.5 transition-all duration-300"
                  style={{
                    top: `${Math.min(90, Math.max(10, 50 - (parseFloat(vSpeed) / 5) * 40))}%`,
                    background: parseFloat(vSpeed) > 0 ? '#00a86b' : parseFloat(vSpeed) < 0 ? '#d93025' : '#0078d4',
                    boxShadow: `0 0 6px ${parseFloat(vSpeed) > 0 ? '#00a86b' : '#d93025'}`
                  }} />
                <div className="absolute bottom-1 left-0 right-0 text-center text-[8px] text-gray-400 tracking-wider font-mono">V/S</div>
              </div>

              {/* Bottom HUD badges */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3">
                {[
                  { label: `ROLL: ${cal.roll.toFixed(1)}°`, color: '' },
                  { label: `PITCH: ${cal.pitch.toFixed(1)}°`, color: 'border-emerald-300 text-emerald-600' },
                  { label: `ALT: ${altBaro} m`, color: '' },
                  { label: gpsData?.status === 'Fixed' ? `GPS: ${gpsData.satellites || 0} SATS` : 'GPS: SEARCHING', color: gpsData?.status === 'Fixed' ? 'border-emerald-300 text-emerald-600 bg-white/90' : 'border-red-300 text-red-500 bg-white/90' },
                ].map((badge, i) => (
                  <div key={i} className={`px-3 py-1.5 bg-white/85 border rounded text-[11px] font-mono font-semibold tracking-wider uppercase shadow-sm ${badge.color || 'border-gray-200 text-[#0078d4]'}`}>
                    {badge.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ RIGHT PANEL ══════════════════════════════════════════ */}
          <div className="space-y-3 order-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>

            {/* Attitude Indicator */}
            <div className="bg-white/92 backdrop-blur-2xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[3px]">Attitude Indicator</h3>
              </div>
              <div className="flex justify-center">
                <AttitudeIndicator roll={cal.roll} pitch={cal.pitch} />
              </div>
              <div className="flex justify-between px-2 mt-2">
                <div className="text-center">
                  <div className="text-[9px] text-gray-400 tracking-wider">ROLL</div>
                  <div className="text-sm font-bold text-amber-500 font-mono">{cal.roll.toFixed(1)}°</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-gray-400 tracking-wider">PITCH</div>
                  <div className="text-sm font-bold text-amber-500 font-mono">{cal.pitch.toFixed(1)}°</div>
                </div>
              </div>
            </div>

            {/* Compass */}
            <div className="bg-white/92 backdrop-blur-2xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[3px]">Compass</h3>
              </div>
              <div className="flex justify-center">
                <Compass heading={correctedHeading} />
              </div>

              {/* Heading Offset Control */}
              <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-gray-400 tracking-wider font-semibold">MOUNTING OFFSET</span>
                  <span className="text-sm font-mono font-bold text-[#0078d4]">{headingOffset}°</span>
                </div>
                <input type="range" min="-180" max="180" value={headingOffset}
                  onChange={e => setHeadingOffset(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:bg-[#0078d4] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow" />
                <div className="flex gap-1 mt-2 justify-center">
                  {[{ label: '0°', val: 0 }, { label: '+90°', val: 90 }, { label: '180°', val: 180 }, { label: '-90°', val: -90 }].map(btn => (
                    <button key={btn.val} onClick={() => setHeadingOffset(btn.val)}
                      className="px-2.5 py-1 text-[10px] font-mono font-bold bg-gray-50 border border-gray-200 rounded text-gray-400 hover:bg-[#0078d4]/10 hover:text-[#0078d4] transition-all">
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Accelerometer */}
            <div className="bg-white/92 backdrop-blur-2xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[3px]">Accelerometer</h3>
              </div>
              <div className="space-y-2.5">
                <SensorBar label="Accel X" value={imuData?.accelX || 0} max={4} color="#0078d4" />
                <SensorBar label="Accel Y" value={imuData?.accelY || 0} max={4} color="#0078d4" />
                <SensorBar label="Accel Z" value={imuData?.accelZ || 0} max={4} color="#00a86b" />
              </div>
            </div>

            {/* Gyroscope */}
            <div className="bg-white/92 backdrop-blur-2xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[3px]">Gyroscope</h3>
              </div>
              <div className="space-y-1.5">
                <DataRow label="Gyro X" value={(imuData?.gyroX || 0).toFixed(3)} unit=" °/s" className="text-[#0078d4]" />
                <DataRow label="Gyro Y" value={(imuData?.gyroY || 0).toFixed(3)} unit=" °/s" className="text-[#0078d4]" />
                <DataRow label="Gyro Z" value={(imuData?.gyroZ || 0).toFixed(3)} unit=" °/s" className="text-[#0078d4]" />
              </div>
            </div>

            {/* Activity Log */}
            <div className="bg-white/92 backdrop-blur-2xl rounded-xl border border-gray-200/50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[3px]">Activity Log</h3>
              </div>
              <div className="space-y-0.5 max-h-[140px] overflow-y-auto font-mono text-[10px]">
                {logs.length === 0 ? (
                  <p className="text-gray-300 text-center py-2">Waiting for telemetry...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 py-0.5 border-b border-gray-50">
                      <span className="text-gray-300 shrink-0">{log.time}</span>
                      <span className={`${log.type === 'ok' ? 'text-emerald-500' : log.type === 'err' ? 'text-red-500' : 'text-amber-500'}`}>
                        {log.msg}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Live Stream + Tracking Map (Side by Side) ──────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3"
        >
          {/* ── Left: Live Video Stream ─────────────────────────────── */}
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white flex flex-col">
            {/* Stream Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800 tracking-wide">Live Video Feed</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${streamStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : streamStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-gray-400'}`} />
                    <p className="text-[10px] text-gray-400 uppercase tracking-[2px]">
                      {streamStatus === 'connected' ? `Live • ${streamFps} FPS` : streamStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={toggleStream}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    streaming
                      ? 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                  }`}>
                  {streaming ? (
                    <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>Stop</>
                  ) : (
                    <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Start</>
                  )}
                </button>
                <button onClick={() => navigate('/live-surveillance')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg text-xs font-semibold text-white hover:shadow-lg hover:shadow-violet-200 transition-all">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  AI Analysis
                </button>
              </div>
            </div>

            {/* Video Canvas */}
            <div className="flex-1 bg-gray-900 flex items-center justify-center relative" style={{ minHeight: 420 }}>
              <canvas ref={streamCanvasRef} className="max-w-full max-h-full object-contain"
                style={{ display: streaming ? 'block' : 'none' }} />
              {!streaming && (
                <div className="flex flex-col items-center gap-4 text-gray-500">
                  <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-400">No Video Feed</p>
                    <p className="text-xs text-gray-600 mt-1">Click Start to begin live streaming</p>
                  </div>
                </div>
              )}
              {streaming && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-600 rounded-md text-[10px] font-bold text-white uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Live
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Live Tracking Map ────────────────────────────── */}
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white flex flex-col">
            {/* Map Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#0078d4] to-[#0891b2] rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800 tracking-wide">Live Tracking Map</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-[2px]">{incidents.length} incidents {droneOnline ? '• Drone tracking' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {droneOnline && gpsData && (
                  <button onClick={flyToDrone}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-100 transition">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    Fly to Drone
                  </button>
                )}
                <button onClick={resetMapView}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition">
                  <CrosshairIcon className="w-3.5 h-3.5" />
                  Reset
                </button>
                {droneOnline && gpsData && (
                  <button onClick={() => {
                    const p = new URLSearchParams({
                      lat: gpsData.latitude,
                      lng: gpsData.longitude,
                      disaster_type: 'Drone Takeoff Zone',
                      report_id: 'DRONE',
                      severity: '',
                      address: `Drone @ ${parseFloat(gpsData.latitude).toFixed(4)}, ${parseFloat(gpsData.longitude).toFixed(4)}`,
                    });
                    navigate(`/incident-weather?${p.toString()}`);
                  }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg text-xs font-semibold text-white hover:shadow-lg hover:shadow-blue-200 transition-all">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
                    Weather
                  </button>
                )}
              </div>
            </div>

            {/* Map Container */}
            <div ref={mapContainerRef} className="flex-1 w-full" style={{ minHeight: 420 }} />

            {/* Layer Switcher */}
            <div className="absolute bottom-20 left-3 z-[500]">
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
                  className="absolute bottom-10 left-0 bg-white/98 backdrop-blur-sm rounded-xl border border-gray-200 shadow-xl py-1.5 min-w-[150px]"
                >
                  {Object.entries(MAP_TILES).map(([key, tile]) => (
                    <button key={key} onClick={() => switchMapLayer(key)}
                      className={`w-full text-left px-4 py-2 text-xs font-medium transition-all ${
                        activeMapLayer === key ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-600 hover:bg-gray-50'
                      }`}>
                      {tile.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-3 z-[500]">
              <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-5 shadow-lg text-xs text-gray-600 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.5)]" />
                  Drone
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.5)]" />
                  Incidents
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-0.5 border-t-2 border-dashed border-blue-500 opacity-60" />
                  Trail
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
