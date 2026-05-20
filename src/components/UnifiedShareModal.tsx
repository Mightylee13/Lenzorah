import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Share2,
  Download,
  Check,
  QrCode,
  Image,
  Sparkles,
  Instagram,
  MessageSquare,
  Link2,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";

interface UnifiedShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  coverUrl?: string;
  rating?: string | number;
  year?: string;
  genre?: string;
  description?: string;
  url: string;
}

function generateQRCode(text: string, size: number = 256): string {
  const encoded = encodeURIComponent(text);

  return `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=${size}x${size}&bgcolor=0b0b0f&color=ffffff&format=png&margin=10`;
}

export default function UnifiedShareModal({
  isOpen,
  onClose,
  title,
  coverUrl,
  rating,
  year,
  genre,
  url,
}: UnifiedShareModalProps) {
  const [activeTab, setActiveTab] = useState<"poster" | "qr" | "caption">(
    "poster",
  );

  const [format, setFormat] = useState<"cinematic" | "story">("cinematic");

  const [copied, setCopied] = useState(false);

  const [selectedCaptionStyle, setSelectedCaptionStyle] = useState<
    "standard" | "hype" | "critic"
  >("standard");

  const qrUrl = generateQRCode(url, 320);

  const siteDomain = window.location.host || "lenzorah.name.ng";

  // ============================================
  // DOWNLOAD IMAGE
  // ============================================

  const handleDownloadPoster = async () => {
    if (!coverUrl) return;

    try {
      const response = await fetch(coverUrl);
      const blob = await response.blob();

      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${title}.jpg`;
      link.click();

      URL.revokeObjectURL(objectUrl);

      toast.success("Image saved!");
    } catch {
      toast.error("Failed to save image");
    }
  };

  // ============================================
  // SHARE
  // ============================================

  const handleShare = async () => {
    if (!coverUrl) return;

    try {
      const response = await fetch(coverUrl);
      const blob = await response.blob();

      const file = new File([blob], `${title}.jpg`, {
        type: blob.type,
      });

      if (
        navigator.share &&
        navigator.canShare?.({
          files: [file],
        })
      ) {
        await navigator.share({
          files: [file],
          title,
          text: `Watch ${title} on Lenzorah\n${url}`,
        });

        toast.success("Shared!");
      } else {
        handleDownloadPoster();
      }
    } catch {
      toast.error("Unable to share");
    }
  };

  // ============================================
  // COPY LINK
  // ============================================

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);

      setCopied(true);

      toast.success("Link copied!");

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  // ============================================
  // GET CAPTION TEXT HELPER
  // ============================================

  const getCaptionText = (style: "standard" | "hype" | "critic") => {
    if (style === "hype") {
      return `🚨 MUST-WATCH ALERT! 🚨\nYou need to watch **${title.toUpperCase()}** on Lenzorah tonight! 🎬🍿\n\n⭐ Rated ${rating || "8.5"}/10 IMDb\n⚡ 100% Free • Ultra HD Quality\n🚫 Zero Ads • Unlimited Free Downloads\n\nStream instantly:\n🔗 ${url}`;
    }
    if (style === "critic") {
      return `✨ Lenzorah SELECTS: *${title.toUpperCase()}* ✨\n"A stunning cinematic experience that you can't miss." 🤯\n\n🎬 Genre: ${genre || "Cinematic"}\n⭐ IMDb Rating: ${rating || "8.5"}/10\n🍿 Stream now in Ultra HD with Zero Ads!\n\nStream for free:\n🔗 ${url}`;
    }
    return `🍿 NOW STREAMING ON Lenzorah 🔥\n🎬 ${title.toUpperCase()}\n⭐ ${rating || "7.4"}/10 IMDb\n📺 Ultra HD Quality\n⬇️ Unlimited Free Downloads\n🚫 Zero Annoying Ads\n\nStream instantly for free:\n🔗 ${url}`;
  };

  // ============================================
  // COPY CAPTION
  // ============================================

  const handleCopyCaption = async () => {
    const caption = getCaptionText(selectedCaptionStyle);

    try {
      await navigator.clipboard.writeText(caption);

      toast.success("Caption copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* BACKDROP */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl" />

        {/* RED GLOW */}
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full bg-red-600/10 blur-[160px] -translate-x-1/2 -translate-y-1/2" />

        {/* MODAL */}
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.95,
            y: 10,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            scale: 0.95,
            y: 10,
          }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 24,
          }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[480px] rounded-[32px] overflow-hidden border border-white/10 bg-[#0c0c11]/95 backdrop-blur-2xl shadow-2xl"
        >
          {/* TOP BORDER */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/70 to-transparent" />

          {/* CLOSE */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={16} />
          </button>

          {/* HEADER */}
          <div className="px-6 pt-7 pb-4 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400 mb-3">
              <Sparkles size={10} />
              Share
            </span>

            <h2 className="text-white text-xl font-black tracking-tight leading-tight px-6">
              {title}
            </h2>

            <p className="text-white/40 text-[11px] mt-1">Share with friends</p>
          </div>

          {/* TABS */}
          <div className="px-6 mb-5">
            <div className="flex gap-1 p-1 rounded-2xl border border-white/5 bg-white/[0.03]">
              {[
                {
                  key: "poster",
                  label: "Poster",
                  icon: Image,
                },
                {
                  key: "qr",
                  label: "QR",
                  icon: QrCode,
                },
                {
                  key: "caption",
                  label: "Caption",
                  icon: MessageSquare,
                },
              ].map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.key}
                    onClick={() =>
                      setActiveTab(tab.key as "poster" | "qr" | "caption")
                    }
                    className={`flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold transition-all ${
                      activeTab === tab.key
                        ? "bg-white/10 text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CONTENT */}
          <div className="px-6 pb-6">
            {/* ========================================= */}
            {/* POSTER */}
            {/* ========================================= */}

            {activeTab === "poster" && (
              <div className="flex flex-col items-center gap-4">
                {/* FORMAT */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormat("cinematic")}
                    className={`px-4 h-9 rounded-xl border text-[10px] font-bold uppercase tracking-wide transition-all ${
                      format === "cinematic"
                        ? "bg-white/10 border-white/15 text-white"
                        : "border-white/5 text-white/40"
                    }`}
                  >
                    Cinematic
                  </button>

                  <button
                    onClick={() => setFormat("story")}
                    className={`px-4 h-9 rounded-xl border text-[10px] font-bold uppercase tracking-wide transition-all ${
                      format === "story"
                        ? "bg-white/10 border-white/15 text-white"
                        : "border-white/5 text-white/40"
                    }`}
                  >
                    Story
                  </button>
                </div>

                {/* CARD */}
                <div
                  className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl shadow-black/50 ${
                    format === "story"
                      ? "w-[280px] sm:w-[310px]"
                      : "w-full max-w-[500px]"
                  }`}
                  style={{
                    aspectRatio: format === "story" ? "10 / 13" : "19 / 16",
                  }}
                >
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
                      No image available
                    </div>
                  )}

                  {/* OVERLAY */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/10" />

                  {/* CONTENT */}
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    {/* TAGS */}
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      {year && (
                        <span className="px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[9px] font-semibold text-white/85">
                          {year}
                        </span>
                      )}

                      {genre && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/15 backdrop-blur-md border border-red-500/20 text-[9px] font-semibold text-red-300 max-w-[100px] truncate">
                          {genre.split(",")[0].trim()}
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[9px] font-semibold text-white/85">
                        HD Quality
                      </span>
                    </div>

                    {/* TITLE */}
                    <h2
                      className={`font-black text-white tracking-tight leading-[0.95] drop-shadow-2xl line-clamp-2 ${
                        title.length > 40
                          ? "text-sm sm:text-base"
                          : title.length > 24
                            ? "text-lg sm:text-xl"
                            : title.length > 15
                              ? "text-xl sm:text-2xl"
                              : "text-2xl sm:text-3xl"
                      }`}
                      style={{
                        wordBreak: "break-word",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {title}
                    </h2>

                    {/* FOOTER */}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      {/* LEFT */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-950/40 shrink-0">
                          <span className="text-white text-xs font-black">
                            ▶
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="text-white text-xs font-semibold truncate">
                            Watch Now
                          </p>

                          <p className="text-white/50 text-[10px] truncate">
                            {siteDomain}
                          </p>
                        </div>
                      </div>

                      {/* RATING */}
                      {rating && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shrink-0">
                          <span className="text-yellow-400 text-xs">★</span>

                          <span className="text-white text-xs font-bold">
                            {rating}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="w-full flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadPoster}
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase text-white/80"
                    >
                      <Download size={14} />
                      Save
                    </button>

                    <button
                      onClick={handleShare}
                      className="h-12 rounded-2xl bg-red-500 hover:bg-red-600 transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase text-white"
                    >
                      <Share2 size={14} />
                      Share
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      handleDownloadPoster();
                      toast.success("Saved for Instagram!");
                    }}
                    className="h-12 rounded-2xl border border-pink-500/10 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 flex items-center justify-center gap-2 text-[11px] font-bold uppercase text-pink-300"
                  >
                    <Instagram size={14} />
                    Instagram Story
                  </button>
                </div>
              </div>
            )}

            {/* ========================================= */}
            {/* QR TAB */}
            {/* ========================================= */}

            {activeTab === "qr" && (
              <div className="flex flex-col items-center gap-5 py-2">
                <div className="relative p-5 rounded-[30px] bg-white/[0.03] border border-white/10">
                  <div className="relative rounded-2xl overflow-hidden">
                    <img
                      src={qrUrl}
                      alt="QR Code"
                      className="w-[210px] h-[210px]"
                    />

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center">
                        <span className="text-red-500 text-sm font-black">
                          R
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-white font-bold text-sm">Scan to Watch</p>

                  <p className="text-white/40 text-xs mt-1">
                    Open instantly on any device
                  </p>
                </div>

                <div className="w-full flex flex-col gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="h-12 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase text-white/80"
                  >
                    {copied ? (
                      <Check size={14} className="text-green-400" />
                    ) : (
                      <Link2 size={14} />
                    )}

                    {copied ? "Copied" : "Copy Link"}
                  </button>
                </div>
              </div>
            )}

            {/* ========================================= */}
            {/* CAPTION TAB */}
            {/* ========================================= */}

            {activeTab === "caption" && (
              <div className="flex flex-col gap-4">
                {/* AI / Template Selector */}
                <div className="flex gap-1.5 p-1 rounded-xl bg-white/[0.02] border border-white/5">
                  {[
                    { key: "standard", label: "Standard 🍿", icon: Sparkles },
                    { key: "hype", label: "AI Hype 🔥", icon: Sparkles },
                    { key: "critic", label: "AI Critic 🎬", icon: Sparkles },
                  ].map((tpl) => (
                    <button
                      key={tpl.key}
                      onClick={() => setSelectedCaptionStyle(tpl.key as any)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        selectedCaptionStyle === tpl.key
                          ? "bg-white/10 text-white border border-white/10"
                          : "text-white/40 hover:text-white/70 border border-transparent"
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-4 max-h-[220px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-white/80 font-medium font-sans">
                    {getCaptionText(selectedCaptionStyle)}
                  </pre>
                </div>

                <button
                  onClick={handleCopyCaption}
                  className="h-12 rounded-2xl bg-red-500 hover:bg-red-600 transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase text-white shadow-lg shadow-red-950/20"
                >
                  <Copy size={14} />
                  Copy Caption
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
