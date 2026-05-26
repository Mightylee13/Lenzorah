import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Compass,
  Search,
  Download,
  Heart,
  Tv,
  Trophy,
  Clock,
  Radio,
} from "lucide-react";
import { cn } from "../utils/cn";
import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const pillStyle = {
  background: "rgba(10,10,15,0.55)",
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
};

export default function Sidebar({ isOpen, onClose, isMobile }: SidebarProps) {
  const location = useLocation();
  const { t } = useTranslation();

  const navLinks = [
    { name: t("Home"), path: "/", icon: Home },
    { name: t("Search"), path: "/search", icon: Search },
    { name: t("Explore"), path: "/explore", icon: Compass },
    {
      name: t("Anime"),
      path: "/anime",
      icon: Tv,
      color: "text-fuchsia-400",
      activeBg: "bg-fuchsia-500/10 border-fuchsia-500/20",
    },
    {
      name: t("Kdrama"),
      path: "/kdrama",
      icon: Tv,
      color: "text-rose-400",
      activeBg: "bg-rose-500/10 border-rose-500/20",
    },
    {
      name: t("Sports"),
      path: "/sports",
      icon: Trophy,
      color: "text-emerald-400",
      activeBg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      name: t("Lenz Mode"),
      path: "/run-mode",
      icon: Radio,
      color: "text-[var(--rf-red)]",
      activeBg: "bg-red-500/10 border-red-500/20",
    },
    { name: t("History"), path: "/history", icon: Clock },
    { name: t("Watchlist"), path: "/watchlist", icon: Heart },
    { name: t("Downloads"), path: "/downloads", icon: Download },
  ];

  useEffect(() => {
    if (isMobile) onClose();
  }, [location.pathname]);

  const sidebarWidth = isOpen ? "260px" : "64px";

  const sidebarContent = (
    <div
      className="flex flex-col h-full overflow-hidden relative"
      style={{
        width: isMobile ? "260px" : sidebarWidth,
        transition: "width 0.3s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <nav className="flex-1 overflow-x-hidden px-2.5 py-4 relative z-10 flex flex-col gap-1">
        {navLinks.map((link, i) => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;
          const color = link.color || "text-[var(--rf-text-muted)]";
          const activeBg =
            link.activeBg || "bg-[var(--rf-red)]/10 border-[var(--rf-red)]/20";

          return (
            <motion.div
              key={link.path}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.025, duration: 0.22 }}
            >
              <Link
                to={link.path}
                onClick={() => {
                  if (isMobile) onClose();
                }}
                title={!isOpen && !isMobile ? link.name : undefined}
                className={cn(
                  "group relative flex items-center rounded-2xl border overflow-hidden transition-all duration-300",
                  isOpen || isMobile
                    ? "gap-3 px-3 py-2.5"
                    : "justify-center py-2.5 px-0",
                  isActive
                    ? cn(
                        "text-white border backdrop-blur-xl shadow-lg",
                        activeBg,
                      )
                    : cn(
                        "border-transparent",
                        color,
                        "hover:bg-white/[0.045] hover:text-white",
                      ),
                )}
                style={isActive ? pillStyle : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-white/[0.03]"
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  />
                )}

                <Icon
                  size={18}
                  className={cn(
                    "relative z-10 shrink-0 transition-all duration-300",
                    isActive && "scale-110",
                  )}
                />

                {(isOpen || isMobile) && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="relative z-10 text-[13px] font-semibold truncate"
                  >
                    {link.name}
                  </motion.span>
                )}

                {/* Tooltip when collapsed */}
                {!isOpen && !isMobile && (
                  <span
                    className="absolute left-full ml-3 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 z-[999] shadow-2xl"
                    style={pillStyle}
                  >
                    {link.name}
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>
    </div>
  );

  // MOBILE
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[105] bg-black/35 backdrop-blur-md"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="fixed top-0 left-0 bottom-0 z-[110] flex flex-col overflow-hidden"
              style={{
                width: "260px",
                background: "rgba(10,10,15,0.45)",
                backdropFilter: "blur(32px) saturate(180%)",
                WebkitBackdropFilter: "blur(32px) saturate(180%)",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                paddingTop: "calc(60px + var(--safe-top))",
                boxShadow: "0 0 40px rgba(0,0,0,0.38)",
              }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  // DESKTOP
  return (
    <aside
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        transition: "width 0.3s cubic-bezier(0.22,1,0.36,1)",
        background: "rgba(10,10,15,0.45)",
        backdropFilter: "blur(32px) saturate(180%)",
        WebkitBackdropFilter: "blur(32px) saturate(180%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        position: "fixed",
        top: "calc(56px + var(--safe-top))",
        left: 0,
        height: "calc(100vh - 56px - var(--safe-top))",
        flexShrink: 0,
        overflowY: "auto",
        overflowX: "hidden",
        zIndex: 100,
        boxShadow: "0 0 30px rgba(0,0,0,0.18)",
      }}
      className="scrollbar-hide hidden md:flex flex-col"
    >
      {sidebarContent}
    </aside>
  );
}
