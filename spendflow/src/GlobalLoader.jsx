import React from "react";

export default function GlobalLoader({ show }) {
  if (!show) return null;

  return (
    <div style={overlay}>
      <div style={spinner}></div>
    </div>
  );
}

/* ---------- styles ---------- */

const overlay = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const spinner = {
  width: 48,
  height: 48,
  border: "4px solid rgba(255,255,255,0.3)",
  borderTop: "4px solid white",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};
