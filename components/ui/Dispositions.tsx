"use client";

import Link from "next/link";
import { createContext, useContext, useId } from "react";
import type { Piece } from "@/components/ui/Presentoir";
import { NBSP } from "@/lib/voice";
import { CERCLE_CRAIE } from "@/components/ui/craie";
import s from "./Dispositions.module.css";

// Le tableau noir des calculs (direction « le lieu, puis l'objet », validée par Théo le 2026-11-13) :
// l'ardoise bleu nuit grainée, ses traces d'effacement, le cadre d'ébène biseauté à liseré d'or sobre,
// le rebord avec sa craie blanche, son bout de craie jaune et sa brosse. Tout ce qui s'y écrit est à
// la craie (la main du site, Caveat, grainée) : les lignes, les pastilles F · M · D, les bâtons, le
// graphique des points faibles et l'action du pied. Les matières gardent des couleurs fixes, jour
// comme nuit (--noir devient clair la nuit) ; un liseré clair les détache du fond sombre.
// Le pavé, l'éventail et la sélection ont été retirés le 2026-11-13 : aucune page ne les utilisait.

/** l'identifiant des tracés de craie du tableau (cercle, trait, flèche), pour les `<use href>` des pièces écrites dessus */
const CraieId = createContext("craie");

/** Une pièce du tableau : `or`, écrite à la craie jaune (ex. le Top 5) ; `puce`, à la place du numéro (★, –) ; `raison`, sous la pièce entourée, en petite craie. */
export type PieceTableau = Piece & { or?: boolean; puce?: string; raison?: React.ReactNode };

/** un mot à trait d'union ne se coupe pas à la ligne (« écart-type ») ; « : », « ; », « ! », « ? » restent collés au mot d'avant */
function insecable(titre: string): React.ReactNode {
  const net = titre.replace(/ ([:;!?])/g, NBSP + "$1");
  const morceaux = net.split(/(\S+-\S+)/);
  return morceaux.length < 2 ? net : morceaux.map((m, i) => (i % 2 ? <span key={i} className={s.insec}>{m}</span> : m));
}

/** le lien d'une pièce disponible, sinon une pièce à moitié effacée ; `label` : sa lecture (sinon `aria`, sinon le titre) */
function Lien({ p, className, label, children }: { p: Piece; className: string; label?: string; children: React.ReactNode }) {
  return p.href ? (
    <Link href={p.href} className={className} aria-label={label ?? p.aria ?? p.titre}>
      {children}
    </Link>
  ) : (
    <span className={className} aria-disabled="true" aria-label={p.titre} data-indispo="1">
      {children}
    </span>
  );
}

/** Un trait de craie (titre souligné, survol, filet pointillé). */
export function TraitCraie({ className }: { className: string }) {
  const id = useContext(CraieId);
  return (
    <svg className={className} viewBox="0 0 240 10" preserveAspectRatio="none" aria-hidden>
      <use href={`#${id}-trait`} />
    </svg>
  );
}

/** Un titre écrit à la craie, souligné d'un trait (`or` : craie jaune). */
export function TitreCraie({ children, or }: { children: React.ReactNode; or?: boolean }) {
  return (
    <h3 className={s.titre} data-or={or ? "1" : undefined}>
      {children}
      <TraitCraie className={s.titreTrait} />
    </h3>
  );
}

/**
 * Le tableau noir. Les pièces s'écrivent en lignes (puce ou numéro, nom, `pied` : pastilles ou bâtons,
 * pourcentage ; `vide` remplace un pourcentage pas encore mesuré). La pièce conseillée (`depart`, -1 :
 * aucune) est entourée d'une gélule de craie glace, sa `raison` dessous ; au survol, un trait de craie
 * souligne. Une pièce indisponible est à moitié effacée, une pièce pas encore mesurée à demi.
 * `sections` (titres, nombres de pièces dans l'ordre, `or`) : les pièces se rangent sous des titres
 * soulignés ; à trois sections, la première et la troisième à gauche, la deuxième à droite quand le
 * tableau a la place. Sans sections, deux colonnes. `dessous` : ce qui s'écrit au bas du tableau
 * (ex. le graphique des points faibles, GrapheCraie) ; `bas` : la légende à gauche, l'action écrite à
 * la craie à droite, avec sa flèche.
 */
export function Tableau({
  pieces,
  action,
  depart = 0,
  vide = "–",
  bas,
  sections,
  dessous,
}: {
  pieces: PieceTableau[];
  action: string;
  depart?: number;
  vide?: string;
  bas?: { legende?: React.ReactNode; lien?: { titre: string; href: string } };
  sections?: { titre: string; nombre: number; or?: boolean }[];
  dessous?: React.ReactNode;
}) {
  const id = "craie" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  if (!pieces.length) return null;

  const ligne = (p: PieceTableau, i: number) => {
    const conseil = i === depart;
    // la raison écrite sous la pièce entourée est l'information principale : le lecteur d'écran la lit aussi
    const label = conseil && typeof p.raison === "string" ? [p.aria ?? p.titre, p.raison].join(", ") : undefined;
    return (
      <li key={p.cle} data-conseil={conseil ? "1" : undefined} data-or={p.or ? "1" : undefined} data-vierge={p.pct == null ? "1" : undefined}>
        <Lien p={p} className={s.ecrit} label={label}>
          <span className={s.ecritNum}>{p.puce ?? `${Number(p.numero)}.`}</span>
          <span className={s.ecritNom}>
            {insecable(p.titre)}
            {conseil && (
              <svg className={s.entoure} viewBox="0 0 240 60" preserveAspectRatio="none" aria-hidden>
                <use href={`#${id}-cercle`} />
              </svg>
            )}
            <TraitCraie className={s.souligne} />
          </span>
          <span className={s.ecritMention}>{p.pied}</span>
          <span className={s.ecritPct}>{p.pct != null ? `${Math.round(p.pct)}${NBSP}%` : p.href ? vide : ""}</span>
          {conseil && p.raison && <span className={s.raison}>{p.raison}</span>}
        </Lien>
      </li>
    );
  };

  const moitie = Math.ceil(pieces.length / 2);

  // les sections : des tranches successives de la liste
  let debut = 0;
  const tranches = (sections ?? [])
    .map((x) => {
      const t = { ...x, debut, items: pieces.slice(debut, debut + x.nombre) };
      debut += x.nombre;
      return t;
    })
    .filter((x) => x.items.length);

  return (
    <CraieId.Provider value={id}>
      <div className={s.tableau}>
        <svg width="0" height="0" className={s.defs} aria-hidden>
          <defs>
            <path id={`${id}-cercle`} vectorEffect="non-scaling-stroke" d={CERCLE_CRAIE} />
            <path id={`${id}-trait`} vectorEffect="non-scaling-stroke" d="M3 7C40 4 92 3 140 5c38 1 70 3 95 1" />
            <path id={`${id}-fleche`} vectorEffect="non-scaling-stroke" d="M4 9c40-3 96-4 150-3 30 0 52 1 72 0M212 2c6 3 12 5 16 7-5 2-10 4-15 8" />
          </defs>
        </svg>
        <div className={s.cadre}>
          <div className={s.ardoise}>
            {tranches.length ? (
              <div className={s.craie + " " + s.listes} data-n={tranches.length} aria-label={action}>
                {tranches.map((x, k) => (
                  <section key={x.titre} className={s.section} data-zone={k}>
                    <TitreCraie or={x.or}>{x.titre}</TitreCraie>
                    <ol className={s.liste}>{x.items.map((p, j) => ligne(p, x.debut + j))}</ol>
                  </section>
                ))}
              </div>
            ) : (
              // deux listes indépendantes : la raison écrite sous la pièce entourée ne décale pas l'autre colonne
              <div className={s.craie + " " + s.colonnes} aria-label={action}>
                <ol className={s.liste}>{pieces.slice(0, moitie).map((p, i) => ligne(p, i))}</ol>
                <ol className={s.liste} start={moitie + 1}>
                  {pieces.slice(moitie).map((p, i) => ligne(p, moitie + i))}
                </ol>
              </div>
            )}
            {dessous}
            {bas && (
              <div className={s.craie + " " + s.pied}>
                <TraitCraie className={s.filet} />
                <span className={s.legende}>{bas.legende}</span>
                {bas.lien && (
                  <Link href={bas.lien.href} className={s.action}>
                    {bas.lien.titre}
                    <svg className={s.fleche} viewBox="0 0 232 20" preserveAspectRatio="none" aria-hidden>
                      <use href={`#${id}-fleche`} />
                    </svg>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
        <div className={s.rebord} aria-hidden>
          <i className={s.baton} />
          <i className={s.bout} />
          <i className={s.brosse} />
        </div>
      </div>
    </CraieId.Provider>
  );
}

/** Une clé de la légende du pied (un signe, puis ce qu'il veut dire). */
export function CleCraie({ signe, children }: { signe?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className={s.cle}>
      {signe}
      {children}
    </span>
  );
}

export type BarreCraie = { cle: string; nom: string; pct: number; href: string; detail: string; aria: string };

/**
 * Le graphique écrit au bas du tableau (les points faibles d'une matière) : un filet, le titre, puis
 * une barre de craie hachurée par ligne (le nom à gauche, le pourcentage à droite), le seuil en
 * pointillé de craie glace avec son nom, l'axe des zéros et ses repères. Le détail au survol (title)
 * et au lecteur d'écran ; chaque barre mène à sa page. `reste` : une ligne sous le graphique.
 */
export function GrapheCraie({ titre, barres, seuil, seuilNom, reste }: { titre: string; barres: BarreCraie[]; seuil: number; seuilNom: string; reste?: string | null }) {
  if (!barres.length) return null;
  return (
    <section className={s.craie + " " + s.graphe} style={{ "--seuil": `${seuil}%` } as React.CSSProperties} aria-label={titre}>
      <TraitCraie className={s.filet} />
      <TitreCraie>{titre}</TitreCraie>
      <div className={s.grapheTete} aria-hidden>
        <span />
        <span className={s.grapheRepere}>
          <b className={s.seuilNom}>{seuilNom}</b>
        </span>
        <span />
      </div>
      <ol className={s.barres}>
        {barres.map((b) => (
          <li key={b.cle}>
            <Link href={b.href} className={s.barre} title={b.detail} aria-label={b.aria}>
              <span className={s.barreNom}>
                {insecable(b.nom)}
                <TraitCraie className={s.souligne} />
              </span>
              <span className={s.piste}>
                <i style={{ "--p": `${Math.max(1.5, Math.min(100, b.pct))}%` } as React.CSSProperties} />
              </span>
              <span className={s.barrePct}>
                {Math.round(b.pct)}
                {NBSP}%
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <div className={s.axe} aria-hidden>
        <span />
        <span className={s.grapheRepere}>
          <em style={{ left: "0%" }}>0</em>
          <em style={{ left: "50%" }}>50</em>
          <em style={{ left: "100%" }}>100{NBSP}%</em>
        </span>
        <span />
      </div>
      {reste && <p className={s.reste}>{reste}</p>}
    </section>
  );
}

/**
 * Des bâtons de craie (|||| barrés par cinq) : un compte qu'on lit d'un coup d'œil. Les `neufs`
 * derniers (gagnés depuis la dernière visite) se tracent une fois.
 */
export function Batons({ n, titre, neufs = 0 }: { n: number; titre?: string; neufs?: number }) {
  if (n <= 0) return null;
  const depuis = n - Math.max(0, Math.min(n, neufs));
  const groupes = Array.from({ length: Math.ceil(n / 5) }, (_, g) => Math.min(5, n - g * 5));
  return (
    <span className={s.batons} title={titre} aria-hidden>
      {groupes.map((k, g) => (
        <span key={g} className={s.groupe} data-barre={k === 5 ? "1" : undefined} data-neuf={k === 5 && g * 5 + 4 >= depuis ? "1" : undefined}>
          {Array.from({ length: Math.min(k, 4) }, (_, j) => (
            <i key={j} data-neuf={g * 5 + j >= depuis ? "1" : undefined} />
          ))}
        </span>
      ))}
    </span>
  );
}

/** Des pastilles écrites à la craie (ex. F · M · D) : pleine (tenu), entourée (entamé), ou à peine tracée ; `neuf` : se tamponne une fois. */
export function Pastilles({ items, titre }: { items: { lettre: string; etat: "plein" | "cercle" | "vide"; neuf?: boolean }[]; titre?: string }) {
  return (
    <span className={s.pastilles} title={titre} aria-hidden>
      {items.map((x, i) => (
        <span key={i} className={s.pastille} data-etat={x.etat} data-neuf={x.neuf ? "1" : undefined}>
          {x.lettre}
        </span>
      ))}
    </span>
  );
}
