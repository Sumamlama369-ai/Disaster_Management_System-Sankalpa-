import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';

// Import data files
import nepalBorderData from '../data/map.json';
import noFlyZonesData from '../data/nofly_zones.json';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// SVG path data for each category symbol
const categorySymbolPaths = {
  military: { path: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z', color: '#DC2626' },
  airport: { path: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z', color: '#2563EB' },
  protected: { path: 'M17 12h2v6h-2v-6zm-4-4h2v10h-2V8zm-4 6h2v4H9v-4zm-4 2h2v2H5v-2zm16-6v10H3V10l9-6 9 6z', color: '#16A34A' },
  government: { path: 'M12 2L2 7v2h20V7L12 2zM4 10v8h3v-8H4zm5 0v8h3v-8H9zm5 0v8h3v-8h-3zm5 0v8h3v-8h-3zM2 20h20v2H2v-2z', color: '#7C3AED' },
  heritage: { path: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm-1-6h2v2h-2v-2zm0-8h2v6h-2V6z', color: '#EA580C' },
};

// Advanced custom marker icons with teardrop/pin shape and embedded symbol
const createMarkerIcon = (color, category) => {
  const symbol = categorySymbolPaths[category] || { path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z', color: color };
  const uniqueId = Math.random().toString(36).substr(2, 9);
  
  return L.divIcon({
    className: `custom-marker-advanced marker-cat-${category}`,
    html: `
      <div class="marker-wrapper" data-category="${category}">
        <div class="marker-container animated-marker">
          <svg width="44" height="56" viewBox="0 0 44 56" class="marker-svg">
            <defs>
              <filter id="shadow-${uniqueId}" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
              </filter>
            </defs>
            <!-- Pin shape -->
            <path d="M22 0C10 0 0 10 0 22c0 15 22 34 22 34s22-19 22-34C44 10 34 0 22 0z" 
                  fill="${color}" 
                  stroke="${adjustColor(color, -30)}"
                  stroke-width="1.5"
                  filter="url(#shadow-${uniqueId})"/>
            <!-- White circle background -->
            <circle cx="22" cy="20" r="12" fill="white"/>
            <!-- Category symbol -->
            <g transform="translate(13, 11) scale(0.75)">
              <path d="${symbol.path}" fill="${symbol.color}"/>
            </g>
          </svg>
          <div class="marker-shadow-pulse"></div>
        </div>
      </div>
    `,
    iconSize: [44, 56],
    iconAnchor: [22, 56],
    popupAnchor: [0, -56],
  });
};

// Helper to darken/lighten color
const adjustColor = (color, amount) => {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
};

// Map tile layers configuration
const tileLayers = {
  street: {
    name: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap',
  },
  dark: {
    name: 'Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB',
  },
  light: {
    name: 'Light Mode',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB',
  },
  positron: {
    name: 'Positron',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB',
  },
};

// Helper to parse radius string to meters
const parseRadius = (radiusStr) => {
  if (!radiusStr) return 2000; // default 2km
  const match = radiusStr.toLowerCase().match(/([\d.]+)\s*(km|m)?/);
  if (!match) return 2000;
  const value = parseFloat(match[1]);
  const unit = match[2] || 'km';
  return unit === 'km' ? value * 1000 : value;
};

// Category configuration
const categoryConfig = {
  military: { color: '#ef4444', label: 'Restricted Military Zones', icon: '🛡️', bgColor: 'bg-red-500' },
  airport: { color: '#f59e0b', label: 'Airport Buffer Zones', icon: '✈️', bgColor: 'bg-amber-500' },
  protected: { color: '#22c55e', label: 'Protected Areas', icon: '🌲', bgColor: 'bg-green-500' },
  government: { color: '#06b6d4', label: 'Government Buildings', icon: '🏛️', bgColor: 'bg-cyan-500' },
  heritage: { color: '#8b5cf6', label: 'Heritage Sites', icon: '🕉️', bgColor: 'bg-violet-500' },
};

export default function NoFlyZone() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const tileLayerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedTile, setSelectedTile] = useState('street');
  
  const [stats, setStats] = useState({
    totalZones: 0,
    militaryZones: 0,
    airportZones: 0,
    protectedAreas: 0,
    governmentZones: 0,
    heritageZones: 0,
  });
  
  const [controls, setControls] = useState({
    showNoFlyZones: true,
    showNepalBorder: true,
  });
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedZone, setSelectedZone] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [zonesList, setZonesList] = useState([]);
  const [filteredZones, setFilteredZones] = useState([]);

  // Layer references
  const layerRefs = useRef({
    noFlyZoneLayer: null,
    nepalBorderLayer: null,
    markersLayer: null,
  });
  
  // Store all markers with their categories
  const allMarkersRef = useRef([]);

  // Get zone category
  const getZoneCategory = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('military')) return 'military';
    if (t.includes('airport')) return 'airport';
    if (t.includes('protected')) return 'protected';
    if (t.includes('government')) return 'government';
    if (t.includes('religious') || t.includes('heritage')) return 'heritage';
    return 'protected';
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [28.3949, 84.1240],
      zoom: 7,
      zoomControl: false,
      scrollWheelZoom: true,
      minZoom: 6,
      maxZoom: 18,
    });

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add initial tile layer
    tileLayerRef.current = L.tileLayer(tileLayers.street.url, {
      attribution: tileLayers.street.attribution,
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;

    // Load Nepal border
    if (nepalBorderData?.features) {
      const nepalBorder = L.geoJSON(nepalBorderData, {
        style: {
          color: '#6b7280',
          weight: 2,
          opacity: 0.8,
          fillColor: '#6b7280',
          fillOpacity: 0.05,
        },
      });
      layerRefs.current.nepalBorderLayer = nepalBorder;
      nepalBorder.addTo(map);

      const bounds = nepalBorder.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    // Load no-fly zones
    loadNoFlyZones(map);

    setMapReady(true);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Load no-fly zones with markers
  const loadNoFlyZones = (map) => {
    if (!noFlyZonesData?.features) {
      toast.error('No-fly zones data not found');
      return;
    }

    // Reset markers array
    allMarkersRef.current = [];
    
    const counts = { military: 0, airport: 0, protected: 0, government: 0, heritage: 0 };
    const zones = [];
    const markersGroup = L.layerGroup();
    const circlesGroup = L.layerGroup();

    // Create circles based on radius for each feature
    noFlyZonesData.features.forEach((feature, index) => {
      const props = feature.properties;
      const category = getZoneCategory(props.type);
      const color = categoryConfig[category]?.color || '#6366f1';
      counts[category]++;
      
      // Get center point from geometry
      let center;
      if (feature.geometry.type === 'Point') {
        center = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
      } else if (feature.geometry.type === 'Polygon') {
        // Calculate centroid from polygon coords
        const coords = feature.geometry.coordinates[0];
        const sumLat = coords.reduce((sum, c) => sum + c[1], 0);
        const sumLng = coords.reduce((sum, c) => sum + c[0], 0);
        center = L.latLng(sumLat / coords.length, sumLng / coords.length);
      }
      
      // Parse radius and create circle
      const radiusMeters = parseRadius(props.radius);
      const circle = L.circle(center, {
        radius: radiusMeters,
        color: color,
        weight: 2,
        opacity: 0.8,
        fillColor: color,
        fillOpacity: 0.25,
      });
      
      // Store reference for filtering
      circle._category = category;
      zones.push({ ...props, category, layer: circle, id: feature.id || index, center });
      
      // Circle interactions
      circle.on('mouseover', function() {
        this.setStyle({ weight: 3, fillOpacity: 0.4 });
      });
      circle.on('mouseout', function() {
        this.setStyle({ weight: 2, fillOpacity: 0.25 });
      });
      circle.on('click', (e) => {
        const map = mapInstance.current;
        if (map) {
          const point = map.latLngToContainerPoint(e.latlng);
          setPopupPosition({ x: point.x, y: point.y });
        }
        setSelectedZone({ ...props, category });
      });
      
      circlesGroup.addLayer(circle);

      // Create marker at center
      const marker = L.marker(center, {
        icon: createMarkerIcon(color, category),
        category: category,
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        const map = mapInstance.current;
        if (map) {
          const point = map.latLngToContainerPoint(center);
          setPopupPosition({ x: point.x, y: point.y });
        }
        setSelectedZone({ ...props, category });
      });
      
      marker._category = category;
      marker._zoneData = { ...props, category };
      allMarkersRef.current.push(marker);
      markersGroup.addLayer(marker);
    });

    layerRefs.current.noFlyZoneLayer = circlesGroup;
    layerRefs.current.markersLayer = markersGroup;
    circlesGroup.addTo(map);
    markersGroup.addTo(map);

    setStats({
      totalZones: noFlyZonesData.features.length,
      militaryZones: counts.military,
      airportZones: counts.airport,
      protectedAreas: counts.protected,
    });
    setZonesList(zones);
    setFilteredZones(zones);
  };

  // Change tile layer
  const changeTileLayer = (tileKey) => {
    if (!mapInstance.current || !tileLayers[tileKey]) return;
    
    if (tileLayerRef.current) {
      mapInstance.current.removeLayer(tileLayerRef.current);
    }
    
    tileLayerRef.current = L.tileLayer(tileLayers[tileKey].url, {
      attribution: tileLayers[tileKey].attribution,
      maxZoom: 19,
    }).addTo(mapInstance.current);
    
    setSelectedTile(tileKey);
  };

  // Toggle controls
  const toggleControl = (key) => {
    const newControls = { ...controls, [key]: !controls[key] };
    setControls(newControls);

    if (key === 'showNoFlyZones') {
      if (newControls[key]) {
        layerRefs.current.noFlyZoneLayer?.addTo(mapInstance.current);
        layerRefs.current.markersLayer?.addTo(mapInstance.current);
      } else {
        mapInstance.current?.removeLayer(layerRefs.current.noFlyZoneLayer);
        mapInstance.current?.removeLayer(layerRefs.current.markersLayer);
      }
    } else if (key === 'showNepalBorder') {
      if (newControls[key]) {
        layerRefs.current.nepalBorderLayer?.addTo(mapInstance.current);
      } else {
        mapInstance.current?.removeLayer(layerRefs.current.nepalBorderLayer);
      }
    }
  };

  // Filter by category
  const filterByCategory = (category) => {
    setSelectedCategory(category);
    
    if (category === 'all') {
      setFilteredZones(zonesList);
      
      // Show all circle zones
      layerRefs.current.noFlyZoneLayer?.eachLayer((layer) => {
        layer.setStyle({ opacity: 0.8, fillOpacity: 0.25 });
      });
      
      // Show all markers by adding them back to the layer group
      allMarkersRef.current.forEach((marker) => {
        if (!layerRefs.current.markersLayer.hasLayer(marker)) {
          layerRefs.current.markersLayer.addLayer(marker);
        }
      });
    } else {
      const filtered = zonesList.filter(z => z.category === category);
      setFilteredZones(filtered);
      
      // Filter circle zones using stored _category
      layerRefs.current.noFlyZoneLayer?.eachLayer((layer) => {
        if (layer._category === category) {
          layer.setStyle({ opacity: 0.8, fillOpacity: 0.25 });
        } else {
          layer.setStyle({ opacity: 0, fillOpacity: 0 });
        }
      });
      
      // Filter markers - remove non-matching, add matching
      allMarkersRef.current.forEach((marker) => {
        const markerCategory = marker._category;
        if (markerCategory === category) {
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

  // Navigate to zone
  const navigateToZone = (zone) => {
    if (!mapInstance.current) return;
    
    const layer = zone.layer;
    if (layer) {
      const bounds = layer.getBounds();
      const center = zone.center || bounds.getCenter();
      mapInstance.current.fitBounds(bounds, { padding: [100, 100], maxZoom: 14 });
      
      // Wait for animation to complete, then set popup position
      setTimeout(() => {
        if (mapInstance.current) {
          const point = mapInstance.current.latLngToContainerPoint(center);
          setPopupPosition({ x: point.x, y: point.y });
        }
        setSelectedZone(zone);
      }, 300);
    }
  };

  // Center map
  const centerMap = () => {
    if (mapInstance.current && layerRefs.current.nepalBorderLayer) {
      const bounds = layerRefs.current.nepalBorderLayer.getBounds();
      if (bounds.isValid()) {
        mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  };

  // Fullscreen
  const toggleFullscreen = () => {
    const container = mapRef.current?.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setTimeout(() => mapInstance.current?.invalidateSize(), 200);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Get risk badge color
  const getRiskBadge = (risk) => {
    if (risk === 'Critical') return 'bg-red-500 text-white';
    if (risk === 'High') return 'bg-orange-500 text-white';
    return 'bg-yellow-500 text-white';
  };

  // Category counts
  const getCategoryCount = (cat) => {
    if (cat === 'military') return stats.militaryZones;
    if (cat === 'airport') return stats.airportZones;
    if (cat === 'protected') return stats.protectedAreas;
    if (cat === 'government') return stats.governmentZones;
    if (cat === 'heritage') return stats.heritageZones;
    return 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white shadow-xl">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-white/20">
                <span className="text-2xl font-bold text-white">NP</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Nepal Drone No-Fly Zone Mapper</h1>
                <p className="text-slate-300 text-sm">Professional Aerial Restriction Visualization System</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.totalZones}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">No-Fly Zones</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.militaryZones}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Military Zones</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.airportZones}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Airport Zones</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.protectedAreas}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Protected Areas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">Active</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Status</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto p-4">
        <div className="flex gap-4" style={{ height: 'calc(100vh - 160px)' }}>
          
          {/* Left Sidebar */}
          <div className="w-[360px] flex-shrink-0 space-y-4 overflow-y-auto pr-2">
            
            {/* Map Controls */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Map Controls</h2>
              
              {/* Toggle: Show No-Fly Zones */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-700">Show No-Fly Zones</span>
                <button
                  onClick={() => toggleControl('showNoFlyZones')}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    controls.showNoFlyZones ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      controls.showNoFlyZones ? 'left-8' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle: Show Nepal Border */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-gray-700">Show Nepal Border</span>
                <button
                  onClick={() => toggleControl('showNepalBorder')}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    controls.showNepalBorder ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      controls.showNepalBorder ? 'left-8' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-4">No-Fly Zone Categories</h2>
              
              {/* Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => filterByCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">All Categories ({stats.totalZones})</option>
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label} ({getCategoryCount(key)})
                  </option>
                ))}
              </select>

              {/* Category List */}
              <div className="space-y-2">
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => filterByCategory(key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                      selectedCategory === key
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className={`w-8 h-8 ${config.bgColor} rounded-lg flex items-center justify-center`}>
                      <span className="text-white text-sm">{config.icon}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{config.label.replace(' Zones', '').replace(' Areas', '')}</div>
                      <div className={`text-xs ${selectedCategory === key ? 'text-cyan-100' : 'text-gray-500'}`}>
                        {key === 'government' ? 'Sensitive government facilities' : 
                         key === 'military' ? 'Restricted military areas' :
                         key === 'airport' ? 'Airport buffer zones' :
                         key === 'protected' ? 'National parks & reserves' :
                         'Cultural & religious sites'}
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${selectedCategory === key ? 'text-white' : 'text-gray-500'}`}>
                      {getCategoryCount(key)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Zones List */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>📋</span>
                {selectedCategory === 'all' ? 'All Zones' : categoryConfig[selectedCategory]?.label} ({filteredZones.length})
              </h2>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {filteredZones.map((zone, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigateToZone(zone)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedZone?.name === zone.name
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 text-sm truncate">{zone.name}</div>
                        <div className="text-xs text-gray-500">{zone.authority || 'Government of Nepal'}</div>
                      </div>
                      {zone.risk_level && (
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${getRiskBadge(zone.risk_level)}`}>
                          {zone.risk_level.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 relative">
            <div className="bg-white rounded-xl shadow-xl overflow-hidden h-full border border-gray-200">
              <div ref={mapRef} className="w-full h-full" />
              
              {/* Selected Zone Popup - Enhanced Professional Design */}
              <AnimatePresence>
                {selectedZone && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="absolute bg-white rounded-2xl shadow-2xl z-[1000] w-[320px] overflow-hidden border border-gray-100"
                    style={{ 
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                      left: `${Math.min(Math.max(popupPosition.x - 160, 10), window.innerWidth - 340)}px`,
                      top: `${Math.max(popupPosition.y - 280, 10)}px`,
                    }}
                  >
                    {/* Header with gradient */}
                    <div className={`px-5 py-4 ${categoryConfig[selectedZone.category]?.bgColor} bg-opacity-90`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                            <span className="text-xl">{categoryConfig[selectedZone.category]?.icon}</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white leading-tight">{selectedZone.name}</h3>
                            <p className="text-white/80 text-xs mt-0.5">{categoryConfig[selectedZone.category]?.label}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedZone(null)}
                          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="px-5 py-4 space-y-3">
                      {selectedZone.authority && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Authority</p>
                            <p className="text-sm text-gray-800 font-semibold">{selectedZone.authority}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        {selectedZone.risk_level && (
                          <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Risk Level</p>
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                                selectedZone.risk_level === 'Critical' ? 'bg-red-500' :
                                selectedZone.risk_level === 'High' ? 'bg-orange-500' : 'bg-yellow-500'
                              }`}></span>
                              <span className={`font-bold text-sm ${
                                selectedZone.risk_level === 'Critical' ? 'text-red-600' :
                                selectedZone.risk_level === 'High' ? 'text-orange-600' : 'text-yellow-600'
                              }`}>{selectedZone.risk_level}</span>
                            </div>
                          </div>
                        )}
                        
                        {selectedZone.radius && (
                          <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Buffer Radius</p>
                            <p className="text-sm font-bold text-gray-800">{selectedZone.radius}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="px-5 py-3 bg-red-50 border-t border-red-100">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-xs text-red-700 font-medium">Drone flights strictly prohibited in this area</p>
                      </div>
                    </div>
                    
                    {/* Pointer Arrow */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 -bottom-2"
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent',
                        borderTop: '10px solid #FEF2F2',
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Map Legend */}
              <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg p-4 z-[1000] border border-gray-200">
                <h3 className="text-sm font-bold text-gray-800 mb-3">Map Legend</h3>
                <div className="space-y-2">
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${config.bgColor}`}></div>
                      <span className="text-xs text-gray-600">{config.label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-500"></div>
                    <span className="text-xs text-gray-600">Nepal Border</span>
                  </div>
                </div>
              </div>

              {/* Map Controls */}
              <div className="absolute bottom-4 right-16 flex gap-2 z-[1000]">
                <button
                  onClick={centerMap}
                  className="px-4 py-2 bg-white rounded-lg shadow-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Center Map
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="px-4 py-2 bg-white rounded-lg shadow-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Fullscreen
                </button>
              </div>
            </div>

            {/* Tile Layer Selector */}
            <div className="absolute top-4 right-4 bg-white rounded-xl shadow-lg p-3 z-[1000] border border-gray-200">
              <div className="space-y-1">
                {Object.entries(tileLayers).map(([key, layer]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <input
                      type="radio"
                      name="tileLayer"
                      checked={selectedTile === key}
                      onChange={() => changeTileLayer(key)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-xs text-gray-700">{layer.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {!mapReady && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
              <h3 className="text-xl font-bold text-gray-800">Loading Map...</h3>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-marker-advanced {
          background: transparent !important;
          border: none !important;
        }
        
        .marker-wrapper {
          position: relative;
          width: 44px;
          height: 56px;
        }
        
        .marker-container {
          position: relative;
          width: 44px;
          height: 56px;
        }
        
        .animated-marker {
          animation: marker-float 2.5s ease-in-out infinite;
        }
        
        .marker-svg {
          position: absolute;
          top: 0;
          left: 0;
        }
        
        .marker-shadow-pulse {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 14px;
          height: 6px;
          background: rgba(0, 0, 0, 0.25);
          border-radius: 50%;
          animation: pulse-shadow 2.5s ease-in-out infinite;
        }
        
        .marker-wrapper:hover .marker-container {
          animation: marker-bounce 0.6s ease;
        }
        
        @keyframes marker-float {
          0%, 100% { 
            transform: translateY(0);
          }
          50% { 
            transform: translateY(-5px);
          }
        }
        
        @keyframes marker-bounce {
          0% { transform: translateY(0) scale(1); }
          20% { transform: translateY(-15px) scale(1.1); }
          40% { transform: translateY(-8px) scale(1.05); }
          60% { transform: translateY(-12px) scale(1.08); }
          80% { transform: translateY(-4px) scale(1.02); }
          100% { transform: translateY(0) scale(1); }
        }
        
        @keyframes pulse-shadow {
          0%, 100% { 
            transform: translateX(-50%) scale(1);
            opacity: 0.25;
          }
          50% { 
            transform: translateX(-50%) scale(0.6);
            opacity: 0.1;
          }
        }
        
        .leaflet-marker-icon {
          transition: all 0.3s ease !important;
        }
        
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          border-radius: 12px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          border: none !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 18px !important;
        }
        .leaflet-control-zoom a:first-child {
          border-radius: 12px 12px 0 0 !important;
        }
        .leaflet-control-zoom a:last-child {
          border-radius: 0 0 12px 12px !important;
        }
      `}</style>
    </div>
  );
}
