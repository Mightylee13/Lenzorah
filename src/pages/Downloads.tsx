import { Trash2, Film, FileText, Download as DownloadIcon, Clock, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDownloadStore } from './MovieDetails/hooks/useDownloadStore';
import { getRelativeTime } from '../utils/format';
import { useSEO } from '../hooks/useSEO';

export default function Downloads() {
  useSEO({ title: 'Downloads', description: 'Your download history and queue' });

  const history = useDownloadStore((state) => state.history);
  const clearHistory = useDownloadStore((state) => state.clearHistory);
  const removeFromHistory = useDownloadStore((state) => state.removeFromHistory);

  const movieCount = history.filter((h) => h.type === 'movie').length;
  const subtitleCount = history.filter((h) => h.type === 'subtitle').length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen px-4 md:px-10 max-w-4xl mx-auto w-full py-4 md:py-8"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <HardDrive size={24} className="text-[var(--rf-red)]" />
            My Downloads
          </h1>
          <p className="text-sm text-[var(--rf-text-dim)]">
            History of your recent downloads and subtitles
          </p>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-2 text-xs text-[var(--rf-text-dim)]">
              <span className="badge badge-quality">{movieCount} movies</span>
              <span className="badge badge-type">{subtitleCount} subtitles</span>
            </div>

            <button
              onClick={clearHistory}
              className="flex items-center gap-2 px-3 py-2 glass-2 rounded-xl text-xs font-semibold text-[var(--rf-text-muted)] hover:text-[var(--rf-red)] hover:bg-[var(--rf-red)]/5 transition-all"
            >
              <Trash2 size={14} />
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* ============ EMPTY STATE ============ */}
      {history.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-2 rounded-2xl p-10 md:p-14 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
            <DownloadIcon size={32} className="text-[var(--rf-text-dim)]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Downloads Yet</h3>
          <p className="text-sm text-[var(--rf-text-dim)] max-w-sm mx-auto leading-relaxed">
            When you download movies, TV episodes, or subtitles, they will appear here in your download history.
          </p>
        </motion.div>
      )}

      {/* ============ DOWNLOAD LIST ============ */}
      {history.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {history
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((item, idx) => (
                <motion.div
                  key={`${item.id}-${item.timestamp}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8, height: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2) }}
                  className="group flex items-center justify-between p-4 glass-2 rounded-xl hover:bg-white/[0.06] transition-all"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    {/* Icon */}
                    <div className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                      item.type === 'movie'
                        ? 'bg-[var(--rf-red)]/10 text-[var(--rf-red)]'
                        : 'bg-blue-500/10 text-blue-400'
                    )}>
                      {item.type === 'movie' ? <Film size={18} /> : <FileText size={18} />}
                    </div>

                    {/* Info */}
                    <div className="min-w-0">
                      <h4 className="font-semibold text-white text-sm truncate mb-0.5">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--rf-text-dim)]">
                        <span className="truncate max-w-[200px]">{item.filename}</span>
                        <span className="shrink-0 flex items-center gap-1">
                          <Clock size={9} />
                          {getRelativeTime(item.timestamp)}
                        </span>
                        {item.quality && (
                          <span className="badge badge-quality text-[8px] py-0 px-1.5">{item.quality}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => removeFromHistory(item.id)}
                    className="p-2 rounded-lg text-[var(--rf-text-dim)] hover:text-[var(--rf-red)] hover:bg-[var(--rf-red)]/5 transition-all shrink-0 ml-3 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label="Remove from history"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// Utility since we can't import cn at top level cleanly with other imports
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
