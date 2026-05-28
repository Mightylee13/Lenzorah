/**
 * SupportBanner.tsx
 * A cinematic support/contact banner to place just above your Footer.
 *
 * HOW TO USE:
 * 1. Copy this file to src/components/SupportBanner.tsx
 * 2. In Footer.tsx, import and place it BEFORE the <footer> tag:
 *
 *    import SupportBanner from "./SupportBanner";
 *    ...
 *    return (
 *      <>
 *        <SupportBanner />
 *        <footer ...>
 *
 * 3. Update the WHATSAPP_NUMBER with your real number
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import {
  Mail,
  MessageCircle,
  Zap,
  ArrowRight,
  Sparkles,
  Shield,
  HeartHandshake,
} from "lucide-react";

// ── Update this with your WhatsApp number ─────────────────────────────────────
const WHATSAPP_NUMBER = "2349025770772"; // e.g. 2348123456789 (no + sign)
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

// ── Floating particle ─────────────────────────────────────────────────────────
function Orb({ style }: { style: React.CSSProperties }) {
  return (
    <div className="absolute rounded-full pointer-events-none" style={style} />
  );
}

export default function SupportBanner() {
  const [hovered, setHovered] = useState<"email" | "whatsapp" | null>(null);

  return (
    <section className="relative w-full px-4 sm:px-6 md:px-8 py-10 overflow-hidden">
      {/* ── Outer glow atmosphere ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] rounded-full blur-[120px]"
          style={{ background: "rgba(68,144,255,0.05)" }}
        />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-[2rem] overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(68,144,255,0.07) 0%, rgba(10,10,20,0.95) 50%, rgba(68,144,255,0.04) 100%)",
            border: "1px solid rgba(68,144,255,0.12)",
            boxShadow:
              "0 0 80px rgba(68,144,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* ── Decorative orbs ── */}
          <Orb
            style={{
              top: "-60px",
              right: "10%",
              width: "220px",
              height: "220px",
              background: "rgba(68,144,255,0.06)",
              filter: "blur(60px)",
            }}
          />
          <Orb
            style={{
              bottom: "-40px",
              left: "5%",
              width: "160px",
              height: "160px",
              background: "rgba(120,80,255,0.05)",
              filter: "blur(50px)",
            }}
          />

          {/* ── Grid texture overlay ── */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.015]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(68,144,255,0.8) 1px, transparent 1px),
                linear-gradient(90deg, rgba(68,144,255,0.8) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />

          {/* ── Content ── */}
          <div className="relative z-10 p-8 sm:p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center gap-10 md:gap-16">
            {/* Left — text block */}
            <div className="flex-1 space-y-5">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                style={{
                  background: "rgba(68,144,255,0.1)",
                  border: "1px solid rgba(68,144,255,0.2)",
                  color: "#4490ff",
                }}
              >
                <Sparkles size={10} />
                We're here for you
              </motion.div>

              {/* Headline */}
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
                className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tight"
              >
                Got a question?
                <br />
                <span
                  className="text-transparent bg-clip-text"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #4490ff 0%, #a78bfa 100%)",
                  }}
                >
                  Let's talk.
                </span>
              </motion.h2>

              {/* Subtext */}
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-sm leading-relaxed max-w-md"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Whether it's a bug, a feature idea, a missing movie, or just
                feedback — our team responds fast. Pick however you'd like to
                reach us.
              </motion.p>

              {/* Trust chips */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap gap-2 pt-1"
              >
                {[
                  { icon: <Zap size={10} />, label: "Fast replies" },
                  { icon: <Shield size={10} />, label: "Safe & private" },
                  {
                    icon: <HeartHandshake size={10} />,
                    label: "Friendly support",
                  },
                ].map((chip) => (
                  <div
                    key={chip.label}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.35)",
                    }}
                  >
                    <span style={{ color: "#4490ff" }}>{chip.icon}</span>
                    {chip.label}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right — action buttons */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.2,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex flex-col gap-3 w-full md:w-auto md:min-w-[260px]"
            >
              {/* Email / Contact page button */}
              <Link
                to="/contact"
                onMouseEnter={() => setHovered("email")}
                onMouseLeave={() => setHovered(null)}
              >
                <motion.div
                  animate={
                    hovered === "email"
                      ? {
                          scale: 1.02,
                          boxShadow: "0 8px 40px rgba(68,144,255,0.25)",
                        }
                      : {
                          scale: 1,
                          boxShadow: "0 4px 20px rgba(68,144,255,0.1)",
                        }
                  }
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative flex items-center gap-4 px-6 py-4 rounded-2xl cursor-pointer overflow-hidden"
                  style={{
                    background: "#4490ff",
                  }}
                >
                  {/* Shimmer on hover */}
                  <AnimatePresence>
                    {hovered === "email" && (
                      <motion.div
                        initial={{ x: "-100%", opacity: 0.6 }}
                        animate={{ x: "200%", opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        className="absolute inset-0 w-1/3 skew-x-[-20deg]"
                        style={{ background: "rgba(255,255,255,0.15)" }}
                      />
                    )}
                  </AnimatePresence>

                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.15)" }}
                  >
                    <Mail size={18} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black uppercase tracking-wider text-white">
                      Send a Message
                    </p>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      Contact form · We reply within 24h
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-white/70 shrink-0 transition-transform"
                    style={{
                      transform:
                        hovered === "email"
                          ? "translateX(3px)"
                          : "translateX(0)",
                    }}
                  />
                </motion.div>
              </Link>

              {/* WhatsApp button */}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setHovered("whatsapp")}
                onMouseLeave={() => setHovered(null)}
              >
                <motion.div
                  animate={
                    hovered === "whatsapp"
                      ? { scale: 1.02, borderColor: "rgba(255,255,255,0.15)" }
                      : { scale: 1, borderColor: "rgba(255,255,255,0.07)" }
                  }
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex items-center gap-4 px-6 py-4 rounded-2xl cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(37,211,102,0.1)",
                      border: "1px solid rgba(37,211,102,0.2)",
                    }}
                  >
                    <MessageCircle size={18} style={{ color: "#25d366" }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black uppercase tracking-wider text-white">
                      WhatsApp Direct
                    </p>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      Chat with us instantly
                    </p>
                  </div>
                  <div
                    className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                    style={{ background: "#25d366" }}
                  />
                </motion.div>
              </a>

              {/* Subtle note */}
              <p
                className="text-center text-[9px] font-medium pt-1"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Average response time · under 12 hours
              </p>
            </motion.div>
          </div>

          {/* ── Bottom accent line ── */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(68,144,255,0.3), transparent)",
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}
