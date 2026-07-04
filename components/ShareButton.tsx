"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

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
      className="btn btn-secondary flex items-center gap-1.5 text-sm"
    >
      {copied ? <Check size={14} /> : <Link2 size={14} />}
      {copied ? "Lien copié" : "Partager"}
    </button>
  );
}
