/**
 * PageMaintenancePanel.tsx
 * Drop into the System workspace in Daratech.tsx
 * Import and place below the global maintenance panel.
 *
 * import PageMaintenancePanel from "../../components/PageMaintenancePanel";
 * <PageMaintenancePanel />
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  Unlock,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Timer,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useMaintenanceStore,
  LOCKABLE_PAGES,
} from "../stores/useMaintenanceStore";

const B = "#4490ff";

const TIMER_PRESETS = [
  { label: "15 min", ms: 15 * 60 * 1000 },
  { label: "30 min", ms: 30 * 60 * 1000 },
  { label: "1 hour", ms: 60 * 60 * 1000 },
  { label: "2 hours", ms: 120 * 60 * 1000 },
  { label: "6 hours", ms: 360 * 60 * 1000 },
  { label: "24 hours", ms: 1440 * 60 * 1000 },
  { label: "No timer", ms: 0 },
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

export default function PageMaintenancePanel() {
  const { pageLocks, lockPage, unlockPage } = useMaintenanceStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const getLock = (key: string) => pageLocks.find((p) => p.key === key);

  const handleLock = async (key: string) => {
    setLoading((p) => ({ ...p, [key]: true }));
    const msg =
      messages[key] || `This page is temporarily unavailable. Check back soon.`;
    const timerMs = timers[key] ?? 0;
    try {
      await lockPage(key, msg, timerMs > 0 ? timerMs : null);
      toast.success(
        `🔒 ${LOCKABLE_PAGES.find((p) => p.key === key)?.label} locked${timerMs ? ` for ${TIMER_PRESETS.find((t) => t.ms === timerMs)?.label}` : ""}!`,
      );
      setExpanded(null);
    } catch {
      toast.error("Failed to lock page.");
    } finally {
      setLoading((p) => ({ ...p, [key]: false }));
    }
  };

  const handleUnlock = async (key: string) => {
    setLoading((p) => ({ ...p, [key]: true }));
    try {
      await unlockPage(key);
      toast.success(
        `🔓 ${LOCKABLE_PAGES.find((p) => p.key === key)?.label} unlocked!`,
      );
    } catch {
      toast.error("Failed to unlock page.");
    } finally {
      setLoading((p) => ({ ...p, [key]: false }));
    }
  };

  const lockedCount = pageLocks.filter((p) => p.locked).length;

  return (
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
          <Lock size={15} style={{ color: B }} />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            Per-Page Control
          </h3>
          {lockedCount > 0 && (
            <span
              className="text-[9px] font-black px-2 py-0.5 rounded-full"
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
      <div className="p-4 space-y-2">
        {LOCKABLE_PAGES.map(({ key, label, path }) => {
          const lock = getLock(key);
          const isLocked = lock?.locked ?? false;
          const isExpanded = expanded === key;
          const isLoading = loading[key];

          return (
            <div
              key={key}
              className="rounded-2xl overflow-hidden transition-all"
              style={{
                background: isLocked
                  ? "rgba(239,68,68,0.04)"
                  : "rgba(255,255,255,0.02)",
                border: isLocked
                  ? "1px solid rgba(239,68,68,0.15)"
                  : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {/* Row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Status dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: isLocked ? "#f87171" : "#34d399",
                    boxShadow: `0 0 6px ${isLocked ? "#f87171" : "#34d399"}88`,
                  }}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">{label}</p>
                  <p
                    className="text-[9px]"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    {path}
                  </p>
                  {isLocked && lock?.unlocksAt && (
                    <p
                      className="text-[9px] font-bold mt-0.5 flex items-center gap-1"
                      style={{ color: "#fbbf24" }}
                    >
                      <Timer size={9} /> {formatTimeLeft(lock.unlocksAt)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isLocked ? (
                    <button
                      onClick={() => handleUnlock(key)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-50"
                      style={{
                        background: "rgba(52,211,153,0.1)",
                        border: "1px solid rgba(52,211,153,0.2)",
                        color: "#34d399",
                      }}
                    >
                      {isLoading ? (
                        "..."
                      ) : (
                        <>
                          <Unlock size={10} /> Unlock
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all"
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.15)",
                        color: "#f87171",
                      }}
                    >
                      <Lock size={10} /> Lock
                      {isExpanded ? (
                        <ChevronUp size={10} />
                      ) : (
                        <ChevronDown size={10} />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded lock config */}
              <AnimatePresence>
                {isExpanded && !isLocked && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-4 pb-4 space-y-3"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div className="pt-3 space-y-1">
                        <label
                          className="text-[9px] font-black uppercase tracking-wider block"
                          style={{ color: "rgba(255,255,255,0.4)" }}
                        >
                          Message shown to users
                        </label>
                        <input
                          type="text"
                          value={messages[key] || ""}
                          onChange={(e) =>
                            setMessages((p) => ({
                              ...p,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder={`${label} is temporarily unavailable...`}
                          className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none"
                          style={{
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                          onFocus={(e) =>
                            (e.target.style.borderColor = `${B}55`)
                          }
                          onBlur={(e) =>
                            (e.target.style.borderColor =
                              "rgba(255,255,255,0.08)")
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label
                          className="text-[9px] font-black uppercase tracking-wider block"
                          style={{ color: "rgba(255,255,255,0.4)" }}
                        >
                          Auto-unlock timer
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {TIMER_PRESETS.map(({ label: tLabel, ms }) => (
                            <button
                              key={ms}
                              onClick={() =>
                                setTimers((p) => ({ ...p, [key]: ms }))
                              }
                              className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all"
                              style={
                                (timers[key] ?? 0) === ms
                                  ? { background: B, color: "white" }
                                  : {
                                      background: "rgba(255,255,255,0.04)",
                                      border:
                                        "1px solid rgba(255,255,255,0.08)",
                                      color: "rgba(255,255,255,0.45)",
                                    }
                              }
                            >
                              {ms === 0 ? "No timer" : tLabel}
                            </button>
                          ))}
                        </div>
                        {(timers[key] ?? 0) > 0 && (
                          <p
                            className="text-[9px] flex items-center gap-1 mt-1"
                            style={{ color: "rgba(68,144,255,0.7)" }}
                          >
                            <Clock size={9} /> Page auto-unlocks after{" "}
                            {
                              TIMER_PRESETS.find((t) => t.ms === timers[key])
                                ?.label
                            }
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleLock(key)}
                          disabled={isLoading}
                          className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                          style={{ background: "#dc2626" }}
                        >
                          {isLoading ? (
                            "Locking..."
                          ) : (
                            <>
                              <Lock size={11} /> Lock {label}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setExpanded(null)}
                          className="py-2.5 px-3 rounded-xl text-[10px] transition-all"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.4)",
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
