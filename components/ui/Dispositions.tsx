"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { Piece } from "@/components/ui/Presentoir";
import s from "./Dispositions.module.css";

// Quatre autres façons de poser les matières dans la zone de gauche du cadre à zones (CadreZones),
// à la place du carrousel (demande de Théo, 2026-11-12, pour les calculs ou l'entraînement ciblé) :
// le pavé (les touches d'une calculatrice et son écran), l'éventail (une main de cartes), la
// sélection (une liste façon choix de niveau) et le tableau noir (la liste écrite à la craie).
// Toutes prennent les mêmes pièces que le carrousel ; `depart` est la pièce conseillée (voyant du
// pavé, carte levée de l'éventail, ligne choisie, matière entourée au tableau).
// Sans mouvement réduit : rien ne bouge.

type Props = { pieces: Piece[]; action: string; depart?: number };

/** le lien d'une pièce disponible, sinon une pièce en filigrane */
function Lien({ p, className, children, onVoir }: { p: Piece; className: string; children: React.ReactNode; onVoir?: () => void }) {
  const voir = onVoir ? { onMouseEnter: onVoir, onFocus: onVoir } : {};
  return p.href ? (
    <Link href={p.href} className={className} aria-label={p.aria ?? p.titre} {...voir}>
      {children}
    </Link>
  ) : (
    <span className={className} aria-disabled="true" aria-label={p.titre} data-indispo="1" {...(onVoir ? { onMouseEnter: onVoir } : {})}>
      {children}
    </span>
  );
}

/** Le pavé : les matières en touches de calculatrice ; l'écran du haut montre celle qu'on survole. */
export function Pave({ pieces, action, depart = 0 }: Props) {
  const [vu, setVu] = useState<number | null>(null);
  const montre = pieces[vu ?? depart];
  if (!pieces.length) return null;
  return (
    <div className={s.boitier}>
      <p className={s.ecran} aria-live="polite">
        <span className={s.ecranNum}>{montre?.numero}</span>
        <span className={s.ecranNom}>{montre?.titre}</span>
      </p>
      <ul className={s.touches} aria-label={action} onMouseLeave={() => setVu(null)}>
        {pieces.map((p, i) => (
          <li key={p.cle} data-conseil={i === depart ? "1" : undefined}>
            <Lien p={p} className={s.touche} onVoir={() => setVu(i)}>
              <span className={s.toucheNum}>{p.numero}</span>
              <b className={s.toucheCode}>{p.code}</b>
            </Lien>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** L'éventail : les matières en main, comme des cartes ; celle qu'on survole se lève. */
export function Eventail({ pieces, action, depart = 0, forme = "cartes" }: Props & { forme?: "cartes" | "tuile" }) {
  const [vu, setVu] = useState<number | null>(null);
  const n = pieces.length;
  const haut = vu ?? depart;
  if (!n) return null;
  return (
    <div className={s.eventail} data-forme={forme}>
      <ul className={s.main} aria-label={action} onMouseLeave={() => setVu(null)} style={{ "--n": n } as React.CSSProperties}>
        {pieces.map((p, i) => (
          // la main s'ouvre à droite de la carte levée : elle reste entière, sa voisine montre son coin
          <li key={p.cle} className={s.place} data-haut={i === haut ? "1" : undefined} data-droite={i > haut ? "1" : undefined} style={{ "--k": i - (n - 1) / 2 } as React.CSSProperties}>
            <Lien p={p} className={s.carte} onVoir={() => setVu(i)}>
              <span className={s.coin}>
                <span className={s.coinCode}>{p.code}</span>
                {forme === "cartes" ? <span className={s.enseigne}>♠</span> : p.numero}
              </span>
              <b className={s.code}>{p.code}</b>
              <span className={s.coinBas}>{p.numero}</span>
            </Lien>
          </li>
        ))}
      </ul>
      <p className={s.nom} aria-live="polite">
        {pieces[haut]?.titre}
      </p>
    </div>
  );
}

/** La sélection : la liste des matières façon choix de niveau ; la ligne survolée passe sur l'aplat. */
export function Niveaux({ pieces, action, depart = 0 }: Props) {
  if (!pieces.length) return null;
  return (
    <ol className={s.niveaux} aria-label={action} style={{ "--lignes": Math.ceil(pieces.length / 2) } as React.CSSProperties}>
      {pieces.map((p, i) => (
        <li key={p.cle} data-choisi={i === depart ? "1" : undefined}>
          <Lien p={p} className={s.niveau}>
            <span className={s.niveauNum}>{p.numero}</span>
            <b className={s.niveauCode}>{p.code}</b>
            <span className={s.niveauNom}>{p.titre}</span>
            {p.pct != null && <span className={s.niveauPct}>{Math.round(p.pct)} %</span>}
            {p.pct != null && <i className={s.jauge} style={{ width: `${Math.max(0, Math.min(100, p.pct))}%` }} aria-hidden />}
          </Lien>
        </li>
      ))}
    </ol>
  );
}

/**
 * Le tableau noir : les matières écrites à la craie (la main du site, Caveat, grainée), cadre de bois,
 * rebord avec sa craie et sa brosse. La matière conseillée est entourée ; au survol, un trait de craie
 * la souligne. Une matière pas encore ouverte est à moitié effacée.
 */
export function Tableau({ pieces, action, depart = 0 }: Props) {
  const id = "craie" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  if (!pieces.length) return null;
  return (
    <div className={s.tableau}>
      <svg width="0" height="0" className={s.defs} aria-hidden>
        <defs>
          <path id={`${id}-cercle`} vectorEffect="non-scaling-stroke" d="M18 34C10 18 62 6 128 7c62 1 108 9 106 25-2 17-58 24-118 22C58 52 10 46 9 30 8 17 40 9 72 8" />
          <path id={`${id}-trait`} vectorEffect="non-scaling-stroke" d="M3 7C40 4 92 3 140 5c38 1 70 3 95 1" />
        </defs>
      </svg>
      <div className={s.ardoise}>
        <ol className={s.craie} aria-label={action} style={{ "--lignes": Math.ceil(pieces.length / 2) } as React.CSSProperties}>
          {pieces.map((p, i) => (
            <li key={p.cle} data-conseil={i === depart ? "1" : undefined}>
              <Lien p={p} className={s.ecrit}>
                <span className={s.ecritNum}>{Number(p.numero)}.</span>
                <span className={s.ecritNom}>
                  {p.titre}
                  {i === depart && (
                    <svg className={s.entoure} viewBox="0 0 240 60" preserveAspectRatio="none" aria-hidden>
                      <use href={`#${id}-cercle`} />
                    </svg>
                  )}
                  <svg className={s.souligne} viewBox="0 0 240 10" preserveAspectRatio="none" aria-hidden>
                    <use href={`#${id}-trait`} />
                  </svg>
                </span>
                <span className={s.ecritPct}>{p.pct != null ? `${Math.round(p.pct)} %` : p.href ? "–" : ""}</span>
              </Lien>
            </li>
          ))}
        </ol>
      </div>
      <div className={s.rebord} aria-hidden>
        <i className={s.baton} />
        <i className={s.brosse} />
      </div>
    </div>
  );
}
