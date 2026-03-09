import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Una Labs - Creative AI Studio - Building AI products";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background:
            "linear-gradient(135deg, rgb(5, 20, 40) 0%, rgb(10, 78, 163) 50%, rgb(0, 132, 143) 100%)",
          color: "white",
          fontFamily: "system-ui"
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            opacity: 0.95
          }}
        >
          Una Labs
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: 900 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>
            Creative AI Studio
          </div>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 500, opacity: 0.92 }}>
            Building AI products
          </div>
        </div>
      </div>
    ),
    size
  );
}
