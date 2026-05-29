/**
 * PageLocked.tsx
 * Shown when a specific page is locked by admin.
 * Place in src/pages/PageLocked.tsx
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Lock, Clock, ArrowLeft, Home, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageLock } from "../stores/useMaintenanceStore";

interface PageLockedProps {
  lock: PageLock;
  pageName?: string;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function PageLocked({ lock, pageName }: PageLockedProps) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState<number | null>(
    lock.unlocksAt ? lock.unlocksAt - Date.now() : null,
  );

  useEffect(() => {
    if (!lock.unlocksAt) return;
    const id = setInterval(() => {
      const left = lock.unlocksAt! - Date.now();
      if (left <= 0) {
        setTimeLeft(0);
        clearInterval(id);
        // Reload to re-check lock status
        setTimeout(() => window.location.reload(), 500);
      } else {
        setTimeLeft(left);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lock.unlocksAt]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "#030305" }}
    >
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[120px]"
          style={{ background: "rgba(68,144,255,0.05)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full blur-[100px]"
          style={{ background: "rgba(120,80,255,0.04)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm flex flex-col items-center text-center gap-6"
      >
        {/* Icon */}
        <motion.div
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(68,144,255,0)",
              "0 0 0 16px rgba(68,144,255,0.08)",
              "0 0 0 0 rgba(68,144,255,0)",
            ],
          }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: "rgba(68,144,255,0.08)",
            border: "1px solid rgba(68,144,255,0.2)",
          }}
        >
          <Lock size={32} style={{ color: "#4490ff" }} />
        </motion.div>

        {/* Text */}
        <div className="space-y-2">
          <div
            className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest mb-1"
            style={{ color: "rgba(68,144,255,0.7)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#4490ff]" />
            Page Temporarily Unavailable
          </div>
          <h1 className="text-2xl font-black text-white">
            {pageName || "This Page"} is Locked
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {lock.message ||
              "This page is currently under maintenance. Check back soon."}
          </p>
        </div>

        {/* Timer */}
        {timeLeft !== null && (
          <div
            className="w-full rounded-2xl p-4 flex flex-col items-center gap-2"
            style={{
              background: "rgba(68,144,255,0.06)",
              border: "1px solid rgba(68,144,255,0.15)",
            }}
          >
            <div
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider"
              style={{ color: "rgba(68,144,255,0.7)" }}
            >
              <Clock size={12} /> Auto-unlocks in
            </div>
            <span className="text-3xl font-black text-white tabular-nums">
              {timeLeft > 0 ? formatCountdown(timeLeft) : "Unlocking..."}
            </span>
            {/* Progress bar */}
            {lock.unlocksAt && (
              <div
                className="w-full h-1 rounded-full overflow-hidden mt-1"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: "#4490ff",
                    width: `${Math.max(0, Math.min(100, (1 - timeLeft / (lock.unlocksAt - (lock.unlocksAt - (timeLeft || 0)))) * 100))}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => navigate("/")}
            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase text-white transition-all active:scale-95"
            style={{
              background: "#4490ff",
              boxShadow: "0 4px 20px rgba(68,144,255,0.3)",
            }}
          >
            <Home size={15} /> Go to Home
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate(-1)}
              className="py-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <ArrowLeft size={13} /> Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="py-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
