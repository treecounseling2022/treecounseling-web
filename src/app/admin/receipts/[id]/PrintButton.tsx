"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="font-sans text-xs px-4 py-1.5 bg-deep text-paper hover:bg-forest transition-colors"
    >
      列印 / Print
    </button>
  );
}
