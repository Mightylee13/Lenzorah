/**
 * PageLocked.tsx — Redesigned to match global Maintenance.tsx style
 * Shows page name, countdown timer, and allows navigation elsewhere.
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Lock,
  Clock,
  RefreshCw,
  Wrench,
  Activity,
  ArrowLeft,
  Home,
  Mail,
  Compass,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageLock } from "../stores/useMaintenanceStore";

interface PageLockedProps {
  lock: PageLock;
  pageName?: string;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0)
    return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export default function PageLocked({ lock, pageName }: PageLockedProps) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState<number | null>(
    lock.unlocksAt ? Math.max(0, lock.unlocksAt - Date.now()) : null,
  );

  useEffect(() => {
    if (!lock.unlocksAt) return;
    const id = setInterval(() => {
      const left = lock.unlocksAt! - Date.now();
      if (left <= 0) {
        setTimeLeft(0);
        clearInterval(id);
        setTimeout(() => window.location.reload(), 600);
      } else {
        setTimeLeft(left);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lock.unlocksAt]);

  const progress = lock.unlocksAt
    ? Math.max(
        0,
        Math.min(
          100,
          (timeLeft! / (lock.unlocksAt - (lock.unlocksAt - (timeLeft || 1)))) *
            100,
        ),
      )
    : 0;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#030305] text-white p-6 relative overflow-hidden">
      {/* Ambient background lights — match Maintenance.tsx */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-[#4490ff]/[0.04] blur-[130px] animate-float-slow" />
        <div className="absolute -bottom-[15%] -right-[15%] w-[55vw] h-[55vw] rounded-full bg-purple-600/[0.04] blur-[140px] animate-float-mid" />
      </div>

      <div className="relative z-10 w-full max-w-[580px] flex flex-col items-center text-center">
        {/* Status badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4490ff]/10 border border-[#4490ff]/20 mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4490ff] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4490ff]" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#4490ff] flex items-center gap-1">
            <Lock size={10} /> PAGE TEMPORARILY UNAVAILABLE
          </span>
        </motion.div>

        {/* Brand */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex items-center gap-3 mb-6"
        >
          <img
            src="/favicon.png"
            alt=""
            className="w-10 h-10 object-contain animate-spin-slow"
          />
          <img
            src="/logo.png"
            alt="Lenzorah"
            className="h-6 w-auto object-contain"
          />
        </motion.div>

        {/* Headline with page name */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-white leading-tight"
        >
          {pageName ? (
            <>
              <span className="text-[#4490ff]">{pageName}</span>
              <br />
              <span className="text-white/60 text-2xl">is locked</span>
            </>
          ) : (
            "PAGE LOCKED"
          )}
        </motion.h1>

        {/* Main glass card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-2xl p-6 sm:p-8 shadow-2xl mb-8 flex flex-col gap-5"
        >
          {/* Message */}
          <p className="text-white/70 text-sm leading-relaxed font-medium">
            {lock.message ||
              "This page is temporarily unavailable. Please check back soon."}
          </p>

          {/* Status indicators */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.01] border border-white/5 text-left">
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <Wrench size={16} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-white/50 tracking-wider">
                  {pageName || "Page"}
                </h4>
                <p className="text-[11px] font-bold text-orange-400">
                  Restricted
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.01] border border-white/5 text-left">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Activity size={16} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-white/50 tracking-wider">
                  Other Pages
                </h4>
                <p className="text-[11px] font-bold text-emerald-400">
                  Fully Available
                </p>
              </div>
            </div>
          </div>

          {/* Countdown timer */}
          {timeLeft !== null && (
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{
                background: "rgba(68,144,255,0.06)",
                border: "1px solid rgba(68,144,255,0.15)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#4490ff] flex items-center gap-1.5">
                  <Clock size={10} /> Auto-unlocks in
                </span>
                <span className="text-[9px] font-bold text-white/40">
                  {timeLeft <= 0 ? "Unlocking..." : "counting down"}
                </span>
              </div>
              <p className="text-3xl font-black text-white tabular-nums text-center">
                {timeLeft > 0 ? formatCountdown(timeLeft) : "Unlocking..."}
              </p>
              {/* Progress bar */}
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "#4490ff" }}
                  initial={{ width: "100%" }}
                  animate={{
                    width:
                      timeLeft && lock.unlocksAt
                        ? `${Math.max(0, (timeLeft / (lock.unlocksAt - Date.now() + timeLeft)) * 100)}%`
                        : "0%",
                  }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>
            </div>
          )}

          {/* No timer message */}
          {timeLeft === null && (
            <div className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
              <span className="text-white/40 font-semibold uppercase tracking-wider text-[10px]">
                Status
              </span>
              <span className="text-white/80 font-bold flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin text-[#4490ff]" />{" "}
                Manual unlock required
              </span>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold uppercase transition-all active:scale-95"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <ArrowLeft size={13} /> Go Back
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase text-white transition-all active:scale-95"
              style={{
                background: "#4490ff",
                boxShadow: "0 4px 16px rgba(68,144,255,0.3)",
              }}
            >
              <Home size={13} /> Home
            </button>
          </div>
        </motion.div>

        {/* Footer links */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-wrap justify-center items-center gap-6 text-xs text-white/40 font-bold"
        >
          <a
            href="mailto:support@lenzorah.com"
            className="hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Mail size={13} /> Contact Support
          </a>
          <span className="text-white/10">|</span>
          <button
            onClick={() => navigate("/")}
            className="hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Compass size={13} /> Browse Other Pages
          </button>
        </motion.div>
      </div>
    </div>
  );
}
