"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

// Copie le lien public en lecture seule (/share/qcm/… ou /share/flashcards/…).
export function ShareButton({ token, base }: { token: string; base: "flashcards" | "qcm" }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  function copy() {
    const url = `${window.location.origin}/share/${base}/${token}`;
    navigator.clipboard
      .writeText(url)
      .then(() => setState("copied"))
      .catch(() => setState("error"))
      .finally(() => setTimeout(() => setState("idle"), 2200));
  }

  return (
    <button type="button" onClick={copy} className="btn btn-secondary btn-sm min-w-[124px]" aria-live="polite">
      {state === "copied" ? <Check size={14} aria-hidden /> : <Link2 size={14} aria-hidden />}
      {state === "copied" ? "Lien copié" : state === "error" ? "Copie impossible" : "Partager"}
    </button>
  );
}
