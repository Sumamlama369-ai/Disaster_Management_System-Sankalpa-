import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { motion, AnimatePresence } from 'framer-motion';

const GOOGLE_CLIENT_ID = '319558988931-4s3luu63ovtsf2ugcnu8apvqkce7tc5h.apps.googleusercontent.com';

// Full-width Nepal landscape (static background scene)
function LandscapeSVG() {
  return (
    <svg viewBox="0 0 1200 420" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="mountainFar" x1="600" y1="80" x2="600" y2="320" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C8FBF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#A8B8D8" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="mountainMid" x1="600" y1="150" x2="600" y2="350" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5B7A4A" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7FA868" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="mountainNear" x1="600" y1="220" x2="600" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4A7A3A" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#6B9E50" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="snowCap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#E8EFF8" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="groundFill" x1="600" y1="300" x2="600" y2="420" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8CB878" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#A8D090" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* Far Himalayan range */}
      <path d="M-20 300 L40 250 L80 270 L120 230 L160 255 L200 210 L240 240 L280 185 L320 220 L370 170 L410 200 L450 165 L490 195 L530 175 L580 210 L620 190 L660 225 L700 200 L740 235 L780 215 L820 250 L870 220 L910 255 L950 230 L990 260 L1030 240 L1070 265 L1110 245 L1150 270 L1220 255 L1220 420 L-20 420 Z" fill="url(#mountainFar)" />

      {/* Snow caps */}
      <g opacity="0.95">
        <path d="M280 185 L295 205 L265 205 Z" fill="url(#snowCap)" />
        <path d="M370 170 L386 192 L354 192 Z" fill="url(#snowCap)" />
        <path d="M450 165 L468 190 L432 190 Z" fill="url(#snowCap)" />
        <path d="M530 175 L546 196 L514 196 Z" fill="url(#snowCap)" />
        <path d="M620 190 L635 210 L605 210 Z" fill="url(#snowCap)" />
        <path d="M700 200 L714 218 L686 218 Z" fill="url(#snowCap)" />
        <path d="M870 220 L884 238 L856 238 Z" fill="url(#snowCap)" />
      </g>

      {/* Mid hills */}
      <path d="M-20 340 L50 300 L100 315 L160 285 L220 305 L280 278 L340 300 L400 275 L460 295 L520 280 L580 300 L640 285 L700 305 L760 288 L820 308 L880 290 L940 310 L1000 295 L1060 315 L1120 300 L1220 310 L1220 420 L-20 420 Z" fill="url(#mountainMid)" />

      {/* Near hills */}
      <path d="M-20 365 L60 340 L120 350 L180 335 L240 345 L300 332 L360 345 L420 335 L480 348 L540 338 L600 350 L660 340 L720 352 L780 342 L840 355 L900 342 L960 352 L1020 340 L1080 350 L1140 342 L1220 348 L1220 420 L-20 420 Z" fill="url(#mountainNear)" />

      {/* Ground fill */}
      <rect x="-20" y="355" width="1240" height="65" fill="url(#groundFill)" />

      {/* Topographic contours */}
      <g opacity="0.1">
        <ellipse cx="600" cy="390" rx="500" ry="25" stroke="#3B82F6" strokeWidth="0.5" fill="none" />
        <ellipse cx="600" cy="390" rx="380" ry="18" stroke="#3B82F6" strokeWidth="0.5" fill="none" />
        <ellipse cx="600" cy="390" rx="260" ry="12" stroke="#3B82F6" strokeWidth="0.5" fill="none" />
      </g>

      {/* === NEPAL-STYLE BUILDINGS === */}
      <g opacity="0.85">
        {/* Far left small hut */}
        <g transform="translate(60, 350)">
          <rect x="-6" y="2" width="12" height="11" rx="1" fill="#C4956A" />
          <path d="M-8 2 L0 -4 L8 2 Z" fill="#8B4513" />
          <rect x="-2" y="6" width="3" height="3" fill="#FBBF24" opacity="0.6" />
        </g>

        {/* Pagoda temple - left */}
        <g transform="translate(150, 330)">
          <rect x="-12" y="14" width="24" height="22" rx="1" fill="#D4A574" />
          <path d="M-18 14 L0 5 L18 14 Z" fill="#8B2020" />
          <path d="M-12 5 L0 -2 L12 5 Z" fill="#A52A2A" />
          <path d="M-7 -2 L0 -8 L7 -2 Z" fill="#A52A2A" />
          <line x1="0" y1="-8" x2="0" y2="-16" stroke="#DAA520" strokeWidth="1.3" />
          <circle cx="0" cy="-17" r="1.8" fill="#FFD700" opacity="0.9" />
          <rect x="-5" y="20" width="3.5" height="5" fill="#FBBF24" opacity="0.7" />
          <rect x="1.5" y="20" width="3.5" height="5" fill="#FBBF24" opacity="0.6" />
          <rect x="-3" y="30" width="6" height="6" rx="3" fill="#8B6914" opacity="0.6" />
        </g>

        {/* Newari building cluster - left center */}
        <g transform="translate(240, 338)">
          <rect x="-9" y="0" width="18" height="24" rx="1" fill="#C4956A" />
          <rect x="-11" y="0" width="22" height="3.5" rx="0.5" fill="#8B4513" />
          <rect x="-6" y="7" width="4" height="5" rx="0.5" fill="#E8C9A0" opacity="0.7" />
          <rect x="2" y="7" width="4" height="5" rx="0.5" fill="#E8C9A0" opacity="0.6" />
          <rect x="-6" y="16" width="4" height="4" fill="#FBBF24" opacity="0.7" />
          <rect x="2" y="16" width="4" height="4" fill="#FBBF24" opacity="0.6" />
        </g>

        {/* Small stupa */}
        <g transform="translate(310, 348)">
          <rect x="-6" y="6" width="12" height="9" rx="1" fill="#F5F0E8" />
          <ellipse cx="0" cy="6" rx="7" ry="5" fill="#FAFAF5" />
          <path d="M-5 6 Q0 -2 5 6" fill="#FFD700" opacity="0.5" />
          <line x1="0" y1="-2" x2="0" y2="-8" stroke="#DAA520" strokeWidth="0.8" />
          <circle cx="0" cy="-9" r="1.2" fill="#FFD700" opacity="0.8" />
        </g>

        {/* Center tall building */}
        <g transform="translate(400, 330)">
          <rect x="-8" y="0" width="16" height="28" rx="1" fill="#B8845A" />
          <rect x="-10" y="0" width="20" height="3.5" rx="0.5" fill="#8B4513" />
          <rect x="-4" y="7" width="3" height="3" fill="#FBBF24" opacity="0.8" />
          <rect x="1" y="7" width="3" height="3" fill="#FBBF24" opacity="0.7" />
          <rect x="-4" y="14" width="3" height="3" fill="#FBBF24" opacity="0.7" />
          <rect x="1" y="14" width="3" height="3" fill="#FBBF24" opacity="0.6" />
          <rect x="-4" y="21" width="3" height="4" fill="#FBBF24" opacity="0.6" />
        </g>

        {/* Mid building */}
        <g transform="translate(470, 340)">
          <rect x="-7" y="2" width="14" height="18" rx="1" fill="#C4956A" />
          <rect x="-9" y="2" width="18" height="3" rx="0.5" fill="#8B4513" />
          <rect x="-4" y="9" width="3" height="3" fill="#FBBF24" opacity="0.7" />
          <rect x="1" y="9" width="3" height="3" fill="#FBBF24" opacity="0.6" />
        </g>

        {/* Larger pagoda temple - right center */}
        <g transform="translate(580, 322)">
          <rect x="-14" y="16" width="28" height="26" rx="1" fill="#D4A574" />
          <path d="M-22 16 L0 5 L22 16 Z" fill="#8B2020" />
          <path d="M-16 5 L0 -3 L16 5 Z" fill="#A52A2A" />
          <path d="M-10 -3 L0 -10 L10 -3 Z" fill="#A52A2A" />
          <line x1="0" y1="-10" x2="0" y2="-20" stroke="#DAA520" strokeWidth="1.5" />
          <circle cx="0" cy="-21" r="2.2" fill="#FFD700" opacity="0.9" />
          <rect x="-7" y="24" width="5" height="6" fill="#FBBF24" opacity="0.7" />
          <rect x="2" y="24" width="5" height="6" fill="#FBBF24" opacity="0.6" />
          <rect x="-4" y="34" width="8" height="8" rx="4" fill="#8B6914" opacity="0.6" />
        </g>

        {/* Small houses - right */}
        <g transform="translate(700, 342)">
          <rect x="-7" y="2" width="14" height="14" rx="1" fill="#C4956A" />
          <path d="M-9 2 L0 -4 L9 2 Z" fill="#8B4513" />
          <rect x="-3" y="7" width="3" height="3" fill="#FBBF24" opacity="0.7" />
          <rect x="1" y="7" width="3" height="3" fill="#FBBF24" opacity="0.6" />
        </g>

        <g transform="translate(780, 345)">
          <rect x="-6" y="2" width="12" height="12" rx="1" fill="#B8845A" />
          <path d="M-8 2 L0 -3 L8 2 Z" fill="#8B4513" />
          <rect x="-2" y="5" width="3" height="3" fill="#FBBF24" opacity="0.6" />
        </g>

        {/* Newari building - right */}
        <g transform="translate(870, 335)">
          <rect x="-9" y="0" width="18" height="22" rx="1" fill="#C4956A" />
          <rect x="-11" y="0" width="22" height="3" rx="0.5" fill="#8B4513" />
          <rect x="-5" y="7" width="4" height="4" rx="0.5" fill="#E8C9A0" opacity="0.65" />
          <rect x="1" y="7" width="4" height="4" rx="0.5" fill="#E8C9A0" opacity="0.55" />
          <rect x="-5" y="14" width="4" height="4" fill="#FBBF24" opacity="0.6" />
          <rect x="1" y="14" width="4" height="4" fill="#FBBF24" opacity="0.5" />
        </g>

        {/* Small pagoda - far right */}
        <g transform="translate(1000, 338)">
          <rect x="-10" y="10" width="20" height="16" rx="1" fill="#D4A574" />
          <path d="M-15 10 L0 2 L15 10 Z" fill="#8B2020" />
          <path d="M-10 2 L0 -4 L10 2 Z" fill="#A52A2A" />
          <line x1="0" y1="-4" x2="0" y2="-10" stroke="#DAA520" strokeWidth="1" />
          <circle cx="0" cy="-11" r="1.5" fill="#FFD700" opacity="0.8" />
          <rect x="-4" y="16" width="3" height="4" fill="#FBBF24" opacity="0.6" />
          <rect x="1" y="16" width="3" height="4" fill="#FBBF24" opacity="0.5" />
        </g>

        {/* Far right hut */}
        <g transform="translate(1100, 348)">
          <rect x="-6" y="2" width="12" height="11" rx="1" fill="#C4956A" />
          <path d="M-8 2 L0 -4 L8 2 Z" fill="#8B4513" />
          <rect x="-2" y="6" width="3" height="3" fill="#FBBF24" opacity="0.6" />
        </g>

        {/* Trees */}
        <circle cx="100" cy="352" r="6" fill="#4CAF50" opacity="0.55" />
        <circle cx="106" cy="355" r="5" fill="#388E3C" opacity="0.45" />
        <circle cx="200" cy="348" r="5" fill="#4CAF50" opacity="0.5" />
        <circle cx="270" cy="355" r="5" fill="#388E3C" opacity="0.45" />
        <circle cx="350" cy="350" r="6" fill="#4CAF50" opacity="0.5" />
        <circle cx="440" cy="355" r="5" fill="#388E3C" opacity="0.45" />
        <circle cx="520" cy="348" r="5" fill="#4CAF50" opacity="0.45" />
        <circle cx="650" cy="352" r="6" fill="#4CAF50" opacity="0.5" />
        <circle cx="740" cy="350" r="5" fill="#388E3C" opacity="0.45" />
        <circle cx="830" cy="348" r="5" fill="#4CAF50" opacity="0.45" />
        <circle cx="940" cy="352" r="5" fill="#388E3C" opacity="0.45" />
        <circle cx="1050" cy="350" r="5" fill="#4CAF50" opacity="0.45" />

        {/* Prayer flags */}
        <g opacity="0.55">
          <path d="M258 338 Q285 330 320 338" stroke="#EF4444" strokeWidth="0.8" fill="none" />
          <path d="M258 339 Q285 331 320 339" stroke="#3B82F6" strokeWidth="0.8" fill="none" />
          <path d="M258 340 Q285 332 320 340" stroke="#22C55E" strokeWidth="0.8" fill="none" />
          <path d="M468 340 Q520 333 575 336" stroke="#FBBF24" strokeWidth="0.8" fill="none" />
          <path d="M468 341 Q520 334 575 337" stroke="#EF4444" strokeWidth="0.8" fill="none" />
          <path d="M468 342 Q520 335 575 338" stroke="#8B5CF6" strokeWidth="0.8" fill="none" />
          <path d="M700 342 Q740 336 780 342" stroke="#22C55E" strokeWidth="0.8" fill="none" />
          <path d="M700 343 Q740 337 780 343" stroke="#EF4444" strokeWidth="0.8" fill="none" />
        </g>

        {/* Location pins */}
        <g transform="translate(200, 340)" opacity="0.7">
          <path d="M0 -10 C-5.5 -10 -9 -5.5 -9 -1.5 C-9 4 0 11 0 11 C0 11 9 4 9 -1.5 C9 -5.5 5.5 -10 0 -10Z" fill="#EF4444" />
          <circle cx="0" cy="-1.5" r="3" fill="white" opacity="0.9" />
        </g>
        <g transform="translate(650, 340)" opacity="0.6">
          <path d="M0 -8 C-4.5 -8 -7 -4.5 -7 -1 C-7 3.5 0 9 0 9 C0 9 7 3.5 7 -1 C7 -4.5 4.5 -8 0 -8Z" fill="#F97316" />
          <circle cx="0" cy="-1" r="2.5" fill="white" opacity="0.9" />
        </g>
        <g transform="translate(950, 345)" opacity="0.55">
          <path d="M0 -8 C-4.5 -8 -7 -4.5 -7 -1 C-7 3.5 0 9 0 9 C0 9 7 3.5 7 -1 C7 -4.5 4.5 -8 0 -8Z" fill="#3B82F6" />
          <circle cx="0" cy="-1" r="2.5" fill="white" opacity="0.9" />
        </g>
      </g>
    </svg>
  );
}

// Animated drone with searchlight (moves independently over the landscape)
function AnimatedDrone() {
  return (
    <motion.div
      className="absolute"
      style={{ width: '340px', left: 'calc(50% - 170px)', top: '0px' }}
      animate={{ x: [-60, 60, -60], y: [0, -10, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="relative">
        {/* Drone SVG */}
        <svg viewBox="0 0 480 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <defs>
            <linearGradient id="droneBody" x1="210" y1="30" x2="270" y2="75" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>
            <linearGradient id="armGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="propellerBlur">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>
          </defs>

          {/* Signal waves */}
          <g filter="url(#glowBlue)">
            <circle cx="240" cy="45" r="25" stroke="#3B82F6" strokeWidth="1" fill="none" opacity="0.2" />
            <circle cx="240" cy="45" r="40" stroke="#3B82F6" strokeWidth="0.8" fill="none" opacity="0.14" />
            <circle cx="240" cy="45" r="58" stroke="#3B82F6" strokeWidth="0.6" fill="none" opacity="0.08" />
          </g>

          {/* Arms - back */}
          <line x1="218" y1="48" x2="150" y2="28" stroke="url(#armGrad)" strokeWidth="4" strokeLinecap="round" />
          <line x1="262" y1="48" x2="330" y2="28" stroke="url(#armGrad)" strokeWidth="4" strokeLinecap="round" />
          {/* Arms - front */}
          <line x1="222" y1="60" x2="160" y2="75" stroke="url(#armGrad)" strokeWidth="4" strokeLinecap="round" />
          <line x1="258" y1="60" x2="320" y2="75" stroke="url(#armGrad)" strokeWidth="4" strokeLinecap="round" />

          {/* Motor mounts */}
          <circle cx="150" cy="28" r="7" fill="#475569" stroke="#94A3B8" strokeWidth="1" />
          <circle cx="330" cy="28" r="7" fill="#475569" stroke="#94A3B8" strokeWidth="1" />
          <circle cx="160" cy="75" r="7" fill="#475569" stroke="#94A3B8" strokeWidth="1" />
          <circle cx="320" cy="75" r="7" fill="#475569" stroke="#94A3B8" strokeWidth="1" />
          <circle cx="150" cy="28" r="3.5" fill="#334155" />
          <circle cx="330" cy="28" r="3.5" fill="#334155" />
          <circle cx="160" cy="75" r="3.5" fill="#334155" />
          <circle cx="320" cy="75" r="3.5" fill="#334155" />

          {/* Propellers */}
          <g filter="url(#propellerBlur)">
            <ellipse cx="150" cy="28" rx="28" ry="5" fill="#94A3B8" opacity="0.4" />
            <ellipse cx="330" cy="28" rx="28" ry="5" fill="#94A3B8" opacity="0.4" />
            <ellipse cx="160" cy="75" rx="28" ry="5" fill="#94A3B8" opacity="0.4" />
            <ellipse cx="320" cy="75" rx="28" ry="5" fill="#94A3B8" opacity="0.4" />
          </g>

          {/* Body */}
          <rect x="215" y="38" width="50" height="26" rx="8" fill="url(#droneBody)" stroke="#94A3B8" strokeWidth="0.5" />
          <line x1="225" y1="42" x2="255" y2="42" stroke="#94A3B8" strokeWidth="0.5" opacity="0.4" />
          <line x1="225" y1="60" x2="255" y2="60" stroke="#94A3B8" strokeWidth="0.5" opacity="0.4" />

          {/* Antenna */}
          <line x1="240" y1="38" x2="240" y2="26" stroke="#94A3B8" strokeWidth="1.5" />
          <circle cx="240" cy="24" r="2" fill="#3B82F6" filter="url(#glowBlue)" />

          {/* Camera gimbal */}
          <rect x="232" y="64" width="16" height="5" rx="2" fill="#64748B" />
          <rect x="230" y="69" width="20" height="14" rx="3" fill="#334155" stroke="#475569" strokeWidth="0.5" />
          <circle cx="240" cy="76" r="5" fill="#1E293B" stroke="#475569" strokeWidth="0.5" />
          <circle cx="240" cy="76" r="3.5" fill="#0F172A" />
          <circle cx="240" cy="76" r="2" fill="#3B82F6" opacity="0.8" filter="url(#glowBlue)" />
          <circle cx="238.5" cy="74.5" r="1" fill="white" opacity="0.5" />

          {/* Landing gear */}
          <line x1="222" y1="64" x2="218" y2="88" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
          <line x1="210" y1="88" x2="226" y2="88" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="258" y1="64" x2="262" y2="88" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
          <line x1="254" y1="88" x2="270" y2="88" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />

          {/* LEDs */}
          <circle cx="218" cy="51" r="2.5" fill="#EF4444" filter="url(#glowBlue)" opacity="0.9" />
          <circle cx="262" cy="51" r="2.5" fill="#22C55E" filter="url(#glowBlue)" opacity="0.9" />
          <circle cx="185" cy="38" r="1.5" fill="#3B82F6" opacity="0.6" />
          <circle cx="295" cy="38" r="1.5" fill="#3B82F6" opacity="0.6" />

          {/* Data labels */}
          <g opacity="0.3">
            <rect x="350" y="8" width="65" height="22" rx="4" fill="white" stroke="#E2E8F0" strokeWidth="0.5" />
            <text x="357" y="22" fill="#3B82F6" fontSize="8" fontFamily="monospace">ALT: 120m</text>
            <rect x="65" y="55" width="58" height="22" rx="4" fill="white" stroke="#E2E8F0" strokeWidth="0.5" />
            <text x="72" y="69" fill="#22C55E" fontSize="8" fontFamily="monospace">SPD: 8m/s</text>
          </g>
        </svg>

        {/* Pendulum searchlight - swings relative to drone */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: '160px',
            height: '220px',
            left: 'calc(50% - 80px)',
            top: '55%',
            transformOrigin: '50% 0%',
          }}
          animate={{ rotate: [-16, 16, -16] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 160 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
              <linearGradient id="pendulumBeam" x1="80" y1="0" x2="80" y2="220" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.5" />
                <stop offset="30%" stopColor="#FBBF24" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M72 0 L30 220 L130 220 L88 0 Z" fill="url(#pendulumBeam)" />
            <g transform="translate(80, 180)" opacity="0.4">
              <circle cx="0" cy="0" r="14" stroke="#FBBF24" strokeWidth="1.2" fill="none" />
              <circle cx="0" cy="0" r="6" stroke="#FBBF24" strokeWidth="0.8" fill="none" />
              <circle cx="0" cy="0" r="2" fill="#FBBF24" />
            </g>
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Floating particles
function FloatingParticles() {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-blue-400"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.06, 0.2, 0.06],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Linear radio signals traveling from buildings up toward the drone
function RadarSignals() {
  const signalSources = [
    { left: '13%', bottom: '30%' },
    { left: '33%', bottom: '32%' },
    { left: '48%', bottom: '28%' },
    { left: '72%', bottom: '30%' },
    { left: '88%', bottom: '29%' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {signalSources.map((src, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: src.left, bottom: src.bottom, transform: 'translate(-50%, 50%)' }}
        >
          {/* Antenna dot at building */}
          <motion.div
            className="absolute w-2.5 h-2.5 rounded-full bg-blue-400"
            style={{ left: -5, top: -5 }}
            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Linear signal pulses traveling upward toward drone */}
          {[0, 1, 2].map((pulse) => (
            <motion.div
              key={pulse}
              className="absolute"
              style={{
                width: '2px',
                height: '8px',
                left: -1,
                bottom: 6,
                borderRadius: '1px',
                background: 'rgba(59,130,246,0.6)',
                boxShadow: '0 0 4px rgba(59,130,246,0.4)',
              }}
              animate={{
                y: [0, -120, -200],
                opacity: [0.7, 0.4, 0],
                scaleY: [1, 1.5, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: pulse * 0.6 + i * 0.2,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Thin continuous signal line from building toward drone */}
          <motion.div
            className="absolute"
            style={{
              width: '1px',
              height: '140px',
              left: 0,
              bottom: 6,
              background: 'linear-gradient(to top, rgba(59,130,246,0.35), rgba(59,130,246,0.08), transparent)',
            }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
          />

          {/* Small dashes along the signal line */}
          {[0, 1, 2, 3].map((dash) => (
            <motion.div
              key={`dash-${dash}`}
              className="absolute"
              style={{
                width: '6px',
                height: '1px',
                left: -3,
                bottom: 30 + dash * 30,
                background: 'rgba(59,130,246,0.25)',
              }}
              animate={{ opacity: [0.1, 0.4, 0.1] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: dash * 0.4 + i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Status dot
function StatusDot({ color = 'green', label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color === 'green' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${color === 'green' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
      </span>
      <span className="text-xs text-slate-400 font-mono tracking-wide">{label}</span>
    </div>
  );
}

export default function PublicPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleGoogleSuccess = (googleToken) => {
    sessionStorage.setItem('google_token', googleToken);
    if (isRegister) {
      navigate('/role-selection');
    } else {
      navigate('/login-process', { state: { googleToken } });
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="login-page min-h-screen bg-white relative overflow-hidden">

        {/* === UNIFIED BACKGROUND ELEMENTS (span entire page) === */}

        {/* Grid overlay */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(59,130,246,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Floating particles */}
        <FloatingParticles />

        {/* Soft gradient orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl z-0" />
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-sky-100/15 rounded-full blur-3xl z-0" />
        <div className="absolute -bottom-40 right-0 w-[500px] h-[500px] bg-blue-50/20 rounded-full blur-3xl z-0" />

        {/* === FULL-WIDTH LANDSCAPE + DRONE (positioned at bottom) === */}
        <div className="absolute bottom-0 left-0 right-0 z-[1]" style={{ height: '62%' }}>
          {/* Static landscape */}
          <div className="absolute inset-0">
            <LandscapeSVG />
          </div>

          {/* Radar signals from buildings toward drone */}
          <RadarSignals />

          {/* Animated drone flying over landscape */}
          <div className="relative w-full h-full">
            <AnimatedDrone />
          </div>
        </div>

        {/* === CONTENT OVERLAY === */}
        <div className="relative z-10 min-h-screen flex flex-col">

          {/* Top bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="px-8 lg:px-12 py-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <img src="/src/logo/FYP_Logo.png" alt="Sankalpa Logo" className="w-18 h-20 rounded-lg object-contain" />
              <div>
                <span className="text-slate-800 font-bold text-sm tracking-wide"></span>
                <span className="text-slate-400 text-xs ml-2 font-mono"></span>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <StatusDot color="green" label="SYSTEMS ONLINE" />
              <span className="text-slate-400 text-xs font-mono">
                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
              </span>
            </div>
          </motion.div>

          {/* Main content */}
          <div className="flex-1 flex flex-col lg:flex-row items-start lg:items-start px-8 lg:px-12 gap-6 lg:gap-12 pt-2 lg:pt-4">

            {/* Left side - branding & info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:w-[50%] flex flex-col"
            >
              {/* Tag */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mb-5"
              >
                <span className="inline-flex items-center gap-2 bg-blue-50/80 backdrop-blur-sm text-blue-600 text-[11px] font-semibold tracking-[0.2em] uppercase px-4 py-2 rounded-full border border-blue-100/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Disaster Response Platform
                </span>
              </motion.div>

              {/* Title */}
              <h1 className="text-[3.2rem] lg:text-[3.8rem] font-extrabold leading-[1.1] tracking-tight mb-3">
                <span className="text-slate-900">Sankalpa</span>
                <span className="block text-lg lg:text-xl font-semibold tracking-normal mt-1 text-blue-600">
                   आशा, सुरक्षा र सहारा
                </span>
              </h1>
              <p className="text-base lg:text-lg text-slate-500 max-w-lg leading-relaxed mb-8">
                Aerial surveillance and AI-powered threat detection for{' '}
                <span className="text-blue-600 font-medium">real-time disaster response</span>{' '}
                and community safety.
              </p>

              {/* Capability cards */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex flex-wrap gap-3"
              >
                {[
                  {
                    icon: (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    ), label: 'Encrypted Auth', sub: 'OTP + OAuth 2.0',
                  },
                  {
                    icon: (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12a10 10 0 0 1 18 0" />
                        <path d="M5 12a7 7 0 0 1 14 0" />
                        <path d="M8 12a4 4 0 0 1 8 0" />
                        <circle cx="12" cy="12" r="1" fill="currentColor" />
                      </svg>
                    ), label: 'Live Alerts', sub: 'Real-time SMS',
                  },
                  {
                    icon: (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                        <rect x="9" y="9" width="6" height="6" rx="1" />
                        <line x1="9" y1="2" x2="9" y2="4" /><line x1="15" y1="2" x2="15" y2="4" />
                        <line x1="9" y1="20" x2="9" y2="22" /><line x1="15" y1="20" x2="15" y2="22" />
                        <line x1="2" y1="9" x2="4" y2="9" /><line x1="2" y1="15" x2="4" y2="15" />
                        <line x1="20" y1="9" x2="22" y2="9" /><line x1="20" y1="15" x2="22" y2="15" />
                      </svg>
                    ), label: 'YOLOv8 AI', sub: 'Object Detection',
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-slate-100/80 hover:border-blue-200 hover:shadow-md transition-all duration-300 shadow-sm"
                  >
                    <div className="text-blue-500">{item.icon}</div>
                    <div>
                      <div className="text-[13px] text-slate-700 font-medium leading-tight">{item.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sub}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right side - Auth form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="w-full lg:w-[45%] flex justify-center lg:pt-2"
            >
              <div className="w-full max-w-[420px]">
                {/* Mobile-only branding */}
                <div className="lg:hidden text-center mb-10">
                  <img src="/src/logo/FYP_Logo.png" alt="Sankalpa Logo" className="w-14 h-14 rounded-2xl object-contain mx-auto mb-4 shadow-lg" />
                  <h1 className="text-2xl font-bold text-slate-900">Sankalpa</h1>
                  <p className="text-sm font-medium text-blue-600 mt-0.5">— आशा, सुरक्षा र सहारा</p>
                  <p className="text-sm text-slate-500 mt-1">Disaster Management System</p>
                </div>

                {/* Auth card */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isRegister ? 'register' : 'login'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/40 p-9">
                      {/* Header */}
                      <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-900 rounded-xl mb-4 shadow-lg">
                          {isRegister ? (
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <line x1="19" y1="8" x2="19" y2="14" />
                              <line x1="22" y1="11" x2="16" y2="11" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          )}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1.5">
                          {isRegister ? 'Create Account' : 'Welcome Back'}
                        </h2>
                        <p className="text-slate-500 text-sm leading-relaxed">
                          {isRegister
                            ? 'Join the disaster response network'
                            : 'Sign in to access your dashboard'}
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                          {isRegister ? 'Register with' : 'Continue with'}
                        </span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>

                      {/* Google Login */}
                      <div className="mb-6">
                        <GoogleLoginButton
                          onSuccess={handleGoogleSuccess}
                          text={isRegister ? 'signup_with' : 'signin_with'}
                        />
                      </div>

                      {/* Toggle */}
                      <div className="text-center">
                        <p className="text-slate-500 text-sm">
                          {isRegister ? 'Already have an account?' : "Don't have an account?"}
                          <button
                            onClick={() => setIsRegister(!isRegister)}
                            className="ml-2 text-blue-600 font-semibold hover:text-blue-700 underline underline-offset-2 decoration-blue-200 hover:decoration-blue-500 transition-colors duration-200"
                          >
                            {isRegister ? 'Sign In' : 'Register'}
                          </button>
                        </p>
                      </div>
                    </div>

                    {/* Info cards below */}
                    <div className="mt-5 px-2">
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          {
                            icon: (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                            ), title: 'Multi-Role', desc: 'Citizen, Officer & Admin access',
                          },
                          {
                            icon: (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                              </svg>
                            ), title: 'Verified', desc: 'OTP secured authentication',
                          },
                          {
                            icon: (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              </svg>
                            ), title: 'Protected', desc: 'Role-based access control',
                          },
                        ].map((item, i) => (
                          <div key={i} className="text-center p-3 rounded-xl bg-white/70 backdrop-blur-sm border border-slate-100/60">
                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white text-slate-500 mb-1.5">{item.icon}</div>
                            <div className="text-xs font-semibold text-slate-700 mt-1.5">{item.title}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{item.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* Bottom bar */}
          <div className="px-8 lg:px-12 py-4 flex items-center justify-between relative z-10">
            <p className="text-[11px] text-slate-400 tracking-wider font-mono uppercase">
              From Direct Observation to Remote System-Supported Operations
            </p>
            <StatusDot color="blue" label="AI ACTIVE" />
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
