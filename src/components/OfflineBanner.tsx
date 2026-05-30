// src/components/OfflineBanner.tsx
// Shows a banner at the top when the user is offline
// with a button to go to their downloads

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { WifiOff, HardDrive, X } from "lucide-react";

const OFFLINE_SAFE_ROUTES = ["/downloads", "/watch-offline"];

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isOnSafePage = OFFLINE_SAFE_ROUTES.some((r) =>
    location.pathname.startsWith(r),
  );

  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };
    const goOnline = () => {
      setIsOffline(false);
      setDismissed(false);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  const show = isOffline && !dismissed && !isOnSafePage;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-3 bg-[#0a0a0a] border-b border-cyan-500/20 shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <WifiOff size={15} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-white text-xs font-black">You're offline</p>
              <p className="text-white/40 text-[11px]">
                No internet connection — only your downloads are available.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate("/downloads")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-[11px] font-black transition-all"
            >
              <HardDrive size={12} /> My Downloads
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all"
            >
              <X size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
