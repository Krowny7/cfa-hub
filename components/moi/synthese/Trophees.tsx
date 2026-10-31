import type { CSSProperties } from "react";
import { SceauUni } from "@/components/moi/synthese/Encre";
import { metalDePalier } from "@/components/moi/synthese/modele";
import type { TropheesSynthese } from "@/components/moi/synthese/types";
import { ParSource } from "@/components/trophees/SalleDesTrophees";
import { PALIERS_TROPHEE, nomPalier, type PalierTrophee } from "@/lib/trophees";
import { nombre } from "@/lib/voice";
import { SYN } from "@/lib/voice-moi";
import s from "@/components/moi/synthese/Synthese.module.css";

// La salle des trophées (une bande, id="trophees") : le nombre de trophées de
// chaque palier, en métal (bronze, argent, or, diamant : les couleurs des
// insignes de rang), le dernier gagné avec sa règle, et le détail « Par
// source » replié dessous. Sans migration_v3_profil.sql §2, seul
// l'entraînement ciblé est compté et le dernier gagné est masqué. L'icône de
// trophée, répétée six fois, passe par un <symbol> et des <use> (une seule
// copie du tracé dans la page : pas de poids inutile à l'hydratation).
// Composant serveur, aucun hook.

const ID = "syn-trophees";
const SYMBOLE = "syn-trophee";

/** Le tracé du trophée, une seule fois dans la page. */
function SymboleTrophee() {
  return (
    <svg width={0} height={0} aria-hidden focusable="false" style={{ position: "absolute" }}>
      <symbol id={SYMBOLE} viewBox="0 0 24 24">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-1.21 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98 1.21 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </symbol>
    </svg>
  );
}

function IconeTrophee({ taille }: { taille: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <use href={"#" + SYMBOLE} />
    </svg>
  );
}

const jetonsMetal = (palier: PalierTrophee): CSSProperties => {
  const [m0, m1, m2] = metalDePalier(palier);
  return { "--m0": m0, "--m1": m1, "--m2": m2 } as CSSProperties;
};

/** Les paliers du plus haut au plus bas : diamant, or, argent, bronze. */
const PALIERS = [...PALIERS_TROPHEE].reverse();

export function Trophees({ t }: { t: TropheesSynthese }) {
  return (
    <section className={[s.carte, s.salle].join(" ")} id="trophees" aria-labelledby={ID}>
      <SymboleTrophee />
      <div className={s.salleTete}>
        <h2 id={ID} className="font-brand">
          <SceauUni>
            <IconeTrophee taille={15} />
          </SceauUni>
          {SYN.trophees.titre}
        </h2>
        {t.total > 0 && <p className={s.mono + " " + s.salleCompte}>{SYN.trophees.compte(t.total)}</p>}
      </div>
      {t.total > 0 ? (
        <>
          <ul className={[s.metaux, t.dernier ? "" : s.metauxLarges].filter(Boolean).join(" ")}>
            {PALIERS.map(({ palier }) => {
              const n = t.parPalier[palier];
              return (
                <li key={palier} className={[s.metal, n === 0 ? s.metalVide : ""].filter(Boolean).join(" ")} style={jetonsMetal(palier)}>
                  <span className={s.med}>
                    <IconeTrophee taille={20} />
                  </span>
                  <span className={s.metalTexte}>
                    <b className="font-brand">{nombre(n)}</b>
                    <span className={s.mnom}>{nomPalier(palier)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          {t.dernier && (
            <div className={s.dernier}>
              <span className={s.med} style={jetonsMetal(t.dernier.palier)}>
                <IconeTrophee taille={18} />
              </span>
              <span className={s.dernierTexte}>
                <span className={s.eyebrow}>{SYN.trophees.dernier}</span>
                <b>{t.dernier.nom}</b>
                {t.dernier.regle && <span>{t.dernier.regle}</span>}
              </span>
            </div>
          )}
        </>
      ) : (
        <p className={s.salleVide}>{SYN.trophees.vide}</p>
      )}
      {/* le détail à la demande : par source, la règle de chaque palier en infobulle */}
      <ParSource lignes={t.lignes} complet={t.complet} className={s.parSource} />
      {!t.complet && <p className={s.salleNote}>{SYN.trophees.partiel}</p>}
    </section>
  );
}
