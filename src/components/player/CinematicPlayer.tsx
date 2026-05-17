import { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings,
  RotateCcw, SkipForward, Info, Eye, Sliders, Shield, RefreshCw,
  Globe, Languages, Flame, Lock, Unlock, Monitor, Captions,
  Camera, Sparkles, Upload, Check, Plus, Minus, Tv, SkipBack
} from 'lucide-react';
import Hls from 'hls.js';
import { cn } from '../../utils/cn';
import { motion } from 'motion/react';
import { useProgressStore } from '../../stores/useProgressStore';

interface SourceItem {
  id: string;
  quality: string;
  download_url: string;
  stream_url: string;
  size: string;
  format: string;
}

interface StarItem {
  staffId: string | number;
  name: string;
  avatarUrl?: string;
  character?: string;
}

interface CinematicPlayerProps {
  sources: SourceItem[];
  subtitles?: any[];
  title: string;
  backdropUrl?: string;
  stars?: StarItem[];
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
  onPrevEpisode?: () => void;
  hasPrevEpisode?: boolean;
  subjectId?: string;
  season?: number;
  episode?: number;
}

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

// Helper functions for parsing VTT & SRT subtitles
function parseTimestamp(timeStr: string): number {
  const parts = timeStr.trim().replace(',', '.').split(':');
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parseFloat(parts[0]);
    minutes = parseFloat(parts[1]);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseFloat(parts[0]);
    seconds = parseFloat(parts[1]);
  }

  return hours * 3600 + minutes * 60 + seconds;
}

function parseSubtitles(text: string): SubtitleCue[] {
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = cleanText.split('\n\n');
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    let timeLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIdx = i;
        break;
      }
    }
    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const [startStr, endStr] = timeLine.split('-->');
    if (!startStr || !endStr) continue;

    const start = parseTimestamp(startStr);
    const end = parseTimestamp(endStr);

    const textLines = lines.slice(timeLineIdx + 1);
    const textVal = textLines
      .join('\n')
      .replace(/<[^>]*>/g, '')
      .replace(/^[0-9]+$/, '')
      .trim();

    if (!isNaN(start) && !isNaN(end) && textVal) {
      cues.push({ start, end, text: textVal });
    }
  }
  return cues;
}

export default function CinematicPlayer({
  sources,
  subtitles = [],
  title,
  backdropUrl,
  stars = [],
  onNextEpisode,
  hasNextEpisode = false,
  onPrevEpisode,
  hasPrevEpisode = false,
  subjectId,
  season,
  episode
}: CinematicPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Core Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState<[number, number][]>([]);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedSourceIdx, setSelectedSourceIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Premium Features Settings States
  const [showControls, setShowControls] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'original' | '16:9' | '4:3' | 'stretch' | 'zoom'>('original');
  const [ambientGlow, setAmbientGlow] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'main' | 'quality' | 'speed' | 'subtitles' | 'audio' | 'telemetry' | 'adjustments' | 'autoskip'>('main');

  // Subtitles / Captions custom overrides
  const [selectedSubtitleIdx, setSelectedSubtitleIdx] = useState(-1); // -1 = Off
  const [subTextSize, setSubTextSize] = useState(100); // 100%
  const [subDelay, setSubDelay] = useState(0); // Offset delay in seconds
  const [subBackground, setSubBackground] = useState<'translucent' | 'solid' | 'shadow'>('translucent');
  const [subColor, setSubColor] = useState<'white' | 'yellow' | 'cyan' | 'green'>('white');
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [currentSubtitleText, setCurrentSubtitleText] = useState<string>('');
  const [subtitleLoading, setSubtitleLoading] = useState(false);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);

  // Video filter adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [cinematicFilter, setCinematicFilter] = useState<'normal' | 'cinematic' | 'vibrant' | 'warm' | 'cool' | 'noir'>('normal');

  // Amazon Prime style X-Ray Overlay States
  const [showXRay, setShowXRay] = useState(false);
  const [activeXRayTab, setActiveXRayTab] = useState<'cast' | 'music' | 'trivia'>('cast');

  // Premium Toast Notification system
  const [playerNotification, setPlayerNotification] = useState<string | null>(null);

  const [videoCrossOrigin, setVideoCrossOrigin] = useState<'anonymous' | undefined>('anonymous');

  // Auto skip state
  const [autoSkipIntro, setAutoSkipIntro] = useState(false);
  const [autoSkipOutro, setAutoSkipOutro] = useState(false);
  const [showOutroSkip, setShowOutroSkip] = useState(false);

  const hasSkippedIntroRef = useRef(false);
  const hasSkippedOutroRef = useRef(false);

  // Interactive Overlays
  const [showNextEpCountdown, setShowNextEpCountdown] = useState(false);
  const [nextEpCountdown, setNextEpCountdown] = useState(10);
  const [showIntroSkip, setShowIntroSkip] = useState(false);

  // QoS / Telemetry (Mock Metrics)
  const [metrics, setMetrics] = useState({
    vst: 0, // Video Start Time (ms)
    bufferingRatio: 0.1,
    bitrate: 'Auto',
    fps: 60,
    droppedFrames: 0,
    latency: 'Low (0.8s)',
    loudness: 'Normalized',
    codec: 'AV1 / AAC'
  });
  const [showTelemetryOverlay, setShowTelemetryOverlay] = useState(false);

  // Fluctuating Telemetry QoS Metrics Effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setMetrics((prev) => {
        // Random bitrate fluctuation
        const speed = (20 + Math.random() * 25).toFixed(1);
        // Occasionally drop an FPS frame
        const currentFps = Math.random() > 0.95 ? 58 : 60;
        const extraDrops = currentFps < 60 ? 1 : 0;
        // Latency jitter
        const ping = Math.floor(10 + Math.random() * 8);

        return {
          ...prev,
          vst: prev.vst === 0 ? Math.floor(180 + Math.random() * 120) : prev.vst,
          bitrate: `${speed} Mbps`,
          fps: currentFps,
          droppedFrames: prev.droppedFrames + extraDrops,
          latency: `Ultra-Low (${ping}ms)`,
          codec: prev.codec
        };
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Premium Toast Notification Timer
  useEffect(() => {
    if (!playerNotification) return;
    const timer = setTimeout(() => setPlayerNotification(null), 1800);
    return () => clearTimeout(timer);
  }, [playerNotification]);

  const showToast = (msg: string) => {
    setPlayerNotification(msg);
  };

  // Security / DRM Mock Warning overlay
  const [drmVerified, setDrmVerified] = useState(true);
  const [showDrmPopup, setShowDrmPopup] = useState(false);

  // Ad Block Check
  const [adBlockCounter, setAdBlockCounter] = useState(false);

  // Hover Thumbnail seek preview
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverSeekPos, setHoverSeekPos] = useState(0);

  // Branded Right Click Context Menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);



  const [isHoveringControls, setIsHoveringControls] = useState(false);

  // Auto resume
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [savedTime, setSavedTime] = useState(0);
  const savedTimeRef = useRef(0); // keep in sync for use inside event handlers
  const pendingResumeRef = useRef(false); // true when we want to auto-seek on loadedmetadata

  // Auto select quality based on network status
  useEffect(() => {
    if (sources.length <= 1) return;

    const connection = (navigator as any).connection;
    if (connection) {
      const speed = connection.effectiveType || '4g';
      const downlink = connection.downlink || 10;

      let targetQuality = '1080p';
      if (speed === '2g' || speed === 'slow-2g' || downlink < 1.5) {
        targetQuality = '360p';
      } else if (speed === '3g' || downlink < 4) {
        targetQuality = '720p';
      }

      // Find best matching source quality
      let bestIdx = 0;
      let minDiff = Infinity;

      sources.forEach((src, idx) => {
        const qualNum = parseInt(src.quality, 10);
        const targetNum = parseInt(targetQuality, 10);
        if (!isNaN(qualNum)) {
          const diff = Math.abs(qualNum - targetNum);
          if (diff < minDiff) {
            minDiff = diff;
            bestIdx = idx;
          }
        }
      });

      setSelectedSourceIdx(bestIdx);
    }
  }, [sources]);

  const selectedSource = sources[selectedSourceIdx] || null;

  // Reset CORS fallback on source change
  useEffect(() => {
    setVideoCrossOrigin('anonymous');
  }, [selectedSourceIdx]);

  // Reset resume state whenever the episode/title changes
  useEffect(() => {
    setHasSavedProgress(false);
    setSavedTime(0);
    savedTimeRef.current = 0;
    pendingResumeRef.current = false;

    // Check if there is saved progress for this title
    const progressKey = `rf_progress_${title}`;
    const saved = localStorage.getItem(progressKey);
    if (saved) {
      const parsedTime = parseFloat(saved);
      if (parsedTime > 5) {
        setHasSavedProgress(true);
        setSavedTime(parsedTime);
        savedTimeRef.current = parsedTime;
        // We will seek once the video reports loadedmetadata
        pendingResumeRef.current = true;
      }
    }
  }, [title]);

  // Initialize playback and Hls
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedSource) return;

    const tStart = performance.now();

    // Seek to saved progress once metadata is available
    const onLoadedMetadata = () => {
      if (pendingResumeRef.current && savedTimeRef.current > 5) {
        // Only seek if saved time is meaningfully before the end
        if (video.duration && savedTimeRef.current < video.duration - 10) {
          video.currentTime = savedTimeRef.current;
        }
        // Don't auto-dismiss the banner — let user confirm or start over
      }
      setMetrics(prev => ({
        ...prev,
        vst: Math.round(performance.now() - tStart)
      }));
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);

    if (Hls.isSupported() && selectedSource.stream_url.endsWith('.m3u8')) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        maxBufferSize: 30 * 1000 * 1000, // Developer control over local buffer limit (30MB)
        enableWorker: true,
        lowLatencyMode: true
      });

      hlsRef.current = hls;
      hls.loadSource(selectedSource.stream_url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => console.log('Autoplay triggered:', err));
        setMetrics(prev => ({
          ...prev,
          vst: Math.round(performance.now() - tStart),
          bitrate: `${(hls.levels[hls.currentLevel]?.bitrate / 1000000 || 2.4).toFixed(1)} Mbps`
        }));
      });
    } else {
      video.src = selectedSource.stream_url || selectedSource.download_url;
      video.load();
      video.play().catch((err) => console.log('Autoplay triggered:', err));
    }

    const onError = (e: Event) => {
      console.warn('Video load/CORS error occurred. Retrying without CORS settings...', e);
      if (videoCrossOrigin === 'anonymous') {
        setVideoCrossOrigin(undefined);
      }
    };
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('error', onError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [selectedSourceIdx, sources, videoCrossOrigin]);

  // Load subtitles from network
  useEffect(() => {
    // 999 is custom uploaded subtitles
    if (selectedSubtitleIdx === 999) {
      setSubtitleError(null);
      setSubtitleLoading(false);
      return;
    }

    if (selectedSubtitleIdx === -1 || !subtitles || subtitles.length === 0) {
      setSubtitleCues([]);
      setCurrentSubtitleText('');
      return;
    }

    const subItem = subtitles[selectedSubtitleIdx];
    if (!subItem || !subItem.url) {
      setSubtitleCues([]);
      setCurrentSubtitleText('');
      return;
    }

    setSubtitleLoading(true);
    setSubtitleError(null);
    setSubtitleCues([]);
    setCurrentSubtitleText('');

    fetch(subItem.url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch subtitle file');
        return res.text();
      })
      .then((text) => {
        const parsed = parseSubtitles(text);
        setSubtitleCues(parsed);
        setSubtitleLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching subtitles:', err);
        setSubtitleError('Failed to load subtitles (CORS/Network)');
        setSubtitleLoading(false);
      });
  }, [selectedSubtitleIdx, subtitles]);

  // Sync active subtitle text
  useEffect(() => {
    if (subtitleCues.length === 0 || selectedSubtitleIdx === -1) {
      setCurrentSubtitleText('');
      return;
    }

    const adjustedTime = currentTime + subDelay;
    const activeCue = subtitleCues.find(
      (cue) => adjustedTime >= cue.start && adjustedTime <= cue.end
    );

    if (activeCue) {
      setCurrentSubtitleText(activeCue.text);
    } else {
      setCurrentSubtitleText('');
    }
  }, [currentTime, subtitleCues, subDelay, selectedSubtitleIdx]);

  const handleLocalSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        try {
          const parsed = parseSubtitles(text);
          if (parsed.length === 0) {
            alert('Could not find any subtitle cues. Make sure the file is valid SRT or WebVTT.');
            return;
          }
          setSubtitleCues(parsed);
          setSelectedSubtitleIdx(999); // local custom upload
          setShowSettings(false);
        } catch (err) {
          alert('Error parsing subtitle file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const takeScreenshot = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || video.clientWidth || 1920;
      canvas.height = video.videoHeight || video.clientHeight || 1080;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}_Scene_${Math.round(currentTime)}s.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to take screenshot (likely CORS issue):', err);
      alert('Unable to capture screenshot due to stream security (CORS) restrictions.');
    }
  };

  const getVideoFilterStyle = () => {
    let baseFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    switch (cinematicFilter) {
      case 'cinematic':
        baseFilter += ' contrast(1.1) saturate(1.15) brightness(0.95)';
        break;
      case 'vibrant':
        baseFilter += ' saturate(1.4) contrast(1.05)';
        break;
      case 'warm':
        baseFilter += ' sepia(0.15) hue-rotate(-10deg) saturate(1.1)';
        break;
      case 'cool':
        baseFilter += ' hue-rotate(10deg) saturate(1.05) brightness(1.02)';
        break;
      case 'noir':
        baseFilter += ' grayscale(1) contrast(1.2)';
        break;
      default:
        break;
    }
    return baseFilter;
  };

  // Reset auto skip locks when source changes
  useEffect(() => {
    hasSkippedIntroRef.current = false;
    hasSkippedOutroRef.current = false;
  }, [selectedSourceIdx]);

  // Ambient Cinematic Lighting effect (Canvas rendering)
  useEffect(() => {
    if (!ambientGlow || !videoRef.current || !ambientCanvasRef.current) return;
    const video = videoRef.current;
    const canvas = ambientCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const renderAmbient = () => {
      if (video.paused || video.ended) {
        animId = requestAnimationFrame(renderAmbient);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      animId = requestAnimationFrame(renderAmbient);
    };

    renderAmbient();
    return () => cancelAnimationFrame(animId);
  }, [ambientGlow]);

  // Auto Hide Controls
  useEffect(() => {
    if (!showControls || isLocked || !isPlaying || isHoveringControls) return;

    const timer = setTimeout(() => {
      setShowControls(false);
      setShowSettings(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [showControls, isPlaying, isLocked, isHoveringControls]);

  // Video Events Listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      // Save progress dynamically
      if (video.currentTime > 5) {
        localStorage.setItem(`rf_progress_${title}`, String(video.currentTime));
        if (video.duration) {
          localStorage.setItem(`rf_progress_${title}_duration`, String(video.duration));
        }
        if (subjectId) {
          useProgressStore.getState().saveProgress(
            String(subjectId),
            season || 1,
            episode || 1,
            video.currentTime,
            video.duration || 0
          );
        }
      }

      // Check Skip Intro trigger (e.g. 5s to 95s)
      if (video.currentTime >= 5 && video.currentTime <= 95) {
        setShowIntroSkip(true);
        if (autoSkipIntro && !hasSkippedIntroRef.current) {
          hasSkippedIntroRef.current = true;
          video.currentTime = 95;
        }
      } else {
        setShowIntroSkip(false);
        if (video.currentTime < 5) {
          hasSkippedIntroRef.current = false;
        }
      }

      // Next Episode Outro Trigger (90s before end)
      if (video.duration && video.currentTime >= video.duration - 90) {
        setShowOutroSkip(true);

        // Show Binge Autoplay countdown 20s before end
        if (hasNextEpisode && video.currentTime >= video.duration - 20) {
          setShowNextEpCountdown(true);
          if (autoSkipOutro && !hasSkippedOutroRef.current) {
            hasSkippedOutroRef.current = true;
            onNextEpisode?.();
          }
        } else {
          setShowNextEpCountdown(false);
        }
      } else {
        setShowOutroSkip(false);
        setShowNextEpCountdown(false);
        if (video.duration && video.currentTime < video.duration - 90) {
          hasSkippedOutroRef.current = false;
        }
      }
    };
    const onDurationChange = () => setDuration(video.duration);
    const onProgress = () => {
      const ranges: [number, number][] = [];
      for (let i = 0; i < video.buffered.length; i++) {
        ranges.push([video.buffered.start(i), video.buffered.end(i)]);
      }
      setBuffered(ranges);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('progress', onProgress);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('progress', onProgress);
    };
  }, [title, hasNextEpisode, autoSkipIntro, autoSkipOutro]);

  // Handle Controls toggle
  const togglePlay = () => {
    if (isLocked) return;
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  // Skip 10s
  const skip = (seconds: number) => {
    if (isLocked || !videoRef.current) return;
    videoRef.current.currentTime += seconds;
  };

  // Handle seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked || !videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || isLocked) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          showToast(!isPlaying ? "Playing" : "Paused");
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          showToast("Seek Forward +10s");
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          showToast("Seek Backward -10s");
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => {
            const nextVol = Math.min(prev + 0.1, 1);
            showToast(`Volume: ${Math.round(nextVol * 100)}%`);
            return nextVol;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => {
            const nextVol = Math.max(prev - 0.1, 0);
            showToast(`Volume: ${Math.round(nextVol * 100)}%`);
            return nextVol;
          });
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          showToast(document.fullscreenElement ? "Fullscreen Disabled" : "Fullscreen Activated");
          break;
        case 'KeyM':
          e.preventDefault();
          setIsMuted(prev => {
            showToast(!prev ? "Muted" : "Unmuted");
            return !prev;
          });
          break;
        case 'KeyX':
          e.preventDefault();
          setShowXRay(prev => {
            showToast(!prev ? "X-Ray Overlay Enabled" : "X-Ray Overlay Disabled");
            return !prev;
          });
          break;
        case 'KeyS':
          e.preventDefault();
          takeScreenshot();
          showToast("Screenshot Captured!");
          break;
        case 'KeyJ':
          e.preventDefault();
          setSubDelay(prev => {
            const nextDelay = prev + 0.5;
            showToast(`Sub Delay: +${nextDelay.toFixed(1)}s`);
            return nextDelay;
          });
          break;
        case 'KeyH':
          e.preventDefault();
          setSubDelay(prev => {
            const nextDelay = prev - 0.5;
            showToast(`Sub Delay: ${nextDelay.toFixed(1)}s`);
            return nextDelay;
          });
          break;
        case 'BracketRight':
          e.preventDefault();
          setPlaybackRate(prev => {
            const nextRate = Math.min(prev + 0.25, 2);
            showToast(`Speed: ${nextRate.toFixed(2)}x`);
            return nextRate;
          });
          break;
        case 'BracketLeft':
          e.preventDefault();
          setPlaybackRate(prev => {
            const nextRate = Math.max(prev - 0.25, 0.5);
            showToast(`Speed: ${nextRate.toFixed(2)}x`);
            return nextRate;
          });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, isLocked, showXRay]);

  // Sync Volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Synchronize playbackRate property directly on HTML5 video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Volume Scroll Control (Solving passive listener issue)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWheelEvent = (e: WheelEvent) => {
      if (isLocked) return;
      e.preventDefault();
      setVolume(prev => {
        const step = e.deltaY < 0 ? 0.05 : -0.05;
        return Math.min(Math.max(prev + step, 0), 1);
      });
    };

    video.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      video.removeEventListener('wheel', handleWheelEvent);
    };
  }, [isLocked]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // PIP floating mode
  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video || document.pictureInPictureElement) {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      return;
    }
    try {
      await video.requestPictureInPicture();
    } catch (err) {
      console.error(err);
    }
  };

  // Aspect ratio class selection
  const getAspectClass = () => {
    switch (aspectRatio) {
      case '16:9': return 'aspect-video object-contain';
      case '4:3': return 'aspect-[4/3] object-contain';
      case 'stretch': return 'w-full h-full object-fill';
      case 'zoom': return 'w-full h-full object-cover scale-110';
      default: return 'w-full h-full object-contain';
    }
  };

  // Next episode countdown logic
  useEffect(() => {
    if (!showNextEpCountdown) return;
    const timer = setInterval(() => {
      setNextEpCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onNextEpisode?.();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showNextEpCountdown]);

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
      onClick={() => {
        setContextMenu(null);
        setShowControls(true);
      }}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onTouchStart={() => setShowControls(true)}
      className="relative w-full h-[65vh] md:h-[75vh] bg-black rounded-3xl overflow-hidden border border-white/[0.08] flex items-center justify-center group/player"
    >
      {/* ============ CINEMATIC AMBIENT LIGHTING BACKGROUND ============ */}
      {ambientGlow && (
        <canvas
          ref={ambientCanvasRef}
          width={16}
          height={9}
          className="absolute inset-0 w-full h-full opacity-50 blur-[80px] pointer-events-none scale-125 z-0"
        />
      )}

      {/* ============ PRIMARY VIDEO PLAYER ============ */}
      <video
        ref={videoRef}
        autoPlay
        onClick={togglePlay}
        style={{ filter: getVideoFilterStyle() }}
        crossOrigin={videoCrossOrigin}
        className={cn("w-full h-full z-10 transition-all select-none pointer-events-auto", getAspectClass())}
        playsInline
      />

      {/* Branded Right Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y - 120, left: contextMenu.x - 200 }}
          className="absolute z-[100] w-48 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-2xl"
        >
          <div className="px-3 py-1.5 text-[10px] font-black tracking-wider text-[var(--rf-red)] uppercase border-b border-white/10 mb-1">
            RUNFlix Player v3.2
          </div>
          <button
            onClick={() => setAmbientGlow(!ambientGlow)}
            className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 rounded-lg text-white transition-colors"
          >
            Toggle Ambient Lighting
          </button>
          <button
            onClick={() => setShowTelemetryOverlay(true)}
            className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 rounded-lg text-white transition-colors"
          >
            Show Telemetry (QoS)
          </button>
          <div className="border-t border-white/10 my-1"></div>
          <a
            href="https://movieapi.giftedtech.co.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-left px-3 py-2 text-xs hover:bg-white/10 rounded-lg text-white/50 transition-colors"
          >
            API Engine Portal
          </a>
        </div>
      )}

      {/* Lockscreen Cover Overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/40 z-30 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-full bg-black/80 backdrop-blur-xl border border-white/10 pointer-events-auto cursor-pointer"
            onClick={() => setIsLocked(false)}
          >
            <Lock className="text-white" size={24} />
          </motion.div>
        </div>
      )}

      {/* ============ ON-SCREEN DISPLAY (OSD) TOAST NOTIFICATION ============ */}
      {playerNotification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-black/85 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-2xl animate-[bounce_0.8s_infinite] select-none pointer-events-none">
          <Sparkles size={12} className="text-[var(--rf-red)] animate-pulse" />
          <span>{playerNotification}</span>
        </div>
      )}

      {/* ============ WATERMARK OVERLAY ============ */}
      <div className="absolute top-8 left-8 z-20 pointer-events-none opacity-20 select-none text-[10px] font-mono text-white tracking-widest uppercase">
        RUNFlix Client // Anonymous Stream
      </div>

      {/* ============ RESUME AUTO-PLAY SPOT PROMPT ============ */}
      {hasSavedProgress && (
        <div className="absolute bottom-20 left-6 z-40 bg-black/90 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3.5 text-xs font-bold text-white shadow-2xl select-none animate-[fadeIn_0.3s_ease]">
          <RotateCcw className="text-[var(--rf-red)] animate-pulse" size={14} />
          <span className="text-[var(--rf-text-muted)] font-medium">
            Resume from <span className="text-white font-bold">{Math.floor(savedTime / 60)}m {Math.round(savedTime % 60)}s</span>?
          </span>
          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <button
              onClick={() => {
                pendingResumeRef.current = false;
                if (videoRef.current) videoRef.current.currentTime = savedTime;
                setHasSavedProgress(false);
              }}
              className="bg-[var(--rf-red)] hover:bg-[var(--rf-red)]/80 hover:scale-105 active:scale-95 text-white px-3 py-1.5 rounded-xl transition-all font-semibold"
            >
              Resume
            </button>
            <button
              onClick={() => {
                pendingResumeRef.current = false;
                if (videoRef.current) videoRef.current.currentTime = 0;
                setHasSavedProgress(false);
              }}
              className="bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 text-white/80 hover:text-white px-3 py-1.5 rounded-xl transition-all font-semibold"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* ============ TELEMETRY/QOS OVERLAY ============ */}
      {showTelemetryOverlay && (
        <div className="absolute top-16 right-4 z-40 bg-black/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl w-64 shadow-2xl">
          <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-black text-white flex items-center gap-1.5 animate-pulse">
              <Sliders size={12} className="text-[var(--rf-red)]" /> Telemetry Monitor
            </span>
            <button
              onClick={() => setShowTelemetryOverlay(false)}
              className="text-[10px] text-[var(--rf-text-muted)] hover:text-white"
            >
              Close
            </button>
          </div>

          {/* Real-time Network Pulse visualization */}
          <div className="flex items-end justify-between h-8 bg-white/[0.02] border border-white/5 rounded-lg px-2.5 py-1 mb-3">
            <span className="text-[9px] font-black uppercase text-white/40 mb-1 font-mono">QoS Engine</span>
            <div className="flex gap-[2px] items-end h-full">
              <span className="w-[3px] bg-red-500/20 rounded-full h-2"></span>
              <span className="w-[3px] bg-red-500/40 rounded-full h-4"></span>
              <span className="w-[3px] bg-red-500/60 rounded-full h-3"></span>
              <span className="w-[3px] bg-red-500/70 rounded-full h-5"></span>
              <span className="w-[3px] bg-red-500/80 rounded-full h-[18px]"></span>
              <span className="w-[3px] bg-[var(--rf-red)] rounded-full h-6 animate-[pulse_0.4s_infinite_alternate]"></span>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] font-mono text-[var(--rf-text-muted)]">
            <div className="flex justify-between"><span>Startup Time (VST)</span><span className="text-white">{metrics.vst} ms</span></div>
            <div className="flex justify-between"><span>Active Bitrate</span><span className="text-white font-bold text-[var(--rf-red)]">{metrics.bitrate}</span></div>
            <div className="flex justify-between"><span>Active Resolution</span><span className="text-white">{videoRef.current ? `${videoRef.current.videoWidth || 1920}x${videoRef.current.videoHeight || 1080}` : '1920x1080'}</span></div>
            <div className="flex justify-between"><span>Buffer Load</span><span className="text-white">{videoRef.current?.buffered.length ? `${((videoRef.current.buffered.end(videoRef.current.buffered.length - 1) / (videoRef.current.duration || 1)) * 100).toFixed(0)}%` : '0%'}</span></div>
            <div className="flex justify-between"><span>Engine Codec</span><span className="text-white">{metrics.codec}</span></div>
            <div className="flex justify-between"><span>Latency Buffer</span><span className="text-white">{metrics.latency}</span></div>
            <div className="flex justify-between"><span>Dropped Frames</span><span className="text-white font-bold text-yellow-500">{metrics.droppedFrames}</span></div>
            <div className="flex justify-between"><span>Active FPS</span><span className="text-white">{metrics.fps} FPS</span></div>
          </div>
        </div>
      )}

      {/* ============ AD BLOCK countermeasures MOCK ============ */}
      {adBlockCounter && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-8 text-center">
          <Shield className="text-[var(--rf-red)] mb-4 animate-bounce" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">Adblocker Detected</h3>
          <p className="text-sm text-[var(--rf-text-muted)] max-w-md mb-6">
            Please disable your browser's Adblock extension to unlock streaming now. Our server network relies on sponsored cookies to deliver free streams.
          </p>
          <button
            onClick={() => setAdBlockCounter(false)}
            className="btn-primary px-6 py-3"
          >
            I've Disabled It
          </button>
        </div>
      )}

      {/* ============ SKIP INTRO OVERLAY CARD ============ */}
      {showIntroSkip && (
        <button
          onClick={() => {
            if (videoRef.current) videoRef.current.currentTime = 95;
            setShowIntroSkip(false);
          }}
          className="absolute bottom-20 right-6 z-40 bg-black/90 backdrop-blur-xl border border-white/10 hover:border-[var(--rf-red)]/50 px-5 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold text-white transition-all shadow-2xl active:scale-95"
        >
          <SkipForward size={14} /> Skip Intro / Recap
        </button>
      )}

      {/* ============ SKIP OUTRO OVERLAY CARD ============ */}
      {showOutroSkip && !showNextEpCountdown && (
        <button
          onClick={() => {
            if (hasNextEpisode) {
              onNextEpisode?.();
            } else if (videoRef.current) {
              videoRef.current.currentTime = videoRef.current.duration - 5;
            }
          }}
          className="absolute bottom-20 right-6 z-40 bg-black/90 backdrop-blur-xl border border-white/10 hover:border-[var(--rf-red)]/50 px-5 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold text-white transition-all shadow-2xl active:scale-95"
        >
          <SkipForward size={14} /> {hasNextEpisode ? 'Skip Outro / Play Next' : 'Skip Outro / Credits'}
        </button>
      )}

      {/* ============ NEXT EPISODE COUNTDOWN OVERLAY ============ */}
      {showNextEpCountdown && (
        <div className="absolute bottom-24 right-6 z-40 bg-black/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl w-64 shadow-2xl flex flex-col">
          <span className="text-[10px] font-black text-[var(--rf-red)] uppercase tracking-wider mb-1">
            Binge Autoplay
          </span>
          <h6 className="text-xs font-bold text-white line-clamp-1 mb-3">Up Next in {nextEpCountdown}s...</h6>
          <div className="flex gap-2">
            <button
              onClick={() => onNextEpisode?.()}
              className="btn-primary text-[10px] flex-1 py-2"
            >
              Play Now
            </button>
            <button
              onClick={() => setShowNextEpCountdown(false)}
              className="btn-glass text-[10px] flex-1 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}



      {/* ============ AUDIO DESCRIPTION / SUBTITLES RENDERER ============ */}
      {selectedSubtitleIdx >= 0 && (
        <div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 text-center w-[90%] max-w-2xl select-none pointer-events-none transition-all"
        >
          {subtitleLoading && (
            <div className="bg-black/60 backdrop-blur-sm text-white/70 px-4 py-1.5 rounded-lg text-xs inline-block">
              Loading subtitles...
            </div>
          )}
          {subtitleError && (
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/40 text-red-200 px-4 py-1.5 rounded-lg text-xs inline-block">
              {subtitleError}
            </div>
          )}
          {currentSubtitleText && (
            <div
              style={{
                fontSize: `${subTextSize}%`,
                color: subColor === 'yellow' ? '#fde047' : subColor === 'cyan' ? '#22d3ee' : subColor === 'green' ? '#4ade80' : '#ffffff',
                textShadow: subBackground === 'shadow' ? '2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000' : 'none',
              }}
              className={cn(
                "px-5 py-2.5 rounded-xl transition-all font-sans font-bold tracking-wide leading-relaxed inline-block whitespace-pre-line shadow-2xl",
                subBackground === 'solid' ? 'bg-black text-yellow-300' :
                  subBackground === 'shadow' ? 'text-white' :
                    'bg-black/75 backdrop-blur-md border border-white/5 text-white'
              )}
            >
              {currentSubtitleText}
            </div>
          )}
        </div>
      )}

      {/* ============ CUSTOM VIEW CONTROLS SKIN ============ */}
      <div
        className={cn(
          "absolute inset-0 z-20 flex flex-col justify-between transition-all duration-300 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/60",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Top Header Controls */}
        <div
          onMouseEnter={() => setIsHoveringControls(true)}
          onMouseLeave={() => setIsHoveringControls(false)}
          className="p-4 flex items-center justify-between pointer-events-auto"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white line-clamp-1">{title}</span>
            {selectedSource && (
              <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded text-white/70 uppercase">
                {selectedSource.quality}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* X-Ray Button Toggle */}
            {stars.length > 0 && (
              <button
                onClick={() => setShowXRay(!showXRay)}
                className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1",
                  showXRay
                    ? "bg-[var(--rf-red)] border-none text-white shadow-lg shadow-[var(--rf-red)]/20"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                )}
                title="Toggle Amazon X-Ray Overlay"
              >
                <Sparkles size={12} />
                <span className="hidden sm:inline">X-Ray</span>
              </button>
            )}

            {/* Picture In Picture Floating Player */}
            <button
              onClick={togglePictureInPicture}
              className="text-white/60 hover:text-white transition-colors w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
              title="Picture In Picture Mini Window"
            >
              <Monitor size={16} />
            </button>

            {/* Settings Toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSettings(!showSettings);
                  setActiveMenu('main');
                }}
                className="text-white/60 hover:text-white transition-colors relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
              >
                <Settings size={16} />
              </button>

              {/* Glassmorphic Settings popout */}
              {showSettings && (
                <div className="absolute top-10 right-0 z-50 w-64 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-1 max-h-[85vh] overflow-y-auto">
                  {activeMenu === 'main' && (
                    <>
                      <button
                        onClick={() => setActiveMenu('quality')}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Monitor size={14} /> Quality</span>
                        <span className="text-[10px] text-[var(--rf-text-muted)] uppercase">Auto ({selectedSource?.quality})</span>
                      </button>
                      <button
                        onClick={() => setActiveMenu('speed')}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Flame size={14} /> Speed</span>
                        <span className="text-[10px] text-[var(--rf-text-muted)]">{playbackRate}x</span>
                      </button>
                      <button
                        onClick={() => setActiveMenu('subtitles')}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Captions size={14} /> Subtitles</span>
                        <span className="text-[10px] text-[var(--rf-text-muted)]">
                          {selectedSubtitleIdx === -1 ? 'Off' : selectedSubtitleIdx === 999 ? 'Custom' : (subtitles[selectedSubtitleIdx]?.lanName || subtitles[selectedSubtitleIdx]?.language || `Track ${selectedSubtitleIdx + 1}`)}
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveMenu('adjustments')}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Sparkles size={14} /> Adjustments</span>
                        <span className="text-[10px] text-[var(--rf-text-muted)] capitalize">{cinematicFilter === 'normal' ? 'Normal' : cinematicFilter}</span>
                      </button>
                      <button
                        onClick={() => setActiveMenu('autoskip')}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Tv size={14} /> Auto Skip</span>
                        <span className="text-[10px] text-[var(--rf-text-muted)]">
                          {autoSkipIntro || autoSkipOutro ? 'Active' : 'Off'}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setAspectRatio(prev => {
                            const list: typeof aspectRatio[] = ['original', '16:9', '4:3', 'stretch', 'zoom'];
                            const idx = (list.indexOf(prev) + 1) % list.length;
                            return list[idx];
                          });
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Sliders size={14} /> Aspect Ratio</span>
                        <span className="text-[10px] text-[var(--rf-text-muted)] capitalize">{aspectRatio}</span>
                      </button>

                      <button
                        onClick={() => {
                          setAmbientGlow(prev => !prev);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Flame size={14} /> Ambient Lighting</span>
                        <span className="text-[10px] text-[var(--rf-text-muted)]">{ambientGlow ? 'ON' : 'OFF'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowTelemetryOverlay(prev => !prev);
                          setShowSettings(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Info size={14} /> Telemetry Monitor</span>
                        <span className="text-[10px] text-[var(--rf-text-muted)]">{showTelemetryOverlay ? 'Active' : 'Show'}</span>
                      </button>

                      <button
                        onClick={() => {
                          takeScreenshot();
                          setShowSettings(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Camera size={14} /> Screen Capture</span>
                        <span className="text-[10px] text-[var(--rf-text-muted)]">Snap</span>
                      </button>

                      <button
                        onClick={() => {
                          setAdBlockCounter(true);
                          setShowSettings(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Shield size={14} /> Security Protection</span>
                        <span className="text-[10px] text-green-400 font-bold">SECURE</span>
                      </button>
                    </>
                  )}

                  {activeMenu === 'quality' && (
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      <button
                        onClick={() => setActiveMenu('main')}
                        className="text-left px-3 py-1.5 text-[10px] font-bold text-[var(--rf-red)] uppercase border-b border-white/5 mb-1"
                      >
                        ← Back
                      </button>
                      {sources.map((src, i) => (
                        <button
                          key={src.id || i}
                          onClick={() => {
                            setSelectedSourceIdx(i);
                            setShowSettings(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors",
                            selectedSourceIdx === i ? "bg-[var(--rf-red)] text-white" : "text-white/70 hover:bg-white/10"
                          )}
                        >
                          {src.quality} ({src.size})
                        </button>
                      ))}
                    </div>
                  )}

                  {activeMenu === 'speed' && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setActiveMenu('main')}
                        className="text-left px-3 py-1.5 text-[10px] font-bold text-[var(--rf-red)] uppercase border-b border-white/5 mb-1"
                      >
                        ← Back
                      </button>
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3].map(rate => (
                        <button
                          key={rate}
                          onClick={() => {
                            setPlaybackRate(rate);
                            setShowSettings(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors",
                            playbackRate === rate ? "bg-[var(--rf-red)] text-white" : "text-white/70 hover:bg-white/10"
                          )}
                        >
                          {rate === 1 ? 'Normal' : `${rate}x`}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeMenu === 'subtitles' && (
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      <button
                        onClick={() => setActiveMenu('main')}
                        className="text-left px-3 py-1.5 text-[10px] font-bold text-[var(--rf-red)] uppercase border-b border-white/5 mb-1"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSubtitleIdx(-1);
                          setShowSettings(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors",
                          selectedSubtitleIdx === -1 ? "bg-[var(--rf-red)] text-white" : "text-white/70 hover:bg-white/10"
                        )}
                      >
                        Off (None)
                      </button>
                      {subtitles.map((sub, i) => (
                        <button
                          key={sub.id || i}
                          onClick={() => {
                            setSelectedSubtitleIdx(i);
                            setShowSettings(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors",
                            selectedSubtitleIdx === i ? "bg-[var(--rf-red)] text-white" : "text-white/70 hover:bg-white/10"
                          )}
                        >
                          {sub.lanName || sub.language || `Track ${i + 1}`}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeMenu === 'adjustments' && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setActiveMenu('main')}
                        className="text-left px-3 py-1.5 text-[10px] font-bold text-[var(--rf-red)] uppercase border-b border-white/5 mb-1"
                      >
                        ← Back
                      </button>
                      {['normal', 'cinematic', 'warm', 'noir', 'vibrant'].map(filter => (
                        <button
                          key={filter}
                          onClick={() => {
                            setCinematicFilter(filter as any);
                            setShowSettings(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors capitalize",
                            cinematicFilter === filter ? "bg-[var(--rf-red)] text-white" : "text-white/70 hover:bg-white/10"
                          )}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeMenu === 'autoskip' && (
                    <div className="flex flex-col gap-3 p-1">
                      <button
                        onClick={() => setActiveMenu('main')}
                        className="text-left py-1 text-[10px] font-bold text-[var(--rf-red)] uppercase border-b border-white/5"
                      >
                        ← Back
                      </button>

                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Skip Intro Section</span>
                          <button
                            onClick={() => setAutoSkipIntro(!autoSkipIntro)}
                            className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded border transition-all",
                              autoSkipIntro
                                ? "bg-green-500/25 border-green-500/50 text-green-400"
                                : "bg-white/5 border-white/10 text-white/40"
                            )}
                          >
                            {autoSkipIntro ? 'ENABLED' : 'DISABLED'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-2">
                          <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Skip Outro/Credits</span>
                          <button
                            onClick={() => setAutoSkipOutro(!autoSkipOutro)}
                            className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded border transition-all",
                              autoSkipOutro
                                ? "bg-green-500/25 border-green-500/50 text-green-400"
                                : "bg-white/5 border-white/10 text-white/40"
                            )}
                          >
                            {autoSkipOutro ? 'ENABLED' : 'DISABLED'}
                          </button>
                        </div>

                        <p className="text-[10px] text-[var(--rf-text-muted)] leading-relaxed border-t border-white/5 pt-2 mt-1">
                          Bridges the gap during binge sessions. Intro sections are jumped through instantly, and the next episode will start automatically as credits begin rolling.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center play buttons overlay */}
        <div
          onMouseEnter={() => setIsHoveringControls(true)}
          onMouseLeave={() => setIsHoveringControls(false)}
          className="flex items-center justify-center gap-6 pointer-events-auto"
        >
          <button
            onClick={() => skip(-10)}
            className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/20 flex items-center justify-center text-white active:scale-95 transition-all"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-[var(--rf-red)] hover:bg-[var(--rf-red-deep)] flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
          >
            {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current ml-1" />}
          </button>
          <button
            onClick={() => skip(10)}
            className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/20 flex items-center justify-center text-white active:scale-95 transition-all"
          >
            <SkipForward size={20} />
          </button>
        </div>

        {/* Bottom controls panel */}
        <div
          onMouseEnter={() => setIsHoveringControls(true)}
          onMouseLeave={() => setIsHoveringControls(false)}
          className="p-4 flex flex-col gap-3 pointer-events-auto"
        >
          {/* Custom seekbar progress timeline */}
          <div className="flex items-center gap-3 w-full">
            <span className="text-xs text-[var(--rf-text-muted)] select-none">
              {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60) < 10 ? '0' : '') + Math.floor(currentTime % 60)}
            </span>
            <div className="relative flex-1 group/timeline flex items-center h-4 cursor-pointer">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full accent-[var(--rf-red)] h-1 rounded bg-white/10 cursor-pointer appearance-none outline-none group-hover/timeline:h-1.5 transition-all"
              />
            </div>
            <span className="text-xs text-[var(--rf-text-muted)] select-none">
              {Math.floor(duration / 60)}:{(Math.floor(duration % 60) < 10 ? '0' : '') + Math.floor(duration % 60)}
            </span>
          </div>

          {/* Controls Bar Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Previous Episode */}
              {hasPrevEpisode && onPrevEpisode && (
                <button
                  onClick={onPrevEpisode}
                  className="text-white/60 hover:text-white transition-colors flex items-center justify-center"
                  title="Previous Episode"
                >
                  <SkipBack size={16} />
                </button>
              )}

              {/* Play Pause */}
              <button onClick={togglePlay} className="text-white/80 hover:text-white transition-colors">
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              {/* Next Episode */}
              {hasNextEpisode && onNextEpisode && (
                <button
                  onClick={onNextEpisode}
                  className="text-white/60 hover:text-white transition-colors flex items-center justify-center"
                  title="Next Episode"
                >
                  <SkipForward size={16} />
                </button>
              )}

              {/* Volume Controls */}
              <div className="flex items-center gap-1.5 group/volume">
                <button onClick={() => setIsMuted(!isMuted)} className="text-white/80 hover:text-white transition-colors">
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-0 group-hover/volume:w-16 h-1 rounded bg-white/20 cursor-pointer accent-white transition-all appearance-none outline-none"
                />
              </div>
            </div>

            {/* Right Buttons settings */}
            <div className="flex items-center gap-3">


              {/* Fullscreen control */}
              <button
                onClick={toggleFullscreen}
                className="text-white/80 hover:text-white transition-colors"
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>

              {/* Locked Player Interface control */}
              <button
                onClick={() => setIsLocked(true)}
                className="text-white/80 hover:text-white transition-colors"
                title="Lock Controls UI"
              >
                <Unlock size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
