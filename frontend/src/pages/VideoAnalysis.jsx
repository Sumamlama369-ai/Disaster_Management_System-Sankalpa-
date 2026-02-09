import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import api from '../services/api';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

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
      
      // Poll for processing status
      const videoId = response.data.video_id;
      pollProcessingStatus(videoId);

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

  // Poll processing status
  const pollProcessingStatus = async (videoId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get(`/video/status/${videoId}`);
        const status = response.data.status;

        if (status === 'completed') {
          clearInterval(pollInterval);
          toast.success('Video processing completed!');
          fetchVideos();
          setActiveTab('history');
        } else if (status === 'failed') {
          clearInterval(pollInterval);
          toast.error('Video processing failed');
        } else {
          // Still processing
          console.log(`Processing status: ${status}`);
        }
      } catch (error) {
        clearInterval(pollInterval);
        console.error('Status check error:', error);
      }
    }, 5000); // Check every 5 seconds

    // Stop polling after 30 minutes
    setTimeout(() => clearInterval(pollInterval), 30 * 60 * 1000);
  };

  // View video analysis
  const viewAnalysis = async (video) => {
    setLoading(true);
    setSelectedVideo(video);

    try {
      const response = await api.get(`/video/analysis/${video.id}`);
      setAnalysisData(response.data);
      
      // DEBUG: Log the URLs
      console.log('🎬 Video URLs:', response.data.video_urls);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Navbar />

      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🎬 Video Analysis Dashboard
          </h1>
          <p className="text-gray-600">
            AI-powered disaster video analysis with YOLOv8 detection and segmentation
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'upload'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
            }`}
          >
            📤 Upload Video
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
            }`}
          >
            📚 Video History
          </button>
          {selectedVideo && (
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'analysis'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
              }`}
            >
              📊 Analysis Results
            </button>
          )}
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
          >
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-5xl">🎥</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload Disaster Video</h2>
                <p className="text-gray-600">
                  Upload a video for AI-powered disaster analysis using YOLOv8 models
                </p>
              </div>

              {/* File Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
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
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">✅</span>
                    </div>
                    <p className="text-lg font-bold text-gray-800 mb-2">{selectedFile.name}</p>
                    <p className="text-sm text-gray-600 mb-4">
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
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">📁</span>
                    </div>
                    <p className="text-lg font-bold text-gray-800 mb-2">
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
                className={`w-full mt-6 py-4 rounded-xl font-bold text-white text-lg transition-all ${
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
                  '🚀 Upload and Analyze'
                )}
              </button>

              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="text-3xl mb-2">🎯</div>
                  <p className="text-sm font-bold text-blue-900 mb-1">Object Detection</p>
                  <p className="text-xs text-blue-700">
                    Detects fire, ambulance, injured people, and more
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="text-3xl mb-2">🎭</div>
                  <p className="text-sm font-bold text-purple-900 mb-1">Segmentation</p>
                  <p className="text-xs text-purple-700">
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
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-2xl mb-3">
                    📹
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
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-2xl mb-3">
                    ✅
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
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-2xl mb-3">
                    ⏳
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
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-2xl mb-3">
                    🚨
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
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    📚
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Video History</h3>
                    <p className="text-sm text-gray-500">All analyzed disaster videos</p>
                  </div>
                </div>
                <button
                  onClick={fetchVideos}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg font-medium text-sm"
                >
                  🔄 Refresh
                </button>
              </div>

              {videos.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-5xl">📹</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Videos Yet</h3>
                  <p className="text-gray-600 mb-6">Upload your first disaster video to get started</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg font-medium"
                  >
                    📤 Upload Video
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
                          <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-md ${
                            video.status === 'completed' ? 'bg-gradient-to-br from-green-100 to-green-200' :
                            video.status === 'processing' ? 'bg-gradient-to-br from-yellow-100 to-orange-200' :
                            video.status === 'failed' ? 'bg-gradient-to-br from-red-100 to-red-200' :
                            'bg-gradient-to-br from-gray-100 to-gray-200'
                          }`}>
                            {video.status === 'completed' ? '✅' :
                             video.status === 'processing' ? '⏳' :
                             video.status === 'failed' ? '❌' : '📹'}
                          </div>

                          {/* Video Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
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
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg font-medium text-sm"
                            >
                              📊 View Analysis
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteVideo(video.id)}
                            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition shadow-lg font-medium text-sm"
                          >
                            🗑️ Delete
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
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl hover:bg-gray-50 transition shadow font-medium text-gray-700"
            >
              ← Back to History
            </button>

            {/* Video Info Header */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-3xl shadow-lg">
                    🎬
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedVideo.filename}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span>⏱️</span>
                        <span>Duration: {Math.floor(analysisData.video_info.duration_seconds / 60)}:{(analysisData.video_info.duration_seconds % 60).toFixed(0).padStart(2, '0')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🎞️</span>
                        <span>Frames: {analysisData.video_info.total_frames}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📐</span>
                        <span>Resolution: {analysisData.video_info.resolution}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🎯</span>
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
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                      🎯
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
                    <div className="text-2xl mb-1">📦</div>
                    <p className="text-xs text-blue-700 mb-1">Total Objects</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {Object.values(analysisData.statistics.total_detections).reduce((a, b) => a + b, 0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="text-2xl mb-1">✅</div>
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
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                      🎭
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Instance Segmentation</h3>
                      <p className="text-sm text-gray-500">YOLOv8 Segmentation Model</p>
                    </div>
                  </div>
                  <span className="px-4 py-2 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl text-sm font-bold text-purple-700">
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
                    <div className="text-2xl mb-1">📏</div>
                    <p className="text-xs text-orange-700 mb-1">Avg Affected Area</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {analysisData.statistics.avg_affected_area.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                    <div className="text-2xl mb-1">🔥</div>
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
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                  📊
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Overall Analysis Summary</h3>
                  <p className="text-sm text-gray-500">Complete video analysis statistics</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">⚠️</span>
                    <span className="text-xs font-bold text-blue-700 bg-blue-200 px-2 py-1 rounded">SEVERITY</span>
                  </div>
                  <p className="text-sm text-blue-700 mb-1">Average Severity</p>
                  <p className="text-3xl font-bold text-blue-900">{analysisData.statistics.avg_severity_score.toFixed(1)}/10</p>
                  <p className="text-xs text-blue-600 mt-2">Max: {analysisData.statistics.max_severity_score.toFixed(1)}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">🎯</span>
                    <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded">DETECTION</span>
                  </div>
                  <p className="text-sm text-green-700 mb-1">Detection Classes</p>
                  <p className="text-3xl font-bold text-green-900">
                    {Object.keys(analysisData.statistics.total_detections).length}
                  </p>
                  <p className="text-xs text-green-600 mt-2">Types identified</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">📍</span>
                    <span className="text-xs font-bold text-purple-700 bg-purple-200 px-2 py-1 rounded">PEAK</span>
                  </div>
                  <p className="text-sm text-purple-700 mb-1">Peak Severity Frame</p>
                  <p className="text-3xl font-bold text-purple-900">{analysisData.statistics.peak_severity_frame}</p>
                  <p className="text-xs text-purple-600 mt-2">
                    @ {analysisData.statistics.peak_severity_timestamp?.toFixed(1)}s
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">💯</span>
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
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-xl shadow">
                    📈
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
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-xl shadow">
                    📊
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
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-xl shadow">
                  🏆
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
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center text-xl shadow">
                  📋
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
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    💾
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Download Results</h3>
                    <p className="text-sm text-gray-600">Export analyzed videos and data</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => downloadVideo(
                      `/api/v1/video/stream/${selectedVideo.id}/detection`,
                      `detection_${selectedVideo.filename}`
                    )}
                    className="px-5 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition shadow-lg font-medium"
                  >
                    📥 Detection Video
                  </button>
                  <button
                    onClick={() => downloadVideo(
                      `/api/v1/video/stream/${selectedVideo.id}/segmentation`,
                      `segmentation_${selectedVideo.filename}`
                    )}
                    className="px-5 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition shadow-lg font-medium"
                  >
                    📥 Segmentation Video
                  </button>
                  <button
                    onClick={downloadCSVReport}
                    className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg font-medium"
                  >
                    📊 CSV Report
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