"use client";

import { useState, useRef, useEffect } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number) => void;
  readonly?: boolean;
  /** Show stars inline (always open) instead of compact badge with popup */
  inline?: boolean;
  size?: number;
}

export default function StarRating({
  value,
  onChange,
  readonly = false,
  inline = false,
  size = 11,
}: StarRatingProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  const displayValue = value !== null && value > 0 ? value : null;

  // Readonly: compact badge — 1 star + number
  if (readonly) {
    if (!displayValue) return null;
    return (
      <div className="flex items-center gap-1 rounded bg-yellow-500/15 px-1.5 py-0.5 text-xs font-semibold text-yellow-400">
        <Star size={size} fill="currentColor" />
        {displayValue}
      </div>
    );
  }

  // Inline mode: 10 stars always visible
  if (inline) {
    return (
      <div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 10 }, (_, i) => {
            const fullValue = i + 1;
            const halfValue = i + 0.5;
            const display = hover ?? value ?? 0;

            return (
              <div key={i} className="relative cursor-pointer" style={{ width: size * 1.4, height: size * 1.4 }}>
                <div
                  className="absolute inset-y-0 left-0 w-1/2"
                  onMouseEnter={() => setHover(halfValue)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onChange?.(halfValue)}
                />
                <div
                  className="absolute inset-y-0 right-0 w-1/2"
                  onMouseEnter={() => setHover(fullValue)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onChange?.(fullValue)}
                />
                <div className="pointer-events-none flex h-full items-center justify-center">
                  {display >= fullValue ? (
                    <Star size={size * 1.2} className="text-yellow-400" fill="currentColor" strokeWidth={0} />
                  ) : display >= halfValue ? (
                    <div className="relative" style={{ width: size * 1.2, height: size * 1.2 }}>
                      <Star size={size * 1.2} className="absolute text-white/15" fill="none" strokeWidth={1.5} />
                      <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                        <Star size={size * 1.2} className="text-yellow-400" fill="currentColor" strokeWidth={0} />
                      </div>
                    </div>
                  ) : (
                    <Star size={size * 1.2} className="text-white/15" fill="none" strokeWidth={1.5} />
                  )}
                </div>
              </div>
            );
          })}
          <span className="ml-2 text-sm font-semibold text-yellow-400/80">
            {hover ?? displayValue ?? "—"} / 10
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={pickerRef}>
      {/* Compact badge — click to open picker */}
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold transition-colors ${
          displayValue
            ? "bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25"
            : "bg-white/5 text-muted hover:bg-white/10 hover:text-foreground"
        }`}
      >
        <Star size={size} fill={displayValue ? "currentColor" : "none"} strokeWidth={displayValue ? 0 : 1.5} />
        {displayValue ?? "—"}
      </button>

      {/* Picker: 10 clickable stars with half-star support */}
      {showPicker && (
        <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)}>
          <div
            className="absolute rounded-xl border border-white/10 bg-card-hover p-3 shadow-2xl"
            style={{
              left: pickerRef.current
                ? Math.min(
                    pickerRef.current.getBoundingClientRect().left,
                    window.innerWidth - 280
                  )
                : 0,
              top: pickerRef.current
                ? pickerRef.current.getBoundingClientRect().bottom + 4
                : 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 10 }, (_, i) => {
                const fullValue = i + 1;
                const halfValue = i + 0.5;
                const display = hover ?? value ?? 0;
                const s = 18;

                return (
                  <div key={i} className="relative cursor-pointer" style={{ width: s * 1.4, height: s * 1.4 }}>
                    <div
                      className="absolute inset-y-0 left-0 w-1/2"
                      onMouseEnter={() => setHover(halfValue)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => {
                        onChange?.(halfValue);
                        setShowPicker(false);
                      }}
                    />
                    <div
                      className="absolute inset-y-0 right-0 w-1/2"
                      onMouseEnter={() => setHover(fullValue)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => {
                        onChange?.(fullValue);
                        setShowPicker(false);
                      }}
                    />
                    <div className="pointer-events-none flex h-full items-center justify-center">
                      {display >= fullValue ? (
                        <Star size={s} className="text-yellow-400" fill="currentColor" strokeWidth={0} />
                      ) : display >= halfValue ? (
                        <div className="relative" style={{ width: s, height: s }}>
                          <Star size={s} className="absolute text-white/15" fill="none" strokeWidth={1.5} />
                          <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                            <Star size={s} className="text-yellow-400" fill="currentColor" strokeWidth={0} />
                          </div>
                        </div>
                      ) : (
                        <Star size={s} className="text-white/15" fill="none" strokeWidth={1.5} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 text-center text-xs font-semibold text-yellow-400/80">
              {hover ?? displayValue ?? "—"} / 10
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
