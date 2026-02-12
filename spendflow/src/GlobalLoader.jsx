import React from "react";

export default function GlobalLoader({ show, text }) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ background: "white", padding: 18, borderRadius: 12, width: 340 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Loading…</div>
        <div style={{ fontSize: 14, opacity: 0.8 }}>{text || "Please wait"}</div>
      </div>
    </div>
  );
}
