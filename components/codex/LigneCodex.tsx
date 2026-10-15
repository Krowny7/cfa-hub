import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BilanCodex } from "@/lib/codex/bilan";
import { CODEX } from "@/lib/voice-codex";
import { Sceau } from "@/components/codex/Sceau";
import { FeteCodex } from "@/components/codex/FeteCodex";
import s from "./Codex.module.css";

// L'accueil, sous les traits du jour : « Ta quête : … (2/5) » qui mène au
// Codex, et les contrats du jour en petit. Une ligne, pas une carte de plus :
// le héros reste les 30 du jour, puis les 5, puis les traits. Sans état
// (le seul morceau client est la fanfare, FeteCodex). Rien si le Codex n'est
// pas disponible. `demo` : aperçus.
export function LigneCodex({ bilan, persister = false, demo = false }: { bilan: BilanCodex; persister?: boolean; demo?: boolean }) {
  if (!bilan.disponible) return null;
  const p = bilan.prochaine;
  const entame = p && p.cible > 1 ? `(${Math.floor(p.valeur)}/${Math.floor(p.cible)})` : null;
  return (
    <div className="flex flex-col gap-3" data-leonard="codex-accueil">
      <FeteCodex initial={bilan} persister={persister} demo={demo} />
      <div className={s.accueil}>
        {p ? (
          <Link href="/codex" className={s.accueilQuete} aria-label={`${CODEX.accueil.maQuete} : ${p.titre}`}>
            <Sceau l={{ etat: p.valeur > 0 ? "active" : "disponible", fraction: p.cible ? Math.min(1, p.valeur / p.cible) : 0, affichage: "complet", retro: false }} taille={30} />
            <span className="min-w-0 flex-1 text-[13.5px] leading-snug">
              <span className="font-semibold">{CODEX.accueil.maQuete} : </span>
              <span className="[overflow-wrap:anywhere]">{p.titre}</span>
              {entame && <span className="ml-1.5 font-mono text-[12px] tabular-nums text-muted">{entame}</span>}
            </span>
            <ArrowRight size={16} aria-hidden className="shrink-0 text-muted" />
          </Link>
        ) : (
          <Link href="/codex" className={s.accueilQuete}>
            <span className="text-[13.5px] font-semibold">{CODEX.accueil.ouvrir}</span>
            <ArrowRight size={16} aria-hidden className="ml-auto shrink-0 text-muted" />
          </Link>
        )}
        {bilan.contrats.length > 0 && (
          <div>
            <p className="t-eyebrow m-0 mb-1.5 flex items-center justify-between">
              <span>{CODEX.accueil.contrats}</span>
              <span className="font-mono normal-case tracking-normal tabular-nums">
                {bilan.trio.faits}/{bilan.trio.total}
              </span>
            </p>
            <ul className={s.accueilContrats}>
              {bilan.contrats.map((c) => (
                <li key={c.id} className={s.accueilContrat + (c.etat === "terminee" ? " " + s.fait : "")}>
                  <Sceau l={{ etat: c.etat, fraction: c.cible ? Math.min(1, c.valeur / c.cible) : 0, affichage: "complet", retro: false }} taille={18} />
                  <span className="min-w-0 truncate">{c.titre}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
