import Link from "next/link";
import { nombre } from "@/lib/voice";
import { SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import s from "./PointsFaibles.module.css";

const M = SOUS_ENTRAINEMENT.calculsMatiere;

export type PointFaible = { cle: string; nom: string; pct: number; ok: number; n: number; tenus: number; href: string };

/**
 * Les points faibles d'une matière (demande de Théo, 2026-11-12, l'annexe sous le tableau noir) : un
 * graphique en barres de la précision récente des calculs entamés pas encore tenus, les plus faibles
 * en haut ; le trait pointillé du seuil « tenu » (4 justes sur 5). Le détail (justes, essais, niveaux)
 * au survol ou au clavier ; chaque barre mène au calcul. Au-delà de `max`, une ligne dit combien il en
 * reste. Composant serveur (sans état).
 */
export function PointsFaibles({ points, seuil, max = 8 }: { points: PointFaible[]; seuil: number; max?: number }) {
  const vus = points.slice(0, max);
  const reste = points.length - vus.length;
  return (
    <figure className={s.graphique} style={{ "--seuil": `${seuil}%` } as React.CSSProperties}>
      <div className={s.entete} aria-hidden>
        <span />
        <span className={s.piste}>
          <span className={s.seuilNom}>{M.seuil}</span>
        </span>
        <span />
      </div>
      <ol className={s.barres}>
        {vus.map((p) => (
          <li key={p.cle}>
            <Link href={p.href} className={s.ligne} aria-label={`${p.nom}, ${nombre(p.pct)} %, ${M.detail(p.ok, p.n, p.tenus)}`}>
              <span className={s.nom}>{p.nom}</span>
              <span className={s.piste}>
                <span className={s.barre} style={{ width: `${Math.max(1.5, Math.min(100, p.pct))}%` }} />
              </span>
              <span className={s.valeur}>{nombre(p.pct)} %</span>
              <span className={s.bulle} aria-hidden>
                {M.detail(p.ok, p.n, p.tenus)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <div className={s.axe} aria-hidden>
        <span />
        <span className={s.piste}>
          <span style={{ left: "0%" }}>0 %</span>
          <span style={{ left: "50%" }}>50 %</span>
          <span style={{ left: "100%" }}>100 %</span>
        </span>
        <span />
      </div>
      {reste > 0 && <figcaption className={s.reste}>{M.autres(reste)}</figcaption>}
    </figure>
  );
}
