import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import api from '../services/api';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

export default function LiveDashboard() {
  const [stats, setStats] = useState({
    total_incidents: 0,
    urgent_incidents: 0,
    avg_sentiment: 0,
    top_disaster_type: null,
    top_location: null,
    hourly_count: 0,
  });

  const [recentDisasters, setRecentDisasters] = useState([]);
  const [disasterTypes, setDisasterTypes] = useState([]);
  const [locationHotspots, setLocationHotspots] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [nextFetch, setNextFetch] = useState(new Date(Date.now() + 300000));
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [mapRegistered, setMapRegistered] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds

  const DISASTER_COLORS = {
    earthquake: '#ef4444', flood: '#3b82f6', fire: '#f97316',
    hurricane: '#8b5cf6', tornado: '#6366f1', tsunami: '#0ea5e9',
    volcano: '#dc2626', drought: '#f59e0b', landslide: '#84cc16',
    pandemic: '#ec4899', conflict: '#dc2626', explosion: '#f97316',
    other: '#6b7280',
  };

  // Corrected coordinates
  const countryCoordinates = {
    'USA': [-95.7129, 37.0902], 'Canada': [-106.3468, 56.1304], 'Mexico': [-102.5528, 23.6345],
    'California': [-119.4179, 36.7783], 'NC': [-79.0193, 35.7596], 'Virginia': [-78.6569, 37.4316],
    'Vegas': [-115.1398, 36.1699], 'UK': [-3.4360, 55.3781], 'London': [-0.1278, 51.5074],
    'Germany': [10.4515, 51.1657], 'France': [2.2137, 46.2276], 'Italy': [12.5674, 41.8719],
    'Spain': [-3.7038, 40.4168], 'Ukraine': [31.1656, 48.3794], 'Russia': [105.3188, 61.5240],
    'China': [104.1954, 35.8617], 'Japan': [138.2529, 36.2048], 'India': [78.9629, 20.5937],
    'Iran': [53.6880, 32.4279], 'Turkey': [35.2433, 38.9637], 'Uttarakhand': [79.0193, 30.0668],
    'Brazil': [-47.8825, -15.7942], 'Argentina': [-63.6167, -38.4161], 'Patagonia': [-69.0, -42.0],
    'Africa': [20.0, 0.0], 'Zemmouri': [3.5800, 36.7800], 'Australia': [133.7751, -25.2744],
    'West': [-120.0, 40.0], 'Siberia': [105.0, 60.0], 'Pacific basin': [-155.0, 15.0],
  };

  // Register world map
  useEffect(() => {
    const registerWorldMap = async () => {
      try {
        const response = await fetch('/world.json');
        const worldGeoJson = await response.json();
        echarts.registerMap('world', worldGeoJson);
        setMapRegistered(true);
      } catch (error) {
        try {
          const cdnResponse = await fetch('https://raw.githubusercontent.com/apache/echarts/master/test/data/map/json/world.json');
          const worldGeoJson = await cdnResponse.json();
          echarts.registerMap('world', worldGeoJson);
          setMapRegistered(true);
        } catch (cdnError) {
          console.error('Failed to load map:', cdnError);
        }
      }
    };
    registerWorldMap();
  }, []);

  // Countdown timer
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => {
      fetchStats();
      fetchRecentDisasters();
      setLastUpdate(new Date());
      setNextFetch(new Date(Date.now() + 30000));
      setCountdown(30);
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const critical = recentDisasters.filter(d => d.urgency_level === 'critical').slice(0, 3);
    if (critical.length > 0 && JSON.stringify(critical) !== JSON.stringify(criticalAlerts)) {
      setCriticalAlerts(critical);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 10000);
    }
  }, [recentDisasters]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(), fetchRecentDisasters(), fetchDisasterTypes(),
        fetchLocationHotspots(), fetchTimeline(),
      ]);
      setLastUpdate(new Date());
      setNextFetch(new Date(Date.now() + 300000));
      setCountdown(300);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/disasters/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentDisasters = async () => {
    try {
      const response = await api.get('/disasters/dashboard/recent-disasters?limit=100');
      setRecentDisasters(response.data);
    } catch (error) {
      console.error('Error fetching recent disasters:', error);
    }
  };

  const fetchDisasterTypes = async () => {
    try {
      const response = await api.get('/disasters/dashboard/disaster-types');
      setDisasterTypes(response.data);
    } catch (error) {
      console.error('Error fetching disaster types:', error);
    }
  };

  const fetchLocationHotspots = async () => {
    try {
      const response = await api.get('/disasters/dashboard/location-hotspots?limit=15');
      setLocationHotspots(response.data);
    } catch (error) {
      console.error('Error fetching location hotspots:', error);
    }
  };

  const fetchTimeline = async () => {
    try {
      const response = await api.get('/disasters/dashboard/timeline?hours=24');
      setTimeline(response.data);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };

  // Format countdown
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ENHANCED MODERN SUNBURST (Rose Chart Style)
  const getModernSunburstOption = () => {
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#1f2937', fontSize: 13 },
        formatter: (params) => {
          return `<div style="padding: 6px;">
            <div style="font-weight: bold; font-size: 14px; color: ${params.color}; margin-bottom: 4px;">
              ${params.name}
            </div>
            <div style="color: #6b7280;">Incidents: <strong>${params.value}</strong></div>
            <div style="color: #6b7280;">Percentage: <strong>${params.percent.toFixed(1)}%</strong></div>
          </div>`;
        },
      },
      series: [{
        type: 'pie',
        radius: ['40%', '75%'],
        center: ['50%', '50%'],
        roseType: 'area',
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 3,
          shadowBlur: 20,
          shadowColor: 'rgba(0, 0, 0, 0.1)',
        },
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}\n{d}%',
          fontSize: 11,
          fontWeight: 'bold',
          color: '#374151',
        },
        labelLine: {
          show: true,
          length: 15,
          length2: 10,
          lineStyle: { width: 2 },
        },
        emphasis: {
          scale: true,
          scaleSize: 10,
          itemStyle: {
            shadowBlur: 30,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
          label: {
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        data: disasterTypes.map(type => ({
          value: type.count,
          name: type.disaster_type.charAt(0).toUpperCase() + type.disaster_type.slice(1),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: DISASTER_COLORS[type.disaster_type] },
              { offset: 1, color: DISASTER_COLORS[type.disaster_type] + 'dd' },
            ]),
          },
        })),
      }],
    };
  };

  // MODERN GRADIENT STREAM CHART
  const getModernStreamOption = () => {
    const disasterTimeSeries = {};
    
    recentDisasters.forEach(disaster => {
      const hour = new Date(disaster.timestamp).getHours();
      const type = disaster.disaster_type;
      
      if (!disasterTimeSeries[type]) {
        disasterTimeSeries[type] = new Array(24).fill(0);
      }
      disasterTimeSeries[type][hour]++;
    });

    const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    const series = Object.keys(disasterTimeSeries).map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      type: 'line',
      stack: 'Total',
      smooth: 0.4,
      emphasis: { focus: 'series' },
      areaStyle: {
        opacity: 0.8,
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: DISASTER_COLORS[type] + 'dd' },
          { offset: 1, color: DISASTER_COLORS[type] + '33' },
        ]),
      },
      lineStyle: {
        width: 0,
      },
      showSymbol: false,
      data: disasterTimeSeries[type],
      color: DISASTER_COLORS[type],
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6366f1',
          },
        },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#1f2937', fontSize: 12 },
      },
      legend: {
        data: Object.keys(disasterTimeSeries).map(t => t.charAt(0).toUpperCase() + t.slice(1)),
        bottom: 5,
        left: 'center',
        textStyle: { fontSize: 11, fontWeight: '500' },
        itemWidth: 25,
        itemHeight: 14,
        icon: 'roundRect',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: hours,
        axisLabel: {
          fontSize: 11,
          color: '#6b7280',
          fontWeight: '500',
          interval: 2,
        },
        axisLine: {
          lineStyle: { color: '#e5e7eb', width: 2 },
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 11,
          color: '#6b7280',
          fontWeight: '500',
        },
        splitLine: {
          lineStyle: { color: '#f3f4f6', type: 'dashed' },
        },
        axisLine: { show: false },
      },
      series: series,
    };
  };

  // ENHANCED BUBBLE CHART
  const getEnhancedBubbleOption = () => {
    const hourlyData = {};
    
    recentDisasters.forEach(disaster => {
      const hour = new Date(disaster.timestamp).getHours();
      const type = disaster.disaster_type;
      
      if (!hourlyData[hour]) {
        hourlyData[hour] = {};
      }
      if (!hourlyData[hour][type]) {
        hourlyData[hour][type] = 0;
      }
      hourlyData[hour][type]++;
    });

    const bubbleData = [];
    Object.keys(hourlyData).forEach(hour => {
      Object.keys(hourlyData[hour]).forEach(type => {
        bubbleData.push([
          parseInt(hour),
          disasterTypes.findIndex(d => d.disaster_type === type),
          hourlyData[hour][type],
          type,
        ]);
      });
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (params) => {
          return `<div style="padding: 8px;">
            <div style="font-weight: bold; color: ${DISASTER_COLORS[params.data[3]]}; margin-bottom: 4px;">
              ${params.data[3].charAt(0).toUpperCase() + params.data[3].slice(1)}
            </div>
            <div style="color: #6b7280;">Time: <strong>${params.data[0]}:00</strong></div>
            <div style="color: #6b7280;">Incidents: <strong>${params.data[2]}</strong></div>
          </div>`;
        },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
      },
      grid: {
        left: '12%',
        right: '5%',
        bottom: '8%',
        top: '5%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: 'Hour of Day',
        nameTextStyle: { fontSize: 12, fontWeight: 'bold', color: '#374151' },
        min: 0,
        max: 23,
        interval: 3,
        axisLabel: {
          fontSize: 11,
          color: '#6b7280',
          fontWeight: '500',
          formatter: (val) => `${val}:00`,
        },
        splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
        axisLine: { lineStyle: { color: '#e5e7eb', width: 2 } },
      },
      yAxis: {
        type: 'category',
        data: disasterTypes.map(t => t.disaster_type.charAt(0).toUpperCase() + t.disaster_type.slice(1)),
        axisLabel: {
          fontSize: 11,
          color: '#374151',
          fontWeight: '600',
        },
        axisLine: { lineStyle: { color: '#e5e7eb', width: 2 } },
        axisTick: { show: false },
      },
      series: [{
        type: 'scatter',
        data: bubbleData,
        symbolSize: (data) => Math.sqrt(data[2]) * 18,
        itemStyle: {
          color: (params) => DISASTER_COLORS[params.data[3]] || '#6b7280',
          opacity: 0.85,
          shadowBlur: 15,
          shadowColor: 'rgba(0, 0, 0, 0.2)',
          borderColor: '#fff',
          borderWidth: 2,
        },
        emphasis: {
          scale: 1.3,
          itemStyle: {
            shadowBlur: 25,
            shadowColor: 'rgba(0, 0, 0, 0.4)',
            borderWidth: 3,
          },
        },
      }],
    };
  };

  // Keep other chart functions (map, horizontal bar, gauge, sentiment, radar) the same...
  // [Previous implementations remain unchanged]

  const getGeoMapOption = () => {
    const mapData = locationHotspots.map(loc => {
      const coords = countryCoordinates[loc.location];
      return coords ? {
        name: loc.location,
        value: [...coords, loc.count],
      } : null;
    }).filter(Boolean);

    const maxCount = Math.max(...mapData.map(d => d.value[2]), 1);

    return {
      backgroundColor: '#f8fafc',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#1f2937', fontSize: 13 },
        formatter: (params) => {
          if (params.seriesType === 'scatter' || params.seriesType === 'effectScatter') {
            const count = params.value[2];
            const percentage = ((count / maxCount) * 100).toFixed(1);
            return `<div style="padding: 8px;">
              <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px; color: #ef4444;">
                📍 ${params.name}
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="color: #6b7280;">Incidents:</span>
                <span style="font-weight: bold; color: #1f2937;">${count}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="color: #6b7280;">Intensity:</span>
                <span style="font-weight: bold; color: #ef4444;">${percentage}%</span>
              </div>
            </div>`;
          }
          return params.name;
        },
      },
      visualMap: {
        show: true,
        min: 0,
        max: maxCount,
        calculable: true,
        realtime: true,
        inRange: {
          color: ['#fef3c7', '#fde68a', '#fbbf24', '#f59e0b', '#f97316', '#ef4444', '#dc2626', '#b91c1c'],
        },
        textStyle: { color: '#374151', fontSize: 11, fontWeight: '500' },
        formatter: (value) => Math.round(value),
        left: 'right',
        top: 'bottom',
        itemWidth: 20,
        itemHeight: 140,
        text: ['High', 'Low'],
        orient: 'vertical',
      },
      geo: {
        map: 'world',
        roam: true,
        scaleLimit: { min: 1, max: 10 },
        zoom: 1.2,
        center: [20, 30],
        itemStyle: { areaColor: '#e5e7eb', borderColor: '#9ca3af', borderWidth: 0.8 },
        emphasis: {
          itemStyle: { areaColor: '#cbd5e1', borderColor: '#64748b', borderWidth: 1.2 },
          label: { show: false },
        },
        label: { show: false },
      },
      series: [
        {
          type: 'scatter',
          coordinateSystem: 'geo',
          data: mapData,
          symbolSize: (val) => Math.max(Math.sqrt(val[2]) * 8, 10),
          itemStyle: {
            color: (params) => {
              const count = params.value[2];
              const ratio = count / maxCount;
              if (ratio > 0.7) return '#dc2626';
              if (ratio > 0.5) return '#ef4444';
              if (ratio > 0.3) return '#f97316';
              if (ratio > 0.15) return '#fbbf24';
              return '#10b981';
            },
            shadowBlur: 20,
            shadowColor: (params) => {
              const count = params.value[2];
              const ratio = count / maxCount;
              return ratio > 0.5 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(249, 115, 22, 0.4)';
            },
            borderColor: '#fff',
            borderWidth: 2,
          },
          emphasis: {
            scale: 1.5,
            itemStyle: { shadowBlur: 30, borderWidth: 3 },
          },
          zlevel: 2,
        },
        {
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: mapData.filter(d => d.value[2] > 2),
          symbolSize: (val) => Math.max(Math.sqrt(val[2]) * 10, 12),
          showEffectOn: 'render',
          rippleEffect: { brushType: 'stroke', color: '#ef4444', scale: 4, period: 4, number: 2 },
          itemStyle: { color: '#ef4444', shadowBlur: 15, shadowColor: 'rgba(239, 68, 68, 0.8)', borderColor: '#fff', borderWidth: 2 },
          emphasis: { scale: 1.5 },
          zlevel: 3,
        },
        {
          type: 'scatter',
          coordinateSystem: 'geo',
          data: mapData.filter(d => d.value[2] > 2),
          symbolSize: 1,
          label: {
            show: true,
            formatter: '{b}',
            position: 'top',
            color: '#1f2937',
            fontSize: 12,
            fontWeight: 'bold',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: [4, 8],
            borderRadius: 4,
            borderColor: '#e5e7eb',
            borderWidth: 1,
          },
          emphasis: { label: { show: true, fontSize: 14 } },
          zlevel: 4,
        },
      ],
    };
  };

  const getHorizontalBarOption = () => {
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '20%', right: '10%', bottom: '5%', top: '5%', containLabel: true },
      xAxis: { type: 'value', axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: 'dashed' } } },
      yAxis: {
        type: 'category',
        data: locationHotspots.map(l => l.location),
        axisLabel: { fontSize: 11, fontWeight: '500' },
      },
      series: [{
        type: 'bar',
        data: locationHotspots.map((l, i) => ({
          value: l.count,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: ['#ef4444', '#f97316', '#fbbf24', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'][i % 7] },
              { offset: 1, color: ['#dc2626', '#ea580c', '#f59e0b', '#059669', '#2563eb', '#7c3aed', '#db2777'][i % 7] },
            ]),
            borderRadius: [0, 8, 8, 0],
          },
        })),
        barWidth: '70%',
        label: { show: true, position: 'right', formatter: '{c}', fontSize: 10, fontWeight: 'bold' },
      }],
    };
  };

  const getGaugeChartOption = () => {
    const urgencyScore = stats.urgent_incidents / (stats.total_incidents || 1) * 100;
    
    return {
      series: [{
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 4,
        itemStyle: {
          color: urgencyScore > 60 ? '#ef4444' : urgencyScore > 40 ? '#f97316' : urgencyScore > 20 ? '#fbbf24' : '#10b981',
        },
        progress: { show: true, width: 22 },
        pointer: { show: false },
        axisLine: { lineStyle: { width: 22 } },
        axisTick: { show: false },
        splitLine: { distance: -22, length: 14, lineStyle: { width: 2, color: '#fff' } },
        axisLabel: { distance: 32, fontSize: 11 },
        title: { show: false },
        detail: {
          valueAnimation: true,
          formatter: '{value}%',
          fontSize: 32,
          fontWeight: 'bold',
          offsetCenter: [0, '0%'],
        },
        data: [{ value: urgencyScore.toFixed(0) }],
      }],
    };
  };

  // REAL SENTIMENT WAVE (using actual database data)
  const getRealSentimentWaveOption = () => {
    // Extract sentiment data from recent disasters over time
    const sentimentTimeline = recentDisasters
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-50) // Last 50 disasters
      .map((disaster, index) => ({
        x: index,
        y: disaster.sentiment || 0,
        time: new Date(disaster.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        type: disaster.disaster_type,
      }));

    // Calculate moving average for smoother trend
    const movingAverage = (data, windowSize = 5) => {
      return data.map((item, index) => {
        const start = Math.max(0, index - Math.floor(windowSize / 2));
        const end = Math.min(data.length, index + Math.ceil(windowSize / 2));
        const window = data.slice(start, end);
        const avg = window.reduce((sum, d) => sum + d.y, 0) / window.length;
        return { ...item, smoothed: avg };
      });
    };

    const smoothedData = movingAverage(sentimentTimeline);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#1f2937', fontSize: 12 },
        formatter: (params) => {
          const data = sentimentTimeline[params[0].dataIndex];
          if (!data) return '';
          const sentiment = data.y;
          const emoji = sentiment > 0.3 ? '😊' : sentiment > 0 ? '😐' : sentiment > -0.3 ? '😟' : '😰';
          
          return `<div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 6px; color: #374151;">
              ${emoji} Sentiment Analysis
            </div>
            <div style="color: #6b7280; margin-bottom: 4px;">
              Time: <strong>${data.time}</strong>
            </div>
            <div style="color: #6b7280; margin-bottom: 4px;">
              Type: <strong>${data.type}</strong>
            </div>
            <div style="color: #6b7280;">
              Score: <strong style="color: ${sentiment > 0 ? '#10b981' : '#ef4444'}">${sentiment.toFixed(3)}</strong>
            </div>
            <div style="color: #6b7280; margin-top: 4px; font-size: 11px;">
              ${sentiment > 0 ? '✅ Positive sentiment' : '⚠️ Negative sentiment'}
            </div>
          </div>`;
        },
      },
      grid: {
        left: '8%',
        right: '5%',
        bottom: '8%',
        top: '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: smoothedData.map(d => d.time),
        axisLabel: {
          fontSize: 10,
          color: '#6b7280',
          fontWeight: '500',
          interval: Math.floor(smoothedData.length / 8),
          rotate: 0,
        },
        axisLine: {
          lineStyle: { color: '#e5e7eb', width: 2 },
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'Sentiment',
        nameTextStyle: {
          fontSize: 12,
          fontWeight: 'bold',
          color: '#374151',
        },
        min: -1,
        max: 1,
        interval: 0.5,
        axisLabel: {
          fontSize: 11,
          color: '#6b7280',
          fontWeight: '500',
          formatter: (val) => {
            if (val === 0) return '😐 Neutral';
            if (val > 0) return `😊 +${val.toFixed(1)}`;
            return `😰 ${val.toFixed(1)}`;
          },
        },
        splitLine: {
          lineStyle: { color: '#f3f4f6', type: 'dashed' },
        },
        axisLine: { show: false },
      },
      series: [
        // Actual sentiment points
        {
          name: 'Raw Sentiment',
          type: 'scatter',
          data: sentimentTimeline.map(d => d.y),
          symbolSize: 6,
          itemStyle: {
            color: (params) => {
              const val = params.value;
              if (val > 0.3) return '#10b981';
              if (val > 0) return '#84cc16';
              if (val > -0.3) return '#f59e0b';
              return '#ef4444';
            },
            opacity: 0.6,
          },
          z: 2,
        },
        // Smoothed trend line
        {
          name: 'Trend',
          type: 'line',
          data: smoothedData.map(d => d.smoothed),
          smooth: true,
          symbol: 'none',
          lineStyle: {
            width: 4,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#3b82f6' },
              { offset: 0.5, color: '#8b5cf6' },
              { offset: 1, color: '#ec4899' },
            ]),
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ]),
          },
          z: 1,
        },
        // Zero baseline
        {
          type: 'line',
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: '#ef4444',
              type: 'solid',
              width: 2,
            },
            data: [{ yAxis: 0 }],
            label: {
              show: true,
              position: 'end',
              formatter: 'Neutral Line',
              fontSize: 10,
              color: '#ef4444',
            },
          },
        },
      ],
    };
  };

  // ENHANCED LARGER RADAR (increased size)
  const getEnhancedRadarOption = () => {
    const topTypes = disasterTypes.slice(0, 8);
    const maxValue = Math.max(...disasterTypes.map(t => t.count)) * 1.2;
    
    const indicators = topTypes.map(type => ({
      name: type.disaster_type.charAt(0).toUpperCase() + type.disaster_type.slice(1),
      max: maxValue,
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#1f2937', fontSize: 13 },
        formatter: (params) => {
          if (!params.value) return '';
          const index = params.value.findIndex((v, i) => i === params.dimensionNames.indexOf(params.name));
          const value = params.value[index];
          const percentage = ((value / maxValue) * 100).toFixed(1);
          
          return `<div style="padding: 8px;">
            <div style="font-weight: bold; color: #ef4444; margin-bottom: 6px; font-size: 14px;">
              ${params.name}
            </div>
            <div style="color: #6b7280; margin-bottom: 4px;">
              Incidents: <strong style="color: #1f2937;">${value}</strong>
            </div>
            <div style="color: #6b7280;">
              Intensity: <strong style="color: #ef4444;">${percentage}%</strong>
            </div>
          </div>`;
        },
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        splitNumber: 5,
        radius: '75%', // ← INCREASED from default
        center: ['50%', '50%'],
        name: {
          textStyle: {
            fontSize: 13, // ← LARGER labels
            fontWeight: 'bold',
            color: '#374151',
          },
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(59, 130, 246, 0.15)',
            width: 2,
          },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: [
              'rgba(59, 130, 246, 0.1)',
              'rgba(59, 130, 246, 0.06)',
              'rgba(59, 130, 246, 0.04)',
              'rgba(59, 130, 246, 0.02)',
              'rgba(255, 255, 255, 0)',
            ],
          },
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(59, 130, 246, 0.2)',
            width: 2,
          },
        },
      },
      series: [
        {
          type: 'radar',
          emphasis: {
            lineStyle: { width: 4 },
            areaStyle: { opacity: 0.8 },
          },
          data: [
            {
              value: topTypes.map(t => t.count),
              name: 'Disaster Frequency',
              areaStyle: {
                color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                  { offset: 0, color: 'rgba(239, 68, 68, 0.6)' },
                  { offset: 0.5, color: 'rgba(239, 68, 68, 0.4)' },
                  { offset: 1, color: 'rgba(239, 68, 68, 0.2)' },
                ]),
              },
              lineStyle: {
                color: '#ef4444',
                width: 3,
                shadowBlur: 10,
                shadowColor: 'rgba(239, 68, 68, 0.5)',
              },
              symbol: 'circle',
              symbolSize: 10, // ← LARGER data points
              itemStyle: {
                color: '#ef4444',
                borderColor: '#fff',
                borderWidth: 3,
                shadowBlur: 10,
                shadowColor: 'rgba(239, 68, 68, 0.5)',
              },
            },
          ],
        },
      ],
    };
  };

  const getSentimentEmoji = (sentiment) => {
    if (sentiment >= 0.3) return '😊';
    if (sentiment >= 0) return '😐';
    if (sentiment >= -0.5) return '😟';
    return '😰';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading Advanced Analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Navbar />

      {/* Critical Alert */}
      <AnimatePresence>
        {showAlert && criticalAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-20 right-6 z-50 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-2xl shadow-2xl p-5 max-w-sm border border-red-400"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl animate-pulse">
                  ⚠️
                </div>
                <h3 className="font-bold text-lg">Critical Alert</h3>
              </div>
              <button
                onClick={() => setShowAlert(false)}
                className="text-white hover:text-red-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {criticalAlerts.map((alert, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white bg-opacity-20 backdrop-blur rounded-lg p-3"
                >
                  <p className="font-bold capitalize text-lg">{alert.disaster_type}</p>
                  <p className="text-sm">📍 {alert.location || 'Unknown location'}</p>
                  <p className="text-sm">⚡ Severity: {alert.severity_score}/10</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Global Disaster Analytics Dashboard
              </h1>
              <p className="text-gray-600">
                Real-time AI-powered monitoring • NLP-driven insights • Live updates
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* ENHANCED LIVE STATUS */}
              <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-bold text-green-800 text-sm">● LIVE</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <span className="text-xs text-gray-600 font-medium">
                    {lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <span>Next update in:</span>
                    <span className="font-mono font-bold text-blue-600">{formatCountdown(countdown)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Refresh interval:</span>
                    <span className="font-semibold">5 minutes</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Data source:</span>
                    <span className="font-semibold">Reddit API</span>
                  </div>
                </div>
              </div>
              <button
                onClick={fetchAllData}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg font-medium"
              >
                🔄 Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeView === 'overview'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
            }`}
          >
            📊 Overview Dashboard
          </button>
          <button
            onClick={() => setActiveView('advanced')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeView === 'advanced'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
            }`}
          >
            🔬 Advanced Analytics
          </button>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
            <div className="relative">
              <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-3xl mb-3">
                📊
              </div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Incidents</p>
              <h3 className="text-5xl font-bold mb-2">{stats.total_incidents}</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-blue-100">Live • Updated now</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl shadow-xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
            <div className="relative">
              <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-3xl mb-3">
                🚨
              </div>
              <p className="text-red-100 text-sm font-medium mb-1">Critical Alerts</p>
              <h3 className="text-5xl font-bold mb-2">{stats.urgent_incidents}</h3>
              <p className="text-red-100 text-sm">High priority incidents</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-2xl shadow-xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
            <div className="relative">
              <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-3xl mb-3">
                {getSentimentEmoji(stats.avg_sentiment)}
              </div>
              <p className="text-orange-100 text-sm font-medium mb-1">Avg Sentiment</p>
              <h3 className="text-5xl font-bold mb-2">
                {(stats.avg_sentiment * 100).toFixed(0)}%
              </h3>
              <p className="text-orange-100 text-sm">Emotional impact score</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl shadow-xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
            <div className="relative">
              <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-3xl mb-3">
                🌍
              </div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Top Hotspot</p>
              <h3 className="text-2xl font-bold mb-2">{stats.top_location || 'N/A'}</h3>
              <p className="text-emerald-100 text-sm capitalize">Type: {stats.top_disaster_type || 'N/A'}</p>
            </div>
          </motion.div>
        </div>

        {/* Overview Tab */}
        {activeView === 'overview' && (
          <div className="grid grid-cols-12 gap-6">
            {/* Geo Heatmap */}
            <div className="col-span-12 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    🗺️
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Global Incident Heatmap</h3>
                    <p className="text-sm text-gray-500">Real-time geographical distribution with intensity markers</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-bold text-blue-700">
                        {locationHotspots.length} Active Locations
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                {mapRegistered ? (
                  <>
                    <ReactECharts 
                      option={getGeoMapOption()} 
                      style={{ height: '550px' }}
                      opts={{ renderer: 'canvas' }}
                      notMerge={true}
                      lazyUpdate={true}
                    />
                    <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 backdrop-blur rounded-lg shadow-lg p-3 text-xs text-gray-600 border border-gray-200">
                      <div className="font-bold text-gray-800 mb-2">🎮 Map Controls</div>
                      <div className="space-y-1">
                        <div>🖱️ <span className="font-semibold">Drag:</span> Pan the map</div>
                        <div>🔍 <span className="font-semibold">Scroll:</span> Zoom in/out</div>
                        <div>👆 <span className="font-semibold">Click marker:</span> View details</div>
                      </div>
                    </div>
                    <div className="absolute bottom-4 right-24 bg-white bg-opacity-95 backdrop-blur rounded-lg shadow-lg p-3 text-xs border border-gray-200">
                      <div className="font-bold text-gray-800 mb-2">📊 Marker Legend</div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-600"></div>
                          <span>High intensity (ripple effect)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <span>Medium intensity</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span>Low intensity</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-[550px] flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-xl border border-gray-200">
                    <div className="text-center">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-2xl">🌍</div>
                        </div>
                      </div>
                      <p className="text-gray-700 font-bold text-lg">Loading World Map...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 24-Hour Activity - Bubble Chart */}
            <div className="col-span-8 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    ⏰
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">24-Hour Activity Pattern</h3>
                    <p className="text-sm text-gray-500">Bubble chart showing disaster frequency by type and time</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl text-sm font-bold text-purple-700">
                  Bubble Chart
                </span>
              </div>
              <ReactECharts option={getEnhancedBubbleOption()} style={{ height: '350px' }} opts={{ renderer: 'svg' }} />
            </div>

            {/* Recent Incidents */}
            <div className="col-span-4 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    📋
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Live Feed</h3>
                    <p className="text-sm text-gray-500">Recent incidents</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">
                  {recentDisasters.length}
                </span>
              </div>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                {recentDisasters.slice(0, 12).map((disaster, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:shadow-md transition border-l-4"
                    style={{ borderLeftColor: DISASTER_COLORS[disaster.disaster_type] }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        disaster.urgency_level === 'critical' ? 'bg-red-100 text-red-700' :
                        disaster.urgency_level === 'high' ? 'bg-orange-100 text-orange-700' :
                        disaster.urgency_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {disaster.urgency_level.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(disaster.timestamp).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 capitalize mb-1">
                      {disaster.disaster_type}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">📍 {disaster.location || 'Unknown'}</span>
                      <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {((disaster.confidence_score || 0.5) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ENHANCED Disaster Distribution - Rose Chart */}
            <div className="col-span-5 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    🏆
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Disaster Distribution</h3>
                    <p className="text-sm text-gray-500">Hierarchical rose visualization</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl text-sm font-bold text-orange-700">
                  {disasterTypes.length} Types
                </span>
              </div>
              <ReactECharts option={getModernSunburstOption()} style={{ height: '400px' }} opts={{ renderer: 'svg' }} />
            </div>

            {/* Top Locations */}
            <div className="col-span-7 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    📍
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Top Affected Locations</h3>
                    <p className="text-sm text-gray-500">Gradient bar chart with incident counts</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl text-sm font-bold text-blue-700">
                  {locationHotspots.length} Locations
                </span>
              </div>
              <ReactECharts option={getHorizontalBarOption()} style={{ height: '400px' }} opts={{ renderer: 'svg' }} />
            </div>

            {/* Urgency Gauge */}
            <div className="col-span-4 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Urgency Level</h3>
                    <p className="text-sm text-gray-500">Real-time threat assessment</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl text-sm font-bold text-red-700">
                  Gauge
                </span>
              </div>
              <ReactECharts option={getGaugeChartOption()} style={{ height: '280px' }} opts={{ renderer: 'svg' }} />
            </div>

            {/* ENHANCED Disaster Timeline - Modern Stream */}
            <div className="col-span-8 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    🌊
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Disaster Timeline Evolution</h3>
                    <p className="text-sm text-gray-500">Stream graph showing disaster flow over 24 hours</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl text-sm font-bold text-indigo-700">
                  Stream Chart
                </span>
              </div>
              <ReactECharts option={getModernStreamOption()} style={{ height: '280px' }} opts={{ renderer: 'svg' }} />
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {activeView === 'advanced' && (
          <div className="grid grid-cols-12 gap-6">
            {/* REAL Sentiment Wave */}
            <div className="col-span-6 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    📉
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Sentiment Wave Analysis</h3>
                    <p className="text-sm text-gray-500">Real-time emotional impact from last 50 incidents</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl text-sm font-bold text-blue-700">
                    Live Data
                  </span>
                  <div className="px-3 py-2 bg-gray-100 rounded-lg">
                    <span className="text-xs text-gray-600">
                      {recentDisasters.slice(-50).length} points
                    </span>
                  </div>
                </div>
              </div>
              <ReactECharts 
                option={getRealSentimentWaveOption()} 
                style={{ height: '380px' }} 
                opts={{ renderer: 'svg' }} 
              />
            </div>

            {/* ENHANCED Larger Radar */}
            <div className="col-span-6 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    🕸️
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Multi-Dimensional Analysis</h3>
                    <p className="text-sm text-gray-500">Radar chart showing disaster frequency patterns</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl text-sm font-bold text-purple-700">
                  Radar
                </span>
              </div>
              <ReactECharts 
                option={getEnhancedRadarOption()} 
                style={{ height: '380px' }} 
                opts={{ renderer: 'svg' }} 
              />
            </div>

            {/* Complete Timeline - keep as is */}
            <div className="col-span-12 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    ⏱️
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Complete 24-Hour Timeline</h3>
                    <p className="text-sm text-gray-500">Comprehensive view of disaster progression throughout the day</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl text-sm font-bold text-green-700">
                  Stream View
                </span>
              </div>
              <ReactECharts option={getModernStreamOption()} style={{ height: '420px' }} opts={{ renderer: 'svg' }} />
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}