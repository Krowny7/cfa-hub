"use client";

import { useId } from "react";
import { CERCLE_CRAIE } from "@/components/ui/craie";
import s from "./Selection.module.css";

// L'objet-héros de /practice (direction « le lieu, puis l'objet », 2026-11-13) : la sélection façon
// choix de niveau, une planche d'ébène biseautée à liseré d'or sobre. Dessus, les 10 matières en
// lignes : le numéro et le poids en Mono, la précision en Mono et sa jauge graduée (le repère « tenu »
// à 80 %, le seuil de lib/calc/faibles.ts). Une ligne choisie s'allume (fond ivoire, filet à gauche,
// nom en ivoire plein) ; les conseillées (les trois plus faibles) sont entourées du cercle de craie
// du tableau des calculs (components/ui/craie : un seul signe « conseillé » partout), en deux
// passages décalés. Au pied, les réglages en touches, puis le grand Lancer centré. L'ébène garde ses
// couleurs fixes de jour comme de nuit (--noir devient clair la nuit) ; la nuit, un liseré clair
// remplace l'ombre. Sans état : ni Date ni hasard.

/** le seuil « tenu » des jauges (le même que les points faibles des calculs : 4 justes sur 5) */
export const SEUIL_TENU = 80;

export type LigneNiveau = {
  cle: string;
  numero: string;
  nom: string;
  /** le poids à l'examen (« 15-20 % ») */
  poids: string;
  /** la précision mesurée, null : pas encore */
  pct: number | null;
  /** conseillée : entourée à la craie */
  conseil: boolean;
  on: boolean;
  /** la ligne lue (lecteur d'écran) */
  lecture: string;
};

/** La planche d'ébène : `tete` (l'étiquette et le choix matières/notions), le corps, puis `pied` (les réglages et l'action). */
export function Planche({ tete, pied, children, clair, calme }: { tete?: React.ReactNode; pied?: React.ReactNode; children: React.ReactNode; clair?: boolean; calme?: boolean }) {
  return (
    <div className={s.planche} data-clair={clair ? "1" : undefined} data-calme={calme ? "1" : undefined}>
      {tete && <div className={s.tete}>{tete}</div>}
      <div className={s.corps}>{children}</div>
      {pied && <div className={s.pied}>{pied}</div>}
    </div>
  );
}

/** Les dix matières, façon choix de niveau. `poidsVifs` : le mode examen, les poids comptent (en ivoire plein). */
export function Niveaux({ lignes, onBascule, label, poidsVifs }: { lignes: LigneNiveau[]; onBascule: (cle: string) => void; label: string; poidsVifs?: boolean }) {
  const id = "niveau" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <>
      <svg className={s.defs} aria-hidden focusable="false">
        <defs>
          {/* le cercle de craie du tableau, une seule fois ; chaque ligne conseillée le reprend (<use href>) */}
          <path id={`${id}-cercle`} vectorEffect="non-scaling-stroke" d={CERCLE_CRAIE} />
        </defs>
      </svg>
      <ol className={s.niveaux} aria-label={label} data-poids={poidsVifs ? "1" : undefined}>
        {lignes.map((l, i) => {
          const rempli = l.pct === null ? 0 : Math.max(2, Math.min(100, l.pct));
          return (
            <li key={l.cle} style={{ "--i": i } as React.CSSProperties}>
              <button type="button" aria-pressed={l.on} aria-label={l.lecture} className={"rl-presse " + s.niveau} data-on={l.on ? "1" : undefined} onClick={() => onBascule(l.cle)}>
                <span className={s.num} aria-hidden>
                  {l.numero}
                </span>
                <span className={s.nom}>{l.nom}</span>
                <span className={s.poids} aria-hidden>
                  {l.poids}
                </span>
                <span className={s.mesure} aria-hidden>
                  <span className={s.pct} data-vide={l.pct === null ? "1" : undefined}>
                    {l.pct === null ? "—" : `${l.pct}`}
                    {l.pct !== null && <small>%</small>}
                    {l.conseil && (
                      <svg className={s.cercle} viewBox="0 0 240 60" preserveAspectRatio="none" aria-hidden focusable="false">
                        <use href={`#${id}-cercle`} />
                        <use href={`#${id}-cercle`} className={s.repasse} />
                      </svg>
                    )}
                  </span>
                  <span className={s.jauge} data-tenu={l.pct !== null && l.pct >= SEUIL_TENU ? "1" : undefined}>
                    <i style={{ width: `${rempli}%` }} />
                    <b style={{ left: `${SEUIL_TENU}%` }} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** Un réglage de la barre : son nom en Mono au-dessus, la commande dessous. */
export function Reglage({ nom, children, aide }: { nom: string; children: React.ReactNode; aide?: string }) {
  return (
    <div className={s.reglage} title={aide}>
      <span className={s.reglageNom}>{nom}</span>
      {children}
    </div>
  );
}

/** Le choix d'une valeur, sur l'ébène (le nombre de questions, le mélange, le mode examen) : des touches. */
export function Touches<K extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: K | null;
  options: { key: K; label: React.ReactNode; disabled?: boolean; titre?: string }[];
  onChange: (k: K) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={s.touches}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={o.key === value}
          disabled={o.disabled}
          title={o.titre}
          className={"rl-presse " + s.touche}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Le choix matières / notions, en tête de la planche. */
export function Onglets<K extends string>({ value, options, onChange, label }: { value: K; options: { key: K; label: string }[]; onChange: (k: K) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className={s.onglets}>
      {options.map((o) => (
        <button key={o.key} type="button" role="tab" aria-selected={o.key === value} className={s.onglet} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** L'étiquette Mono de la planche (« TES MATIÈRES ») et son compte. */
export function TetePlanche({ titre, compte }: { titre: string; compte?: React.ReactNode }) {
  return (
    <h2 className={s.titre}>
      {titre}
      {compte != null && <span className={s.compte}>{compte}</span>}
    </h2>
  );
}

/** La ligne Mono sous l'action (matières, durée, trophée visé) ou une erreur. */
export function NotePlanche({ children, alerte }: { children: React.ReactNode; alerte?: boolean }) {
  return (
    <p className={s.note} role={alerte ? "alert" : undefined} aria-live={alerte ? undefined : "polite"}>
      {children}
    </p>
  );
}

/** Les réglages, en une rangée au pied de la planche. */
export function Reglages({ children }: { children: React.ReactNode }) {
  return <div className={s.reglages}>{children}</div>;
}

/** L'action, centrée sous les réglages : le grand Lancer (le compte en Dela), puis la note. */
export function Lancement({ children }: { children: React.ReactNode }) {
  return <div className={s.lancement}>{children}</div>;
}

/** Le compte de la séance, en Dela, dans le grand Lancer. */
export function CompteLancer({ n }: { n: number }) {
  return <b className={s.compteLancer}>{n}</b>;
}
