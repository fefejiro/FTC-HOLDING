import type React from "react";

export default function Loading() {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 140px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        gap: "32px",
      }}
      aria-label="Loading"
      aria-busy="true"
    >
      {/* Skeleton hero block */}
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={skeletonStyle({ width: "40%", height: "14px" })} />
        <div style={skeletonStyle({ width: "80%", height: "40px" })} />
        <div style={skeletonStyle({ width: "65%", height: "40px" })} />
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
          <div style={skeletonStyle({ width: "100%", height: "16px" })} />
          <div style={skeletonStyle({ width: "90%", height: "16px" })} />
          <div style={skeletonStyle({ width: "75%", height: "16px" })} />
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
          <div style={skeletonStyle({ width: "140px", height: "44px", radius: "var(--radius)" })} />
          <div style={skeletonStyle({ width: "110px", height: "44px", radius: "var(--radius)" })} />
        </div>
      </div>

      <style>{`
        @keyframes ftc-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
      `}</style>
    </div>
  );
}

function skeletonStyle({
  width,
  height,
  radius = "6px",
}: {
  width: string;
  height: string;
  radius?: string;
}): React.CSSProperties {
  return {
    width,
    height,
    borderRadius: radius,
    background:
      "linear-gradient(90deg, var(--surface) 25%, var(--surface-2) 50%, var(--surface) 75%)",
    backgroundSize: "600px 100%",
    animation: "ftc-shimmer 1.5s infinite linear",
  };
}
