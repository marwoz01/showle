import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Showle — Daily movie guessing game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#101012",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Purple glow */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "25%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,77,255,0.35) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "20%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(91,33,182,0.25) 0%, transparent 70%)",
          }}
        />

        {/* Clapperboard icon */}
        <div
          style={{
            display: "flex",
            width: 88,
            height: 88,
            borderRadius: 20,
            background: "rgba(124,77,255,0.15)",
            border: "1px solid rgba(124,77,255,0.3)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#7C4DFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="17" x2="22" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#f0f0f5",
            marginBottom: 12,
          }}
        >
          Showle
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#8a8a9a",
            marginBottom: 48,
          }}
        >
          Daily movie guessing game
        </div>

        {/* Match pills */}
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "exact", color: "#00e676" },
            { label: "close", color: "#ffc107" },
            { label: "miss", color: "#ff5252" },
          ].map((pill) => (
            <div
              key={pill.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: `${pill.color}15`,
                borderRadius: 20,
                padding: "8px 20px",
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: pill.color,
                }}
              />
              <span style={{ color: pill.color, fontSize: 16, fontWeight: 600 }}>
                {pill.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
