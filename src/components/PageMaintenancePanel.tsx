/**
 * PageMaintenancePanel.tsx — Redesigned
 * Place in src/components/PageMaintenancePanel.tsx
 * Import ONLY in the System workspace of Daratech.tsx
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  Unlock,
  Clock,
  Timer,
  X,
  Loader2,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useMaintenanceStore,
  LOCKABLE_PAGES,
} from "../stores/useMaintenanceStore";

const B = "#4490ff";

// ── Preset timers ─────────────────────────────────────────────────────────────
const TIMER_PRESETS = [
  { label: "15m", ms: 15 * 60 * 1000 },
  { label: "30m", ms: 30 * 60 * 1000 },
  { label: "1h", ms: 60 * 60 * 1000 },
  { label: "2h", ms: 120 * 60 * 1000 },
  { label: "6h", ms: 360 * 60 * 1000 },
  { label: "24h", ms: 1440 * 60 * 1000 },
  { label: "Custom", ms: -1 },
  { label: "None", ms: 0 },
];

function formatTimeLeft(unlocksAt: number) {
  const diff = unlocksAt - Date.now();
  if (diff <= 0) return "Unlocking...";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${s}s left`;
  return `${s}s left`;
}

// ── Lock modal (matches global maintenance style) ─────────────────────────────
function LockModal({
  pageKey,
  pageName,
  onClose,
  onLock,
}: {
  pageKey: string;
  pageName: string;
  onClose: () => void;
  onLock: (msg: string, ms: number | null) => void;
}) {
  const [message, setMessage] = useState(
    `${pageName} is temporarily unavailable. Check back soon.`,
  );
  const [selectedMs, setSelectedMs] = useState<number>(0);
  const [customH, setCustomH] = useState("");
  const [customM, setCustomM] = useState("");
  const [loading, setLoading] = useState(false);

  const isCustom = selectedMs === -1;
  const customMs = isCustom
    ? ((parseInt(customH) || 0) * 60 + (parseInt(customM) || 0)) * 60 * 1000
    : 0;
  const finalMs = isCustom ? customMs : selectedMs;
  const selectedPreset = TIMER_PRESETS.find((p) => p.ms === selectedMs);

  const handleSubmit = async () => {
    setLoading(true);
    await onLock(message, finalMs > 0 ? finalMs : null);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: "rgba(6,6,14,0.98)",
          border: "1px solid rgba(68,144,255,0.2)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Blue top accent */}
        <div
          className="h-0.5 w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${B}, transparent)`,
          }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <Lock size={18} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Lock Page</h3>
              <p className="text-[10px] font-bold" style={{ color: B }}>
                {pageName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <X size={13} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Message */}
          <div className="space-y-1.5">
            <label
              className="text-[9px] font-black uppercase tracking-widest block"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Message shown to visitors
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-xs text-white outline-none resize-none font-sans leading-relaxed"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onFocus={(e) => (e.target.style.borderColor = `${B}55`)}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.08)")
              }
            />
          </div>

          {/* Timer presets */}
          <div className="space-y-2">
            <label
              className="text-[9px] font-black uppercase tracking-widest block"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Auto-unlock timer
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TIMER_PRESETS.map(({ label, ms }) => (
                <button
                  key={label}
                  onClick={() => setSelectedMs(ms)}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all"
                  style={
                    selectedMs === ms
                      ? { background: B, color: "white" }
                      : {
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.45)",
                        }
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom time input */}
            <AnimatePresence>
              {isCustom && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 space-y-0.5">
                      <label
                        className="text-[8px] uppercase font-bold block"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="72"
                        value={customH}
                        onChange={(e) => setCustomH(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none text-center"
                        style={{
                          background: "rgba(0,0,0,0.4)",
                          border: `1px solid ${B}30`,
                        }}
                      />
                    </div>
                    <span className="text-white/40 font-black text-sm mt-4">
                      :
                    </span>
                    <div className="flex-1 space-y-0.5">
                      <label
                        className="text-[8px] uppercase font-bold block"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        Minutes
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={customM}
                        onChange={(e) => setCustomM(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none text-center"
                        style={{
                          background: "rgba(0,0,0,0.4)",
                          border: `1px solid ${B}30`,
                        }}
                      />
                    </div>
                    {parseInt(customH) || parseInt(customM) ? (
                      <div
                        className="mt-4 text-[9px] font-black shrink-0"
                        style={{ color: B }}
                      >
                        {(parseInt(customH) || 0) * 60 +
                          (parseInt(customM) || 0)}
                        m
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timer summary */}
            {finalMs > 0 && (
              <p
                className="text-[9px] flex items-center gap-1"
                style={{ color: `${B}99` }}
              >
                <Clock size={9} />
                Page will auto-unlock after{" "}
                {isCustom
                  ? `${parseInt(customH) || 0}h ${parseInt(customM) || 0}m`
                  : selectedPreset?.label}
              </p>
            )}
            {finalMs === 0 && selectedMs !== -1 && (
              <p
                className="text-[9px]"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                No timer — stays locked until you manually unlock it.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || (isCustom && !finalMs)}
              className="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              style={{
                background: "#dc2626",
                boxShadow: "0 4px 16px rgba(220,38,38,0.3)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={11} className="animate-spin" /> Locking...
                </>
              ) : (
                <>
                  <Lock size={11} /> Lock {pageName}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function PageMaintenancePanel() {
  const { pageLocks, lockPage, unlockPage } = useMaintenanceStore();
  const [modalPage, setModalPage] = useState<{
    key: string;
    label: string;
  } | null>(null);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [, tick] = useState(0);

  // Tick every second to update countdowns
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const getLock = (key: string) =>
    pageLocks.find((p) => p.key === key && p.locked);
  const lockedCount = pageLocks.filter((p) => p.locked).length;

  const handleLock = async (key: string, msg: string, ms: number | null) => {
    await lockPage(key, msg, ms);
    const label = LOCKABLE_PAGES.find((p) => p.key === key)?.label || key;
    toast.success(
      `🔒 ${label} locked${ms ? ` · auto-unlocks in ${Math.round(ms / 60000)}m` : ""}!`,
    );
    setModalPage(null);
  };

  const handleUnlock = async (key: string) => {
    setUnlocking(key);
    await unlockPage(key);
    const label = LOCKABLE_PAGES.find((p) => p.key === key)?.label || key;
    toast.success(`🔓 ${label} unlocked!`);
    setUnlocking(null);
  };

  return (
    <>
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.01)",
          border: "1px solid rgba(68,144,255,0.1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2.5">
            <Lock size={14} style={{ color: B }} />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Per-Page Control
            </h3>
            {lockedCount > 0 && (
              <span
                className="text-[8px] font-black px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                }}
              >
                {lockedCount} locked
              </span>
            )}
          </div>
          <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Lock individual pages with optional timer
          </p>
        </div>

        {/* Page list */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LOCKABLE_PAGES.map(({ key, label, path }) => {
            const lock = getLock(key);
            const isLocked = !!lock;
            const isUnlocking = unlocking === key;

            return (
              <div
                key={key}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                style={{
                  background: isLocked
                    ? "rgba(239,68,68,0.04)"
                    : "rgba(255,255,255,0.02)",
                  border: isLocked
                    ? "1px solid rgba(239,68,68,0.15)"
                    : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {/* Status dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: isLocked ? "#f87171" : "#34d399",
                    boxShadow: `0 0 5px ${isLocked ? "#f87171" : "#34d399"}88`,
                  }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {label}
                  </p>
                  {isLocked && lock?.unlocksAt ? (
                    <p
                      className="text-[9px] font-bold flex items-center gap-1 mt-0.5"
                      style={{ color: "#fbbf24" }}
                    >
                      <Timer size={8} /> {formatTimeLeft(lock.unlocksAt)}
                    </p>
                  ) : (
                    <p
                      className="text-[9px] truncate mt-0.5"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      {path}
                    </p>
                  )}
                </div>

                {/* Action */}
                {isLocked ? (
                  <button
                    onClick={() => handleUnlock(key)}
                    disabled={isUnlocking}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all disabled:opacity-50 shrink-0"
                    style={{
                      background: "rgba(52,211,153,0.08)",
                      border: "1px solid rgba(52,211,153,0.2)",
                      color: "#34d399",
                    }}
                  >
                    {isUnlocking ? (
                      <Loader2 size={9} className="animate-spin" />
                    ) : (
                      <>
                        <Unlock size={9} /> Unlock
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => setModalPage({ key, label })}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all shrink-0"
                    style={{
                      background: "rgba(239,68,68,0.07)",
                      border: "1px solid rgba(239,68,68,0.15)",
                      color: "#f87171",
                    }}
                  >
                    <Lock size={9} /> Lock
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lock modal portal */}
      <AnimatePresence>
        {modalPage && (
          <LockModal
            pageKey={modalPage.key}
            pageName={modalPage.label}
            onClose={() => setModalPage(null)}
            onLock={(msg, ms) => handleLock(modalPage.key, msg, ms)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
