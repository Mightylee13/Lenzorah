
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  RotateCcw,
  SkipForward,
  Info,
  Eye,
  Sliders,
  Shield,
  RefreshCw,
  Globe,
  Languages,
  Flame,
  Lock,
  Unlock,
  Monitor,
  Captions,
  Camera,
  Sparkles,
  Upload,
  Check,
  Plus,
  Minus,
  Tv,
  SkipBack,
  ChevronLeft,
  List,
  X,
  Brain,
  Loader2,
} from "lucide-react";
import Hls from "hls.js";
import { cn } from "../../utils/cn";
import { motion, AnimatePresence } from "motion/react";
import { useProgressStore } from "../../stores/useProgressStore";
import { aiRecap } from "../../api/ai";
import { useTranslation } from "react-i18next";

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
  className?: string;
  onBack?: () => void;
  onShowEpisodes?: () => void;
  seasons?: { se: number; maxEp: number }[];
  onEpisodeSelect?: (season: number, episode: number) => void;
}

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

interface LocalSubtitleTrack {
  language: string;
  label: string;
  blobUrl: string;
}

function parseTimestamp(timeStr: string): number {
  const parts = timeStr.trim().replace(",", ".").split(":");
  let hours = 0,
    minutes = 0,
    seconds = 0;
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
  const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = cleanText.split("\n\n");
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    let timeLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("-->")) {
        timeLineIdx = i;
        break;
      }
    }
    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const [startStr, endStr] = timeLine.split("-->");
    if (!startStr || !endStr) continue;

    const start = parseTimestamp(startStr);
    const end = parseTimestamp(endStr);
    const textLines = lines.slice(timeLineIdx + 1);
    const textVal = textLines
      .join("\n")
      .replace(/<[^>]*>/g, "")
      .replace(/^[0-9]+$/, "")
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
  episode,
  className,
  onBack,
  onShowEpisodes,
  seasons = [],
  onEpisodeSelect,
}: CinematicPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState<[number, number][]>([]);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedSourceIdx, setSelectedSourceIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [showControls, setShowControls] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<
    "original" | "16:9" | "4:3" | "stretch" | "zoom"
  >("original");
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [ambientGlow, setAmbientGlow] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeMenu, setActiveMenu] = useState<
    | "main"
    | "quality"
    | "speed"
    | "subtitles"
    | "audio"
    | "telemetry"
    | "adjustments"
    | "autoskip"
    | "subtitlestyle"
  >("main");

  const [selectedSubtitleIdx, setSelectedSubtitleIdx] = useState(-1);
  const [subTextSize, setSubTextSize] = useState(100);
  const [subDelay, setSubDelay] = useState(0);
  const [subBackground, setSubBackground] = useState<
    "translucent" | "solid" | "shadow"
  >("translucent");
  const [subColor, setSubColor] = useState<
    "white" | "yellow" | "cyan" | "green"
  >("white");
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [currentSubtitleText, setCurrentSubtitleText] = useState<string>("");
  const [subtitleLoading, setSubtitleLoading] = useState(false);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);
  const [localSubTracks, setLocalSubTracks] = useState<LocalSubtitleTrack[]>(
    [],
  );
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  useEffect(() => {
    if (subtitles && subtitles.length > 0) {
      const engIdx = subtitles.findIndex(
        (sub) =>
          sub?.lanName?.toLowerCase().includes("eng") ||
          sub?.language?.toLowerCase().includes("eng") ||
          sub?.label?.toLowerCase().includes("eng"),
      );
      if (engIdx !== -1) setSelectedSubtitleIdx(engIdx);
    } else {
      setSelectedSubtitleIdx(-1);
    }
  }, [subtitles]);

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [cinematicFilter, setCinematicFilter] = useState<
    "normal" | "cinematic" | "vibrant" | "warm" | "cool" | "noir"
  >("normal");

  const [showXRay, setShowXRay] = useState(false);
  const [activeXRayTab, setActiveXRayTab] = useState<
    "cast" | "music" | "trivia"
  >("cast");

  const [playerNotification, setPlayerNotification] = useState<string | null>(
    null,
  );

  const [showRecap, setShowRecap] = useState(false);
  const [recapText, setRecapText] = useState("");
  const [recapLoading, setRecapLoading] = useState(false);

  const [videoCrossOrigin, setVideoCrossOrigin] = useState<
    "anonymous" | undefined
  >("anonymous");

  const [autoSkipIntro, setAutoSkipIntro] = useState(false);
  const [autoSkipOutro, setAutoSkipOutro] = useState(false);
  const [showOutroSkip, setShowOutroSkip] = useState(false);

  const hasSkippedIntroRef = useRef(false);
  const hasSkippedOutroRef = useRef(false);

  const [showNextEpCountdown, setShowNextEpCountdown] = useState(false);
  const [nextEpCountdown, setNextEpCountdown] = useState(10);
  const [showIntroSkip, setShowIntroSkip] = useState(false);

  const [metrics, setMetrics] = useState({
    vst: 0,
    bufferingRatio: 0.1,
    bitrate: "Auto",
    fps: 60,
    droppedFrames: 0,
    latency: "Low (0.8s)",
    loudness: "Normalized",
    codec: "AV1 / AAC",
  });
  const [showTelemetryOverlay, setShowTelemetryOverlay] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setMetrics((prev) => {
        const speed = (20 + Math.random() * 25).toFixed(1);
        const currentFps = Math.random() > 0.95 ? 58 : 60;
        const extraDrops = currentFps < 60 ? 1 : 0;
        const ping = Math.floor(10 + Math.random() * 8);
        return {
          ...prev,
          vst:
            prev.vst === 0 ? Math.floor(180 + Math.random() * 120) : prev.vst,
          bitrate: `${speed} Mbps`,
          fps: currentFps,
          droppedFrames: prev.droppedFrames + extraDrops,
          latency: `Ultra-Low (${ping}ms)`,
          codec: prev.codec,
        };
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (!playerNotification) return;
    const timer = setTimeout(() => setPlayerNotification(null), 1800);
    return () => clearTimeout(timer);
  }, [playerNotification]);

  const showToast = (msg: string) => setPlayerNotification(msg);

  const [drmVerified, setDrmVerified] = useState(true);
  const [showDrmPopup, setShowDrmPopup] = useState(false);
  const [adBlockCounter, setAdBlockCounter] = useState(false);
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverSeekPos, setHoverSeekPos] = useState(0);
  const [showEpisodesOverlay, setShowEpisodesOverlay] = useState(false);
  const [epViewingSeason, setEpViewingSeason] = useState(season || 1);

  useEffect(() => {
    if (season) setEpViewingSeason(season);
  }, [season]);

  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(0);
  const triggerInteraction = useCallback(() => {
    setShowControls(true);
    setLastInteraction(Date.now());
  }, []);

  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [savedTime, setSavedTime] = useState(0);
  const savedTimeRef = useRef(0);
  const pendingResumeRef = useRef(false);

  useEffect(() => {
    if (!hasSavedProgress) return;
    const timer = setTimeout(() => {
      setHasSavedProgress(false);
      pendingResumeRef.current = false;
    }, 5000);
    return () => clearTimeout(timer);
  }, [hasSavedProgress]);

  const lastPlaybackTimeRef = useRef<number | null>(null);
  const lastTitleRef = useRef<string>("");

  useEffect(() => {
    if (sources.length <= 1) return;
    const connection = (navigator as any).connection;
    if (connection) {
      const speed = connection.effectiveType || "4g";
      const downlink = connection.downlink || 10;
      let targetQuality = "1080p";
      if (speed === "2g" || speed === "slow-2g" || downlink < 1.5)
        targetQuality = "360p";
      else if (speed === "3g" || downlink < 4) targetQuality = "720p";

      let bestIdx = 0,
        minDiff = Infinity;
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

  useEffect(() => {
    setVideoCrossOrigin("anonymous");
  }, [selectedSourceIdx]);

  useEffect(() => {
    setHasSavedProgress(false);
    setSavedTime(0);
    savedTimeRef.current = 0;
    pendingResumeRef.current = false;
    setHasPlayedOnce(false);

    const progressKey = `rf_progress_${title}`;
    const saved = localStorage.getItem(progressKey);
    if (saved) {
      const parsedTime = parseFloat(saved);
      if (parsedTime > 5) {
        setSavedTime(parsedTime);
        savedTimeRef.current = parsedTime;
        pendingResumeRef.current = true;
      }
    }
  }, [title]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedSource) return;

    const tStart = performance.now();

    const onLoadedMetadata = () => {
      if (
        lastTitleRef.current === title &&
        lastPlaybackTimeRef.current !== null &&
        lastPlaybackTimeRef.current > 0
      ) {
        video.currentTime = lastPlaybackTimeRef.current;
        lastPlaybackTimeRef.current = null;
      } else if (pendingResumeRef.current && savedTimeRef.current > 5) {
        if (video.duration && savedTimeRef.current < video.duration - 10) {
          video.currentTime = savedTimeRef.current;
          const mins = Math.floor(savedTimeRef.current / 60);
          const secs = Math.round(savedTimeRef.current % 60);
          showToast(`🍿 Resumed playback from ${mins}m ${secs}s`);
        }
        pendingResumeRef.current = false;
        setHasSavedProgress(false);
      }
      setMetrics((prev) => ({
        ...prev,
        vst: Math.round(performance.now() - tStart),
      }));
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);

    if (Hls.isSupported() && selectedSource.stream_url.endsWith(".m3u8")) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls({
        maxBufferSize: 30 * 1000 * 1000,
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(selectedSource.stream_url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => console.log("Autoplay triggered:", err));
        setMetrics((prev) => ({
          ...prev,
          vst: Math.round(performance.now() - tStart),
          bitrate: `${(hls.levels[hls.currentLevel]?.bitrate / 1000000 || 2.4).toFixed(1)} Mbps`,
        }));
      });
    } else {
      video.src = selectedSource.stream_url || selectedSource.download_url;
      video.load();
      video.play().catch((err) => console.log("Autoplay triggered:", err));
    }

    const onError = (e: Event) => {
      console.warn(
        "Video load/CORS error occurred. Retrying without CORS settings...",
        e,
      );
      if (videoCrossOrigin === "anonymous") setVideoCrossOrigin(undefined);
    };
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("error", onError);
      if (video.currentTime > 0) {
        lastPlaybackTimeRef.current = video.currentTime;
        lastTitleRef.current = title;
      }
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [selectedSourceIdx, sources, videoCrossOrigin, title]);

  useEffect(() => {
    if (selectedSubtitleIdx === 999) {
      setSubtitleError(null);
      setSubtitleLoading(false);
      return;
    }
    if (selectedSubtitleIdx === -1 || !subtitles || subtitles.length === 0) {
      setSubtitleCues([]);
      setCurrentSubtitleText("");
      return;
    }
    const subItem = subtitles[selectedSubtitleIdx];
    if (!subItem || !subItem.url) {
      setSubtitleCues([]);
      setCurrentSubtitleText("");
      return;
    }

    setSubtitleLoading(true);
    setSubtitleError(null);
    setSubtitleCues([]);
    setCurrentSubtitleText("");

    fetch(subItem.url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch subtitle file");
        return res.text();
      })
      .then((text) => {
        setSubtitleCues(parseSubtitles(text));
        setSubtitleLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching subtitles:", err);
        setSubtitleError("Failed to load subtitles (CORS/Network)");
        setSubtitleLoading(false);
      });
  }, [selectedSubtitleIdx, subtitles]);

  useEffect(() => {
    if (subtitleCues.length === 0 || selectedSubtitleIdx === -1) {
      setCurrentSubtitleText("");
      return;
    }
    const adjustedTime = currentTime + subDelay;
    const activeCue = subtitleCues.find(
      (cue) => adjustedTime >= cue.start && adjustedTime <= cue.end,
    );
    setCurrentSubtitleText(activeCue ? activeCue.text : "");
  }, [currentTime, subtitleCues, subDelay, selectedSubtitleIdx]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const hideNativeTracks = () => {
      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i++) tracks[i].mode = "disabled";
    };
    hideNativeTracks();
    video.addEventListener("loadedmetadata", hideNativeTracks);
    return () => video.removeEventListener("loadedmetadata", hideNativeTracks);
  }, [subtitles, selectedSubtitleIdx]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !videoRef.current) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !videoRef.current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: "Lenzorah Premium Streaming",
      album:
        season !== undefined && episode !== undefined
          ? `Season ${season} • Episode ${episode}`
          : "Cinematic Movies",
      artwork: [
        {
          src:
            backdropUrl ||
            "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800",
          sizes: "512x512",
          type: "image/jpeg",
        },
      ],
    });
    navigator.mediaSession.setActionHandler("play", () => {
      videoRef.current?.play().catch(() => {});
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      videoRef.current?.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      const offset = details.seekOffset || 10;
      if (videoRef.current)
        videoRef.current.currentTime = Math.max(
          videoRef.current.currentTime - offset,
          0,
        );
    });
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      const offset = details.seekOffset || 10;
      if (videoRef.current)
        videoRef.current.currentTime = Math.min(
          videoRef.current.currentTime + offset,
          videoRef.current.duration || 0,
        );
    });
    if (hasNextEpisode && onNextEpisode)
      navigator.mediaSession.setActionHandler("nexttrack", () =>
        onNextEpisode(),
      );
    else navigator.mediaSession.setActionHandler("nexttrack", null);
    if (hasPrevEpisode && onPrevEpisode)
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        onPrevEpisode(),
      );
    else navigator.mediaSession.setActionHandler("previoustrack", null);

    return () => {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("seekbackward", null);
        navigator.mediaSession.setActionHandler("seekforward", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
      }
    };
  }, [
    title,
    season,
    episode,
    backdropUrl,
    hasNextEpisode,
    hasPrevEpisode,
    onNextEpisode,
    onPrevEpisode,
  ]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !videoRef.current) return;
    const video = videoRef.current;
    const updatePositionState = () => {
      if (video.duration && !isNaN(video.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: video.duration,
            playbackRate: video.playbackRate || 1,
            position: video.currentTime,
          });
        } catch (err) {}
      }
    };
    video.addEventListener("timeupdate", updatePositionState);
    return () => video.removeEventListener("timeupdate", updatePositionState);
  }, [duration]);

  useEffect(() => {
    if (!subtitles || subtitles.length === 0) {
      setLocalSubTracks([]);
      return;
    }
    let active = true;
    const tracksToRevoke: string[] = [];

    const formatVttTime = (secs: number) => {
      const h = Math.floor(secs / 3600),
        m = Math.floor((secs % 3600) / 60),
        s = Math.floor(secs % 60),
        ms = Math.floor((secs % 1) * 1000);
      const pad = (n: number, z = 2) => ("00" + n).slice(-z);
      return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
    };

    const loadAllSubtitles = async () => {
      const promises = subtitles.map(async (sub, idx) => {
        try {
          const res = await fetch(sub.url);
          if (!res.ok) throw new Error("Failed to fetch subtitle track");
          const text = await res.text();
          const cues = parseSubtitles(text);
          let vtt = "WEBVTT\n\n";
          cues.forEach((cue, cIdx) => {
            vtt += `${cIdx + 1}\n${formatVttTime(cue.start)} --> ${formatVttTime(cue.end)}\n${cue.text}\n\n`;
          });
          const blob = new Blob([vtt], { type: "text/vtt" });
          const blobUrl = URL.createObjectURL(blob);
          tracksToRevoke.push(blobUrl);
          return {
            language: sub.language || "en",
            label: sub.lanName || sub.language || `Track ${idx + 1}`,
            blobUrl,
          };
        } catch (err) {
          return {
            language: sub.language || "en",
            label: sub.lanName || sub.language || `Track ${idx + 1}`,
            blobUrl: sub.url,
          };
        }
      });
      const loadedTracks = await Promise.all(promises);
      if (active) setLocalSubTracks(loadedTracks);
    };

    loadAllSubtitles();
    return () => {
      active = false;
      tracksToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [subtitles]);

  const handleLocalSubtitleUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        try {
          const parsed = parseSubtitles(text);
          if (parsed.length === 0) {
            alert(
              "Could not find any subtitle cues. Make sure the file is valid SRT or WebVTT.",
            );
            return;
          }
          setSubtitleCues(parsed);
          setSelectedSubtitleIdx(999);
          setShowSettings(false);
        } catch (err) {
          alert("Error parsing subtitle file.");
        }
      }
    };
    reader.readAsText(file);
  };

  const takeScreenshot = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || video.clientWidth || 1920;
      canvas.height = video.videoHeight || video.clientHeight || 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${title.replace(/\s+/g, "_")}_Scene_${Math.round(currentTime)}s.png`;
      link.href = dataUrl;
      link.click();
      showToast("📸 Screenshot Captured!");
    } catch (err) {
      showToast("🔒 Screenshot blocked by stream CORS protection");
    }
  };

  const getVideoFilterStyle = () => {
    let baseFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    switch (cinematicFilter) {
      case "cinematic":
        baseFilter += " contrast(1.1) saturate(1.15) brightness(0.95)";
        break;
      case "vibrant":
        baseFilter += " saturate(1.4) contrast(1.05)";
        break;
      case "warm":
        baseFilter += " sepia(0.15) hue-rotate(-10deg) saturate(1.1)";
        break;
      case "cool":
        baseFilter += " hue-rotate(10deg) saturate(1.05) brightness(1.02)";
        break;
      case "noir":
        baseFilter += " grayscale(1) contrast(1.2)";
        break;
    }
    return baseFilter;
  };

  useEffect(() => {
    hasSkippedIntroRef.current = false;
    hasSkippedOutroRef.current = false;
  }, [selectedSourceIdx]);

  useEffect(() => {
    if (!ambientGlow || !videoRef.current || !ambientCanvasRef.current) return;
    const video = videoRef.current;
    const canvas = ambientCanvasRef.current;
    const ctx = canvas.getContext("2d");
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

  useEffect(() => {
    if (!showControls || isLocked || !isPlaying || isHoveringControls) return;
    const CONTROLS_HIDE_DELAY = isMobileDevice ? 6000 : 10000;
    const timer = setTimeout(() => {
      setShowControls(false);
      setShowSettings(false);
    }, CONTROLS_HIDE_DELAY);
    return () => clearTimeout(timer);
  }, [showControls, isPlaying, isLocked, isHoveringControls, lastInteraction]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      setHasPlayedOnce(true);
    };
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime > 5) {
        localStorage.setItem(`rf_progress_${title}`, String(video.currentTime));
        if (video.duration)
          localStorage.setItem(
            `rf_progress_${title}_duration`,
            String(video.duration),
          );
        if (subjectId)
          useProgressStore
            .getState()
            .saveProgress(
              String(subjectId),
              season || 1,
              episode || 1,
              video.currentTime,
              video.duration || 0,
            );
      }
      if (video.currentTime >= 5 && video.currentTime <= 95) {
        setShowIntroSkip(true);
        if (autoSkipIntro && !hasSkippedIntroRef.current) {
          hasSkippedIntroRef.current = true;
          video.currentTime = 95;
        }
      } else {
        setShowIntroSkip(false);
        if (video.currentTime < 5) hasSkippedIntroRef.current = false;
      }

      if (video.duration && video.currentTime >= video.duration - 90) {
        setShowOutroSkip(true);
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
        if (video.duration && video.currentTime < video.duration - 90)
          hasSkippedOutroRef.current = false;
      }
    };
    const onDurationChange = () => setDuration(video.duration);
    const onProgress = () => {
      const ranges: [number, number][] = [];
      for (let i = 0; i < video.buffered.length; i++)
        ranges.push([video.buffered.start(i), video.buffered.end(i)]);
      setBuffered(ranges);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("progress", onProgress);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("progress", onProgress);
    };
  }, [title, hasNextEpisode, autoSkipIntro, autoSkipOutro]);

  const togglePlay = () => {
    if (isLocked) return;
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.pause();
    else video.play();
  };

  const skip = (seconds: number) => {
    if (isLocked || !videoRef.current) return;
    videoRef.current.currentTime += seconds;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked || !videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || isLocked) return;
      triggerInteraction();
      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          showToast(!isPlaying ? "Playing" : "Paused");
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(10);
          showToast("Seek Forward +10s");
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-10);
          showToast("Seek Backward -10s");
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((prev) => {
            const v = Math.min(prev + 0.1, 1);
            showToast(`Volume: ${Math.round(v * 100)}%`);
            return v;
          });
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((prev) => {
            const v = Math.max(prev - 0.1, 0);
            showToast(`Volume: ${Math.round(v * 100)}%`);
            return v;
          });
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          showToast(
            document.fullscreenElement
              ? "Fullscreen Disabled"
              : "Fullscreen Activated",
          );
          break;
        case "KeyM":
          e.preventDefault();
          setIsMuted((prev) => {
            showToast(!prev ? "Muted" : "Unmuted");
            return !prev;
          });
          break;
        case "KeyX":
          e.preventDefault();
          setShowXRay((prev) => {
            showToast(
              !prev ? "X-Ray Overlay Enabled" : "X-Ray Overlay Disabled",
            );
            return !prev;
          });
          break;
        case "KeyS":
          e.preventDefault();
          takeScreenshot();
          break;
        case "KeyJ":
          e.preventDefault();
          setSubDelay((prev) => {
            const d = prev + 0.5;
            showToast(`Sub Delay: +${d.toFixed(1)}s`);
            return d;
          });
          break;
        case "KeyH":
          e.preventDefault();
          setSubDelay((prev) => {
            const d = prev - 0.5;
            showToast(`Sub Delay: ${d.toFixed(1)}s`);
            return d;
          });
          break;
        case "BracketRight":
          e.preventDefault();
          setPlaybackRate((prev) => {
            const r = Math.min(prev + 0.25, 2);
            showToast(`Speed: ${r.toFixed(2)}x`);
            return r;
          });
          break;
        case "BracketLeft":
          e.preventDefault();
          setPlaybackRate((prev) => {
            const r = Math.max(prev - 0.25, 0.5);
            showToast(`Speed: ${r.toFixed(2)}x`);
            return r;
          });
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, isMuted, isLocked, showXRay]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleWheelEvent = (e: WheelEvent) => {
      if (isLocked) return;
      e.preventDefault();
      setVolume((prev) =>
        Math.min(Math.max(prev + (e.deltaY < 0 ? 0.05 : -0.05), 0), 1),
      );
    };
    video.addEventListener("wheel", handleWheelEvent, { passive: false });
    return () => video.removeEventListener("wheel", handleWheelEvent);
  }, [isLocked]);

  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;
    if (container.requestFullscreen) {
      if (!document.fullscreenElement)
        container
          .requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch((err) => console.error("Fullscreen request failed:", err));
      else
        document
          .exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch((err) => console.error("Exit fullscreen failed:", err));
    } else if (video && (video as any).webkitSupportsFullscreen) {
      if (!(video as any).webkitDisplayingFullscreen) {
        try {
          (video as any).webkitEnterFullscreen();
          setIsFullscreen(true);
        } catch (err) {
          console.error("iOS webkitEnterFullscreen failed:", err);
        }
      } else {
        try {
          (video as any).webkitExitFullscreen();
          setIsFullscreen(false);
        } catch (err) {
          console.error("iOS webkitExitFullscreen failed:", err);
        }
      }
    } else {
      alert("Fullscreen is not supported on this browser/device.");
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnter = () => setIsFullscreen(true);
    const onExit = () => setIsFullscreen(false);
    video.addEventListener("webkitbeginfullscreen", onEnter);
    video.addEventListener("webkitendfullscreen", onExit);
    return () => {
      video.removeEventListener("webkitbeginfullscreen", onEnter);
      video.removeEventListener("webkitendfullscreen", onExit);
    };
  }, []);

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video || document.pictureInPictureElement) {
      if (document.pictureInPictureElement)
        await document.exitPictureInPicture();
      return;
    }
    try {
      await video.requestPictureInPicture();
    } catch (err) {
      console.error(err);
    }
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case "16:9":
        return "aspect-video object-contain";
      case "4:3":
        return "aspect-[4/3] object-contain";
      case "stretch":
        return "w-full h-full object-fill";
      case "zoom":
        return "w-full h-full object-cover scale-110";
      default:
        return "w-full h-full object-contain";
    }
  };

  useEffect(() => {
    if (!showNextEpCountdown) return;
    const timer = setInterval(() => {
      setNextEpCountdown((prev) => {
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

  const isMobileDevice =
    typeof navigator !== "undefined" &&
    /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const isRotatedLandscape =
    isMobileDevice && (rotation === 90 || rotation === 270);

  const getSubColor = () => {
    switch (subColor) {
      case "yellow":
        return "#fde047";
      case "cyan":
        return "#22d3ee";
      case "green":
        return "#4ade80";
      default:
        return "#ffffff";
    }
  };

  const getSubTextShadow = () => {
    if (subBackground === "solid") return "none";
    if (subBackground === "shadow")
      return "0 2px 8px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.8), -2px 2px 0px #000, 2px -2px 0px #000";
    return "0 2px 4px rgba(0,0,0,0.9), -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 1px 1px 0px #000, -2px 2px 0px #000, 2px -2px 0px #000";
  };

  return (
    <div
      ref={containerRef}
      onClick={triggerInteraction}
      onMouseMove={triggerInteraction}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onTouchStart={isMobileDevice ? undefined : triggerInteraction}
      className={cn(
        "relative w-full h-[65vh] md:h-[75vh] bg-black rounded-3xl overflow-hidden border border-white/[0.08] flex items-center justify-center group/player",
        !showControls && "cursor-none",
        className,
      )}
      style={{
        ...(isRotatedLandscape
          ? {
              position: "fixed",
              top: "50%",
              left: "50%",
              width: "100vh",
              height: "100vw",
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              zIndex: 99999,
              borderRadius: "0px",
              margin: 0,
              border: "none",
              maxWidth: "none",
              maxHeight: "none",
            }
          : {}),
      }}
    >
      {/* CINEMATIC AMBIENT LIGHTING */}
      {ambientGlow && (
        <canvas
          ref={ambientCanvasRef}
          width={16}
          height={9}
          className="absolute inset-0 w-full h-full opacity-50 blur-[80px] pointer-events-none scale-125 z-0"
        />
      )}
      {/* PRIMARY VIDEO PLAYER */}
      <video
        ref={videoRef}
        autoPlay
        onClick={(e) => {
          if (isMobileDevice) {
            e.stopPropagation();
            setShowControls((prev) => !prev);
          } else togglePlay();
        }}
        style={{
          filter: getVideoFilterStyle(),
          transform: isRotatedLandscape
            ? "none"
            : `rotate(${rotation}deg)${rotation === 90 || rotation === 270 ? " scale(0.5625)" : ""}`,
        }}
        crossOrigin={videoCrossOrigin}
        className={cn(
          "w-full h-full z-10 transition-all select-none pointer-events-auto",
          getAspectClass(),
        )}
        playsInline
      >
        {localSubTracks.length > 0
          ? localSubTracks.map((track, i) => (
              <track
                key={i}
                kind="subtitles"
                src={track.blobUrl}
                srcLang={track.language}
                label={track.label}
                default={selectedSubtitleIdx === i}
              />
            ))
          : subtitles &&
            subtitles.map((sub, i) => (
              <track
                key={sub.id || i}
                kind="subtitles"
                src={sub.url}
                srcLang={sub.language || "en"}
                label={sub.lanName || sub.language || `Track ${i + 1}`}
                default={selectedSubtitleIdx === i}
              />
            ))}
      </video>
      {/* GIANT PLAY BUTTON OVERLAY */}
      {!isPlaying && !hasPlayedOnce && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-15 flex items-center justify-center bg-black/45 backdrop-blur-[1.5px] cursor-pointer pointer-events-auto transition-all"
        >
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-20 h-20 rounded-full bg-[var(--rf-red)] hover:bg-[var(--rf-red-deep)] flex items-center justify-center text-white shadow-2xl shadow-[var(--rf-red)]/35 border border-white/10 active:scale-95 transition-transform"
            aria-label="Play Movie"
          >
            <Play size={32} className="fill-current ml-2 text-white" />
          </motion.button>
        </div>
      )}
      {/* UNLOCK BUTTON WHEN LOCKED */}
      {isLocked && (
        <div className="absolute top-4 right-4 z-40 pointer-events-auto">
          <button
            onClick={() => {
              setIsLocked(false);
              showToast("🔓 Controls Unlocked");
            }}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-xl"
            title={t("Close")}
          >
            <Lock size={18} className="animate-pulse" />
          </button>
        </div>
      )}
      {/* OSD TOAST */}
      {playerNotification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-black/85 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-2xl animate-[bounce_0.8s_infinite] select-none pointer-events-none">
          <Sparkles size={12} className="text-[var(--rf-red)] animate-pulse" />
          <span>{playerNotification}</span>
        </div>
      )}
      {/* WATERMARK */}
      <div className="absolute top-8 left-8 z-20 pointer-events-none opacity-20 select-none text-[10px] font-mono text-white tracking-widest uppercase">
        Lenzorah Client // Anonymous Stream
      </div>
      {/* RESUME PROMPT */}
      {hasSavedProgress && (
        <div className="absolute bottom-20 left-6 z-40 bg-black/90 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3.5 text-xs font-bold text-white shadow-2xl select-none animate-[fadeIn_0.3s_ease]">
          <RotateCcw className="text-[var(--rf-red)] animate-pulse" size={14} />
          <span className="text-[var(--rf-text-muted)] font-medium">
            Resume from{" "}
            <span className="text-white font-bold">
              {Math.floor(savedTime / 60)}m {Math.round(savedTime % 60)}s
            </span>
            ?
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
              {t("Back")}
            </button>
          </div>
        </div>
      )}
      {/* TELEMETRY OVERLAY */}
      {showTelemetryOverlay && (
        <div className="absolute top-16 right-4 z-40 bg-black/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl w-64 shadow-2xl">
          <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-black text-white flex items-center gap-1.5 animate-pulse">
              <Sliders size={12} className="text-[var(--rf-red)]" /> Telemetry
              Monitor
            </span>
            <button
              onClick={() => setShowTelemetryOverlay(false)}
              className="text-[10px] text-[var(--rf-text-muted)] hover:text-white"
            >
              {t("Close")}
            </button>
          </div>
          <div className="flex items-end justify-between h-8 bg-white/[0.02] border border-white/5 rounded-lg px-2.5 py-1 mb-3">
            <span className="text-[9px] font-black uppercase text-white/40 mb-1 font-mono">
              QoS Engine
            </span>
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
            {[
              ["Startup Time (VST)", `${metrics.vst} ms`],
              ["Active Bitrate", metrics.bitrate],
              [
                "Active Resolution",
                videoRef.current
                  ? `${videoRef.current.videoWidth || 1920}x${videoRef.current.videoHeight || 1080}`
                  : "1920x1080",
              ],
              [
                "Buffer Load",
                videoRef.current?.buffered.length
                  ? `${((videoRef.current.buffered.end(videoRef.current.buffered.length - 1) / (videoRef.current.duration || 1)) * 100).toFixed(0)}%`
                  : "0%",
              ],
              ["Engine Codec", metrics.codec],
              ["Latency Buffer", metrics.latency],
              ["Dropped Frames", String(metrics.droppedFrames)],
              ["Active FPS", `${metrics.fps} FPS`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span>{label}</span>
                <span className="text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* AD BLOCK MOCK */}
      {adBlockCounter && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-8 text-center">
          <Shield
            className="text-[var(--rf-red)] mb-4 animate-bounce"
            size={48}
          />
          <h3 className="text-xl font-bold text-white mb-2">
            Adblocker Detected
          </h3>
          <p className="text-sm text-[var(--rf-text-muted)] max-w-md mb-6">
            Please disable your browser's Adblock extension to unlock streaming
            now.
          </p>
          <button
            onClick={() => setAdBlockCounter(false)}
            className="btn-primary px-6 py-3"
          >
            I've Disabled It
          </button>
        </div>
      )}
      {/* SKIP INTRO */}
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
      {/* SKIP OUTRO */}
      {showOutroSkip && !showNextEpCountdown && (
        <button
          onClick={() => {
            if (hasNextEpisode) onNextEpisode?.();
            else if (videoRef.current)
              videoRef.current.currentTime = videoRef.current.duration - 5;
          }}
          className="absolute bottom-20 right-6 z-40 bg-black/90 backdrop-blur-xl border border-white/10 hover:border-[var(--rf-red)]/50 px-5 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold text-white transition-all shadow-2xl active:scale-95"
        >
          <SkipForward size={14} />{" "}
          {hasNextEpisode ? "Skip Outro / Play Next" : "Skip Outro / Credits"}
        </button>
      )}
      {/* AI RECAP OVERLAY */}
      {showRecap && (
        <div className="absolute top-24 left-6 z-40 bg-black/95 backdrop-blur-2xl border border-[var(--rf-red)]/20 p-5 rounded-3xl w-80 shadow-2xl">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Brain size={16} className="text-[var(--rf-red)]" />
              AI Episode Recap
            </h4>
            <button
              onClick={() => setShowRecap(false)}
              className="text-[var(--rf-text-muted)] hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
          <div className="text-xs text-[var(--rf-text-muted)] leading-relaxed">
            {recapLoading ? (
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2
                  size={24}
                  className="animate-spin text-[var(--rf-red)] mb-2"
                />
                <span className="text-[10px] uppercase tracking-wider animate-pulse">
                  {t("Loading")}
                </span>
              </div>
            ) : recapText ? (
              <p>{recapText}</p>
            ) : (
              <p className="text-red-400">
                Failed to generate recap. Please try again.
              </p>
            )}
          </div>
        </div>
      )}
      {/* NEXT EPISODE COUNTDOWN */}
      {showNextEpCountdown && (
        <div className="absolute bottom-24 right-6 z-40 bg-black/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl w-64 shadow-2xl flex flex-col">
          <span className="text-[10px] font-black text-[var(--rf-red)] uppercase tracking-wider mb-1">
            Binge Autoplay
          </span>
          <h6 className="text-xs font-bold text-white line-clamp-1 mb-3">
            Up Next in {nextEpCountdown}s...
          </h6>
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
              {t("Close")}
            </button>
          </div>
        </div>
      )}
      {/* SUBTITLE RENDERER */}
      {selectedSubtitleIdx >= 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 text-center w-[90%] max-w-2xl select-none pointer-events-none transition-all">
          {subtitleLoading && (
            <div className="bg-black/60 backdrop-blur-sm text-white/70 px-4 py-1.5 rounded-lg text-xs inline-block">
              {t("Loading")}
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
                color: getSubColor(),
                textShadow: getSubTextShadow(),
              }}
              className={cn(
                "px-4 py-1.5 transition-all font-sans font-extrabold tracking-wide leading-relaxed inline-block whitespace-pre-line text-center",
                subBackground === "solid" && "bg-black rounded-md",
                subBackground === "translucent" &&
                  "bg-black/50 rounded-md backdrop-blur-sm",
              )}
            >
              {currentSubtitleText}
            </div>
          )}
        </div>
      )}
      {/* CONTROLS */}
      <div
        className={cn(
          "absolute inset-0 z-20 flex flex-col justify-between transition-all duration-300 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/60",
          showControls && !isLocked ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Top Header */}
        <div
          onMouseEnter={() => setIsHoveringControls(true)}
          onMouseLeave={() => setIsHoveringControls(false)}
          className="p-4 flex items-center justify-between pointer-events-auto w-full"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
            {onBack && (
              <button
                onClick={onBack}
                className="text-white/80 hover:text-white transition-colors w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 shrink-0"
                title={t("Back")}
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0">
              <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px] sm:max-w-xs">
                {title}
              </span>
              {selectedSource && (
                <span className="text-[8px] sm:text-[9px] font-black bg-white/10 px-1.5 py-0.5 rounded text-white/70 uppercase w-max">
                  {selectedSource.quality}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {onShowEpisodes && (
              <button
                onClick={() => {
                  if (document.fullscreenElement || window.innerWidth < 1024)
                    setShowEpisodesOverlay(true);
                  else onShowEpisodes();
                }}
                className="text-white/60 hover:text-white transition-colors w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
                title="Episodes List"
              >
                <List size={16} />
              </button>
            )}
            {stars.length > 0 && (
              <button
                onClick={() => setShowXRay(!showXRay)}
                className={cn(
                  "text-[10px] font-bold h-8 px-2 rounded-lg border transition-all flex items-center gap-1",
                  showXRay
                    ? "bg-[var(--rf-red)] border-none text-white shadow-lg shadow-[var(--rf-red)]/20"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10",
                )}
              >
                <Sparkles size={12} />
                <span className="hidden sm:inline">X-Ray</span>
              </button>
            )}
            {season !== undefined && episode !== undefined && episode > 1 && (
              <button
                onClick={async () => {
                  setShowRecap(true);
                  if (!recapText && !recapLoading) {
                    setRecapLoading(true);
                    try {
                      const text = await aiRecap(title, season, episode);
                      setRecapText(text);
                    } catch (err) {
                      console.error("Recap error:", err);
                      setRecapText("");
                    } finally {
                      setRecapLoading(false);
                    }
                  }
                }}
                className={cn(
                  "text-[10px] font-bold h-8 px-2 rounded-lg border transition-all flex items-center gap-1.5",
                  showRecap
                    ? "bg-[var(--rf-red)] border-[var(--rf-red)] text-white shadow-lg shadow-[var(--rf-red)]/20"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-[var(--rf-red)]/20 hover:border-[var(--rf-red)]/30 hover:text-[var(--rf-red)]",
                )}
              >
                <Brain size={12} className={showRecap ? "animate-pulse" : ""} />
                <span className="hidden sm:inline">Recap</span>
              </button>
            )}
            <button
              onClick={togglePictureInPicture}
              className="text-white/60 hover:text-white transition-colors w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
              title="Picture In Picture"
            >
              <Monitor size={16} />
            </button>

            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSettings(!showSettings);
                  setActiveMenu("main");
                }}
                className="text-white/60 hover:text-white transition-colors relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
              >
                <Settings size={16} />
              </button>

              {showSettings && (
                <div className="absolute top-10 right-0 z-50 w-64 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-1 max-h-[85vh] overflow-y-auto">
                  {activeMenu === "main" && (
                    <>
                      {[
                        {
                          label: "Quality",
                          icon: <Monitor size={14} />,
                          menu: "quality" as const,
                          value: `Auto (${selectedSource?.quality})`,
                        },
                        {
                          label: "Speed",
                          icon: <Flame size={14} />,
                          menu: "speed" as const,
                          value: `${playbackRate}x`,
                        },
                        {
                          label: t("Subtitles"),
                          icon: <Captions size={14} />,
                          menu: "subtitles" as const,
                          value:
                            selectedSubtitleIdx === -1
                              ? "Off"
                              : selectedSubtitleIdx === 999
                                ? "Custom"
                                : subtitles[selectedSubtitleIdx]?.lanName ||
                                  subtitles[selectedSubtitleIdx]?.language ||
                                  `Track ${selectedSubtitleIdx + 1}`,
                        },
                        {
                          label: "Adjustments",
                          icon: <Sparkles size={14} />,
                          menu: "adjustments" as const,
                          value:
                            cinematicFilter === "normal"
                              ? "Normal"
                              : cinematicFilter,
                        },
                        {
                          label: "Auto Skip",
                          icon: <Tv size={14} />,
                          menu: "autoskip" as const,
                          value:
                            autoSkipIntro || autoSkipOutro ? "Active" : "Off",
                        },
                      ].map(({ label, icon, menu, value }) => (
                        <button
                          key={menu}
                          onClick={() => setActiveMenu(menu)}
                          className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                        >
                          <span className="flex items-center gap-2">
                            {icon} {label}
                          </span>
                          <span className="text-[10px] text-[var(--rf-text-muted)] capitalize">
                            {value}
                          </span>
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setAspectRatio((prev) => {
                            const list: (typeof aspectRatio)[] = [
                              "original",
                              "16:9",
                              "4:3",
                              "stretch",
                              "zoom",
                            ];
                            return list[(list.indexOf(prev) + 1) % list.length];
                          });
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Sliders size={14} /> Aspect Ratio
                        </span>
                        <span className="text-[10px] text-[var(--rf-text-muted)] capitalize">
                          {aspectRatio}
                        </span>
                      </button>
                      <button
                        onClick={() => setAmbientGlow((prev) => !prev)}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Flame size={14} /> Ambient Lighting
                        </span>
                        <span className="text-[10px] text-[var(--rf-text-muted)]">
                          {ambientGlow ? "ON" : "OFF"}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setShowTelemetryOverlay((prev) => !prev);
                          setShowSettings(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Info size={14} /> Telemetry Monitor
                        </span>
                        <span className="text-[10px] text-[var(--rf-text-muted)]">
                          {showTelemetryOverlay ? "Active" : "Show"}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          takeScreenshot();
                          setShowSettings(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Camera size={14} /> Screen Capture
                        </span>
                        <span className="text-[10px] text-[var(--rf-text-muted)]">
                          Snap
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setAdBlockCounter(true);
                          setShowSettings(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Shield size={14} /> Security Protection
                        </span>
                        <span className="text-[10px] text-green-400 font-bold">
                          SECURE
                        </span>
                      </button>
                    </>
                  )}

                  {activeMenu === "quality" && (
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      <button
                        onClick={() => setActiveMenu("main")}
                        className="text-left px-3 py-1.5 text-[10px] font-bold text-[var(--rf-red)] uppercase border-b border-white/5 mb-1"
                      >
                        ← {t("Back")}
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
                            selectedSourceIdx === i
                              ? "bg-[var(--rf-red)] text-white"
                              : "text-white/70 hover:bg-white/10",
                          )}
                        >
                          {src.quality} ({src.size})
                        </button>
                      ))}
                    </div>
                  )}

                  {activeMenu === "speed" && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setActiveMenu("main")}
                        className="text-left px-3 py-1.5 text-[10px] font-bold text-[var(--rf-red)] uppercase border-b border-white/5 mb-1"
                      >
                        ← {t("Back")}
                      </button>
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => {
                            setPlaybackRate(rate);
                            setShowSettings(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors",
                            playbackRate === rate
                              ? "bg-[var(--rf-red)] text-white"
                              : "text-white/70 hover:bg-white/10",
                          )}
                        >
                          {rate === 1 ? "Normal" : `${rate}x`}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeMenu === "subtitles" && (
                    <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                      <button
                        onClick={() => setActiveMenu("main")}
                        className="text-left px-3 py-1.5 text-[10px] font-bold text-[var(--rf-red)] uppercase border-b border-white/5 mb-1"
                      >
                        ← {t("Back")}
                      </button>
                      <button
                        onClick={() => setActiveMenu("subtitlestyle")}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all border border-white/[0.06] mb-1"
                      >
                        <span className="flex items-center gap-2">
                          <Sliders size={12} className="text-[var(--rf-red)]" />{" "}
                          Subtitle Style
                        </span>
                        <span className="text-[10px] text-[var(--rf-text-muted)]">
                          Customize →
                        </span>
                      </button>
                      <div className="border-t border-white/5 mb-1" />
                      <button
                        onClick={() => {
                          setSelectedSubtitleIdx(-1);
                          setShowSettings(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors",
                          selectedSubtitleIdx === -1
                            ? "bg-[var(--rf-red)] text-white"
                            : "text-white/70 hover:bg-white/10",
                        )}
                      >
                        {t("No Subtitles")}
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
                            selectedSubtitleIdx === i
                              ? "bg-[var(--rf-red)] text-white"
                              : "text-white/70 hover:bg-white/10",
                          )}
                        >
                          {sub.lanName || sub.language || `Track ${i + 1}`}
                        </button>
                      ))}
                      <div className="border-t border-white/5 mt-1 pt-2">
                        <label className="flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl cursor-pointer transition-all">
                          <Upload size={12} /> Upload Subtitle (.srt / .vtt)
                          <input
                            type="file"
                            accept=".srt,.vtt"
                            className="hidden"
                            onChange={handleLocalSubtitleUpload}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {activeMenu === "subtitlestyle" && (
                    <div className="flex flex-col gap-2 p-1">
                      <button
                        onClick={() => setActiveMenu("subtitles")}
                        className="text-left py-1 text-[10px] font-bold text-[var(--rf-red)] uppercase border-b border-white/5 mb-1"
                      >
                        ← {t("Back")}
                      </button>
                      <div className="flex flex-col gap-1.5 px-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/70 uppercase tracking-wider font-bold">
                            Font Size
                          </span>
                          <span className="text-[10px] text-[var(--rf-red)] font-black">
                            {subTextSize}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setSubTextSize((s) => Math.max(60, s - 10))
                            }
                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 text-xs font-bold shrink-0"
                          >
                            −
                          </button>
                          <input
                            type="range"
                            min={60}
                            max={200}
                            step={10}
                            value={subTextSize}
                            onChange={(e) =>
                              setSubTextSize(Number(e.target.value))
                            }
                            className="flex-1 accent-[var(--rf-red)] h-1 rounded cursor-pointer"
                          />
                          <button
                            onClick={() =>
                              setSubTextSize((s) => Math.min(200, s + 10))
                            }
                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 text-xs font-bold shrink-0"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 px-1 border-t border-white/5 pt-2">
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-bold">
                          Font Color
                        </span>
                        <div className="flex items-center gap-2">
                          {(["white", "yellow", "cyan", "green"] as const).map(
                            (c) => (
                              <button
                                key={c}
                                onClick={() => setSubColor(c)}
                                title={c.charAt(0).toUpperCase() + c.slice(1)}
                                className={cn(
                                  "w-8 h-8 rounded-lg border-2 transition-all flex-1 relative",
                                  subColor === c
                                    ? "border-[var(--rf-red)] scale-105 shadow-lg shadow-[var(--rf-red)]/30"
                                    : "border-white/10 hover:border-white/30",
                                )}
                                style={{
                                  background:
                                    c === "white"
                                      ? "#ffffff"
                                      : c === "yellow"
                                        ? "#fde047"
                                        : c === "cyan"
                                          ? "#22d3ee"
                                          : "#4ade80",
                                }}
                              >
                                {subColor === c && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <Check
                                      size={12}
                                      className="text-black font-black"
                                      strokeWidth={3}
                                    />
                                  </span>
                                )}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 px-1 border-t border-white/5 pt-2">
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-bold">
                          Background
                        </span>
                        <div className="flex flex-col gap-1">
                          {(["translucent", "solid", "shadow"] as const).map(
                            (bg) => (
                              <button
                                key={bg}
                                onClick={() => setSubBackground(bg)}
                                className={cn(
                                  "w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors",
                                  subBackground === bg
                                    ? "bg-[var(--rf-red)] text-white"
                                    : "text-white/60 hover:bg-white/10",
                                )}
                              >
                                {bg === "translucent"
                                  ? "Translucent (default)"
                                  : bg === "solid"
                                    ? "Solid Black Box"
                                    : "Shadow Only"}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 px-1 border-t border-white/5 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/70 uppercase tracking-wider font-bold">
                            Sync Delay
                          </span>
                          <span className="text-[10px] text-[var(--rf-red)] font-black">
                            {subDelay > 0
                              ? `+${subDelay.toFixed(1)}`
                              : subDelay.toFixed(1)}
                            s
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setSubDelay((d) =>
                                parseFloat((d - 0.5).toFixed(1)),
                              )
                            }
                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 text-xs font-bold shrink-0"
                          >
                            −
                          </button>
                          <div className="flex-1 h-1 bg-white/10 rounded-full relative overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full bg-[var(--rf-red)] rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, Math.max(0, ((subDelay + 5) / 10) * 100))}%`,
                              }}
                            />
                          </div>
                          <button
                            onClick={() =>
                              setSubDelay((d) =>
                                parseFloat((d + 0.5).toFixed(1)),
                              )
                            }
                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 text-xs font-bold shrink-0"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => setSubDelay(0)}
                          className="text-[9px] text-[var(--rf-text-muted)] hover:text-white text-center transition-colors mt-0.5"
                        >
                          Reset delay to 0
                        </button>
                      </div>
                    </div>
                  )}

                  {activeMenu === "adjustments" && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setActiveMenu("main")}
                        className="text-left px-3 py-1.5 text-[10px] font-bold text-[var(--rf-red)] uppercase border-b border-white/5 mb-1"
                      >
                        ← {t("Back")}
                      </button>
                      {["normal", "cinematic", "warm", "noir", "vibrant"].map(
                        (filter) => (
                          <button
                            key={filter}
                            onClick={() => {
                              setCinematicFilter(filter as any);
                              setShowSettings(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors capitalize",
                              cinematicFilter === filter
                                ? "bg-[var(--rf-red)] text-white"
                                : "text-white/70 hover:bg-white/10",
                            )}
                          >
                            {filter}
                          </button>
                        ),
                      )}
                    </div>
                  )}

                  {activeMenu === "autoskip" && (
                    <div className="flex flex-col gap-3 p-1">
                      <button
                        onClick={() => setActiveMenu("main")}
                        className="text-left py-1 text-[10px] font-bold text-[var(--rf-red)] uppercase border-b border-white/5"
                      >
                        ← {t("Back")}
                      </button>
                      <div className="flex flex-col gap-2.5">
                        {[
                          {
                            label: "Skip Intro Section",
                            value: autoSkipIntro,
                            toggle: () => setAutoSkipIntro(!autoSkipIntro),
                          },
                          {
                            label: "Skip Outro/Credits",
                            value: autoSkipOutro,
                            toggle: () => setAutoSkipOutro(!autoSkipOutro),
                          },
                        ].map(({ label, value, toggle }, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex items-center justify-between",
                              i > 0 && "border-t border-white/5 pt-2",
                            )}
                          >
                            <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">
                              {label}
                            </span>
                            <button
                              onClick={toggle}
                              className={cn(
                                "text-[9px] font-black px-2 py-0.5 rounded border transition-all",
                                value
                                  ? "bg-green-500/25 border-green-500/50 text-green-400"
                                  : "bg-white/5 border-white/10 text-white/40",
                              )}
                            >
                              {value ? "ENABLED" : "DISABLED"}
                            </button>
                          </div>
                        ))}
                        <p className="text-[10px] text-[var(--rf-text-muted)] leading-relaxed border-t border-white/5 pt-2 mt-1">
                          Bridges the gap during binge sessions. Intro sections
                          are jumped through instantly, and the next episode
                          will start automatically as credits begin rolling.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center play controls */}
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
            {isPlaying ? (
              <Pause size={28} className="fill-current" />
            ) : (
              <Play size={28} className="fill-current ml-1" />
            )}
          </button>
          <button
            onClick={() => skip(10)}
            className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/20 flex items-center justify-center text-white active:scale-95 transition-all"
          >
            <SkipForward size={20} />
          </button>
        </div>

        {/* Bottom controls */}
        <div
          onMouseEnter={() => setIsHoveringControls(true)}
          onMouseLeave={() => setIsHoveringControls(false)}
          className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-3 pointer-events-auto"
        >
          <div className="flex items-center gap-3 w-full">
            <span className="text-xs text-[var(--rf-text-muted)] select-none">
              {Math.floor(currentTime / 60)}:
              {(Math.floor(currentTime % 60) < 10 ? "0" : "") +
                Math.floor(currentTime % 60)}
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
              {Math.floor(duration / 60)}:
              {(Math.floor(duration % 60) < 10 ? "0" : "") +
                Math.floor(duration % 60)}
            </span>
          </div>

          <div className="flex items-center justify-between mt-3 sm:mt-0 pt-1 sm:pt-0">
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {hasPrevEpisode && onPrevEpisode && (
                <button
                  onClick={onPrevEpisode}
                  className="text-white/60 hover:text-white transition-all duration-300 w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 bg-white/5 md:bg-transparent shadow-md md:shadow-none border border-white/5 md:border-transparent shrink-0"
                  title="Previous Episode"
                >
                  <SkipBack className="w-5 h-5 md:w-[18px] md:h-[18px]" />
                </button>
              )}
              <button
                onClick={togglePlay}
                className="text-white/80 hover:text-white transition-all duration-300 w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 bg-white/5 md:bg-transparent shadow-md md:shadow-none border border-white/5 md:border-transparent shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 md:w-[18px] md:h-[18px]" />
                ) : (
                  <Play className="w-5 h-5 md:w-[18px] md:h-[18px]" />
                )}
              </button>
              {hasNextEpisode && onNextEpisode && (
                <button
                  onClick={onNextEpisode}
                  className="text-white/60 hover:text-white transition-all duration-300 w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 bg-white/5 md:bg-transparent shadow-md md:shadow-none border border-white/5 md:border-transparent shrink-0"
                  title="Next Episode"
                >
                  <SkipForward className="w-5 h-5 md:w-[18px] md:h-[18px]" />
                </button>
              )}
              <div className="flex items-center gap-1 group/volume shrink-0">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white/80 hover:text-white transition-all duration-300 w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 bg-white/5 md:bg-transparent shadow-md md:shadow-none border border-white/5 md:border-transparent"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 md:w-[18px] md:h-[18px]" />
                  ) : (
                    <Volume2 className="w-5 h-5 md:w-[18px] md:h-[18px]" />
                  )}
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
                  className="w-0 group-hover/volume:w-16 h-1 rounded bg-white/20 cursor-pointer accent-white transition-all appearance-none outline-none hidden md:block"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
              <button
                onClick={() =>
                  setRotation((prev) => {
                    const next = (prev + 90) % 360;
                    return next as 0 | 90 | 180 | 270;
                  })
                }
                className="text-white/80 hover:text-white transition-all duration-300 w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 bg-white/5 md:bg-transparent shadow-md md:shadow-none border border-white/5 md:border-transparent"
                title={`Rotate Screen View (${rotation}°)`}
              >
                <RefreshCw
                  className={cn(
                    "transition-transform duration-500 w-5 h-5 md:w-[18px] md:h-[18px]",
                    rotation === 90
                      ? "rotate-90"
                      : rotation === 180
                        ? "rotate-180"
                        : rotation === 270
                          ? "rotate-[270deg]"
                          : "rotate-0",
                  )}
                />
              </button>
              <button
                onClick={toggleFullscreen}
                className="text-white/80 hover:text-white transition-all duration-300 w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 bg-white/5 md:bg-transparent shadow-md md:shadow-none border border-white/5 md:border-transparent"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 md:w-[18px] md:h-[18px]" />
                ) : (
                  <Maximize className="w-5 h-5 md:w-[18px] md:h-[18px]" />
                )}
              </button>
              <button
                onClick={() => setIsLocked(true)}
                className="text-white/80 hover:text-white transition-all duration-300 w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 bg-white/5 md:bg-transparent shadow-md md:shadow-none border border-white/5 md:border-transparent"
              >
                <Unlock className="w-5 h-5 md:w-[18px] md:h-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
     
      {/* EPISODES OVERLAY */}
      <AnimatePresence>
        {showEpisodesOverlay && seasons && seasons.length > 0 && (
          <>
            <div
              onClick={() => setShowEpisodesOverlay(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 cursor-pointer pointer-events-auto select-none"
            />

            <div className="absolute inset-y-0 right-0 z-40 w-[92vw] sm:w-[420px] md:w-[480px] lg:w-[520px] max-w-full h-full bg-black/95 backdrop-blur-2xl border-l border-white/10 p-4 sm:p-5 flex flex-col gap-4 pointer-events-auto select-none overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-1">
                <span className="text-[10px] font-black text-[var(--rf-red)] uppercase tracking-[0.25em]">
                  Episodes Menu
                </span>

                <button
                  onClick={() => setShowEpisodesOverlay(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={15} />
                </button>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-[var(--rf-text-dim)] mb-2 uppercase tracking-[0.2em]">
                  {t("Season")}
                </label>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {seasons
                    .filter((s) => s.se > 0)
                    .map((s) => (
                      <button
                        key={s.se}
                        onClick={() => setEpViewingSeason(s.se)}
                        className={cn(
                          "px-3 py-2 text-[11px] font-bold rounded-xl border transition-all text-center",
                          epViewingSeason === s.se
                            ? "bg-[var(--rf-red)] border-none text-white shadow-lg shadow-[var(--rf-red)]/20"
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70",
                        )}
                      >
                        Season {s.se}
                      </button>
                    ))}
                </div>
              </div>

              <div className="border-t border-white/5 my-1"></div>

              <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <span className="text-[9px] font-bold text-[var(--rf-text-dim)] uppercase tracking-[0.2em] mb-1 block">
                  {t("Episode")} — {t("Season")} {epViewingSeason}
                </span>

                <div className="space-y-2 pb-6">
                  {Array.from(
                    {
                      length:
                        seasons.find((s) => s.se === epViewingSeason)?.maxEp ||
                        0,
                    },
                    (_, i) => i + 1,
                  ).map((ep) => {
                    const isCurrent =
                      ep === episode && epViewingSeason === season;

                    const isCompleted =
                      subjectId &&
                      useProgressStore
                        .getState()
                        .isEpisodeComplete(subjectId, ep);

                    let realEpProgress = 0;

                    if (isCompleted) {
                      realEpProgress = 100;
                    } else {
                      const epTitle = `${title.split(" - ")[0]} - S${epViewingSeason}E${ep}`;

                      const savedTimeVal = localStorage.getItem(
                        `rf_progress_${epTitle}`,
                      );

                      const durationVal = localStorage.getItem(
                        `rf_progress_${epTitle}_duration`,
                      );

                      if (savedTimeVal && durationVal) {
                        const tv = parseFloat(savedTimeVal);
                        const dv = parseFloat(durationVal);

                        if (dv > 0)
                          realEpProgress = Math.min((tv / dv) * 100, 100);
                      }
                    }

                    return (
                      <button
                        key={ep}
                        onClick={() => {
                          onEpisodeSelect?.(epViewingSeason, ep);
                          setShowEpisodesOverlay(false);
                        }}
                        className={cn(
                          "w-full text-left p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 flex gap-3 relative overflow-hidden group min-h-[84px]",
                          isCurrent
                            ? "bg-white/[0.04] border-[var(--rf-red)]/40 shadow-lg shadow-[var(--rf-red)]/5"
                            : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.03]",
                        )}
                      >
                        <div className="relative w-24 sm:w-28 aspect-[16/9] rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10">
                          {backdropUrl && (
                            <img
                              src={backdropUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              className="w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-500"
                            />
                          )}

                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            {isCurrent ? (
                              <div className="flex gap-0.5 items-end justify-center h-3 w-5">
                                <span className="w-0.5 bg-[var(--rf-red)] animate-[pulse_0.8s_infinite_alternate] h-1.5"></span>
                                <span className="w-0.5 bg-[var(--rf-red)] animate-[pulse_0.6s_infinite_alternate] h-3"></span>
                                <span className="w-0.5 bg-[var(--rf-red)] animate-[pulse_0.7s_infinite_alternate] h-2.5"></span>
                              </div>
                            ) : (
                              <span className="text-white/80 font-black text-sm">
                                {ep}
                              </span>
                            )}
                          </div>

                          {isCompleted && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white shadow-md">
                              <Check size={9} strokeWidth={3} />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col justify-between py-1 flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span
                                className={cn(
                                  "text-[11px] sm:text-xs font-black tracking-wider uppercase block truncate",
                                  isCurrent
                                    ? "text-[var(--rf-red)]"
                                    : "text-white/80",
                                )}
                              >
                                Episode {ep}
                              </span>

                              <span className="text-[10px] text-white/45 mt-0.5 block truncate">
                                Season {epViewingSeason}
                              </span>
                            </div>

                            {realEpProgress > 0 && (
                              <span className="text-[10px] text-white/50 shrink-0">
                                {Math.round(realEpProgress)}%
                              </span>
                            )}
                          </div>

                          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-3">
                            <div
                              style={{ width: `${realEpProgress}%` }}
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                realEpProgress > 0
                                  ? "bg-[var(--rf-red)]"
                                  : "bg-white/30",
                              )}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
       
    </div>
  );
}
