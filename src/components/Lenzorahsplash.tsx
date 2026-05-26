import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/**
 * LenzorahSplash
 *
 * Logo slice reveal animation
 * Like letters entering one by one,
 * but using your full logo.
 */

const SLICES = 8;

export default function LenzorahSplash({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 2600);
    const t3 = setTimeout(() => onComplete(), 3200);

    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase < 2 && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-background"
        >
          {/* Background Glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at center, hsl(var(--primary) / 0.16) 0%, transparent 72%)",
            }}
          />

          {/* Logo Slice Animation */}
          <div className="relative w-[220px] sm:w-[320px] md:w-[430px] h-[110px]">
            {Array.from({ length: SLICES }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 0,
                  y: 40,
                  filter: "blur(10px)",
                }}
                animate={
                  phase >= 1
                    ? {
                        opacity: 1,
                        y: 0,
                        filter: "blur(0px)",
                      }
                    : {}
                }
                transition={{
                  delay: i * 0.08,
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute inset-0"
                style={{
                  clipPath: `polygon(
                    ${(i / SLICES) * 100}% 0%,
                    ${((i + 1) / SLICES) * 100}% 0%,
                    ${((i + 1) / SLICES) * 100}% 100%,
                    ${(i / SLICES) * 100}% 100%
                  )`,
                }}
              >
                <img
                  src="/logo.png"
                  alt="Lenzorah"
                  className="w-full h-full object-contain select-none pointer-events-none"
                  draggable={false}
                />
              </motion.div>
            ))}

            {/* Glow Accent */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={
                phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }
              }
              transition={{
                delay: 0.2,
                duration: 0.8,
              }}
              className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-primary shadow-[0_0_25px_hsl(var(--primary))]"
            />
          </div>

          {/* Bottom Progress */}
          <motion.div
            className="absolute bottom-0 left-0 h-[2px] bg-primary"
            initial={{ width: "0%" }}
            animate={{
              width: phase >= 1 ? "100%" : "0%",
            }}
            transition={{
              duration: 0.2,
              ease: "easeInOut",
            }}
          />

          {/* Dark Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at center, transparent 45%, rgba(0,0,0,0.38) 100%)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
