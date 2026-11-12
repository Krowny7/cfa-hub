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

/** Une pièce du tableau : `or`, écrite à la craie jaune (ex. le Top 5) ; `puce`, à la place du numéro (★, –). */
export type PieceTableau = Piece & { or?: boolean; puce?: string };

/**
 * Le tableau noir : les matières écrites à la craie (la main du site, Caveat, grainée), cadre de bois,
 * rebord avec sa craie et sa brosse. La pièce conseillée (`depart`, -1 : aucune) est entourée ; au
 * survol, un trait de craie la souligne. Une pièce indisponible est à moitié effacée. Le `pied` d'une
 * pièce s'écrit entre son nom et son pourcentage (ex. les bâtons des calculs maîtrisés) ; `vide`
 * remplace un pourcentage pas encore mesuré ; `bas` : une ligne au pied du tableau (légende à gauche,
 * lien à la craie à droite). Avec `sections` (titres et nombres de pièces, dans l'ordre), les pièces se
 * rangent sous des titres soulignés, sur deux colonnes équilibrées quand le tableau a la place.
 */
export function Tableau({
  pieces,
  action,
  depart = 0,
  vide = "–",
  bas,
  sections,
}: {
  pieces: PieceTableau[];
  action: string;
  depart?: number;
  vide?: string;
  bas?: { legende?: React.ReactNode; lien?: { titre: string; href: string } };
  sections?: { titre: string; nombre: number }[];
}) {
  const id = "craie" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  if (!pieces.length) return null;

  const ligne = (p: PieceTableau, i: number) => (
    <li key={p.cle} data-conseil={i === depart ? "1" : undefined} data-or={p.or ? "1" : undefined}>
      <Lien p={p} className={s.ecrit}>
        <span className={s.ecritNum}>{p.puce ?? `${Number(p.numero)}.`}</span>
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
        <span className={s.ecritMention}>{p.pied}</span>
        <span className={s.ecritPct}>{p.pct != null ? `${Math.round(p.pct)} %` : p.href ? vide : ""}</span>
      </Lien>
    </li>
  );

  // les sections : des tranches successives de la liste
  let debut = 0;
  const tranches = (sections ?? [])
    .map((x) => {
      const t = { titre: x.titre, debut, items: pieces.slice(debut, debut + x.nombre) };
      debut += x.nombre;
      return t;
    })
    .filter((x) => x.items.length);

  return (
    <div className={s.tableau}>
      <svg width="0" height="0" className={s.defs} aria-hidden>
        <defs>
          <path id={`${id}-cercle`} vectorEffect="non-scaling-stroke" d="M18 34C10 18 62 6 128 7c62 1 108 9 106 25-2 17-58 24-118 22C58 52 10 46 9 30 8 17 40 9 72 8" />
          <path id={`${id}-trait`} vectorEffect="non-scaling-stroke" d="M3 7C40 4 92 3 140 5c38 1 70 3 95 1" />
        </defs>
      </svg>
      <div className={s.ardoise}>
        {tranches.length ? (
          <div className={s.craie} data-sections="1" aria-label={action}>
            {tranches.map((x) => (
              <section key={x.titre} className={s.section}>
                <h3 className={s.sectionTitre}>{x.titre}</h3>
                <ol className={s.sectionListe}>{x.items.map((p, j) => ligne(p, x.debut + j))}</ol>
              </section>
            ))}
          </div>
        ) : (
          <ol className={s.craie} aria-label={action} style={{ "--lignes": Math.ceil(pieces.length / 2) } as React.CSSProperties}>
            {pieces.map(ligne)}
          </ol>
        )}
        {bas && (
          <div className={s.basTableau}>
            <span className={s.legendeCraie}>{bas.legende}</span>
            {bas.lien && (
              <Link href={bas.lien.href} className={s.lienCraie}>
                {bas.lien.titre} →
              </Link>
            )}
          </div>
        )}
      </div>
      <div className={s.rebord} aria-hidden>
        <i className={s.baton} />
        <i className={s.brosse} />
      </div>
    </div>
  );
}

/** Des bâtons de craie (|||| barrés par cinq) : un compte qu'on lit d'un coup d'œil. */
export function Batons({ n, titre }: { n: number; titre?: string }) {
  if (n <= 0) return null;
  const groupes = Array.from({ length: Math.ceil(n / 5) }, (_, g) => Math.min(5, n - g * 5));
  return (
    <span className={s.batons} title={titre} aria-hidden>
      {groupes.map((k, g) => (
        <span key={g} className={s.groupe} data-barre={k === 5 ? "1" : undefined}>
          {Array.from({ length: Math.min(k, 4) }, (_, j) => (
            <i key={j} />
          ))}
        </span>
      ))}
    </span>
  );
}

/** Des pastilles écrites à la craie (ex. F · M · D) : pleine, entourée, ou à peine tracée. */
export function Pastilles({ items, titre }: { items: { lettre: string; etat: "plein" | "cercle" | "vide" }[]; titre?: string }) {
  return (
    <span className={s.pastilles} title={titre} aria-hidden>
      {items.map((x, i) => (
        <span key={i} className={s.pastille} data-etat={x.etat}>
          {x.lettre}
        </span>
      ))}
    </span>
  );
}
