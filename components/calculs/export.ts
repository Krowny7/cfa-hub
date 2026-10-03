import { formatCalc, decimalsOf } from "@/lib/calc/engine";
import type { CalcLevel, CalcUnit } from "@/lib/calc/types";
import { NIVEAU } from "./voice";

// « Copier pour l'IA » d'un round de calcul : même esprit que l'export des
// sessions (components/session/review.ts, buildAiExportText), adapté au
// calcul : énoncé, données, ma réponse, la bonne, la correction pas à pas.
// Module neutre.

export type CalcCopyItem = {
  prompt: string;
  data: { label: string; value: string }[];
  unit: CalcUnit;
  decimals: number;
  /** ma réponse lue (null : pas répondu) */
  value: number | null;
  correct: boolean;
  answer: number;
  solution: string[];
};

const NBSP = String.fromCharCode(160);
const NNBSP = String.fromCharCode(0x202f);
const plain = (s: string) => s.split(NBSP).join(" ").split(NNBSP).join(" ");

export function buildCalcAiText({ subject, typeName, level, items }: { subject: string; typeName: string; level: CalcLevel; items: CalcCopyItem[] }) {
  const score = items.filter((i) => i.correct).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const niveau = NIVEAU[level].label.toLowerCase();
  const header =
    `EXERCICES DE CALCUL CFA — ${subject} · ${typeName} · niveau ${niveau} — ${score}/${total} (${pct}%)\n` +
    `Voici mes réponses à un round d'exercices de calcul CFA Level I (${subject}, « ${typeName} », niveau ${niveau}). ` +
    `Pour chaque question : l'énoncé, les données, ma réponse, la bonne réponse et la correction. ` +
    `Peux-tu me faire un bilan de mes erreurs de méthode, et m'expliquer plus en détail les questions où je me suis trompé ?\n\n`;
  const body = items
    .map((it, i) => {
      const mine = it.value === null ? "Non répondue" : plain(formatCalc(it.value, it.unit, Math.max(decimalsOf(it.value), 0)));
      const right = plain(formatCalc(it.answer, it.unit, it.decimals));
      return (
        `Q${i + 1} — ${it.correct ? "CORRECT" : "INCORRECT"}\n` +
        `${it.prompt}\n` +
        (it.data.length ? `Données :\n${it.data.map((d) => `- ${d.label} : ${d.value}`).join("\n")}\n` : "") +
        `Ma réponse : ${mine}\n` +
        `Bonne réponse : ${right}\n` +
        (it.solution.length ? `Correction :\n${it.solution.map((s, k) => `${k + 1}. ${s}`).join("\n")}\n` : "")
      );
    })
    .join("\n");
  return header + body;
}

/** Copie dans le presse-papiers, avec un repli pour les navigateurs sans l'API. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
