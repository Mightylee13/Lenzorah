/**
 * ScrollToTopButton.tsx
 * Floating scroll-to-top button that appears when user reaches the footer area.
 *
 * HOW TO USE:
 * Import and place inside App.tsx AppContent() return, just before the closing </div>:
 *   import ScrollToTopButton from "./components/ScrollToTopButton";
 *   ...
 *   <ScrollToTopButton />
 * </div>
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Show when user is within 600px of the bottom (footer zone)
      const nearBottom =
        window.scrollY + window.innerHeight >= document.body.scrollHeight - 600;
      // Also show after scrolling down 400px from top
      const scrolledDown = window.scrollY > 400;
      setVisible(nearBottom || scrolledDown);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="scroll-top"
          initial={{ opacity: 0, y: 16, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed z-[120] transition-all active:scale-90"
          style={{
            bottom: "88px", // sits above mobile nav
            right: "20px",
            width: 44,
            height: 44,
            borderRadius: "14px",
            background: "rgba(10,10,18,0.75)",
            border: "1px solid rgba(68,144,255,0.25)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow:
              "0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(68,144,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#4490ff",
          }}
          whileHover={{
            scale: 1.08,
            boxShadow:
              "0 6px 30px rgba(68,144,255,0.25), 0 0 0 1px rgba(68,144,255,0.2)",
          }}
          whileTap={{ scale: 0.92 }}
        >
          <ArrowUp size={18} strokeWidth={2.2} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
