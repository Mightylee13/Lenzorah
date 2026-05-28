import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Brain, HelpCircle, Loader2, AlertTriangle, Eye } from "lucide-react";
import { aiEndingExplained, type AIEndingExplainedResult } from "../api/ai";

interface Props {
  title: string;
}

export function AIEndingExplained({ title }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AIEndingExplainedResult | null>(null);

  const handleReveal = async () => {
    setLoading(true);
    try {
      const res = await aiEndingExplained(title);
      setData(res);
      setHasRevealed(true);
    } catch (err) {
      console.warn("Confusing ending lookup failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mt-8 select-none">
      <div className="rounded-2xl border border-white/[0.06] p-4 bg-white/[0.01]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <Brain size={14} className="text-purple-400" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Confused by the ending?
              </h4>
              <p className="text-[10px] text-white/30">
                Lenzorah AI ending analysis and popular theories
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all outline-none focus:outline-none cursor-pointer"
          >
            {isOpen ? "Collapse" : "Explain Ending"}
          </button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-4 border-t border-white/[0.05] pt-4"
            >
              {!hasRevealed ? (
                /* Spoiler warning shield gate */
                <div className="rounded-xl border border-rose-500/15 p-5 text-center space-y-4 bg-rose-500/[0.01]">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto text-rose-400 border border-rose-500/20 animate-pulse">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-white uppercase tracking-wider">
                      Warning: Major Spoilers Ahead
                    </h5>
                    <p className="text-[10px] text-white/45 max-w-sm mx-auto leading-relaxed mt-1">
                      This analysis contains full ending disclosures for{" "}
                      <span className="text-white font-bold">"{title}"</span>.
                      Proceed only if you've finished watching [1].
                    </p>
                  </div>
                  <button
                    onClick={handleReveal}
                    disabled={loading}
                    className="mx-auto px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-500 transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-lg shadow-rose-950/20"
                  >
                    {loading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Eye size={11} />
                    )}
                    Reveal Explanations
                  </button>
                </div>
              ) : (
                data && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {/* TL;DR Answer quote */}
                    <div className="p-3.5 rounded-xl border border-purple-500/15 bg-purple-500/[0.02]">
                      <span className="text-[8px] font-black uppercase tracking-widest text-purple-400 block mb-1">
                        Confused Ending TL;DR
                      </span>
                      <p className="text-xs font-medium text-white/85 italic leading-relaxed">
                        "{data.shortAnswer}"
                      </p>
                    </div>

                    {/* Detailed synopsis text */}
                    <div className="space-y-2.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block">
                        Full Breakdowns
                      </span>
                      <p className="text-xs leading-relaxed text-white/60 font-medium whitespace-pre-line">
                        {data.fullExplanation}
                      </p>
                    </div>

                    {/* Popular theories list */}
                    <div className="space-y-2 pt-2 border-t border-white/[0.03]">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block">
                        Popular Interpretations
                      </span>
                      <div className="space-y-2">
                        {data.theories.map((theory, i) => (
                          <div
                            key={i}
                            className="flex gap-2.5 p-3 rounded-lg bg-white/[0.01] border border-white/[0.03]"
                          >
                            <span className="text-[10px] font-black font-mono text-purple-400">
                              0{i + 1}
                            </span>
                            <p className="text-[11px] text-white/50 leading-relaxed font-semibold">
                              {theory}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Director/Creator intent details */}
                    <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.005]">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/35 block mb-1">
                        Creator/Director's Intent
                      </span>
                      <p className="text-[11px] text-white/50 leading-relaxed font-medium">
                        {data.directorIntent}
                      </p>
                    </div>
                  </motion.div>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default AIEndingExplained;
