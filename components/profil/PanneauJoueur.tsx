import type { CSSProperties } from "react";
import type { BadgeVue, PanneauVue } from "@/lib/profil/panneau-vue";
import c from "./PanneauJoueur.module.css";

// Le panneau de gauche de la bannière : la « carte » du joueur, dessinée par
// le site (comme dans Apex) ; le joueur choisit seulement ce qu'il y met
// (lib/profil/panneau-vue.ts : trois badges, trois statistiques). Une plaque
// sombre à texture d'encre, cadre fin de métal, liseré vermillon ; dessus, de
// haut en bas : le pseudo (et son titre), le rang (le vrai insigne du site),
// les trois badges sur leur rail, les trois chiffres en Dela Gothic One.
// Il remplit la boîte que lui donne la carte (CarteBanniere) ; tout se mesure
// en unités de la carte (--u : un pixel d'une carte de 860 de large), avec
// des minimums lisibles sur petit écran. La bannière passe devant sa partie
// droite (le texte reste dans la partie gauche). Sans état : serveur comme client.

const ACCENT = "#d9482b";
const CREME = "#f3ecda";
const ENCRE = "#1a1410";

/** La couleur d'un badge : le ton de son palier (sceau : encre, vermillon, dorure ; trophée : bronze à diamant ; titre : parchemin). */
export function tonBadge(b: Pick<BadgeVue, "genre" | "palier">): string {
  if (b.genre === "sceau") return ["#6e675c", "#6e675c", "#c4402a", "#c9a24a"][Math.max(1, Math.min(3, b.palier))];
  if (b.genre === "trophee") return ["#b8713f", "#b8713f", "#bcc1c7", "#e2b13b", "#afc0f5"][Math.max(1, Math.min(4, b.palier))];
  return "#d8cba8";
}

/** Le dessin d'un badge : un losange à reflets, le motif de son genre au milieu (cachet, coupe, étoile). */
function Losange({ b }: { b: BadgeVue }) {
  return (
    <svg viewBox="0 0 90 110" className={c.losange} aria-hidden focusable="false" data-genre={b.genre}>
      <path d="M45,3L87,55L45,107L3,55Z" fill={tonBadge(b)} stroke={ENCRE} strokeWidth={3} strokeLinejoin="round" />
      <path d="M87,55L45,107L45,55Z" fill="#000" fillOpacity={0.32} />
      <path d="M45,3L87,55L45,55Z" fill="#000" fillOpacity={0.14} />
      <path d="M45,7L9,55L45,55Z" fill="#fff" fillOpacity={0.28} />
      <path d="M45,22.1L71.6,55L45,87.9L18.4,55Z" fill="#1c150f" stroke={ENCRE} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M37,3L53,3L45,13Z" fill={ACCENT} stroke={ENCRE} strokeWidth={2} />
      {b.genre === "sceau" && (
        <>
          <circle cx={45} cy={56} r={13} fill="none" stroke={CREME} strokeWidth={3.6} />
          <circle cx={45} cy={56} r={4.6} fill={CREME} />
        </>
      )}
      {b.genre === "trophee" && (
        <>
          <path d="M34,42H56V53A11,11 0 0 1 34,53Z" fill={CREME} stroke={ENCRE} strokeWidth={1.6} strokeLinejoin="round" />
          <path d="M34,45H28V50A6,6 0 0 0 34,56M56,45H62V50A6,6 0 0 1 56,56" fill="none" stroke={CREME} strokeWidth={3} />
          <path d="M45,64V70M37,71H53" fill="none" stroke={CREME} strokeWidth={4} strokeLinecap="round" />
        </>
      )}
      {b.genre === "titre" && <path d="M45,33.6L49.9,51.1L67.4,56L49.9,60.9L45,78.4L40.1,60.9L22.6,56L40.1,51.1Z" fill={CREME} stroke={ENCRE} strokeWidth={1.6} strokeLinejoin="round" />}
    </svg>
  );
}

export function PanneauJoueur({
  v,
  className = "",
  isole = false,
  cote = "gauche",
}: {
  v: PanneauVue;
  className?: string;
  /** hors de la carte complète (le volet du podium) : le panneau remplit seul sa boîte, qui mesure 470 unités de large et non 860 */
  isole?: boolean;
  /** de quel côté de la bannière il se pose (le volet) : à gauche, comme sur la carte, la bannière en cache la droite ; à droite, elle en cache la gauche ; « dessus », elle ne le cache pas */
  cote?: "gauche" | "droite" | "dessus";
}) {
  return (
    <aside className={`${c.panneau} ${className}`} style={{ ["--metal" as string]: v.metal, ["--acc" as string]: ACCENT } as CSSProperties} aria-label={`Carte de ${v.nom}`} data-panneau="" data-isole={isole ? "" : undefined} data-cote={isole ? cote : undefined}>
      {/* la plaque : un contour d'encre, un filet de métal, le fond d'encre ; le coin du haut gauche est coupé */}
      <span aria-hidden className={c.plaque}>
        <span className={c.metal}>
          <span className={c.fondPlaque} />
        </span>
      </span>
      <div className={c.contenu}>
        <div className={c.identite}>
          <p className={`${c.nom} font-brand`}>{v.nom}</p>
          <span aria-hidden className={c.filet} />
          {v.titre && <p className={c.titre}>{v.titre}</p>}
          <div className={c.rang}>
            {/* le vrai insigne du palier (l'image pré-rendue du site) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={c.insigne} src={`/ranks/v2/petit-${v.rang.tier}-128.png`} width={128} height={128} alt="" draggable={false} loading="lazy" decoding="async" />
            <p className={c.rangTexte}>
              <small>Rang</small>
              <b className="font-brand">{v.rang.nom}</b>
              {v.rang.provisoire && <small className={c.provisoire}>{v.rang.provisoire}</small>}
            </p>
          </div>
        </div>

        {v.badges.length > 0 && (
          <ul className={c.badges} aria-label="Badges">
            {v.badges.map((b, i) => (
              <li key={b.id} className={c.badge} data-badge={b.id}>
                <Losange b={b} />
                <span className={c.badgeTexte}>
                  <small aria-hidden>{String(i + 1).padStart(2, "0")}</small>
                  <b>{b.nom}</b>
                  {b.detail && <em>{b.detail}</em>}
                </span>
              </li>
            ))}
          </ul>
        )}

        {v.stats.length > 0 && (
          <dl className={c.stats}>
            {v.stats.map((s) => (
              <div key={s.cle} className={c.stat} data-stat={s.cle}>
                <dt>{s.etiquette}</dt>
                <dd className="font-brand">{s.valeur}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </aside>
  );
}
