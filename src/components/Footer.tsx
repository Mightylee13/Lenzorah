import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface FooterProps {
  sidebarOpen?: boolean;
}

export default function Footer({
  sidebarOpen = false,
}: FooterProps) {
  const { t } = useTranslation();

  return (
    <footer
      className={`
        relative mt-auto border-t border-[var(--rf-border)]
        transition-all duration-300 ease-in-out
        lg:${sidebarOpen ? "ml-[280px]" : "ml-0"}
      `}
    >
      {/* Ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[var(--rf-red)]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-10 md:py-14 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block mb-4">
              <img
                src="/logo.png"
                alt="Lenzorah Entertainment"
                className="h-10 w-auto object-contain"
              />
            </Link>

            <p className="text-xs text-[var(--rf-text-dim)] leading-relaxed max-w-[240px]">
              Your destination for movies and TV series downloads.
              Explore, discover, and stream in stunning quality.
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

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[var(--rf-border)] flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--rf-text-dim)] flex items-center gap-1.5">
            <img
              src="/favicon.png"
              alt=""
              className="w-4 h-4 object-contain opacity-50"
              aria-hidden="true"
            />

            © {new Date().getFullYear()} Lenzorah Entertainment.
            All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            <Link
              to="/privacy"
              className="text-[11px] text-[var(--rf-text-dim)] hover:text-white transition-colors"
            >
              Privacy
            </Link>

            <Link
              to="/terms"
              className="text-[11px] text-[var(--rf-text-dim)] hover:text-white transition-colors"
            >
              Terms
            </Link>

            <Link
              to="/dmca"
              className="text-[11px] text-[var(--rf-text-dim)] hover:text-white transition-colors"
            >
              DMCA
            </Link>

            <Link
              to="/contact"
              className="text-[11px] text-[var(--rf-text-dim)] hover:text-white transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}