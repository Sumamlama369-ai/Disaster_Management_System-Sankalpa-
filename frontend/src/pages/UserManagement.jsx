import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import api from '../services/api';
import ReactECharts from 'echarts-for-react';
import toast from 'react-hot-toast';

// ─── Gradient helper ─────────────────────────────────────────
const lg = (x, y, x2, y2, stops) => ({ type: 'linear', x, y, x2, y2, colorStops: stops });

// ─── SVG Icons ───────────────────────────────────────────────
const UsersIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const ShieldIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const SearchIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const EditIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);
const TrashIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);
const CheckCircleIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const XIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const RefreshIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
);
const ChevronIcon = ({ className = 'w-4 h-4', direction = 'down' }) => (
  <svg className={`${className} transition-transform ${direction === 'up' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
);
const TrendUpIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
);
const BarChartIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
);
const MapPinIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
);
const AwardIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
);
const ActivityIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
);
const FileTextIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
);
const PieChartIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
);

// ─── Role config ─────────────────────────────────────────────
const ROLE_CONFIG = {
  citizen: { label: 'Citizen', color: '#3b82f6', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  officer: { label: 'Officer', color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  admin:   { label: 'Admin',   color: '#ef4444', bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-700',   badge: 'bg-red-100 text-red-700 border-red-200' },
};

// ─── Component ───────────────────────────────────────────────
export default function UserManagement() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [stats, setStats] = useState(null);

  // Filters & search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Tabs
  const [activeTab, setActiveTab] = useState('users');

  // Edit modal
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Registration Trend filters
  const [trendFilterYear, setTrendFilterYear] = useState('all');
  const [trendFilterMonth, setTrendFilterMonth] = useState('all');

  // ── Data fetching ────────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.allSettled([
        api.get('/users/all?skip=0&limit=500'),
        api.get('/users/admin/stats'),
      ]);
      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.data.users || []);
        setTotalUsers(usersRes.value.data.total || 0);
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtered & sorted users ──────────────────────────────
  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter);
    if (statusFilter === 'active') list = list.filter(u => u.is_active);
    else if (statusFilter === 'inactive') list = list.filter(u => !u.is_active);
    else if (statusFilter === 'verified') list = list.filter(u => u.is_verified);
    else if (statusFilter === 'unverified') list = list.filter(u => !u.is_verified);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.district?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (sortField === 'created_at') { av = new Date(av || 0).getTime(); bv = new Date(bv || 0).getTime(); }
      if (sortField === 'name') { av = (av || '').toLowerCase(); bv = (bv || '').toLowerCase(); }
      if (sortField === 'report_count' || sortField === 'permit_count') { av = av || 0; bv = bv || 0; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, roleFilter, statusFilter, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [search, roleFilter, statusFilter]);

  // ── Derived counts ───────────────────────────────────────
  const citizenCount = users.filter(u => u.role === 'citizen').length;
  const officerCount = users.filter(u => u.role === 'officer').length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const activeCount = users.filter(u => u.is_active).length;
  const inactiveCount = users.filter(u => !u.is_active).length;
  const verifiedCount = users.filter(u => u.is_verified).length;

  // ── Sort handler ─────────────────────────────────────────
  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // ── CRUD handlers ────────────────────────────────────────
  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({ name: user.name || '', phone: user.phone || '', district: user.district || '', role: user.role, is_active: user.is_active });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const payload = {};
      if (editForm.name !== editUser.name) payload.name = editForm.name;
      if (editForm.phone !== (editUser.phone || '')) payload.phone = editForm.phone;
      if (editForm.district !== (editUser.district || '')) payload.district = editForm.district;
      if (editForm.role !== editUser.role) payload.role = editForm.role;
      if (editForm.is_active !== editUser.is_active) payload.is_active = editForm.is_active;

      if (Object.keys(payload).length === 0) { toast('No changes to save'); setSaving(false); return; }

      await api.put(`/users/admin/update/${editUser.id}`, payload);
      toast.success(`${editUser.name} updated successfully`);
      setEditUser(null);
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update user');
    } finally { setSaving(false); }
  };

  const toggleActive = async (user) => {
    try {
      if (user.is_active) {
        await api.delete(`/users/delete/${user.id}`);
        toast.success(`${user.name} deactivated`);
      } else {
        await api.put(`/users/admin/activate/${user.id}`);
        toast.success(`${user.name} reactivated`);
      }
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed');
    }
    setDeleteConfirm(null);
  };

  // ═══════════════════════════════════════════════════════════
  // CHART OPTIONS
  // ═══════════════════════════════════════════════════════════

  // 1. Role Distribution Donut
  const getRoleDonutOption = () => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { color: '#1f2937' } },
    legend: { bottom: 0, textStyle: { fontSize: 11, fontWeight: '600' }, itemWidth: 14, itemHeight: 10, icon: 'roundRect' },
    series: [{
      type: 'pie', radius: ['45%', '72%'], center: ['50%', '45%'],
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 4 },
      label: { show: true, formatter: '{b}\n{c} ({d}%)', fontSize: 11, fontWeight: 'bold', color: '#374151' },
      emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.2)' } },
      data: [
        { value: citizenCount, name: 'Citizens', itemStyle: { color: lg(0, 0, 0, 1, [{ offset: 0, color: '#60a5fa' }, { offset: 1, color: '#3b82f6' }]) } },
        { value: officerCount, name: 'Officers', itemStyle: { color: lg(0, 0, 0, 1, [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#10b981' }]) } },
        { value: adminCount, name: 'Admins', itemStyle: { color: lg(0, 0, 0, 1, [{ offset: 0, color: '#f87171' }, { offset: 1, color: '#ef4444' }]) } },
      ],
    }],
  });

  // Available years from trend data (for filters)
  const trendYears = useMemo(() => {
    const trend = stats?.monthly_trend || {};
    return [...new Set(Object.keys(trend).map(k => k.split('-')[0]))].sort((a, b) => b - a);
  }, [stats]);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // 2. Registration Trend (stacked bar)
  const getRegTrendOption = () => {
    const trend = stats?.monthly_trend || {};
    let months = Object.keys(trend).sort();
    if (trendFilterYear !== 'all') months = months.filter(m => m.startsWith(trendFilterYear));
    if (trendFilterMonth !== 'all') months = months.filter(m => parseInt(m.split('-')[1], 10) === parseInt(trendFilterMonth, 10) + 1);
    const labels = months.map(m => { const [y, mo] = m.split('-'); return new Date(y, mo - 1).toLocaleString('en', { month: 'short', year: '2-digit' }); });
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { color: '#1f2937' }, axisPointer: { type: 'shadow' } },
      legend: { data: ['Citizens', 'Officers', 'Admins'], bottom: 0, textStyle: { fontSize: 10, fontWeight: '600' }, itemWidth: 14, itemHeight: 10, icon: 'roundRect' },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '8%', containLabel: true },
      xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10, color: '#6b7280', rotate: months.length > 8 ? 30 : 0 }, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } }, axisLine: { show: false } },
      series: [
        { name: 'Citizens', type: 'bar', stack: 'T', data: months.map(m => trend[m]?.citizen || 0), itemStyle: { color: lg(0, 0, 0, 1, [{ offset: 0, color: '#60a5fa' }, { offset: 1, color: '#3b82f6' }]), borderRadius: [0, 0, 0, 0] }, barWidth: '60%' },
        { name: 'Officers', type: 'bar', stack: 'T', data: months.map(m => trend[m]?.officer || 0), itemStyle: { color: lg(0, 0, 0, 1, [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#10b981' }]) } },
        { name: 'Admins', type: 'bar', stack: 'T', data: months.map(m => trend[m]?.admin || 0), itemStyle: { color: lg(0, 0, 0, 1, [{ offset: 0, color: '#f87171' }, { offset: 1, color: '#ef4444' }]), borderRadius: [4, 4, 0, 0] } },
      ],
    };
  };

  // 3. District Distribution Bar
  const getDistrictOption = () => {
    const dist = stats?.district_distribution || {};
    const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 15);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { color: '#1f2937' } },
      grid: { left: '3%', right: '6%', bottom: '3%', top: '5%', containLabel: true },
      xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } }, axisLine: { show: false } },
      yAxis: { type: 'category', data: entries.map(e => e[0]).reverse(), axisLabel: { fontSize: 10, color: '#374151', fontWeight: '600' }, axisTick: { show: false }, axisLine: { lineStyle: { color: '#e5e7eb' } } },
      series: [{
        type: 'bar', data: entries.map(e => e[1]).reverse(), barWidth: '65%',
        itemStyle: { borderRadius: [0, 6, 6, 0], color: lg(0, 0, 1, 0, [{ offset: 0, color: '#bae6fd' }, { offset: 1, color: '#0284c7' }]) },
        label: { show: true, position: 'right', fontSize: 11, fontWeight: 'bold', color: '#0284c7' },
      }],
    };
  };

  // 4. Report Status Donut
  const getReportStatusOption = () => {
    const rd = stats?.report_status_distribution || {};
    const statusColors = { pending: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981', rejected: '#ef4444', verified: '#0d9488', assigned: '#0ea5e9', closed: '#64748b', under_review: '#e17055', escalated: '#d63031' };
    const FALLBACK_COLORS = ['#0891b2', '#059669', '#d97706', '#dc2626', '#0284c7', '#b45309', '#15803d', '#0369a1'];
    let fallbackIdx = 0;
    const data = Object.entries(rd).filter(([_, v]) => v > 0).map(([k, v]) => ({
      value: v, name: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      itemStyle: { color: statusColors[k] || FALLBACK_COLORS[(fallbackIdx++) % FALLBACK_COLORS.length] },
    }));
    if (data.length === 0) return { backgroundColor: 'transparent', graphic: { type: 'text', left: 'center', top: 'center', style: { text: 'No report data', fontSize: 14, fill: '#9ca3af' } } };
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { color: '#1f2937' } },
      legend: { bottom: 0, textStyle: { fontSize: 10, fontWeight: '600' }, itemWidth: 14, itemHeight: 10, icon: 'roundRect' },
      series: [{
        type: 'pie', radius: ['42%', '68%'], center: ['50%', '42%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
        label: { show: true, formatter: '{b}\n{c}', fontSize: 10, fontWeight: 'bold', color: '#374151' },
        data,
      }],
    };
  };

  // 5. Permit Status Donut
  const getPermitStatusOption = () => {
    const pd = stats?.permit_status_distribution || {};
    const permitColors = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444', expired: '#64748b', revoked: '#dc2626', suspended: '#e17055', under_review: '#0ea5e9', active: '#0d9488' };
    const FALLBACK_COLORS = ['#0891b2', '#d97706', '#059669', '#0284c7', '#b45309', '#15803d'];
    let fallbackIdx = 0;
    const data = Object.entries(pd).filter(([_, v]) => v > 0).map(([k, v]) => ({
      value: v, name: k.replace(/\b\w/g, c => c.toUpperCase()),
      itemStyle: { color: permitColors[k] || FALLBACK_COLORS[(fallbackIdx++) % FALLBACK_COLORS.length] },
    }));
    if (data.length === 0) return { backgroundColor: 'transparent', graphic: { type: 'text', left: 'center', top: 'center', style: { text: 'No permit data', fontSize: 14, fill: '#9ca3af' } } };
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { color: '#1f2937' } },
      legend: { bottom: 0, textStyle: { fontSize: 10, fontWeight: '600' }, itemWidth: 14, itemHeight: 10, icon: 'roundRect' },
      series: [{
        type: 'pie', radius: ['42%', '68%'], center: ['50%', '42%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
        label: { show: true, formatter: '{b}\n{c}', fontSize: 10, fontWeight: 'bold', color: '#374151' },
        data,
      }],
    };
  };

  // 6. Citizen vs Officer Activity Comparison Radar
  const getActivityRadarOption = () => {
    const s = stats || {};
    const citizenReports = s.citizen_reports_total || 0;
    const officerAssigned = s.officer_assigned_total || 0;
    const topCitizenMax = s.top_citizens?.length > 0 ? Math.max(...s.top_citizens.map(c => c.report_count)) : 0;
    const topOfficerMax = s.top_officers?.length > 0 ? Math.max(...s.top_officers.map(o => o.assigned_count)) : 0;
    const permitDist = s.permit_status_distribution || {};
    const citizenPermits = Object.values(permitDist).reduce((a, b) => a + b, 0);

    const maxVal = Math.max(citizenReports, officerAssigned, citizenCount, officerCount, citizenPermits, topCitizenMax, topOfficerMax, 1);
    const indicators = [
      { name: 'Population', max: maxVal },
      { name: 'Reports\nFiled', max: maxVal },
      { name: 'Top User\nActivity', max: maxVal },
      { name: 'Permits', max: maxVal },
      { name: 'Assigned\nReports', max: maxVal },
    ];
    return {
      backgroundColor: 'transparent',
      tooltip: { backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { color: '#1f2937' } },
      legend: { data: ['Citizens', 'Officers'], bottom: 0, textStyle: { fontSize: 11, fontWeight: '600' }, itemWidth: 18, itemHeight: 10, icon: 'roundRect' },
      radar: { indicator: indicators, radius: '62%', axisName: { color: '#6b7280', fontSize: 10, fontWeight: '600' }, splitArea: { areaStyle: { color: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1'] } }, splitLine: { lineStyle: { color: '#e2e8f0' } } },
      series: [{
        type: 'radar',
        data: [
          { value: [citizenCount, citizenReports, topCitizenMax, citizenPermits, 0], name: 'Citizens', lineStyle: { color: '#3b82f6', width: 2 }, areaStyle: { color: 'rgba(59,130,246,0.15)' }, itemStyle: { color: '#3b82f6' } },
          { value: [officerCount, 0, topOfficerMax, 0, officerAssigned], name: 'Officers', lineStyle: { color: '#10b981', width: 2 }, areaStyle: { color: 'rgba(16,185,129,0.15)' }, itemStyle: { color: '#10b981' } },
        ],
      }],
    };
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Hero Header ─────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-300 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-300 rounded-full blur-3xl" />
        </div>
        <div className="max-w-[1600px] mx-auto px-6 py-8 relative">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center">
                  <UsersIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">User Management</h1>
                  <p className="text-slate-300 text-sm">Manage citizens, officers & platform activity</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <button onClick={() => fetchData(true)} disabled={refreshing} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur border border-white/25 rounded-xl px-5 py-3 text-white text-sm font-bold transition-colors">
                <RefreshIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6">

        {/* ── Stat Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 -mt-7 relative z-10 mb-6">
          {[
            { l: 'Total Users', v: totalUsers, s: `${activeCount} active`, g: 'from-slate-600 to-slate-800', ic: <UsersIcon className="w-5 h-5" /> },
            { l: 'Citizens', v: citizenCount, s: `${((citizenCount / Math.max(totalUsers, 1)) * 100).toFixed(0)}% of total`, g: 'from-blue-500 to-sky-500', ic: <UsersIcon className="w-5 h-5" /> },
            { l: 'Officers', v: officerCount, s: `${stats?.officer_assigned_total || 0} assigned`, g: 'from-emerald-500 to-teal-500', ic: <ShieldIcon className="w-5 h-5" /> },
            { l: 'Verified', v: verifiedCount, s: `${totalUsers - verifiedCount} unverified`, g: 'from-teal-500 to-cyan-600', ic: <CheckCircleIcon className="w-5 h-5" /> },
            { l: 'Inactive', v: inactiveCount, s: 'Deactivated accounts', g: 'from-gray-500 to-slate-600', ic: <XIcon className="w-5 h-5" /> },
            { l: 'Reports Filed', v: stats?.citizen_reports_total || 0, s: `by citizens`, g: 'from-amber-500 to-orange-500', ic: <BarChartIcon className="w-5 h-5" /> },
          ].map((c, i) => (
            <motion.div key={c.l} initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className={`bg-gradient-to-br ${c.g} text-white rounded-2xl p-4 shadow-xl relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8" />
              <div className="relative">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center mb-2">{c.ic}</div>
                <p className="text-2xl font-extrabold">{c.v}</p>
                <p className="text-xs font-bold opacity-90">{c.l}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{c.s}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Tab Navigation ────────────────────────────────── */}
        <div className="flex gap-1 mb-5 bg-white rounded-xl border border-gray-200 p-1 shadow-sm overflow-x-auto">
          {[
            { id: 'users', label: 'User Directory', ic: <UsersIcon className="w-4 h-4" /> },
            { id: 'analytics', label: 'Activity Analytics', ic: <BarChartIcon className="w-4 h-4" /> },
            { id: 'leaderboard', label: 'Leaderboard', ic: <AwardIcon className="w-4 h-4" /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              {tab.ic} {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════════════════════ */}
          {/* USER DIRECTORY TAB */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                {/* Toolbar */}
                <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row items-start lg:items-center gap-3">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[250px]">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or district..."
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300" />
                  </div>
                  {/* Filters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer">
                      <option value="all">All Roles</option>
                      <option value="citizen">Citizens</option>
                      <option value="officer">Officers</option>
                      <option value="admin">Admins</option>
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer">
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="verified">Verified</option>
                      <option value="unverified">Unverified</option>
                    </select>
                    <span className="text-xs text-gray-400 font-semibold">{filteredUsers.length} of {totalUsers} users</span>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/80">
                        {[
                          { f: 'name', l: 'User' },
                          { f: 'role', l: 'Role' },
                          { f: 'district', l: 'District' },
                          { f: 'report_count', l: 'Reports' },
                          { f: 'permit_count', l: 'Permits' },
                          { f: 'created_at', l: 'Joined' },
                          { f: null, l: 'Status' },
                          { f: null, l: 'Actions' },
                        ].map(col => (
                          <th key={col.l} onClick={() => col.f && handleSort(col.f)}
                            className={`px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider ${col.f ? 'cursor-pointer hover:text-gray-700 select-none' : ''}`}>
                            <span className="flex items-center gap-1">
                              {col.l}
                              {col.f && sortField === col.f && <ChevronIcon className="w-3 h-3" direction={sortDir === 'asc' ? 'up' : 'down'} />}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pagedUsers.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No users found matching your filters</td></tr>
                      ) : pagedUsers.map((u, idx) => {
                        const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.citizen;
                        return (
                          <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                            className={`hover:bg-gray-50/50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {u.profile_picture ? (
                                  <img src={u.profile_picture} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-gray-100" />
                                ) : (
                                  <div className={`w-9 h-9 rounded-full ${rc.bg} ${rc.border} border flex items-center justify-center text-xs font-bold ${rc.text}`}>
                                    {(u.name || '?')[0].toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                                  <p className="text-[11px] text-gray-400">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${rc.badge}`}>
                                {rc.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs font-medium">{u.district || <span className="text-gray-300">—</span>}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-700">
                                {u.report_count || 0}
                                {u.role === 'officer' && u.assigned_count > 0 && (
                                  <span className="text-[10px] text-emerald-500 font-semibold">({u.assigned_count} assigned)</span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-bold text-gray-700">{u.permit_count || 0}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                <span className={`text-[10px] font-bold uppercase ${u.is_active ? 'text-emerald-600' : 'text-red-500'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                                {u.is_verified && <CheckCircleIcon className="w-3.5 h-3.5 text-teal-400" />}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button onClick={() => openEdit(u)} title="Edit user" className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                                  <EditIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => u.is_active ? setDeleteConfirm(u) : toggleActive(u)}
                                  title={u.is_active ? 'Deactivate' : 'Reactivate'}
                                  className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'hover:bg-red-50 text-gray-400 hover:text-red-600' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-600'}`}>
                                  {u.is_active ? <TrashIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">Page {currentPage} of {totalPages}</p>
                    <div className="flex items-center gap-1">
                      <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Prev</button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let page;
                        if (totalPages <= 7) page = i + 1;
                        else if (currentPage <= 4) page = i + 1;
                        else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                        else page = currentPage - 3 + i;
                        return (
                          <button key={page} onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${currentPage === page ? 'bg-slate-700 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>{page}</button>
                        );
                      })}
                      <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next</button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* ANALYTICS TAB */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-12 gap-5 pb-16">
              {/* Role Distribution */}
              <div className="col-span-12 lg:col-span-4">
                <ChartCard t="Role Distribution" s="Breakdown of user roles" ic={<UsersIcon />} b="Donut">
                  <ReactECharts option={getRoleDonutOption()} style={{ height: '300px' }} opts={{ renderer: 'svg' }} />
                </ChartCard>
              </div>

              {/* Registration Trend */}
              <div className="col-span-12 lg:col-span-8">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-full">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-slate-50 to-gray-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600"><TrendUpIcon /></div>
                      <div><h3 className="text-sm font-bold text-gray-900">Registration Trend</h3><p className="text-[11px] text-gray-400">Monthly user sign-ups by role</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={trendFilterYear} onChange={e => setTrendFilterYear(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 cursor-pointer">
                        <option value="all">All Years</option>
                        {trendYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <select value={trendFilterMonth} onChange={e => setTrendFilterMonth(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 cursor-pointer">
                        <option value="all">All Months</option>
                        {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                      <span className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wide">Stacked Bar</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <ReactECharts option={getRegTrendOption()} style={{ height: '300px' }} opts={{ renderer: 'svg' }} />
                  </div>
                </div>
              </div>

              {/* Citizen vs Officer Radar */}
              <div className="col-span-12 lg:col-span-5">
                <ChartCard t="Citizen vs Officer Activity" s="Comparative radar of engagement metrics" ic={<ActivityIcon />} b="Radar">
                  <ReactECharts option={getActivityRadarOption()} style={{ height: '340px' }} opts={{ renderer: 'svg' }} />
                </ChartCard>
              </div>

              {/* District Distribution */}
              <div className="col-span-12 lg:col-span-7">
                <ChartCard t="Users by District" s="Geographic distribution of registered users" ic={<MapPinIcon />} b="Horizontal Bar">
                  <ReactECharts option={getDistrictOption()} style={{ height: '340px' }} opts={{ renderer: 'svg' }} />
                </ChartCard>
              </div>

              {/* Report Status */}
              <div className="col-span-12 lg:col-span-6">
                <ChartCard t="Disaster Report Status" s="Current status of all citizen-filed reports" ic={<BarChartIcon />} b="Donut">
                  <ReactECharts option={getReportStatusOption()} style={{ height: '300px' }} opts={{ renderer: 'svg' }} />
                </ChartCard>
              </div>

              {/* Permit Status */}
              <div className="col-span-12 lg:col-span-6">
                <ChartCard t="Drone Permit Status" s="Citizen permit applications breakdown" ic={<ShieldIcon />} b="Donut">
                  <ReactECharts option={getPermitStatusOption()} style={{ height: '300px' }} opts={{ renderer: 'svg' }} />
                </ChartCard>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* LEADERBOARD TAB */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-12 gap-5 pb-16">

              {/* Top Citizens */}
              <div className="col-span-12 lg:col-span-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-500"><AwardIcon /></div>
                      <div><h3 className="text-sm font-bold text-gray-900">Top Active Citizens</h3><p className="text-[11px] text-gray-400">Ranked by disaster reports filed</p></div>
                    </div>
                    <span className="px-3 py-1 bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wide">Top 10</span>
                  </div>
                  <div className="p-4">
                    {(!stats?.top_citizens || stats.top_citizens.length === 0) ? (
                      <div className="text-center py-10 text-gray-400 text-sm">No citizen activity data yet</div>
                    ) : (
                      <div className="space-y-2">
                        {stats.top_citizens.map((c, i) => (
                          <motion.div key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${i < 3 ? 'bg-gradient-to-r from-blue-50/80 to-transparent' : 'hover:bg-gray-50'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0
                              ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'}`}>
                              {i + 1}
                            </div>
                            {c.profile_picture ? (
                              <img src={c.profile_picture} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-blue-100 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                                {(c.name || '?')[0].toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate">{c.name}</p>
                              <p className="text-[10px] text-gray-400 truncate">{c.email} {c.district && `• ${c.district}`}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-extrabold text-blue-600">{c.report_count}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase">reports</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Officers */}
              <div className="col-span-12 lg:col-span-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-500"><ShieldIcon /></div>
                      <div><h3 className="text-sm font-bold text-gray-900">Top Active Officers</h3><p className="text-[11px] text-gray-400">Ranked by reports assigned & handled</p></div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold rounded-full uppercase tracking-wide">Top 10</span>
                  </div>
                  <div className="p-4">
                    {(!stats?.top_officers || stats.top_officers.length === 0) ? (
                      <div className="text-center py-10 text-gray-400 text-sm">No officer activity data yet</div>
                    ) : (
                      <div className="space-y-2">
                        {stats.top_officers.map((o, i) => (
                          <motion.div key={o.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${i < 3 ? 'bg-gradient-to-r from-emerald-50/80 to-transparent' : 'hover:bg-gray-50'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0
                              ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'}`}>
                              {i + 1}
                            </div>
                            {o.profile_picture ? (
                              <img src={o.profile_picture} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-emerald-100 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-600 shrink-0">
                                {(o.name || '?')[0].toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate">{o.name}</p>
                              <p className="text-[10px] text-gray-400 truncate">{o.email} {o.district && `• ${o.district}`}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-extrabold text-emerald-600">{o.assigned_count}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase">assigned</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity Summary Cards */}
              <div className="col-span-12">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-500"><ActivityIcon /></div>
                    <div><h3 className="text-sm font-bold text-gray-900">Platform Engagement Overview</h3><p className="text-[11px] text-gray-400">Key metrics comparing citizen and officer interactions</p></div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { l: 'Citizen Reports', v: stats?.citizen_reports_total || 0, desc: 'Total disaster reports submitted by citizens', color: 'blue', ic: <FileTextIcon className="w-4.5 h-4.5" /> },
                        { l: 'Officer Assignments', v: stats?.officer_assigned_total || 0, desc: 'Reports assigned to officers for handling', color: 'emerald', ic: <ShieldIcon className="w-4.5 h-4.5" /> },
                        { l: 'Active Districts', v: Object.keys(stats?.district_distribution || {}).length, desc: 'Districts with registered users', color: 'cyan', ic: <MapPinIcon className="w-4.5 h-4.5" /> },
                        { l: 'Avg Reports/Citizen', v: citizenCount > 0 ? ((stats?.citizen_reports_total || 0) / citizenCount).toFixed(1) : '0', desc: 'Average reports per citizen user', color: 'amber', ic: <PieChartIcon className="w-4.5 h-4.5" /> },
                      ].map(m => (
                        <div key={m.l} className={`bg-${m.color}-50/50 border border-${m.color}-100 rounded-xl p-4`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-7 h-7 rounded-lg bg-${m.color}-100 flex items-center justify-center text-${m.color}-600`}>{m.ic}</div>
                            <span className={`text-xs font-bold text-${m.color}-700 uppercase tracking-wide`}>{m.l}</span>
                          </div>
                          <p className={`text-3xl font-extrabold text-${m.color}-600`}>{m.v}</p>
                          <p className="text-[10px] text-gray-500 mt-1">{m.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* EDIT USER MODAL */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {editUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditUser(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-gray-50">
                <div className="flex items-center gap-3">
                  {editUser.profile_picture ? (
                    <img src={editUser.profile_picture} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">{(editUser.name || '?')[0].toUpperCase()}</div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Edit User</h3>
                    <p className="text-[11px] text-gray-400">{editUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setEditUser(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><XIcon /></button>
              </div>
              {/* Form */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Full Name</label>
                  <input type="text" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Phone</label>
                    <input type="text" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="e.g. +977-98..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">District</label>
                    <input type="text" value={editForm.district || ''} onChange={e => setEditForm(f => ({ ...f, district: e.target.value }))}
                      placeholder="e.g. Kathmandu"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Role</label>
                    <select value={editForm.role || 'citizen'} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 cursor-pointer">
                      <option value="citizen">Citizen</option>
                      <option value="officer">Officer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Account Status</label>
                    <select value={editForm.is_active ? 'active' : 'inactive'} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.value === 'active' }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 cursor-pointer">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                {/* Info badges */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-500">
                    ID: {editUser.id}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${editUser.is_verified ? 'bg-teal-50 border border-teal-200 text-teal-600' : 'bg-gray-50 border border-gray-200 text-gray-400'}`}>
                    {editUser.is_verified ? 'Verified' : 'Unverified'}
                  </span>
                  <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-500">
                    Reports: {editUser.report_count || 0}
                  </span>
                  <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-500">
                    Permits: {editUser.permit_count || 0}
                  </span>
                  {editUser.organization_code && (
                    <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] font-bold text-emerald-600">
                      Org: {editUser.organization_code}
                    </span>
                  )}
                </div>
              </div>
              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
                <button onClick={() => setEditUser(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
                <button onClick={saveEdit} disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-md">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRM MODAL */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-red-50 border border-red-100 rounded-full flex items-center justify-center">
                  <TrashIcon className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Deactivate User?</h3>
                <p className="text-sm text-gray-500 mb-1">This will deactivate the account for:</p>
                <p className="text-sm font-bold text-gray-800">{deleteConfirm.name} ({deleteConfirm.email})</p>
                <p className="text-xs text-gray-400 mt-2">The user will lose access but data is preserved. You can reactivate later.</p>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-center gap-3 bg-gray-50/50">
                <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
                <button onClick={() => toggleActive(deleteConfirm)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-700 hover:bg-slate-800 transition-colors shadow-md">Deactivate</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Reusable chart card ─────────────────────────────────────
function ChartCard({ t, s, ic, b, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-full">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-slate-50 to-gray-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600">{ic}</div>
          <div><h3 className="text-sm font-bold text-gray-900">{t}</h3>{s && <p className="text-[11px] text-gray-400">{s}</p>}</div>
        </div>
        {b && <span className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wide">{b}</span>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
