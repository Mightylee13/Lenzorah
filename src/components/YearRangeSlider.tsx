import { useState, useEffect } from "react";

interface Props {
  minYear: number;
  maxYear: number;
  onChange: (range: { min: number; max: number }) => void;
}

export function YearRangeSlider({ minYear, maxYear, onChange }: Props) {
  const [min, setMin] = useState(minYear);
  const [max, setMax] = useState(maxYear);

  useEffect(() => {
    onChange({ min, max });
  }, [min, max]);

  return (
    <div className="space-y-3.5 select-none pt-2">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-black uppercase tracking-widest text-white/30">
          Year Span
        </span>
        <span className="text-[10px] font-black text-[#4490ff]">
          {min} — {max}
        </span>
      </div>

      <div className="space-y-4">
        {/* Min Year Range Input */}
        <div className="space-y-1">
          <div className="flex justify-between text-[8px] font-bold text-white/20 uppercase">
            <span>Minimum Year</span>
            <span>{min}</span>
          </div>
          <input
            type="range"
            min={minYear}
            max={max}
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4490ff]"
          />
        </div>

        {/* Max Year Range Input */}
        <div className="space-y-1">
          <div className="flex justify-between text-[8px] font-bold text-white/20 uppercase">
            <span>Maximum Year</span>
            <span>{max}</span>
          </div>
          <input
            type="range"
            min={min}
            max={maxYear}
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4490ff]"
          />
        </div>
      </div>
    </div>
  );
}