"use client";

import { useEffect } from "react";

export default function PrintTrigger({ backUrl }: { backUrl: string }) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="no-print"
      style={{ marginBottom: 24, display: "flex", gap: 12 }}
    >
      <button
        onClick={() => window.print()}
        style={{
          padding: "8px 20px",
          background: "#2d4a38",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontFamily: "sans-serif",
          fontSize: 13,
        }}
      >
        列印 / 另存 PDF
      </button>
      <a
        href={backUrl}
        style={{
          padding: "8px 20px",
          border: "1px solid #ccc",
          color: "#666",
          textDecoration: "none",
          fontFamily: "sans-serif",
          fontSize: 13,
        }}
      >
        ← 返回
      </a>
    </div>
  );
}
