import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SupportBanner from "./SupportBanner";
import {
  Home,
  Compass,
  Trophy,
  Flame,
  History,
  ExternalLink,
} from "lucide-react";

interface FooterProps {
  sidebarOpen?: boolean;
}

const QUICK_LINKS = [
  { label: "Home", to: "/" },
  { label: "Explore", to: "/explore" },
  { label: "Anime", to: "/anime" },
  { label: "K-Drama", to: "/kdrama" },
  { label: "Sports", to: "/sports" },
  { label: "Trending", to: "/trending" },
  { label: "Collections", to: "/collections" },
  { label: "Downloads", to: "/downloads" },
];

const LEGAL_LINKS = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  { label: "DMCA", to: "/dmca" },
  { label: "Contact", to: "/contact" },
];

export default function Footer({ sidebarOpen = false }: FooterProps) {
  const { t } = useTranslation();

  return (
    <>
      <SupportBanner />

      <footer
        className={`
          relative mt-auto border-t border-[var(--rf-border)]
          transition-all duration-300 ease-in-out
          lg:${sidebarOpen ? "ml-[280px]" : "ml-0"}
        `}
      >
        {/* Ambient glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[var(--rf-red)]/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 relative z-10">
          {/* ── DESKTOP FOOTER ── */}
          <div className="hidden md:block py-14">
            <div className="grid grid-cols-4 gap-8 mb-10">
              {/* Brand */}
              <div className="col-span-1">
                <Link to="/" className="inline-block mb-4">
                  <img
                    src="/logo.png"
                    alt="Lenzorah Entertainment"
                    className="h-10 w-auto object-contain"
                  />
                </Link>
                <p className="text-xs text-[var(--rf-text-dim)] leading-relaxed max-w-[240px]">
                  Your destination for movies and TV series downloads. Explore,
                  discover, and stream in stunning quality.
                </p>
              </div>

              {/* Navigation */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--rf-text-muted)] mb-3">
                  {t("Navigate")}
                </h4>
                <div className="space-y-2">
                  {["Home", "Explore", "Anime", "Search", "Downloads"].map(
                    (link) => (
                      <Link
                        key={link}
                        to={link === "Home" ? "/" : `/${link.toLowerCase()}`}
                        className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors"
                      >
                        {link}
                      </Link>
                    ),
                  )}
                </div>
              </div>

              {/* Categories */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--rf-text-muted)] mb-3">
                  {t("Categories")}
                </h4>
                <div className="space-y-2">
                  <Link
                    to="/explore"
                    className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors"
                  >
                    Movies
                  </Link>
                  <Link
                    to="/explore"
                    className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors"
                  >
                    {t("Series")}
                  </Link>
                  <Link
                    to="/trending"
                    className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors"
                  >
                    Trending
                  </Link>
                  <Link
                    to="/collections"
                    className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors"
                  >
                    Collections
                  </Link>
                </div>
              </div>

              {/* Support */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--rf-text-muted)] mb-3">
                  {t("Support")}
                </h4>
                <div className="space-y-2">
                  <Link
                    to="/contact"
                    className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors"
                  >
                    {t("ContactUs")}
                  </Link>
                  <Link
                    to="/dmca"
                    className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors"
                  >
                    DMCA
                  </Link>
                  <Link
                    to="/terms"
                    className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors"
                  >
                    {t("Terms")}
                  </Link>
                  <Link
                    to="/privacy"
                    className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors"
                  >
                    {t("Privacy")}
                  </Link>
                </div>
              </div>
            </div>

            {/* Desktop bottom bar */}
            <div className="pt-6 border-t border-[var(--rf-border)] flex items-center justify-between gap-3">
              <p className="text-[11px] text-[var(--rf-text-dim)] flex items-center gap-1.5">
                <img
                  src="/favicon.png"
                  alt=""
                  className="w-4 h-4 object-contain opacity-50"
                />
                © {new Date().getFullYear()} Lenzorah Entertainment. All rights
                reserved.
              </p>
              <div className="flex items-center gap-4">
                {LEGAL_LINKS.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="text-[11px] text-[var(--rf-text-dim)] hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── MOBILE FOOTER ── */}
          <div className="md:hidden py-8 pb-32 space-y-8">
            {/* Brand row */}
            <div className="flex items-center justify-between">
              <Link to="/">
                <img
                  src="/logo.png"
                  alt="Lenzorah"
                  className="h-8 w-auto object-contain"
                />
              </Link>
              <span
                className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(68,144,255,0.08)",
                  border: "1px solid rgba(68,144,255,0.15)",
                  color: "#4490ff",
                }}
              >
                Free · HD · Fast
              </span>
            </div>

            {/* Quick links grid */}
            <div>
              <p
                className="text-[9px] font-black uppercase tracking-widest mb-3"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Quick Links
              </p>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_LINKS.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-center transition-all active:scale-95"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <span className="text-[10px] font-bold text-white/60">
                      {l.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal pills */}
            <div className="flex flex-wrap gap-2">
              {LEGAL_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Divider + copyright */}
            <div
              className="pt-4 border-t flex items-center justify-between"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <p
                className="text-[10px]"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                © {new Date().getFullYear()} Lenzorah Entertainment
              </p>
              <p
                className="text-[10px]"
                style={{ color: "rgba(255,255,255,0.15)" }}
              >
                All rights reserved
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
