import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Sales Blitz - AI-powered sales prep & practice";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #064e3b 0%, #059669 40%, #34d399 100%)",
          padding: "60px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.08,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              color: "white",
              fontWeight: 800,
            }}
          >
            SB
          </div>
          <span style={{ fontSize: "24px", fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
            Sales Blitz
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: "20px",
          }}
        >
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: "-1px",
            }}
          >
            Research. Rehearse. Close.
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.5,
              margin: 0,
              maxWidth: "700px",
            }}
          >
            AI-powered research, POV decks, on-screen notes & live practice for every deal on your calendar.
          </p>
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          {["Deep Research", "POV Decks", "AI Practice Mode"].map((label) => (
            <div
              key={label}
              style={{
                padding: "10px 20px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.2)",
                fontSize: "16px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                display: "flex",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "24px",
            right: "40px",
            fontSize: "16px",
            color: "rgba(255,255,255,0.4)",
            fontWeight: 500,
            display: "flex",
          }}
        >
          salesblitz.ai
        </div>
      </div>
    ),
    { ...size }
  );
}
