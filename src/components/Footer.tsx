import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="relative border-t border-[var(--rf-border)] mt-auto">
      {/* Ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[var(--rf-red)]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-10 md:py-14 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block mb-4">
              <img
                src="/logo.png"
                alt="RUNFlix Entertainment"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-[var(--rf-text-dim)] leading-relaxed max-w-[240px]">
              Your premium destination for movies and TV series downloads. Explore, discover, and download in stunning quality.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--rf-text-muted)] mb-3">Navigate</h4>
            <div className="space-y-2">
              {['Home', 'Explore', 'Anime', 'Search', 'Downloads'].map((link) => (
                <Link
                  key={link}
                  to={link === 'Home' ? '/' : `/${link.toLowerCase()}`}
                  className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors"
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--rf-text-muted)] mb-3">Categories</h4>
            <div className="space-y-2">
              <Link to="/explore" className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors">Movies</Link>
              <Link to="/explore" className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors">TV Series</Link>
              <Link to="/trending" className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors">Trending</Link>
              <Link to="/collections" className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors">Collections</Link>
            </div>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--rf-text-muted)] mb-3">Quality</h4>
            <div className="flex flex-wrap gap-1.5">
              {['4K', '1080p', '720p', '480p', 'HDR'].map((q) => (
                <span
                  key={q}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg glass-2 text-[var(--rf-text-dim)]"
                >
                  {q}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[var(--rf-border)] flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--rf-text-dim)] flex items-center gap-1.5">
            <img src="/favicon.png" alt="" className="w-4 h-4 object-contain opacity-50" aria-hidden="true" />
            © {new Date().getFullYear()} RUNFlix Entertainment. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[var(--rf-text-dim)] hover:text-white cursor-pointer transition-colors">Privacy</span>
            <span className="text-[11px] text-[var(--rf-text-dim)] hover:text-white cursor-pointer transition-colors">Terms</span>
            <span className="text-[11px] text-[var(--rf-text-dim)] hover:text-white cursor-pointer transition-colors">Contact</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
