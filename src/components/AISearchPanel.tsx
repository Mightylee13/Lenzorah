import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Search,
  Film,
  X,
  Zap,
  Brain,
  MessageSquareText,
  AlertTriangle,
  Lightbulb,
  Tv,
} from "lucide-react";
import {
  aiSearch,
  aiRecommend,
  aijudge,
  aiContentWarning,
  aiGetTrivia,
  aiRecap,
} from "../api/ai";
import { cn } from "../utils/cn";

// Explicit type definitions to avoid complex TS compiler helpers
interface CriticResultType {
  judge: {
    verdict: "watch" | "skip" | "maybe";
    score: number;
    reason: string;
    watchIf: string;
    skipIf: string;
  };
  warning: {
    title: string;
    ratings: { category: string; level: number }[];
    summary: string;
  };
}

interface AISearchPanelProps {
  query?: string;
  setQuery?: (val: string) => void;
  onSearchTitle: (title: string) => void;
  open?: boolean;
  onClose?: () => void;
}

const AI_PROMPTS = [
  "Movies like John Wick but darker",
  "Feel-good comedy for date night",
  "Mind-bending sci-fi with twist endings",
  "Best thriller series to binge",
];

const MOOD_OPTIONS = [
  { emoji: "😄", label: "Happy", value: "happy and uplifting" },
  { emoji: "😢", label: "Emotional", value: "emotional and touching" },
  {
    emoji: "🤔",
    label: "Thoughtful",
    value: "intellectual and thought-provoking",
  },
  { emoji: "🔥", label: "Pumped", value: "energetic and action-packed" },
];

export default function AISearchPanel({
  query = "",
  setQuery,
  onSearchTitle,
  open: externalOpen,
  onClose: externalClose,
}: AISearchPanelProps) {
  const isControlled = externalOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? externalOpen : internalOpen;

  const closePanel = () => {
    if (isControlled) externalClose?.();
    else setInternalOpen(false);
    resetAllStates();
  };

  // Tab Control: "discover" | "critic" | "lore"
  const [activeTab, setActiveTab] = useState<"discover" | "critic" | "lore">(
    "discover",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Safe fallback to prevent undefined string property crashes
  const safeQuery = query || "";

  // ── State: Discover Tab ───────────────────────────────────────────────────
  const [discoverResult, setDiscoverResult] = useState<{
    text: string;
    suggestions: string[];
  } | null>(null);

  const handleDiscoverSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || safeQuery;
    if (!q.trim()) return;
    setIsLoading(true);
    setError(null);
    setDiscoverResult(null);
    try {
      const res = await aiSearch(q);
      setDiscoverResult(res);
    } catch (err: any) {
      setError(err.message || "AI search lookup failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoodSearch = async (moodValue: string) => {
    setIsLoading(true);
    setError(null);
    setDiscoverResult(null);
    try {
      const res = await aiRecommend({ mood: moodValue });
      setDiscoverResult(res);
    } catch (err: any) {
      setError(err.message || "Mood recommendation lookup failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSurpriseMe = async () => {
    setIsLoading(true);
    setError(null);
    setDiscoverResult(null);
    try {
      const res = await aiRecommend({});
      setDiscoverResult(res);
    } catch (err: any) {
      setError(err.message || "Recommendation lookup failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── State: Critic Tab (Judge + Content Advisory) ───────────────────────────
  const [criticResult, setCriticResult] = useState<CriticResultType | null>(
    null,
  );

  const handleCriticSearch = async () => {
    if (!safeQuery.trim()) return;
    setIsLoading(true);
    setError(null);
    setCriticResult(null);
    try {
      const [judgeData, warningData] = await Promise.all([
        aijudge(safeQuery),
        aiContentWarning(safeQuery),
      ]);
      setCriticResult({ judge: judgeData, warning: warningData });
    } catch (err: any) {
      setError(err.message || "Review analysis failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── State: Lore Tab (Trivia + Episode Recaps) ──────────────────────────────
  const [loreMode, setLoreMode] = useState<"trivia" | "recap">("trivia");
  const [seasonNum, setSeasonNum] = useState<number>(1);
  const [episodeNum, setEpisodeNum] = useState<number>(1);
  const [triviaResult, setTriviaResult] = useState<string[] | null>(null);
  const [recapResult, setRecapResult] = useState<string | null>(null);

  const handleLoreSearch = async () => {
    if (!safeQuery.trim()) return;
    setIsLoading(true);
    setError(null);
    setTriviaResult(null);
    setRecapResult(null);
    try {
      if (loreMode === "trivia") {
        const res = await aiGetTrivia(safeQuery);
        setTriviaResult(res);
      } else {
        const res = await aiRecap(safeQuery, seasonNum, episodeNum);
        setRecapResult(res);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process lore request.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetAllStates = () => {
    setError(null);
    setIsLoading(false);
    setDiscoverResult(null);
    setCriticResult(null);
    setTriviaResult(null);
    setRecapResult(null);
  };

  const getVerdictStyles = (verdict: "watch" | "skip" | "maybe") => {
    switch (verdict) {
      case "watch":
        return {
          text: "text-emerald-400",
          bg: "rgba(16,185,129,0.12)",
          border: "rgba(16,185,129,0.3)",
        };
      case "skip":
        return {
          text: "text-rose-400",
          bg: "rgba(244,63,94,0.12)",
          border: "rgba(244,63,94,0.3)",
        };
      default:
        return {
          text: "text-amber-400",
          bg: "rgba(245,158,11,0.12)",
          border: "rgba(245,158,11,0.3)",
        };
    }
  };

  const renderRatingBar = (level: number) => {
    const bars = [];
    for (let i = 1; i <= 5; i++) {
      bars.push(
        <div
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors duration-300",
            i <= level
              ? level >= 4
                ? "bg-purple-500"
                : level >= 2
                  ? "bg-blue-400"
                  : "bg-emerald-500"
              : "bg-white/10",
          )}
        />,
      );
    }
    return <div className="flex gap-1 w-24">{bars}</div>;
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border overflow-hidden shadow-2xl w-full"
      style={{
        background: "rgba(7,7,14,0.98)",
        border: "1px solid rgba(147,51,234,0.18)",
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(147,51,234,0.08)",
      }}
    >
      {/* ── HEADER ── */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]"
        style={{ background: "rgba(147,51,234,0.04)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/20">
            <Brain size={15} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-xs font-black tracking-wider text-white flex items-center gap-2 uppercase">
              LENZORAH AI Hub
              <span className="px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/20">
                STABLE
              </span>
            </h3>
          </div>
        </div>
        <button
          onClick={closePanel}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-white/30 hover:text-white"
        >
          <X size={15} />
        </button>
      </div>

      <div className="p-5">
        {/* ── TAB SELECTOR ── */}
        <div className="flex gap-1.5 mb-5 p-1 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          {(
            [
              { id: "discover", label: "Discovery", icon: Sparkles },
              { id: "critic", label: "AI Critic", icon: MessageSquareText },
              { id: "lore", label: "Fans & Lore", icon: Tv },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  resetAllStates();
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 outline-none focus:outline-none focus:ring-0",
                  isSelected
                    ? "text-white bg-purple-500/12 border border-purple-500/20 shadow-inner"
                    : "text-white/40 hover:text-white/70 border border-transparent hover:bg-white/[0.02]",
                )}
              >
                <Icon
                  size={12}
                  className={isSelected ? "text-purple-400" : "text-white/30"}
                />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab Container Content ── */}
        <div className="max-h-[460px] overflow-y-auto pr-1 select-none custom-scrollbar">
          {/* ── TAB 1: DISCOVER (Semantic Search & Mood Recommend) ── */}
          {activeTab === "discover" && (
            <div className="space-y-5">
              {!discoverResult && !isLoading && (
                <>
                  {/* Primary search action button utilizing the parent input */}
                  <button
                    onClick={() => handleDiscoverSearch()}
                    disabled={!safeQuery.trim()}
                    className="w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 border border-purple-500/20 disabled:opacity-20 transition-all"
                    style={{ background: "rgba(147,51,234,0.1)" }}
                  >
                    <Brain size={13} className="text-purple-400" />
                    Run AI Search for "{safeQuery.trim() || "Type above..."}"
                  </button>

                  {/* Predefined prompts */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">
                      Describe your appetite
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {AI_PROMPTS.map((p) => (
                        <button
                          key={p}
                          onClick={() => {
                            setQuery?.(p);
                            handleDiscoverSearch(p);
                          }}
                          className="px-3 py-2.5 rounded-xl text-[10px] font-bold text-white/50 hover:text-white text-left transition-all truncate border border-white/[0.04] hover:border-purple-500/20"
                          style={{ background: "rgba(255,255,255,0.015)" }}
                        >
                          "{p}"
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mood Grid */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">
                      Match your exact mood
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {MOOD_OPTIONS.map((mood) => (
                        <button
                          key={mood.value}
                          onClick={() => handleMoodSearch(mood.value)}
                          className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-white/5 transition-all group border border-white/[0.04]"
                          style={{ background: "rgba(255,255,255,0.01)" }}
                        >
                          <span className="text-lg group-hover:scale-110 transition-transform">
                            {mood.emoji}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-white/40 group-hover:text-white/70">
                            {mood.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Surprise button */}
                  <button
                    onClick={handleSurpriseMe}
                    className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-purple-300 flex items-center justify-center gap-2 transition-all"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(147,51,234,0.1), rgba(68,144,255,0.1))",
                      border: "1px solid rgba(147,51,234,0.15)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "linear-gradient(135deg, rgba(147,51,234,0.18), rgba(68,144,255,0.18))")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        "linear-gradient(135deg, rgba(147,51,234,0.1), rgba(68,144,255,0.1))")
                    }
                  >
                    <Zap size={13} /> Custom Surprise Me
                  </button>
                </>
              )}

              {/* Discovery Results display */}
              {discoverResult && (
                <div className="space-y-4">
                  <div
                    className="rounded-xl p-4 border border-purple-500/15"
                    style={{ background: "rgba(147,51,234,0.04)" }}
                  >
                    <div className="flex items-start gap-2.5">
                      <Sparkles
                        size={14}
                        className="text-purple-400 mt-0.5 shrink-0"
                      />
                      <p className="text-xs font-medium text-white/70 leading-relaxed">
                        {discoverResult.text}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">
                      Matched Recommendations
                    </span>
                    <div className="grid grid-cols-1 gap-1">
                      {discoverResult.suggestions.map((title, i) => (
                        <button
                          key={`${title}-${i}`}
                          onClick={() => {
                            onSearchTitle(title);
                            closePanel();
                          }}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-purple-500/15 transition-all group text-left"
                        >
                          <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                            <Film size={12} className="text-purple-400" />
                          </div>
                          <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors flex-1 truncate">
                            {title}
                          </span>
                          <Search
                            size={12}
                            className="text-white/30 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0"
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={resetAllStates}
                    className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-white/30 hover:text-white hover:bg-white/5 transition-all"
                  >
                    ← Search for something else
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: AI CRITIC (Judge & Content Warnings) ── */}
          {activeTab === "critic" && (
            <div className="space-y-5">
              {!criticResult && !isLoading && (
                <>
                  <p className="text-[11px] text-white/40 leading-relaxed text-center">
                    Evaluate any movie or TV show. Lenzorah AI performs a review
                    alongside a content advisory rating checklist [1].
                  </p>

                  {safeQuery.trim() ? (
                    <button
                      onClick={handleCriticSearch}
                      className="w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest text-purple-300 flex items-center justify-center gap-2 border border-purple-500/20 transition-all"
                      style={{ background: "rgba(147,51,234,0.08)" }}
                    >
                      <MessageSquareText size={13} /> Evaluate "{safeQuery}"
                      with AI Critic
                    </button>
                  ) : (
                    <div className="text-center py-8 px-4 border border-dashed border-white/[0.06] rounded-2xl">
                      <MessageSquareText
                        size={20}
                        className="text-white/20 mx-auto mb-2"
                      />
                      <p className="text-xs text-white/40 leading-relaxed">
                        Type a movie or show in the search bar above [1], then
                        open the AI Critic tab.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Critic Results Panel */}
              {criticResult && (
                <div className="space-y-5">
                  {/* Verdict Row */}
                  <div
                    className="flex items-center justify-between p-4 rounded-xl border"
                    style={{
                      background: getVerdictStyles(criticResult.judge.verdict)
                        .bg,
                      borderColor: getVerdictStyles(criticResult.judge.verdict)
                        .border,
                    }}
                  >
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">
                        Verdict
                      </span>
                      <span
                        className={cn(
                          "text-base font-black uppercase",
                          getVerdictStyles(criticResult.judge.verdict).text,
                        )}
                      >
                        {criticResult.judge.verdict}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">
                        Score
                      </span>
                      <span className="text-xl font-black text-white">
                        {criticResult.judge.score}{" "}
                        <span className="text-xs text-white/30">/ 10</span>
                      </span>
                    </div>
                  </div>

                  {/* Verdict comment quotes */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 block mb-1">
                      Brutally Honest Take
                    </span>
                    <p className="text-xs leading-relaxed text-white/80 italic font-medium">
                      "{criticResult.judge.reason}"
                    </p>
                  </div>

                  {/* Watch If / Skip If */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
                        Watch If
                      </span>
                      <p className="text-[11px] text-white/75 leading-relaxed">
                        {criticResult.judge.watchIf}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/15">
                      <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 block mb-1">
                        Skip If
                      </span>
                      <p className="text-[11px] text-white/75 leading-relaxed">
                        {criticResult.judge.skipIf}
                      </p>
                    </div>
                  </div>

                  {/* Content Warnings Grid */}
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.05] space-y-3.5">
                    <div className="flex items-center gap-1.5 border-b border-white/[0.05] pb-2">
                      <AlertTriangle size={13} className="text-amber-400" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/60">
                        Content Advisory
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {criticResult.warning.ratings.map((warn) => (
                        <div
                          key={warn.category}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-white/60">
                            {warn.category}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-white/40">
                              {warn.level} / 5
                            </span>
                            {renderRatingBar(warn.level)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] leading-relaxed text-white/50 border-t border-white/[0.05] pt-2 italic">
                      {criticResult.warning.summary}
                    </p>
                  </div>

                  {/* Control actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onSearchTitle(safeQuery);
                        closePanel();
                      }}
                      className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white flex items-center justify-center gap-2"
                      style={{
                        background: "rgba(147,51,234,0.15)",
                        border: "1px solid rgba(147,51,234,0.25)",
                      }}
                    >
                      <Search size={12} /> Search this Title
                    </button>
                    <button
                      onClick={resetAllStates}
                      className="px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white/30 hover:text-white bg-white/[0.03] border border-white/[0.08]"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: FANS & LORE (Trivia & Recap) ── */}
          {activeTab === "lore" && (
            <div className="space-y-5">
              {!triviaResult && !recapResult && !isLoading && (
                <>
                  <div className="flex gap-1.5 p-1 rounded-lg bg-white/[0.01] border border-white/[0.04]">
                    {(["trivia", "recap"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setLoreMode(mode)}
                        className={cn(
                          "flex-1 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all duration-150",
                          loreMode === mode
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/15"
                            : "text-white/30 hover:text-white/60",
                        )}
                      >
                        {mode === "trivia" ? "Facts & Trivia" : "Episode Recap"}
                      </button>
                    ))}
                  </div>

                  {safeQuery.trim() ? (
                    <>
                      {/* Episode Fields on Recap Mode */}
                      {loreMode === "recap" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-1">
                              Season
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={seasonNum}
                              onChange={(e) =>
                                setSeasonNum(Number(e.target.value))
                              }
                              className="w-full px-3 py-2.5 rounded-lg border text-xs text-white bg-transparent focus:outline-none border-white/[0.08]"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-1">
                              Episode
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={episodeNum}
                              onChange={(e) =>
                                setEpisodeNum(Number(e.target.value))
                              }
                              className="w-full px-3 py-2.5 rounded-lg border text-xs text-white bg-transparent focus:outline-none border-white/[0.08]"
                            />
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleLoreSearch}
                        className="w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest text-purple-300 flex items-center justify-center gap-2 border border-purple-500/20 transition-all"
                        style={{ background: "rgba(147,51,234,0.08)" }}
                      >
                        <Lightbulb size={13} /> Fetch{" "}
                        {loreMode === "trivia" ? "Trivia" : "Recap"} for "
                        {safeQuery}"
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-8 px-4 border border-dashed border-white/[0.06] rounded-2xl">
                      <Tv size={20} className="text-white/20 mx-auto mb-2" />
                      <p className="text-xs text-white/40 leading-relaxed">
                        Type a movie or show in the search bar above [1], then
                        open the Fans & Lore tab.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Trivia List Output */}
              {triviaResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 border-b border-white/[0.05] pb-2">
                    <Lightbulb
                      size={13}
                      className="text-yellow-400 animate-pulse"
                    />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/50">
                      Production Trivia
                    </span>
                  </div>

                  <div className="space-y-2">
                    {triviaResult.map((fact, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl border border-white/[0.04] flex items-start gap-3"
                        style={{ background: "rgba(255,255,255,0.005)" }}
                      >
                        <span className="text-[10px] font-black text-purple-400 font-mono mt-0.5">
                          #{i + 1}
                        </span>
                        <p className="text-xs text-white/85 leading-relaxed">
                          {fact}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={resetAllStates}
                    className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-white/30 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/[0.05]"
                  >
                    ← Check another movie/show
                  </button>
                </div>
              )}

              {/* Recap Box Output */}
              {recapResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 border-b border-white/[0.05] pb-2">
                    <Tv size={13} className="text-purple-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/50">
                      Season {seasonNum} Episode {episodeNum} Recap
                    </span>
                  </div>

                  <div
                    className="p-4 rounded-xl border border-purple-500/15 leading-relaxed text-xs text-white/80"
                    style={{ background: "rgba(147,51,234,0.03)" }}
                  >
                    {recapResult}
                  </div>

                  <button
                    onClick={resetAllStates}
                    className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-white/30 hover:text-white hover:bg-white/5 transition-all border border-transparent"
                  >
                    ← Check another episode
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── LOADER OVERLAY ── */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 min-h-[160px]">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-purple-500/10 border-t-purple-400 animate-spin" />
              <Brain
                size={18}
                className="text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              />
            </div>
            <p className="text-xs text-white/40 tracking-widest uppercase font-black animate-pulse">
              AI Analyzing...
            </p>
          </div>
        )}

        {/* ── ERROR ── */}
        {error && (
          <div className="text-center py-8">
            <p className="text-xs text-rose-400 font-bold mb-4">{error}</p>
            <button
              onClick={resetAllStates}
              className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-300 bg-purple-500/10 border border-purple-500/20"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
