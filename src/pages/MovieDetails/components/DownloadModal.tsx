import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { HardDriveDownload, Download, ListVideo, Loader2, X } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { Season, SourceItem, SubjectInfo, BatchEpisodeResult } from '../types';
import { EpisodeSelector } from './EpisodeSelector';
import { BatchDownloads } from './BatchDownloads';
import { SourceCard } from './SourceCard';
import { SubtitleList } from './SubtitleList';
import { useDownloadStore } from '../hooks/useDownloadStore';
import { useProgressStore } from '../../../stores/useProgressStore';
import { downloadMovie } from '../../../utils/download';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: SubjectInfo;
  isTvSeries: boolean;
  seasons: Season[];
  selectedSeason: number;
  selectedEpisode: number;
  downloadMode: 'single' | 'batch';
  sources: SourceItem[];
  subtitles: any[];
  sourcesLoading: boolean;
  batchResults: BatchEpisodeResult[];
  batchLoading: boolean;
  onSeasonChange: (s: number) => void;
  onEpisodeChange: (e: number) => void;
  onModeChange: (m: 'single' | 'batch') => void;
  onFetchBatch: () => void;
  onDownloadBatchAll: (preferredQuality?: string) => void;
  onDownloadBatchAllSubtitles: (language?: string) => void;
}

export const DownloadModal = ({
  isOpen,
  onClose,
  subject,
  isTvSeries,
  seasons,
  selectedSeason,
  selectedEpisode,
  downloadMode,
  sources,
  subtitles,
  sourcesLoading,
  batchResults,
  batchLoading,
  onSeasonChange,
  onEpisodeChange,
  onModeChange,
  onFetchBatch,
  onDownloadBatchAll,
  onDownloadBatchAllSubtitles,
}: DownloadModalProps) => {
  const setProgress = useDownloadStore((state) => state.setProgress);
  const addToHistory = useDownloadStore((state) => state.addToHistory);
  const markEpisodeComplete = useProgressStore((state) => state.markEpisodeComplete);
  const modalRef = useRef<HTMLDivElement>(null);

  // Trap focus and handle escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSingleDownload = (src: SourceItem, downloadId: string, episodeLabel?: string) => {
    addToHistory({
      id: downloadId,
      title: subject.title,
      filename: episodeLabel ? `${subject.title} - ${episodeLabel}` : subject.title,
      quality: src.quality || 'HD',
      type: 'movie',
    });

    downloadMovie(
      src.download_url || src.stream_url,
      subject.title,
      src.quality || 'HD',
      src.format,
      episodeLabel,
      (p) => setProgress(downloadId, p.progress, p.status === 'done' || p.status === 'error')
    );

    // Track progress
    if (isTvSeries) {
      const match = episodeLabel?.match(/E(\d+)/);
      if (match && match[1]) {
        markEpisodeComplete(subject.subjectId || '', selectedSeason, parseInt(match[1], 10));
      }
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="relative z-[100]" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            ref={modalRef}
            className="fixed bottom-0 left-0 w-full bg-[var(--rf-surface)] border-t border-[var(--rf-border)] rounded-t-[20px] max-h-[70vh] overflow-hidden flex flex-col"
          >
            {/* Handle Bar */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 sticky top-0 bg-[var(--rf-surface)]/95 backdrop-blur-xl z-10 border-b border-[var(--rf-border)]">
              <div className="flex-1 flex justify-center md:justify-start">
                <div
                  className="w-10 h-1 bg-white/15 rounded-full cursor-pointer md:hidden"
                  onClick={onClose}
                />
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg glass-2 flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-5 overflow-y-auto flex-1">
              {/* Header */}
              <div className="mb-4">
                <h2 id="modal-title" className="text-base md:text-lg font-bold text-white mb-0.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[var(--rf-red)]/15 flex items-center justify-center shrink-0">
                    <HardDriveDownload size={14} className="text-[var(--rf-red)]" />
                  </div>
                  {downloadMode === 'batch' ? 'Batch Download' : 'Download'}
                </h2>
                <p className="text-xs text-[var(--rf-text-dim)] ml-9">
                  {downloadMode === 'batch'
                    ? `Season ${selectedSeason} — ${subject.title}`
                    : `Select quality — ${subject.title}`}
                </p>
              </div>

              {/* Mode Toggle (TV Series only) */}
              {isTvSeries && seasons.length > 0 && (
                <div className="flex items-center gap-1 mb-4 p-0.5 glass-2 rounded-lg w-fit">
                  <button
                    onClick={() => onModeChange('single')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5',
                      downloadMode === 'single'
                        ? 'bg-[var(--rf-red)] text-white shadow-md shadow-[var(--rf-red)]/20'
                        : 'text-[var(--rf-text-dim)] hover:text-white'
                    )}
                  >
                    <Download size={11} /> Single
                  </button>
                  <button
                    onClick={() => onModeChange('batch')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5',
                      downloadMode === 'batch'
                        ? 'bg-[var(--rf-red)] text-white shadow-md shadow-[var(--rf-red)]/20'
                        : 'text-[var(--rf-text-dim)] hover:text-white'
                    )}
                  >
                    <ListVideo size={11} /> Batch
                  </button>
                </div>
              )}

              {/* Episode Selector */}
              <EpisodeSelector
                seasons={seasons}
                selectedSeason={selectedSeason}
                selectedEpisode={selectedEpisode}
                downloadMode={downloadMode}
                onSeasonChange={onSeasonChange}
                onEpisodeChange={onEpisodeChange}
                subjectId={subject.subjectId}
              />

              {/* Batch: Fetch Button */}
              {downloadMode === 'batch' && !batchLoading && batchResults.length === 0 && (
                <button
                  onClick={onFetchBatch}
                  className="w-full btn-primary py-3 text-xs mb-4"
                >
                  <ListVideo size={15} />
                  <span>Fetch All Episodes — Season {selectedSeason}</span>
                </button>
              )}

              {/* Batch: Loading */}
              {batchLoading && (
                <div className="py-8 flex flex-col items-center gap-3">
                  <Loader2 size={22} className="animate-spin text-[var(--rf-red)]" />
                  <p className="text-xs text-[var(--rf-text-dim)]">Fetching episode links...</p>
                </div>
              )}

              {/* Batch Results */}
              {downloadMode === 'batch' && batchResults.length > 0 && (
                <BatchDownloads
                  batchResults={batchResults}
                  title={subject.title}
                  selectedSeason={selectedSeason}
                  onDownloadAll={onDownloadBatchAll}
                  onDownloadAllSubtitles={onDownloadBatchAllSubtitles}
                  onDownloadSingle={(src, id, ep) => handleSingleDownload(src, id, `S${selectedSeason}E${ep}`)}
                />
              )}

              {/* Single: Sources */}
              {downloadMode === 'single' && (
                <>
                  {sourcesLoading ? (
                    <div className="py-12 flex justify-center">
                      <div className="w-8 h-8 border-2 border-[var(--rf-red)] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : sources.length > 0 ? (
                    <div className="grid gap-2">
                      {sources.map((src, i) => {
                        const downloadId = `single_${subject.title}_S${selectedSeason}E${selectedEpisode}_${src.quality || 'HD'}_${i}`;
                        return (
                          <SourceCard
                            key={downloadId}
                            src={src}
                            downloadId={downloadId}
                            title={subject.title}
                            episodeLabel={isTvSeries ? `S${selectedSeason}E${selectedEpisode}` : undefined}
                            onDownload={(s, id) => handleSingleDownload(s, id, isTvSeries ? `S${selectedSeason}E${selectedEpisode}` : undefined)}
                          />
                        );
                      })}
                      <SubtitleList subtitles={subtitles} title={subject.title} />
                    </div>
                  ) : (
                    <div className="text-center py-8 glass-2 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center mx-auto mb-2">
                        <Download size={18} className="text-[var(--rf-text-dim)]" />
                      </div>
                      <p className="text-xs text-[var(--rf-text-muted)] mb-0.5">No sources available</p>
                      <p className="text-[11px] text-[var(--rf-text-dim)]">Try a different season or episode</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
