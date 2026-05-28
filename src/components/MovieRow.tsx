import { useRef, useState, useEffect, memo, ReactNode } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface MovieRowProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onViewAll?: () => void;
}

export const MovieRow = memo(
  ({ title, subtitle, children, onViewAll }: MovieRowProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
      const el = scrollRef.current;
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 10);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    };

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      checkScroll();
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }, []);

    const scroll = (direction: "left" | "right") => {
      const el = scrollRef.current;
      if (!el) return;
      const scrollAmount = el.clientWidth * 0.75;
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    };

    return (
      <section className="relative pb-8 md:pb-10">
        {/* Section Header */}
        <div className="flex items-end justify-between px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 mb-4 md:mb-5">
          <div>
            <h3 className="text-lg md:text-xl font-bold tracking-tight text-white">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[var(--rf-text-dim)] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-[var(--rf-red)] text-xs font-semibold flex items-center gap-0.5 hover:gap-1.5 transition-all group"
            >
              View All
              <ChevronRight
                size={14}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </button>
          )}
        </div>

        {/* Scroll Container */}
        <div className="relative group/row">
          {/* Left Arrow */}
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className={`
              absolute left-0 top-0 bottom-4 z-20 w-14 md:w-16
              items-center justify-center
              bg-gradient-to-r from-[var(--rf-black)] to-transparent
              transition-all duration-300
              ${canScrollLeft ? "flex" : "hidden"}
              opacity-0 group-hover/row:opacity-100
            `}
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full glass-2 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10 hover:border-white/20 hover:scale-110 active:scale-95 duration-200">
              <ChevronLeft size={18} />
            </div>
          </button>

          {/* Right Arrow */}
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className={`
              absolute right-0 top-0 bottom-4 z-20 w-14 md:w-16
              items-center justify-center
              bg-gradient-to-l from-[var(--rf-black)] to-transparent
              transition-all duration-300
              ${canScrollRight ? "flex" : "hidden"}
              opacity-0 group-hover/row:opacity-100
            `}
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full glass-2 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10 hover:border-white/20 hover:scale-110 active:scale-95 duration-200">
              <ChevronRight size={18} />
            </div>
          </button>

          {/* Scrollable Track */}
          <div
            ref={scrollRef}
            className="flex gap-4 md:gap-5 overflow-x-auto px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 pb-3 scrollbar-hide snap-x snap-mandatory"
          >
            {children}
            {/* WebKit right-padding fix */}
            <div
              className="shrink-0 w-1 sm:w-4 md:w-10 lg:w-14"
              aria-hidden="true"
            />
          </div>
        </div>
      </section>
    );
  },
);

MovieRow.displayName = "MovieRow";
