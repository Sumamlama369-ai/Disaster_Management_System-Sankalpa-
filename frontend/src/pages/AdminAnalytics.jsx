import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import api from '../services/api';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

// ─── SVG Icons ────────────────────────────────────────────────
const ChartBarIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
);
const UsersIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const ShieldIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const AlertIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const DroneIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0" fill="currentColor"/><path d="M12 12L5 5M12 12l7-7M12 12l-7 7M12 12l7 7"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/></svg>
);
const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
);
const ClockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const FileTextIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
);
const ActivityIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
);
const PieChartIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
);
const TargetIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);
const LayersIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
);
const GlobeIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);
const TrendIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
);
const VideoIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></svg>
);
const MapPinIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
);

// ─── Constants ────────────────────────────────────────────────
const SEVERITY_COLORS = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' };
const TYPE_COLORS = { fire: '#ef4444', flood: '#3b82f6', earthquake: '#f97316', landslide: '#d97706', storm: '#0ea5e9', other: '#6b7280' };
const URGENCY_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };

// ─── Component ────────────────────────────────────────────────
export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [countdown, setCountdown] = useState(60);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Data stores — each from a DIFFERENT API
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [reportStats, setReportStats] = useState(null);
  const [nlpStats, setNlpStats] = useState(null);
  const [recentDisasters, setRecentDisasters] = useState([]);
  const [disasterTypes, setDisasterTypes] = useState([]);
  const [urgencyDist, setUrgencyDist] = useState([]);
  const [locationHotspots, setLocationHotspots] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [videos, setVideos] = useState([]);
  const [permits, setPermits] = useState([]);
  const [reports, setReports] = useState([]);

  // Derived
  const citizens = users.filter(u => u.role === 'citizen');
  const officers = users.filter(u => u.role === 'officer');
  const admins = users.filter(u => u.role === 'admin');

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [usersRes, statsRes, nlpRes, recentRes, typesRes, urgencyRes, hotspotsRes, timelineRes, sysRes, videosRes, permitsRes, reportsRes] = await Promise.allSettled([
        api.get('/users/all?skip=0&limit=500'),
        api.get('/disaster-reports/statistics'),
        api.get('/disasters/dashboard/stats'),
        api.get('/disasters/dashboard/recent-disasters?limit=100'),
        api.get('/disasters/dashboard/disaster-types'),
        api.get('/disasters/dashboard/urgency-distribution'),
        api.get('/disasters/dashboard/location-hotspots?limit=15'),
        api.get('/disasters/dashboard/timeline?hours=24'),
        api.get('/disasters/system/status'),
        api.get('/video/list?skip=0&limit=50'),
        api.get('/permits/pending'),
        api.get('/disaster-reports/reports?page=1&page_size=200'),
      ]);

      if (usersRes.status === 'fulfilled') { setUsers(usersRes.value.data.users || []); setTotalUsers(usersRes.value.data.total || 0); }
      if (statsRes.status === 'fulfilled') setReportStats(statsRes.value.data);
      if (nlpRes.status === 'fulfilled') setNlpStats(nlpRes.value.data);
      if (recentRes.status === 'fulfilled') setRecentDisasters(recentRes.value.data || []);
      if (typesRes.status === 'fulfilled') setDisasterTypes(typesRes.value.data || []);
      if (urgencyRes.status === 'fulfilled') setUrgencyDist(urgencyRes.value.data || []);
      if (hotspotsRes.status === 'fulfilled') setLocationHotspots(hotspotsRes.value.data || []);
      if (timelineRes.status === 'fulfilled') setTimeline(timelineRes.value.data || []);
      if (sysRes.status === 'fulfilled') setSystemStatus(sysRes.value.data);
      if (videosRes.status === 'fulfilled') setVideos(videosRes.value.data || []);
      if (permitsRes.status === 'fulfilled') setPermits(permitsRes.value.data || []);
      if (reportsRes.status === 'fulfilled') setReports(reportsRes.value.data?.reports || reportsRes.value.data || []);

      setLastUpdate(new Date());
      setCountdown(60);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const t = setInterval(() => setCountdown(p => { if (p <= 1) { fetchData(true); return 60; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // OVERVIEW CHARTS — System-wide bird's eye view
  // ═══════════════════════════════════════════════════════════════

  // 1. System Health Radar (5-axis)
  const getRadarOption = () => {
    const t = reportStats?.total_reports || 1;
    const vals = [
      Math.min(100, ((reportStats?.resolved_reports || 0) / t) * 100),
      reportStats?.avg_response_time_hours ? Math.max(0, 100 - reportStats.avg_response_time_hours * 4) : 85,
      Math.min(100, totalUsers * 4),
      Math.min(100, (reportStats?.active_drones || 0) * 25),
      Math.max(0, 100 - ((reportStats?.pending_reports || 0) / t) * 100),
    ];
    return {
      backgroundColor: 'transparent',
      radar: {
        indicator: [{ name: 'Resolution', max: 100 }, { name: 'Speed', max: 100 }, { name: 'Users', max: 100 }, { name: 'Drones', max: 100 }, { name: 'Clearance', max: 100 }],
        shape: 'polygon', radius: '70%', center: ['50%', '52%'],
        axisName: { color: '#374151', fontSize: 12, fontWeight: '700' },
        splitArea: { areaStyle: { color: ['rgba(14,165,233,0.02)', 'rgba(14,165,233,0.06)', 'rgba(14,165,233,0.10)', 'rgba(14,165,233,0.14)'] } },
        splitLine: { lineStyle: { color: 'rgba(14,165,233,0.15)', width: 2 } },
        axisLine: { lineStyle: { color: 'rgba(14,165,233,0.2)' } },
      },
      series: [{ type: 'radar', data: [{
        value: vals.map(v => +v.toFixed(0)),
        areaStyle: { color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [{ offset: 0, color: 'rgba(14,165,233,0.55)' }, { offset: 1, color: 'rgba(14,165,233,0.08)' }]) },
        lineStyle: { color: '#0ea5e9', width: 3, shadowBlur: 10, shadowColor: 'rgba(14,165,233,0.4)' },
        symbol: 'circle', symbolSize: 10, itemStyle: { color: '#0ea5e9', borderColor: '#fff', borderWidth: 3 },
      }] }],
    };
  };

  // 2. 24h Incident Timeline (area)
  const getTimelineOption = () => {
    const hours = timeline.map(t => { const d = new Date(t.timestamp); return `${String(d.getHours()).padStart(2, '0')}:00`; });
    const counts = timeline.map(t => t.count);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { color: '#1f2937' }, axisPointer: { type: 'line', lineStyle: { color: '#0ea5e9', width: 2 } } },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '8%', containLabel: true },
      xAxis: { type: 'category', data: hours, boundaryGap: false, axisLabel: { fontSize: 10, color: '#6b7280', interval: 2 }, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#9ca3af' }, splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } }, axisLine: { show: false } },
      series: [{
        type: 'line', data: counts, smooth: 0.4, showSymbol: false,
        lineStyle: { width: 3, color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#38bdf8' }, { offset: 1, color: '#0ea5e9' }]) },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(14,165,233,0.35)' }, { offset: 1, color: 'rgba(14,165,233,0.02)' }]) },
        markPoint: { data: [{ type: 'max', name: 'Peak' }], symbol: 'pin', symbolSize: 40, itemStyle: { color: '#ef4444' }, label: { color: '#fff', fontWeight: 'bold', fontSize: 10 } },
      }],
    };
  };

  // 3. Urgency Distribution — Pie
  const getUrgencyPieOption = () => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { color: '#1f2937' } },
    series: [{
      type: 'pie', radius: ['42%', '72%'], center: ['50%', '50%'],
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 4, shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.06)' },
      label: { show: true, formatter: '{b}\n{d}%', fontSize: 11, fontWeight: 'bold', color: '#374151' },
      labelLine: { length: 14, length2: 8, lineStyle: { width: 2 } },
      emphasis: { scale: true, scaleSize: 10 },
      data: urgencyDist.map(u => ({
        value: u.count, name: u.urgency_level?.charAt(0).toUpperCase() + u.urgency_level?.slice(1),
        itemStyle: { color: URGENCY_COLORS[u.urgency_level] || '#6b7280' },
      })),
    }],
  });

  // 4. NLP Sentiment Gauge
  const getSentimentGaugeOption = () => {
    const sentiment = nlpStats?.avg_sentiment || 0;
    const pct = ((sentiment + 1) / 2 * 100).toFixed(0); // normalize -1..1 to 0..100
    const color = pct > 60 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444';
    return {
      backgroundColor: 'transparent',
      series: [{
        type: 'gauge', startAngle: 200, endAngle: -20, min: 0, max: 100, radius: '88%',
        pointer: { show: true, length: '48%', width: 5, itemStyle: { color } },
        progress: { show: true, width: 22, roundCap: true, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: color + '99' }, { offset: 1, color }]) } },
        axisLine: { lineStyle: { width: 22, color: [[1, '#f1f5f9']] } },
        axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        title: { show: true, offsetCenter: [0, '72%'], fontSize: 12, fontWeight: '600', color: '#6b7280' },
        detail: { valueAnimation: true, formatter: `${(sentiment * 100).toFixed(0)}%`, fontSize: 28, fontWeight: 'bold', color, offsetCenter: [0, '35%'] },
        data: [{ value: pct, name: 'Public Sentiment' }],
      }],
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // USERS & PERMITS TAB
  // ═══════════════════════════════════════════════════════════════

  // 5. Cumulative User Growth (stacked area)
  const getUserGrowthOption = () => {
    const mMap = {};
    users.forEach(u => { if (!u.created_at) return; const d = new Date(u.created_at); const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; if (!mMap[k]) mMap[k] = { citizen:0, officer:0, admin:0 }; mMap[k][u.role]++; });
    const months = Object.keys(mMap).sort();
    const labels = months.map(m => { const [y,mo] = m.split('-'); return new Date(y,mo-1).toLocaleString('en',{month:'short',year:'2-digit'}); });
    let cc=0,co=0,ca=0;
    const cum = months.map(m => { cc+=mMap[m].citizen; co+=mMap[m].officer; ca+=mMap[m].admin; return {c:cc,o:co,a:ca}; });
    const mkSeries = (name, data, c1, c2) => ({ name, type:'line', stack:'T', smooth:0.5, showSymbol:false, data, lineStyle:{width:0}, areaStyle:{ opacity:0.85, color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:c1},{offset:1,color:c2}]) }, emphasis:{focus:'series'} });
    return {
      backgroundColor:'transparent',
      tooltip:{ trigger:'axis', backgroundColor:'rgba(255,255,255,0.98)', borderColor:'#e5e7eb', borderWidth:1, textStyle:{color:'#1f2937'}, axisPointer:{type:'cross',label:{backgroundColor:'#0ea5e9'}} },
      legend:{ data:['Citizens','Officers','Admins'], bottom:0, textStyle:{fontSize:11,fontWeight:'600'}, itemWidth:18, itemHeight:10, icon:'roundRect' },
      grid:{ left:'3%', right:'4%', bottom:'14%', top:'8%', containLabel:true },
      xAxis:{ type:'category', data:labels, boundaryGap:false, axisLabel:{fontSize:11,color:'#6b7280'}, axisLine:{lineStyle:{color:'#e5e7eb'}}, axisTick:{show:false} },
      yAxis:{ type:'value', axisLabel:{fontSize:11,color:'#6b7280'}, splitLine:{lineStyle:{color:'#f3f4f6',type:'dashed'}}, axisLine:{show:false} },
      series:[ mkSeries('Citizens', cum.map(d=>d.c), '#38bdf8', '#38bdf820'), mkSeries('Officers', cum.map(d=>d.o), '#34d399', '#34d39920'), mkSeries('Admins', cum.map(d=>d.a), '#f87171', '#f8717120') ],
    };
  };

  // 6. User Registration Heatmap (day × hour)
  const getHeatmapOption = () => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const hours = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`);
    const agg = {};
    users.forEach(u => { if(!u.created_at) return; const d=new Date(u.created_at); agg[`${d.getHours()}-${d.getDay()}`]=(agg[`${d.getHours()}-${d.getDay()}`]||0)+1; });
    const data = Object.entries(agg).map(([k,v])=>{const[h,d]=k.split('-').map(Number);return[h,d,v];});
    const max = Math.max(...data.map(d=>d[2]),1);
    return {
      backgroundColor:'transparent',
      tooltip:{ backgroundColor:'rgba(255,255,255,0.98)', borderColor:'#e5e7eb', borderWidth:1, textStyle:{color:'#1f2937',fontSize:12}, formatter:(p)=>`<b>${days[p.value[1]]}</b> at <b>${hours[p.value[0]]}</b><br/>Signups: <b>${p.value[2]}</b>` },
      grid:{left:'10%',right:'8%',bottom:'18%',top:'5%'},
      xAxis:{type:'category',data:hours,splitArea:{show:true},axisLabel:{fontSize:9,color:'#6b7280',interval:2}},
      yAxis:{type:'category',data:days,splitArea:{show:true},axisLabel:{fontSize:11,color:'#374151',fontWeight:'600'}},
      visualMap:{min:0,max,calculable:true,orient:'horizontal',left:'center',bottom:0,inRange:{color:['#f0f9ff','#bae6fd','#38bdf8','#0284c7','#0c4a6e']},textStyle:{color:'#6b7280',fontSize:10},itemWidth:18,itemHeight:10},
      series:[{type:'heatmap',data,emphasis:{itemStyle:{shadowBlur:12,shadowColor:'rgba(0,0,0,0.2)'}},itemStyle:{borderColor:'#fff',borderWidth:2,borderRadius:5}}],
    };
  };

  // 7. Permit Status Breakdown (stacked horizontal bar)
  const getPermitBarOption = () => {
    // Count by status from all permits if we have data
    const pending = permits.length; // permits endpoint returns only pending
    const totalPermitsByMonth = {};
    // Group permits by month if created_at available
    permits.forEach(p => {
      if (!p.created_at) return;
      const d = new Date(p.created_at);
      const k = d.toLocaleString('en',{month:'short'});
      totalPermitsByMonth[k] = (totalPermitsByMonth[k] || 0) + 1;
    });
    const labels = Object.keys(totalPermitsByMonth);
    const values = Object.values(totalPermitsByMonth);
    if (labels.length === 0) {
      return {
        backgroundColor:'transparent',
        graphic: { type:'text', left:'center', top:'center', style:{ text: `${pending} Pending Permits`, fontSize:22, fontWeight:'bold', fill:'#f59e0b' } },
      };
    }
    return {
      backgroundColor:'transparent',
      tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
      grid:{left:'12%',right:'5%',bottom:'5%',top:'5%',containLabel:true},
      xAxis:{type:'value',axisLabel:{fontSize:10,color:'#6b7280'},splitLine:{lineStyle:{type:'dashed',color:'#f3f4f6'}}},
      yAxis:{type:'category',data:labels,axisLabel:{fontSize:12,fontWeight:'600',color:'#374151'}},
      series:[{type:'bar',data:values.map((v,i)=>({value:v,itemStyle:{color:new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#fbbf24'},{offset:1,color:'#f59e0b'}]),borderRadius:[0,6,6,0]}})),barWidth:'60%',label:{show:true,position:'right',formatter:'{c}',fontSize:11,fontWeight:'bold',color:'#374151'}}],
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // INCIDENTS TAB
  // ═══════════════════════════════════════════════════════════════

  // 8. Disaster Type Treemap
  const getTreemapOption = () => {
    const types = reportStats?.reports_by_type || {};
    const data = Object.entries(types).map(([type,count])=>({ name:type.charAt(0).toUpperCase()+type.slice(1), value:count, itemStyle:{color:TYPE_COLORS[type]||'#6b7280',borderColor:'#fff',borderWidth:4,borderRadius:6} }));
    return {
      backgroundColor:'transparent',
      tooltip:{ formatter:(p)=>`<div style="padding:6px"><strong style="color:${p.color};font-size:14px">${p.name}</strong><br/>Reports: <b>${p.value}</b></div>`, backgroundColor:'rgba(255,255,255,0.98)',borderColor:'#e5e7eb',borderWidth:1,textStyle:{color:'#1f2937'} },
      series:[{type:'treemap',width:'95%',height:'85%',top:'5%',roam:false,nodeClick:false,breadcrumb:{show:false},label:{show:true,formatter:'{b}\n{c}',fontSize:15,fontWeight:'bold',color:'#fff',lineHeight:22},itemStyle:{borderColor:'#fff',borderWidth:4,gapWidth:4},emphasis:{itemStyle:{shadowBlur:20,shadowColor:'rgba(0,0,0,0.3)'}},data}],
    };
  };

  // 9. Severity Polar Bar
  const getSeverityPolarOption = () => {
    const sev = reportStats?.reports_by_severity || {};
    const data = ['LOW','MEDIUM','HIGH','CRITICAL'].map(k=>({ value:sev[k]||0, name:k, itemStyle:{color:new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:SEVERITY_COLORS[k]+'cc'},{offset:1,color:SEVERITY_COLORS[k]}])} }));
    return {
      backgroundColor:'transparent',
      tooltip:{trigger:'item',backgroundColor:'rgba(255,255,255,0.98)',borderColor:'#e5e7eb',borderWidth:1,textStyle:{color:'#1f2937'}},
      angleAxis:{type:'category',data:data.map(d=>d.name),axisLabel:{fontSize:12,fontWeight:'bold',color:'#374151'},axisLine:{lineStyle:{color:'#e5e7eb'}}},
      radiusAxis:{axisLabel:{fontSize:10,color:'#9ca3af'},splitLine:{lineStyle:{color:'#f3f4f6',type:'dashed'}},axisLine:{show:false}},
      polar:{radius:['12%','75%']},
      series:[{type:'bar',coordinateSystem:'polar',data,itemStyle:{borderRadius:6},label:{show:true,position:'middle',formatter:'{c}',fontSize:13,fontWeight:'bold',color:'#fff'}}],
    };
  };

  // 10. Location Hotspots — Horizontal Gradient Bars
  const getHotspotsBarOption = () => ({
    backgroundColor:'transparent',
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
    grid:{left:'22%',right:'8%',bottom:'5%',top:'5%',containLabel:true},
    xAxis:{type:'value',axisLabel:{fontSize:10,color:'#6b7280'},splitLine:{lineStyle:{type:'dashed',color:'#f3f4f6'}}},
    yAxis:{type:'category',data:locationHotspots.map(l=>l.location),inverse:true,axisLabel:{fontSize:11,fontWeight:'600',color:'#374151'},axisTick:{show:false}},
    series:[{type:'bar',data:locationHotspots.map((l,i)=>({value:l.count,itemStyle:{color:new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:['#ef4444','#f97316','#fbbf24','#10b981','#3b82f6','#0ea5e9','#8b5cf6'][i%7]},{offset:1,color:['#dc2626','#ea580c','#f59e0b','#059669','#2563eb','#0284c7','#7c3aed'][i%7]}]),borderRadius:[0,8,8,0]}})),barWidth:'65%',label:{show:true,position:'right',formatter:'{c}',fontSize:11,fontWeight:'bold',color:'#374151'}}],
  });

  // 11. NLP Disaster Type Distribution (Nightingale Rose from Reddit)
  const getNlpRoseOption = () => ({
    backgroundColor:'transparent',
    tooltip:{ trigger:'item', backgroundColor:'rgba(255,255,255,0.98)', borderColor:'#e5e7eb', borderWidth:1, textStyle:{color:'#1f2937',fontSize:13}, formatter:(p)=>`<strong style="color:${p.color}">${p.name}</strong><br/>Incidents: <b>${p.value}</b> (${p.percent.toFixed(1)}%)` },
    series:[{
      type:'pie', radius:['20%','72%'], center:['50%','50%'], roseType:'area',
      itemStyle:{borderRadius:10,borderColor:'#fff',borderWidth:4,shadowBlur:12,shadowColor:'rgba(0,0,0,0.06)'},
      label:{show:true,formatter:'{b}\n{d}%',fontSize:11,fontWeight:'bold',color:'#374151'},
      labelLine:{length:14,length2:8,lineStyle:{width:2}},
      emphasis:{scale:true,scaleSize:10},
      data: disasterTypes.map(t=>({
        value:t.count,
        name:t.disaster_type?.charAt(0).toUpperCase()+t.disaster_type?.slice(1),
        itemStyle:{color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:TYPE_COLORS[t.disaster_type]||'#6b7280'},{offset:1,color:(TYPE_COLORS[t.disaster_type]||'#6b7280')+'bb'}])}
      })),
    }],
  });

  // ═══════════════════════════════════════════════════════════════
  // ADVANCED TAB — NLP, Video, Drone data
  // ═══════════════════════════════════════════════════════════════

  // 12. NLP Stream Chart (disaster timeline by type over 24h)
  const getStreamOption = () => {
    const series = {};
    recentDisasters.forEach(d => { const h=new Date(d.timestamp).getHours(); const t=d.disaster_type; if(!series[t]) series[t]=new Array(24).fill(0); series[t][h]++; });
    const hours = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`);
    return {
      backgroundColor:'transparent',
      tooltip:{trigger:'axis',axisPointer:{type:'cross',label:{backgroundColor:'#0ea5e9'}},backgroundColor:'rgba(255,255,255,0.98)',borderColor:'#e5e7eb',borderWidth:1,textStyle:{color:'#1f2937'}},
      legend:{data:Object.keys(series).map(t=>t.charAt(0).toUpperCase()+t.slice(1)),bottom:0,textStyle:{fontSize:10,fontWeight:'600'},itemWidth:18,itemHeight:10,icon:'roundRect'},
      grid:{left:'3%',right:'4%',bottom:'15%',top:'8%',containLabel:true},
      xAxis:{type:'category',boundaryGap:false,data:hours,axisLabel:{fontSize:10,color:'#6b7280',interval:2},axisLine:{lineStyle:{color:'#e5e7eb'}},axisTick:{show:false}},
      yAxis:{type:'value',axisLabel:{fontSize:10,color:'#6b7280'},splitLine:{lineStyle:{color:'#f3f4f6',type:'dashed'}},axisLine:{show:false}},
      series: Object.keys(series).map(type=>({
        name:type.charAt(0).toUpperCase()+type.slice(1), type:'line', stack:'T', smooth:0.4, emphasis:{focus:'series'},
        areaStyle:{opacity:0.75,color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:(TYPE_COLORS[type]||'#6b7280')+'cc'},{offset:1,color:(TYPE_COLORS[type]||'#6b7280')+'22'}])},
        lineStyle:{width:0}, showSymbol:false, data:series[type], color:TYPE_COLORS[type]||'#6b7280',
      })),
    };
  };

  // 13. Activity Scatter Bubble (hour × type × count)
  const getBubbleOption = () => {
    const hourly = {};
    recentDisasters.forEach(d => { const h=new Date(d.timestamp).getHours(); const t=d.disaster_type; if(!hourly[h]) hourly[h]={}; hourly[h][t]=(hourly[h][t]||0)+1; });
    const bubbleData = [];
    Object.keys(hourly).forEach(h => Object.keys(hourly[h]).forEach(t => bubbleData.push([+h, disasterTypes.findIndex(d=>d.disaster_type===t), hourly[h][t], t])));
    return {
      backgroundColor:'transparent',
      tooltip:{ formatter:(p)=>`<b>${p.data[3]?.charAt(0).toUpperCase()+p.data[3]?.slice(1)}</b><br/>Hour: ${p.data[0]}:00<br/>Count: ${p.data[2]}`, backgroundColor:'rgba(255,255,255,0.98)',borderColor:'#e5e7eb',borderWidth:1,textStyle:{color:'#1f2937'} },
      grid:{left:'14%',right:'5%',bottom:'8%',top:'5%',containLabel:true},
      xAxis:{ type:'value', name:'Hour', min:0, max:23, interval:3, axisLabel:{fontSize:10,color:'#6b7280',formatter:v=>`${v}:00`}, splitLine:{lineStyle:{color:'#f3f4f6',type:'dashed'}}, axisLine:{lineStyle:{color:'#e5e7eb'}} },
      yAxis:{ type:'category', data:disasterTypes.map(t=>t.disaster_type?.charAt(0).toUpperCase()+t.disaster_type?.slice(1)), axisLabel:{fontSize:11,fontWeight:'600',color:'#374151'}, axisTick:{show:false} },
      series:[{
        type:'scatter', data:bubbleData, symbolSize:(d)=>Math.sqrt(d[2])*20,
        itemStyle:{color:(p)=>TYPE_COLORS[p.data[3]]||'#6b7280',opacity:0.8,shadowBlur:12,shadowColor:'rgba(0,0,0,0.15)',borderColor:'#fff',borderWidth:2},
        emphasis:{scale:1.4,itemStyle:{shadowBlur:20,borderWidth:3}},
      }],
    };
  };

  // 14. Video Analysis Risk Level Distribution
  const getVideoRiskOption = () => {
    const riskMap = { low:0, medium:0, high:0, critical:0 };
    videos.forEach(v => { if(v.risk_level) riskMap[v.risk_level]++; });
    const data = Object.entries(riskMap).filter(([_,v])=>v>0).map(([k,v])=>({value:v,name:k.charAt(0).toUpperCase()+k.slice(1),itemStyle:{color:URGENCY_COLORS[k]||'#6b7280'}}));
    if (data.length === 0) return { backgroundColor:'transparent', graphic:{type:'text',left:'center',top:'center',style:{text:`${videos.length} Videos Analyzed`,fontSize:18,fontWeight:'bold',fill:'#0ea5e9'}} };
    return {
      backgroundColor:'transparent',
      tooltip:{trigger:'item',backgroundColor:'rgba(255,255,255,0.98)',borderColor:'#e5e7eb',borderWidth:1,textStyle:{color:'#1f2937'}},
      series:[{type:'pie',radius:['48%','72%'],center:['50%','50%'],
        itemStyle:{borderRadius:8,borderColor:'#fff',borderWidth:4},
        label:{show:true,formatter:'{b}\n{c}',fontSize:12,fontWeight:'bold',color:'#374151'},
        data,
      }],
    };
  };

  // 15. Recent Disasters Live Feed Scatter (severity × sentiment)
  const getSentimentScatterOption = () => {
    const data = recentDisasters.slice(0,50).map(d=>([
      d.severity_score||0, d.sentiment||0, d.disaster_type,
      d.location||'Unknown', d.urgency_level||'low'
    ]));
    return {
      backgroundColor:'transparent',
      tooltip:{
        formatter:(p)=>`<b>${p.data[2]?.charAt(0).toUpperCase()+p.data[2]?.slice(1)}</b><br/>Location: ${p.data[3]}<br/>Severity: ${p.data[0]}/10<br/>Sentiment: ${p.data[1]?.toFixed(2)}<br/>Urgency: ${p.data[4]}`,
        backgroundColor:'rgba(255,255,255,0.98)',borderColor:'#e5e7eb',borderWidth:1,textStyle:{color:'#1f2937',fontSize:12}
      },
      grid:{left:'8%',right:'5%',bottom:'10%',top:'10%',containLabel:true},
      xAxis:{type:'value',name:'Severity Score',nameTextStyle:{fontSize:12,fontWeight:'bold',color:'#374151'},min:0,max:10,axisLabel:{fontSize:10,color:'#6b7280'},splitLine:{lineStyle:{color:'#f3f4f6',type:'dashed'}}},
      yAxis:{type:'value',name:'Sentiment',nameTextStyle:{fontSize:12,fontWeight:'bold',color:'#374151'},min:-1,max:1,axisLabel:{fontSize:10,color:'#6b7280'},splitLine:{lineStyle:{color:'#f3f4f6',type:'dashed'}}},
      series:[{
        type:'scatter',data,symbolSize:(d)=>Math.max(10,d[0]*4),
        itemStyle:{color:(p)=>TYPE_COLORS[p.data[2]]||'#6b7280',opacity:0.8,borderColor:'#fff',borderWidth:2,shadowBlur:8,shadowColor:'rgba(0,0,0,0.1)'},
        emphasis:{scale:1.5},
      }],
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  if (loading) return (
    <div className="min-h-screen bg-white"><Navbar />
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-4 border-sky-200 animate-ping opacity-30"/>
            <div className="relative w-20 h-20 rounded-full border-4 border-sky-500 border-t-transparent animate-spin"/>
          </div>
          <p className="text-gray-600 font-semibold text-lg">Loading Analytics Engine...</p>
          <p className="text-gray-400 text-sm mt-1">Aggregating data from 6 sources</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-500 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage:'radial-gradient(circle at 1px 1px,white 1px,transparent 0)',backgroundSize:'24px 24px'}}/>
          <div className="absolute top-0 left-[20%] w-96 h-96 bg-cyan-400/20 rounded-full blur-[120px]"/>
          <div className="absolute bottom-0 right-[10%] w-80 h-80 bg-sky-300/15 rounded-full blur-[100px]"/>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/5 rounded-full"/>
        </div>

        <div className="relative max-w-[1600px] mx-auto px-6 py-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}}>
              <div className="inline-flex items-center gap-2.5 bg-white/15 backdrop-blur-md border border-white/25 rounded-full px-4 py-1.5 mb-3">
                <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-60"/><span className="relative rounded-full h-2.5 w-2.5 bg-emerald-400"/></span>
                <span className="text-[11px] font-bold text-white/90 tracking-wider uppercase">Live Analytics — {recentDisasters.length} NLP Insights</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-1">System Analytics Console</h1>
              <p className="text-sky-100/70 text-sm max-w-md">6 data sources — Users, Reports, NLP Insights, Permits, Video Analysis, Drones</p>
            </motion.div>

            <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:0.2}} className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 text-white flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2"><ClockIcon className="w-3.5 h-3.5 text-sky-200"/><span className="text-sky-100">{lastUpdate?.toLocaleTimeString()}</span></div>
                <div className="h-4 w-px bg-white/20"/>
                <div className="flex items-center gap-2"><span className="text-sky-200">Next:</span><span className="font-mono font-bold text-white">{countdown}s</span></div>
              </div>
              <button onClick={()=>fetchData(true)} disabled={refreshing} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur border border-white/25 rounded-xl px-5 py-3 text-white text-sm font-bold transition-colors">
                <RefreshIcon className={`w-4 h-4 ${refreshing?'animate-spin':''}`}/> Refresh
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6">

        {/* ── Gradient Stat Cards ──────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 -mt-7 relative z-10 mb-6">
          {[
            {l:'Users',v:totalUsers,s:`${citizens.length}C / ${officers.length}O`,g:'from-sky-500 to-cyan-500',ic:<UsersIcon className="w-5 h-5"/>},
            {l:'Reports',v:reportStats?.total_reports||0,s:`${reportStats?.pending_reports||0} pending`,g:'from-blue-500 to-sky-500',ic:<FileTextIcon className="w-5 h-5"/>},
            {l:'NLP Insights',v:nlpStats?.total_incidents||recentDisasters.length,s:`${nlpStats?.urgent_incidents||0} urgent`,g:'from-cyan-500 to-teal-500',ic:<GlobeIcon className="w-5 h-5"/>},
            {l:'Critical',v:reportStats?.critical_reports||0,s:'Immediate action',g:'from-red-500 to-rose-500',ic:<AlertIcon className="w-5 h-5"/>},
            {l:'Active Drones',v:reportStats?.active_drones||0,s:'In flight now',g:'from-emerald-500 to-teal-500',ic:<DroneIcon className="w-5 h-5"/>},
            {l:'Videos',v:videos.length,s:`${videos.filter(v=>v.risk_level==='high'||v.risk_level==='critical').length} high risk`,g:'from-sky-600 to-blue-600',ic:<VideoIcon className="w-5 h-5"/>},
          ].map((c,i)=>(
            <motion.div key={c.l} initial={{opacity:0,y:25}} animate={{opacity:1,y:0}} transition={{delay:0.05*i}} className={`bg-gradient-to-br ${c.g} text-white rounded-2xl p-4 shadow-xl relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8"/>
              <div className="relative">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center mb-2">{c.ic}</div>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-wide">{c.l}</p>
                <h3 className="text-2xl font-extrabold">{c.v}</h3>
                <p className="text-white/50 text-[10px] mt-0.5">{c.s}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── View Toggle ──────────────────────────────────────── */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {[
            {id:'overview',l:'Overview',ic:<TargetIcon className="w-4 h-4"/>},
            {id:'users',l:'Users & Permits',ic:<UsersIcon className="w-4 h-4"/>},
            {id:'incidents',l:'Incidents & Reports',ic:<AlertIcon className="w-4 h-4"/>},
            {id:'advanced',l:'NLP & Video Intelligence',ic:<GlobeIcon className="w-4 h-4"/>},
          ].map(t=>(
            <button key={t.id} onClick={()=>setActiveView(t.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeView===t.id?'bg-sky-500 text-white shadow-lg shadow-sky-200 scale-[1.02]':'bg-white text-gray-600 hover:bg-gray-50 shadow border border-gray-200'}`}>
              {t.ic} {t.l}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        <AnimatePresence mode="wait">
        {activeView === 'overview' && (
          <motion.div key="ov" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="grid grid-cols-12 gap-5 pb-16">
            <div className="col-span-12 lg:col-span-5">
              <CC t="System Health Radar" s="Multi-dimensional health assessment" ic={<TargetIcon/>} b="Live">
                <ReactECharts option={getRadarOption()} style={{height:'380px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-7">
              <CC t="24-Hour Incident Timeline" s="Hourly NLP-detected disaster activity with peak markers" ic={<ActivityIcon/>} b={`${timeline.length} hours`}>
                <ReactECharts option={getTimelineOption()} style={{height:'380px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-4">
              <CC t="Urgency Distribution" s="NLP-classified urgency levels" ic={<PieChartIcon/>} b={`${urgencyDist.reduce((a,b)=>a+b.count,0)} total`}>
                <ReactECharts option={getUrgencyPieOption()} style={{height:'330px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-4">
              <CC t="Public Sentiment" s="Average NLP sentiment analysis score" ic={<GlobeIcon/>} b="NLP">
                <ReactECharts option={getSentimentGaugeOption()} style={{height:'330px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-4">
              <SystemStatusCard systemStatus={systemStatus} nlpStats={nlpStats} reportStats={reportStats} totalUsers={totalUsers}/>
            </div>
          </motion.div>
        )}

        {/* ═══ USERS & PERMITS ═══ */}
        {activeView === 'users' && (
          <motion.div key="us" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="grid grid-cols-12 gap-5 pb-16">
            <div className="col-span-12">
              <CC t="Platform Growth" s="Cumulative user registrations over time (stacked area)" ic={<TrendIcon/>} b="Growth">
                <ReactECharts option={getUserGrowthOption()} style={{height:'340px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-8">
              <CC t="Registration Activity Heatmap" s="User signups by day of week and hour" ic={<ActivityIcon/>} b="Heatmap">
                <ReactECharts option={getHeatmapOption()} style={{height:'340px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-4">
              <CC t="Permit Queue" s="Pending drone permit applications" ic={<DroneIcon/>} b={`${permits.length} pending`}>
                <ReactECharts option={getPermitBarOption()} style={{height:'340px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            {/* Recent Users List */}
            <div className="col-span-12">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-sky-50 border border-sky-100 rounded-xl flex items-center justify-center text-sky-500"><UsersIcon/></div>
                  <div><h3 className="text-sm font-bold text-gray-900">All Users</h3><p className="text-[11px] text-gray-400">{totalUsers} total across all roles</p></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {users.slice(0,12).map((u,i)=>(
                    <motion.div key={u.id||i} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:i*0.03}} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${u.role==='admin'?'bg-gradient-to-br from-red-500 to-rose-500':u.role==='officer'?'bg-gradient-to-br from-emerald-500 to-teal-500':'bg-gradient-to-br from-sky-500 to-cyan-500'}`}>
                        {u.name?.charAt(0)?.toUpperCase()||'?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-800 truncate">{u.name||'Unknown'}</p>
                        <p className={`text-[9px] font-bold uppercase ${u.role==='admin'?'text-red-500':u.role==='officer'?'text-emerald-500':'text-sky-500'}`}>{u.role}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ INCIDENTS & REPORTS ═══ */}
        {activeView === 'incidents' && (
          <motion.div key="inc" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="grid grid-cols-12 gap-5 pb-16">
            <div className="col-span-12 lg:col-span-7">
              <CC t="Disaster Type Treemap" s="Proportional blocks sized by report count" ic={<LayersIcon/>} b="Treemap">
                <ReactECharts option={getTreemapOption()} style={{height:'400px'}} opts={{renderer:'canvas'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-5">
              <CC t="Severity Polar Chart" s="Circular bar showing severity distribution" ic={<AlertIcon/>} b="Polar">
                <ReactECharts option={getSeverityPolarOption()} style={{height:'400px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12">
              <CC t="Global Incident Hotspots" s="Top affected locations ranked by frequency" ic={<MapPinIcon/>} b={`${locationHotspots.length} locations`}>
                <ReactECharts option={getHotspotsBarOption()} style={{height: Math.max(250, locationHotspots.length * 35) + 'px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            {/* Severity + Type cards */}
            <div className="col-span-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['LOW','MEDIUM','HIGH','CRITICAL'].map((sev,i)=>{
                  const cnt = reportStats?.reports_by_severity?.[sev]||0;
                  return <motion.div key={sev} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:0.06*i}} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor:SEVERITY_COLORS[sev]+'15'}}><div className="w-5 h-5 rounded-full" style={{backgroundColor:SEVERITY_COLORS[sev]}}/></div>
                    <div><p className="text-2xl font-extrabold" style={{color:SEVERITY_COLORS[sev]}}>{cnt}</p><p className="text-xs font-bold text-gray-500">{sev}</p></div>
                  </motion.div>;
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ NLP & VIDEO INTELLIGENCE ═══ */}
        {activeView === 'advanced' && (
          <motion.div key="adv" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="grid grid-cols-12 gap-5 pb-16">
            <div className="col-span-12">
              <CC t="NLP Disaster Stream" s="24-hour stacked area of Reddit-sourced disaster types" ic={<ActivityIcon/>} b="Stream Chart">
                <ReactECharts option={getStreamOption()} style={{height:'350px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-6">
              <CC t="Severity vs Sentiment Scatter" s="Each dot is a Reddit-detected disaster (size = severity)" ic={<GlobeIcon/>} b="NLP Scatter">
                <ReactECharts option={getSentimentScatterOption()} style={{height:'380px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-6">
              <CC t="Activity Bubble Chart" s="Disaster frequency by type and hour of day" ic={<ChartBarIcon/>} b="Bubble">
                <ReactECharts option={getBubbleOption()} style={{height:'380px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-5">
              <CC t="NLP Type Distribution" s="Nightingale rose of Reddit-detected disaster types" ic={<PieChartIcon/>} b="Rose">
                <ReactECharts option={getNlpRoseOption()} style={{height:'380px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-3">
              <CC t="Video Risk Levels" s="AI video analysis risk distribution" ic={<VideoIcon/>} b={`${videos.length} analyzed`}>
                <ReactECharts option={getVideoRiskOption()} style={{height:'380px'}} opts={{renderer:'svg'}}/>
              </CC>
            </div>
            <div className="col-span-12 lg:col-span-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-500"><AlertIcon/></div>
                  <div><h3 className="text-sm font-bold text-gray-900">Critical Incidents</h3><p className="text-[11px] text-gray-400">Latest high-urgency NLP detections</p></div>
                </div>
                <div className="divide-y divide-gray-50 max-h-[340px] overflow-y-auto">
                  {recentDisasters.filter(d=>d.urgency_level==='critical'||d.urgency_level==='high').slice(0,10).map((d,i)=>(
                    <motion.div key={i} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}
                      className="px-5 py-3 hover:bg-gray-50/50 transition-colors border-l-4"
                      style={{borderLeftColor:TYPE_COLORS[d.disaster_type]||'#ef4444'}}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${d.urgency_level==='critical'?'bg-red-50 text-red-600':'bg-orange-50 text-orange-600'}`}>{d.urgency_level}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{new Date(d.timestamp).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-800 capitalize">{d.disaster_type}</p>
                      <p className="text-[11px] text-gray-500 truncate">{d.location||'Unknown location'}</p>
                    </motion.div>
                  ))}
                  {recentDisasters.filter(d=>d.urgency_level==='critical'||d.urgency_level==='high').length===0 && (
                    <div className="p-8 text-center text-gray-400 text-sm">No critical incidents detected</div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────
function CC({ t, s, ic, b, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100 rounded-xl flex items-center justify-center text-sky-500">{ic}</div>
          <div><h3 className="text-sm font-bold text-gray-900">{t}</h3>{s&&<p className="text-[11px] text-gray-400">{s}</p>}</div>
        </div>
        {b&&<span className="px-3 py-1 bg-sky-50 border border-sky-100 text-sky-600 text-[10px] font-bold rounded-full uppercase tracking-wide">{b}</span>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function SystemStatusCard({ systemStatus, nlpStats, reportStats, totalUsers }) {
  const items = [
    { label: 'Database', value: systemStatus?.database_connected ? 'Connected' : 'Unknown', ok: systemStatus?.database_connected },
    { label: 'NLP Pipeline', value: systemStatus?.background_tasks_running ? 'Running' : 'Idle', ok: systemStatus?.background_tasks_running },
    { label: 'Total Posts Analyzed', value: systemStatus?.total_posts || 0 },
    { label: 'Total NLP Insights', value: systemStatus?.total_insights || 0 },
    { label: 'Active Drones', value: reportStats?.active_drones || 0 },
    { label: 'Avg Response Time', value: reportStats?.avg_response_time_hours ? `${reportStats.avg_response_time_hours.toFixed(1)}h` : 'N/A' },
    { label: 'Platform Users', value: totalUsers },
    { label: 'Top Disaster Type', value: nlpStats?.top_disaster_type || 'N/A' },
  ];
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-500"><ShieldIcon/></div>
        <div><h3 className="text-sm font-bold text-gray-900">System Status</h3><p className="text-[11px] text-gray-400">Infrastructure & pipeline health</p></div>
      </div>
      <div className="p-4 space-y-2.5">
        {items.map((it,i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">{it.label}</span>
            <span className={`text-xs font-bold ${it.ok !== undefined ? (it.ok ? 'text-emerald-600' : 'text-gray-400') : 'text-gray-800'}`}>
              {it.ok !== undefined && <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${it.ok ? 'bg-emerald-500' : 'bg-gray-300'}`}/>}
              {it.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
