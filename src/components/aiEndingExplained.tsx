import { useState, useEffect } from "react";

interface Props {
  min: number;
  max: number;
  onChange: (range: [number, number]) => void;
  value: [number, number];
}

export function YearRangeSlider({ min, max, value, onChange }: Props) {
  const [minVal, setMinVal] = useState(value[0]);
  const [maxVal, setMaxVal] = useState(value[1]);

  useEffect(() => {
    setMinVal(value[0]);
    maxVal && setMaxVal(value[1]);
  }, [value, maxVal]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), maxVal - 1);
    setMinVal(val);
    onChange([val, maxVal]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), minVal + 1);
    setMaxVal(val);
    onChange([minVal, val]);
  };

  const minPercent = ((minVal - min) / (max - min)) * 100;
  const maxPercent = ((maxVal - min) / (max - min)) * 100;

  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center justify-between text-[8px] font-black text-white/40 uppercase tracking-widest">
        <span>Year Range</span>
        <span className="text-[#4490ff] font-extrabold">
          {minVal} — {maxVal}
        </span>
      </div>

      <div className="relative h-1 w-full rounded-full bg-white/10">
        <div
          className="absolute h-full rounded-full bg-gradient-to-r from-[#4490ff] to-purple-500"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={minVal}
          onChange={handleMinChange}
          className="absolute pointer-events-none appearance-none bg-transparent h-1 w-full top-0 left-0 outline-none"
          style={{ zIndex: minVal > max - 100 ? 5 : 3 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={maxVal}
          onChange={handleMaxChange}
          className="absolute pointer-events-none appearance-none bg-transparent h-1 w-full top-0 left-0 outline-none"
          style={{ zIndex: 4 }}
        />
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          pointer-events: auto;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #4490ff;
          cursor: pointer;
          -webkit-appearance: none;
          box-shadow: 0 0 8px rgba(68,144,255,0.4);
          transition: transform 0.1s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type="range"]::-moz-range-thumb {
          pointer-events: auto;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #4490ff;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(68,144,255,0.4);
          transition: transform 0.1s ease;
        }
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.15);
        }
      `}</style>
    </div>
  );
}

export default YearRangeSlider;
