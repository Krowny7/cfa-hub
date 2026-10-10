import { pctScore } from "@/lib/voice";

/** Le pourcentage qui suit un score déjà affiché (« 24/30 » → « · 80 % »). Rien si le total est nul. */
export default function PctScore({ justes, total, className = "", sep = true }: { justes: number | null | undefined; total: number | null | undefined; className?: string; sep?: boolean }) {
  if (justes == null || total == null) return null;
  const p = pctScore(justes, total);
  if (!p) return null;
  return <span className={"whitespace-nowrap font-mono font-normal tabular-nums text-muted " + className}>{sep ? ` · ${p}` : p}</span>;
}

/** Les deux pourcentages d'un duel, dans l'ordre du score affiché (« 8 – 6 » → « 80 % – 60 % »). Rien si un score manque. */
export function PctDuel({ a, b, total, className = "" }: { a: number | null | undefined; b: number | null | undefined; total: number | null | undefined; className?: string }) {
  if (a == null || b == null || total == null) return null;
  const pa = pctScore(a, total);
  const pb = pctScore(b, total);
  if (!pa || !pb) return null;
  return <span className={"whitespace-nowrap font-mono font-normal tabular-nums text-muted " + className}>{`${pa} – ${pb}`}</span>;
}
