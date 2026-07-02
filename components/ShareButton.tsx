"use client";

import { useState } from "react";

export function ShareButton({ token, base }: { token: string; base: "flashcards" | "qcm" }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const url = `${window.location.origin}/share/${base}/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="btn btn-secondary text-sm"
    >
      {copied ? "✅ Lien copié !" : "🔗 Partager"}
    </button>
  );
}
