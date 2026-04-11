import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import api from '../services/api';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import useWebSocket from '../hooks/useWebSocket';

export default function VideoAnalysis() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const fileInputRef = useRef(null);
  const [processingVideoId, setProcessingVideoId] = useState(null);

  // Disaster colors
  const DISASTER_COLORS = {
    ambulance: '#fbbf24',
    boat: '#3b82f6',
    fire: '#ef4444',
    forest: '#10b981',
    injured_people: '#f97316',
    landslide: '#92400e',
    person: '#ec4899',
    tent: '#f9a8d4',
    building: '#6b7280',
    fire_and_smoke: '#dc2626',
    road: '#4b5563',
  };

  // Fetch user's videos
  useEffect(() => {
    if (activeTab === 'history') {
      fetchVideos();
    }
  }, [activeTab]);

  const fetchVideos = async () => {
    try {
      const response = await api.get('/video/list');
      setVideos(response.data.videos || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to load videos');
    }
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file type
      const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm'];
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload MP4, AVI, MOV, MKV, or WEBM');
        return;
      }

      // Check file size (500MB max)
      const maxSize = 500 * 1024 * 1024; // 500MB in bytes
      if (file.size > maxSize) {
        toast.error('File too large. Maximum size is 500MB');
        return;
      }

      setSelectedFile(file);
      toast.success(`Selected: ${file.name}`);
    }
  };

  // Handle video upload
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a video file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await api.post('/video/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      toast.success('Video uploaded successfully! Processing started...');
      
      // Subscribe to WebSocket for processing status updates
      const videoId = response.data.video_id;
      setProcessingVideoId(videoId);

      // Clear selection
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // WebSocket: listen for video processing status changes
  const handleVideoWsNotify = useCallback(async (channel, event) => {
    if (channel === `video:${processingVideoId}`) {
      if (event === 'completed') {
        toast.success('Video processing completed!');
        fetchVideos();
        setActiveTab('history');
        setProcessingVideoId(null);
      } else if (event === 'failed') {
        toast.error('Video processing failed');
        setProcessingVideoId(null);
      }
    }
  }, [processingVideoId]);

  useWebSocket(
    processingVideoId ? [`video:${processingVideoId}`] : [],
    handleVideoWsNotify,
    { enabled: !!processingVideoId }
  );

  // View video analysis
  const viewAnalysis = async (video) => {
    setLoading(true);
    setSelectedVideo(video);

    try {
      const response = await api.get(`/video/analysis/${video.id}`);
      setAnalysisData(response.data);
      
      // DEBUG: Log the URLs
      console.log('Video URLs:', response.data.video_urls);
      console.log('Detection URL:', `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${response.data.video_urls.detection_output}`);
      console.log('Segmentation URL:', `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${response.data.video_urls.segmentation_output}`);
      
      setActiveTab('analysis');
    } catch (error) {
      console.error('Error loading analysis:', error);
      toast.error('Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  // Delete video
  const deleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await api.delete(`/video/delete/${videoId}`);
      toast.success('Video deleted successfully');
      fetchVideos();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete video');
    }
  };

  // Download video file - uses direct link approach to avoid CORS issues
  const downloadVideo = (url, filename) => {
    const fullUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${url}`;
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Download started!');
  };

  // Generate and download CSV report
  const downloadCSVReport = () => {
    if (!analysisData) return;
    
    const info = analysisData.video_info;
    const stats = analysisData.statistics;
    const frames = analysisData.frame_timeline;
    
    // Build CSV content
    const csvRows = [];
    
    // Header section
    csvRows.push(['VIDEO ANALYSIS REPORT']);
    csvRows.push(['Generated:', new Date().toLocaleString()]);
    csvRows.push([]);
    
    // Video info
    csvRows.push(['VIDEO INFORMATION']);
    csvRows.push(['Filename:', info.filename]);
    csvRows.push(['Duration (seconds):', info.duration_seconds]);
    csvRows.push(['Total Frames:', info.total_frames]);
    csvRows.push(['FPS:', info.fps]);
    csvRows.push(['Resolution:', info.resolution]);
    csvRows.push(['Overall Severity Score:', info.severity_score]);
    csvRows.push(['Risk Level:', info.risk_level]);
    csvRows.push([]);
    
    // Statistics
    csvRows.push(['ANALYSIS STATISTICS']);
    csvRows.push(['Average Severity Score:', stats.avg_severity_score]);
    csvRows.push(['Max Severity Score:', stats.max_severity_score]);
    csvRows.push(['Peak Severity Frame:', stats.peak_severity_frame]);
    csvRows.push(['Average Detection Confidence:', (stats.avg_detection_confidence * 100).toFixed(1) + '%']);
    csvRows.push(['Average Affected Area:', stats.avg_affected_area.toFixed(1) + '%']);
    csvRows.push(['Max Affected Area:', stats.max_affected_area.toFixed(1) + '%']);
    csvRows.push([]);
    
    // Detection counts
    csvRows.push(['TOTAL DETECTIONS BY CLASS']);
    Object.entries(stats.total_detections).forEach(([className, count]) => {
      csvRows.push([className, count]);
    });
    csvRows.push([]);
    
    // Frame-by-frame data
    csvRows.push(['FRAME-BY-FRAME ANALYSIS']);
    csvRows.push(['Frame #', 'Timestamp (s)', 'Total Objects', 'Affected Area %', 'Severity Score', 'Top Detections']);
    
    frames.forEach(frame => {
      const topDetections = Object.entries(frame.detections)
        .filter(([_, count]) => count > 0)
        .map(([name, count]) => `${name}:${count}`)
        .join('; ');
      
      csvRows.push([
        frame.frame_number,
        frame.timestamp_seconds.toFixed(2),
        frame.total_objects,
        frame.affected_area_percent.toFixed(2),
        frame.severity_score.toFixed(2),
        topDetections || 'None'
      ]);
    });
    
    // Convert to CSV string
    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis_report_${info.filename.replace(/\.[^/.]+$/, '')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV report downloaded!');
  };

  // Get severity color
  const getSeverityColor = (score) => {
    if (score >= 7.5) return 'text-red-600 bg-red-100';
    if (score >= 5.0) return 'text-orange-600 bg-orange-100';
    if (score >= 2.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  // Get risk level badge
  const getRiskBadge = (level) => {
    const colors = {
      critical: 'bg-red-600 text-white',
      high: 'bg-orange-600 text-white',
      medium: 'bg-yellow-600 text-white',
      low: 'bg-green-600 text-white',
    };
    return colors[level] || 'bg-gray-600 text-white';
  };

  // Detection timeline chart
  const getDetectionTimelineChart = () => {
    if (!analysisData || !analysisData.frame_timeline) return {};

    const frames = analysisData.frame_timeline;
    const detectionTypes = new Set();
    
    // Collect all detection types
    frames.forEach(frame => {
      Object.keys(frame.detections).forEach(type => detectionTypes.add(type));
    });

    const series = Array.from(detectionTypes).map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      type: 'line',
      data: frames.map(frame => frame.detections[type] || 0),
      smooth: true,
      lineStyle: { width: 2 },
      itemStyle: { color: DISASTER_COLORS[type] || '#6b7280' },
    }));

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#1f2937' },
      },
      legend: {
        data: Array.from(detectionTypes).map(t => t.charAt(0).toUpperCase() + t.slice(1)),
        bottom: 0,
        textStyle: { fontSize: 11 },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '5%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: frames.map((_, i) => `Frame ${i * 10}`),
        axisLabel: { fontSize: 10, interval: Math.floor(frames.length / 10) },
      },
      yAxis: {
        type: 'value',
        name: 'Count',
        axisLabel: { fontSize: 10 },
      },
      series: series,
    };
  };

  // Segmentation area chart
  const getSegmentationAreaChart = () => {
    if (!analysisData || !analysisData.frame_timeline) return {};

    const frames = analysisData.frame_timeline;
    const segTypes = new Set();
    
    frames.forEach(frame => {
      Object.keys(frame.segmentation).forEach(type => segTypes.add(type));
    });

    const series = Array.from(segTypes).map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      type: 'line',
      stack: 'Total',
      data: frames.map(frame => frame.segmentation[type] || 0),
      areaStyle: { opacity: 0.7 },
      smooth: true,
      itemStyle: { color: DISASTER_COLORS[type] || '#6b7280' },
    }));

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: Array.from(segTypes).map(t => t.charAt(0).toUpperCase() + t.slice(1)),
        bottom: 0,
        textStyle: { fontSize: 11 },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '5%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: frames.map((_, i) => `${(i * 10 / 15).toFixed(1)}s`),
        axisLabel: { fontSize: 10, interval: Math.floor(frames.length / 10) },
      },
      yAxis: {
        type: 'value',
        name: 'Area %',
        axisLabel: { fontSize: 10, formatter: '{value}%' },
      },
      series: series,
    };
  };

  // Top detections bar chart
  const getTopDetectionsChart = () => {
    if (!analysisData || !analysisData.statistics) return {};

    const detections = analysisData.statistics.total_detections || {};
    const data = Object.entries(detections)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: '20%',
        right: '10%',
        bottom: '5%',
        top: '5%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 10 },
      },
      yAxis: {
        type: 'category',
        data: data.map(([type]) => type.charAt(0).toUpperCase() + type.slice(1)),
        axisLabel: { fontSize: 11, fontWeight: '500' },
      },
      series: [{
        type: 'bar',
        data: data.map(([type, count], i) => ({
          value: count,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: DISASTER_COLORS[type] || '#3b82f6' },
              { offset: 1, color: (DISASTER_COLORS[type] || '#3b82f6') + 'dd' },
            ]),
            borderRadius: [0, 8, 8, 0],
          },
        })),
        barWidth: '70%',
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          fontSize: 10,
          fontWeight: 'bold',
        },
      }],
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-blue-100">
      <Navbar />

      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 relative">
          {/* Animated background decorations — floating wireframe "detection boxes" suggesting YOLO inference */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden -z-0">
            {[
              { top: '8%', left: '62%', w: 70, h: 42, d: 8, delay: 0 },
              { top: '52%', left: '74%', w: 54, h: 38, d: 11, delay: 1.6 },
              { top: '22%', left: '86%', w: 46, h: 32, d: 9, delay: 3.2 },
              { top: '68%', left: '56%', w: 38, h: 28, d: 10, delay: 2.1 },
            ].map((b, i) => (
              <motion.div
                key={i}
                className="absolute border-2 border-blue-400/30 rounded-md"
                style={{ top: b.top, left: b.left, width: b.w, height: b.h }}
                animate={{
                  y: [0, -14, 4, 0],
                  opacity: [0, 0.9, 0.9, 0],
                  borderColor: ['rgba(96,165,250,0.25)', 'rgba(59,130,246,0.55)', 'rgba(96,165,250,0.25)'],
                }}
                transition={{ duration: b.d, repeat: Infinity, delay: b.delay, ease: 'easeInOut' }}
              >
                {/* Corner accents so it looks like a YOLO bbox */}
                <span className="absolute -top-[2px] -left-[2px] w-2 h-2 border-t-2 border-l-2 border-blue-500/70"/>
                <span className="absolute -top-[2px] -right-[2px] w-2 h-2 border-t-2 border-r-2 border-blue-500/70"/>
                <span className="absolute -bottom-[2px] -left-[2px] w-2 h-2 border-b-2 border-l-2 border-blue-500/70"/>
                <span className="absolute -bottom-[2px] -right-[2px] w-2 h-2 border-b-2 border-r-2 border-blue-500/70"/>
              </motion.div>
            ))}
            {/* Horizontal scan beam sweeping left→right through the header */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 h-10 w-16 bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent blur-sm"
              animate={{ left: ['-8%', '108%'] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative z-10"
          >
            <motion.h1
              className="text-3xl font-bold mb-2 flex items-center gap-3"
              initial={{ opacity: 0, x: -12 }}
              animate={{
                opacity: 1,
                x: 0,
                backgroundPositionX: ['0%', '-220%'],
              }}
              transition={{
                opacity: { duration: 0.5, ease: 'easeOut', delay: 0.1 },
                x: { duration: 0.5, ease: 'easeOut', delay: 0.1 },
                backgroundPositionX: { duration: 6, repeat: Infinity, ease: 'linear', delay: 0.6 },
              }}
              style={{
                backgroundImage: 'linear-gradient(90deg,#1d4ed8 0%,#60a5fa 45%,#1e40af 100%)',
                backgroundSize: '220% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              <motion.span
                className="relative inline-flex items-center justify-center"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg className="w-8 h-8 text-blue-600 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                {/* REC indicator dot with ping */}
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 z-20">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"/>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"/>
                </span>
                {/* Soft blue glow behind the icon */}
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-blue-400/30 blur-xl"
                  animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.3, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.span>
              Video Analysis Dashboard
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="text-gray-600"
            >
              AI-powered disaster video analysis with YOLOv8 detection and segmentation
            </motion.p>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'upload'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Upload Video
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            Video History
          </button>
          {selectedVideo && (
            <button
              onClick={() => setActiveTab('analysis')}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'analysis'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
              Analysis Results
            </button>
          )}
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
          >
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-5">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Upload Disaster Video</h2>
                <p className="text-gray-600 text-sm">
                  Upload a video for AI-powered disaster analysis using YOLOv8 models
                </p>
              </div>

              {/* File Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    </div>
                    <p className="text-base font-bold text-gray-800 mb-1">{selectedFile.name}</p>
                    <p className="text-sm text-gray-600 mb-3">
                      Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    </div>
                    <p className="text-base font-bold text-gray-800 mb-1">
                      Click to select video or drag and drop
                    </p>
                    <p className="text-sm text-gray-600">
                      Supported formats: MP4, AVI, MOV, MKV, WEBM (Max: 500MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Uploading...</span>
                    <span className="text-sm font-bold text-blue-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className={`w-full mt-4 py-3 rounded-xl font-bold text-white transition-all ${
                  selectedFile && !uploading
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Uploading {uploadProgress}%
                  </span>
                ) : (
                  'Upload and Analyze'
                )}
              </button>

              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
                  <p className="text-sm font-bold text-blue-900 mb-0.5">Object Detection</p>
                  <p className="text-xs text-blue-700">
                    Detects fire, ambulance, injured people, and more
                  </p>
                </div>
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-3 border border-teal-200">
                  <p className="text-sm font-bold text-teal-900 mb-0.5">Segmentation</p>
                  <p className="text-xs text-teal-700">
                    Measures affected areas and damage extent
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-xl p-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                  </div>
                  <p className="text-blue-100 text-sm font-medium mb-1">Total Videos</p>
                  <h3 className="text-4xl font-bold">{videos.length}</h3>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-xl p-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  </div>
                  <p className="text-green-100 text-sm font-medium mb-1">Completed</p>
                  <h3 className="text-4xl font-bold">
                    {videos.filter(v => v.status === 'completed').length}
                  </h3>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-2xl shadow-xl p-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                  </div>
                  <p className="text-orange-100 text-sm font-medium mb-1">Processing</p>
                  <h3 className="text-4xl font-bold">
                    {videos.filter(v => v.status === 'processing').length}
                  </h3>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl shadow-xl p-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  </div>
                  <p className="text-red-100 text-sm font-medium mb-1">Critical Videos</p>
                  <h3 className="text-4xl font-bold">
                    {videos.filter(v => v.risk_level === 'critical').length}
                  </h3>
                </div>
              </motion.div>
            </div>

            {/* Video List */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Video History</h3>
                    <p className="text-sm text-gray-500">All analyzed disaster videos</p>
                  </div>
                </div>
                <button
                  onClick={fetchVideos}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg font-medium text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                  Refresh
                </button>
              </div>

              {videos.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Videos Yet</h3>
                  <p className="text-gray-600 mb-6">Upload your first disaster video to get started</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    Upload Video
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {videos.map((video, index) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all bg-gradient-to-r from-gray-50 to-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Video Icon */}
                          <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-md ${
                            video.status === 'completed' ? 'bg-gradient-to-br from-green-100 to-green-200 text-green-700' :
                            video.status === 'processing' ? 'bg-gradient-to-br from-yellow-100 to-orange-200 text-orange-700' :
                            video.status === 'failed' ? 'bg-gradient-to-br from-red-100 to-red-200 text-red-700' :
                            'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'
                          }`}>
                            {video.status === 'completed' ? (
                              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                            ) : video.status === 'processing' ? (
                              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                            ) : video.status === 'failed' ? (
                              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                            ) : (
                              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                            )}
                          </div>

                          {/* Video Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h4 className="text-lg font-bold text-gray-800">{video.filename}</h4>

                              {/* Status Badge */}
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                video.status === 'completed' ? 'bg-green-100 text-green-700' :
                                video.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                                video.status === 'failed' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {video.status.toUpperCase()}
                              </span>

                              {/* Risk Level Badge */}
                              {video.risk_level && (
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getRiskBadge(video.risk_level)}`}>
                                  {video.risk_level.toUpperCase()}
                                </span>
                              )}
                            </div>

                            {/* Video Details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                              <div>
                                <span className="text-gray-500">Duration:</span>
                                <span className="font-semibold ml-2">
                                  {video.duration_seconds ? `${Math.floor(video.duration_seconds / 60)}:${(video.duration_seconds % 60).toString().padStart(2, '0')}` : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Uploaded:</span>
                                <span className="font-semibold ml-2">
                                  {new Date(video.upload_timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              {video.severity_score && (
                                <div>
                                  <span className="text-gray-500">Severity:</span>
                                  <span className={`font-bold ml-2 ${getSeverityColor(video.severity_score)}`}>
                                    {video.severity_score.toFixed(1)}/10
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Progress Bar for Processing */}
                            {video.status === 'processing' && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-600">Processing...</span>
                                  <span className="text-xs font-bold text-orange-600">In Progress</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {video.status === 'completed' && (
                            <button
                              onClick={() => viewAnalysis(video)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg font-medium text-sm"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                              View Analysis
                            </button>
                          )}

                          <button
                            onClick={() => deleteVideo(video.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition shadow-lg font-medium text-sm"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && selectedVideo && analysisData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Back Button */}
            <button
              onClick={() => {
                setActiveTab('history');
                setSelectedVideo(null);
                setAnalysisData(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl hover:bg-gray-50 transition shadow font-medium text-gray-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
              Back to History
            </button>

            {/* Video Info Header */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedVideo.filename}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        <span>Duration: {Math.floor(analysisData.video_info.duration_seconds / 60)}:{(analysisData.video_info.duration_seconds % 60).toFixed(0).padStart(2, '0')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /></svg>
                        <span>Frames: {analysisData.video_info.total_frames}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>
                        <span>Resolution: {analysisData.video_info.resolution}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                        <span>FPS: {analysisData.video_info.fps}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Severity Score */}
                <div className="text-center">
                  <div className={`px-6 py-3 rounded-xl font-bold text-lg ${getSeverityColor(analysisData.video_info.severity_score)}`}>
                    Severity: {analysisData.video_info.severity_score.toFixed(1)}/10
                  </div>
                  <div className={`mt-2 px-4 py-2 rounded-lg text-sm font-bold ${getRiskBadge(analysisData.video_info.risk_level)}`}>
                    {analysisData.video_info.risk_level.toUpperCase()} RISK
                  </div>
                </div>
              </div>
            </div>

            {/* Side-by-Side Videos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Detection Video */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Object Detection</h3>
                      <p className="text-sm text-gray-500">YOLOv8 Detection Model</p>
                    </div>
                  </div>
                  <span className="px-4 py-2 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl text-sm font-bold text-green-700">
                    Detection
                  </span>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                  <video
                    controls
                    className="w-full h-full"
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${analysisData.video_urls.detection_output}`}
                  >
                    Your browser does not support video playback.
                  </video>
                </div>

                {/* Detection Stats */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <svg className="w-7 h-7 text-blue-700 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                    <p className="text-xs text-blue-700 mb-1">Total Objects</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {Object.values(analysisData.statistics.total_detections).reduce((a, b) => a + b, 0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <svg className="w-7 h-7 text-green-700 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    <p className="text-xs text-green-700 mb-1">Avg Confidence</p>
                    <p className="text-2xl font-bold text-green-900">
                      {(analysisData.statistics.avg_detection_confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Segmentation Video */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Instance Segmentation</h3>
                      <p className="text-sm text-gray-500">YOLOv8 Segmentation Model</p>
                    </div>
                  </div>
                  <span className="px-4 py-2 bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200 rounded-xl text-sm font-bold text-teal-700">
                    Segmentation
                  </span>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                  <video
                    controls
                    className="w-full h-full"
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${analysisData.video_urls.segmentation_output}`}
                  >
                    Your browser does not support video playback.
                  </video>
                </div>

                {/* Segmentation Stats */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                    <svg className="w-7 h-7 text-orange-700 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12h-4l-3 9L9 3l-3 9H2" /></svg>
                    <p className="text-xs text-orange-700 mb-1">Avg Affected Area</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {analysisData.statistics.avg_affected_area.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                    <svg className="w-7 h-7 text-red-700 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
                    <p className="text-xs text-red-700 mb-1">Max Affected Area</p>
                    <p className="text-2xl font-bold text-red-900">
                      {analysisData.statistics.max_affected_area.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Statistics */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Overall Analysis Summary</h3>
                  <p className="text-sm text-gray-500">Complete video analysis statistics</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <svg className="w-8 h-8 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    <span className="text-xs font-bold text-blue-700 bg-blue-200 px-2 py-1 rounded">SEVERITY</span>
                  </div>
                  <p className="text-sm text-blue-700 mb-1">Average Severity</p>
                  <p className="text-3xl font-bold text-blue-900">{analysisData.statistics.avg_severity_score.toFixed(1)}/10</p>
                  <p className="text-xs text-blue-600 mt-2">Max: {analysisData.statistics.max_severity_score.toFixed(1)}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <svg className="w-8 h-8 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                    <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded">DETECTION</span>
                  </div>
                  <p className="text-sm text-green-700 mb-1">Detection Classes</p>
                  <p className="text-3xl font-bold text-green-900">
                    {Object.keys(analysisData.statistics.total_detections).length}
                  </p>
                  <p className="text-xs text-green-600 mt-2">Types identified</p>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-5 border border-teal-200">
                  <div className="flex items-center justify-between mb-3">
                    <svg className="w-8 h-8 text-teal-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span className="text-xs font-bold text-teal-700 bg-teal-200 px-2 py-1 rounded">PEAK</span>
                  </div>
                  <p className="text-sm text-teal-700 mb-1">Peak Severity Frame</p>
                  <p className="text-3xl font-bold text-teal-900">{analysisData.statistics.peak_severity_frame}</p>
                  <p className="text-xs text-teal-600 mt-2">
                    @ {analysisData.statistics.peak_severity_timestamp?.toFixed(1)}s
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
                  <div className="flex items-center justify-between mb-3">
                    <svg className="w-8 h-8 text-orange-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    <span className="text-xs font-bold text-orange-700 bg-orange-200 px-2 py-1 rounded">CONFIDENCE</span>
                  </div>
                  <p className="text-sm text-orange-700 mb-1">Avg Confidence</p>
                  <p className="text-3xl font-bold text-orange-900">
                    {(analysisData.statistics.avg_detection_confidence * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-orange-600 mt-2">
                    Max: {(analysisData.statistics.max_detection_confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Detection Timeline */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Detection Timeline</h3>
                    <p className="text-xs text-gray-500">Object counts over time</p>
                  </div>
                </div>
                <ReactECharts
                  option={getDetectionTimelineChart()}
                  style={{ height: '350px' }}
                  opts={{ renderer: 'svg' }}
                />
              </div>

              {/* Segmentation Area */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center shadow">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Affected Area Timeline</h3>
                    <p className="text-xs text-gray-500">Segmentation area % over time</p>
                  </div>
                </div>
                <ReactECharts
                  option={getSegmentationAreaChart()}
                  style={{ height: '350px' }}
                  opts={{ renderer: 'svg' }}
                />
              </div>
            </div>

            {/* Top Detections */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Top Detections</h3>
                  <p className="text-xs text-gray-500">Most frequent disaster elements</p>
                </div>
              </div>
              <ReactECharts
                option={getTopDetectionsChart()}
                style={{ height: '400px' }}
                opts={{ renderer: 'svg' }}
              />
            </div>

            {/* Frame-by-Frame Table */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Frame-by-Frame Details</h3>
                  <p className="text-xs text-gray-500">Sampled frames analysis (every 10th frame)</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Frame #</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Time (s)</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Objects</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Top Detection</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Affected Area</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.frame_timeline.slice(0, 20).map((frame, index) => {
                      const topDetection = Object.entries(frame.detections)
                        .filter(([_, count]) => count > 0)
                        .sort((a, b) => b[1] - a[1])[0];

                      return (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-mono text-gray-700">{frame.frame_number}</td>
                          <td className="px-4 py-3 text-gray-600">{frame.timestamp_seconds.toFixed(1)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold text-xs">
                              {frame.total_objects}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {topDetection ? (
                              <span className="px-2 py-1 rounded text-xs font-semibold" style={{
                                backgroundColor: DISASTER_COLORS[topDetection[0]] + '20',
                                color: DISASTER_COLORS[topDetection[0]]
                              }}>
                                {topDetection[0]}: {topDetection[1]}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded font-semibold text-xs ${
                              frame.affected_area_percent > 50 ? 'bg-red-100 text-red-700' :
                              frame.affected_area_percent > 25 ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {frame.affected_area_percent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded font-bold text-xs ${getSeverityColor(frame.severity_score)}`}>
                              {frame.severity_score.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {analysisData.frame_timeline.length > 20 && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  Showing first 20 of {analysisData.frame_timeline.length} sampled frames
                </p>
              )}
            </div>

            {/* Download Section */}
            <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl shadow-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Download Results</h3>
                    <p className="text-sm text-gray-600">Export analyzed videos and data</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => downloadVideo(
                      `/api/v1/video/stream/${selectedVideo.id}/detection`,
                      `detection_${selectedVideo.filename}`
                    )}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition shadow-lg font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Detection Video
                  </button>
                  <button
                    onClick={() => downloadVideo(
                      `/api/v1/video/stream/${selectedVideo.id}/segmentation`,
                      `segmentation_${selectedVideo.filename}`
                    )}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 transition shadow-lg font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Segmentation Video
                  </button>
                  <button
                    onClick={downloadCSVReport}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                    CSV Report
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}