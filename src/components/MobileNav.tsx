import { useLocation, useNavigate } from "react-router-dom";
import { Home, Compass, Flame, Bookmark, History,Trophy } from "lucide-react";
import { cn } from "../utils/cn";

const NAV_ITEMS = [
  { icon: Home,    label: "Home",     path: "/" },
  { icon: Compass, label: "Explore",  path: "/explore" },
  { icon: Trophy,  label: "Sports",   path: "/sports",   center: true },
  { icon: Flame,   label: "Trending", path: "/trending" },
  { icon: History, label: "History",  path: "/history" },
];

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isWatch = location.pathname.startsWith("/watch");
  const isAdmin = location.pathname.startsWith("/daratech");

  if (isWatch || isAdmin) return null;

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[111] md:hidden">
      <div
        className="flex items-center gap-4 px-7 py-1.5 rounded-[32px] border border-white/[0.06]"
        style={{
          background: "rgba(10, 10, 15, 0.45)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          boxShadow:
            "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
          const isActive =
            path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(path);

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "relative flex items-center justify-center w-11 h-9 rounded-2xl transition-all duration-200",
                isActive
                  ? "text-blue-300 scale-110"
                  : "text-white/40 active:scale-90",
              )}
              aria-label={label}
            >
              {isActive && (
                <span className="absolute inset-0 rounded-2xl bg-blue-400/10" />
              )}

              <Icon
                size={20}
                strokeWidth={isActive ? 2.2 : 1.6}
                className="relative z-10 transition-all duration-300"
                style={
                  isActive
                    ? {
                        color: "#93c5fd",
                        filter:
                          "drop-shadow(0 0 4px rgba(147,197,253,1)) drop-shadow(0 0 12px rgba(96,165,250,1)) drop-shadow(0 0 30px rgba(96,165,250,0.9)) drop-shadow(0 0 60px rgba(147,197,253,0.7))",
                      }
                    : {}
                }
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
