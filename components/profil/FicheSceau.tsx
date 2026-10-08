"use client";

import { Sceau } from "@/components/adn/Sceau";
import { Feuille } from "@/components/ui/Feuille";
import { seuilAffiche, type EtatSceau } from "@/lib/profil/sceaux";
import { FAMILLES_NOMS, PALIERS, SCEAUX_TXT, condition, inscription, nomSceau, progres, titreSceau } from "@/lib/voice-profil";

// Un sceau de la collection, et sa fiche. Le ton suit le palier : gaufré
// (pas encore gagné), encre, vermillon, dorure. La fiche (feuille du bas
// sur téléphone, panneau latéral sur ordinateur) : le grand sceau, ce qu'il
// atteste, ses trois paliers et l'avancée vers le suivant. Pas de date
// d'obtention : elle n'est pas gardée à cette étape.

const TONS = ["gaufre", "ink", "pen", "dorure"] as const;
/** la pastille de chaque palier, dans la fiche et la collection */
export const COULEUR_PALIER = ["var(--pencil)", "var(--ink)", "var(--pen)", "#c4932f"] as const;

/** Ce que dit le sceau, en une ligne : « Duelliste · vermillon : 25 victoires en duel ». */
export function ditSceau(e: EtatSceau) {
  const c = condition(e.def, seuilAffiche(e));
  return e.palier ? `${titreSceau(e)} : ${c}` : `${nomSceau(e.def)}, ${SCEAUX_TXT.aGagner} : ${c}`;
}

/** Le sceau dessiné, à son palier (gaufré au premier palier s'il n'est pas gagné). */
export function SceauDe({ e, taille, angle = 0 }: { e: EtatSceau; taille: number | "remplir"; angle?: number }) {
  return <Sceau {...inscription(e.def, seuilAffiche(e))} ton={TONS[e.palier]} taille={taille} angle={angle} pose={false} son={false} title={ditSceau(e)} />;
}

export function FicheSceau({ e, onFermer }: { e: EtatSceau | null; onFermer: () => void }) {
  return (
    <Feuille ouvert={!!e} onFermer={onFermer} titre={e ? `${SCEAUX_TXT.titre} · ${FAMILLES_NOMS[e.def.famille]}` : SCEAUX_TXT.titre} fermer={SCEAUX_TXT.fermer}>
      {e && (
        <div className="flex flex-col gap-5 pt-2">
          <div className="grid place-items-center py-2">
            <SceauDe e={e} taille={180} angle={-4} />
          </div>
          <div>
            <p className="t-h2 m-0">{e.palier ? titreSceau(e) : nomSceau(e.def)}</p>
            <p className="t-small m-0 mt-1">{e.palier ? condition(e.def, seuilAffiche(e)) : `${SCEAUX_TXT.aGagner} · ${condition(e.def, e.def.seuils[0])}`}</p>
          </div>

          <div>
            <p className="t-eyebrow m-0 mb-2">{SCEAUX_TXT.paliers}</p>
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {e.def.seuils.map((seuil, i) => {
                const k = i + 1;
                const atteint = e.palier >= k;
                const suivant = e.palier + 1 === k;
                const p = suivant ? progres(e) : null;
                return (
                  <li key={k} className="flex flex-col gap-1.5">
                    <span className="flex items-baseline gap-2.5">
                      <span
                        aria-hidden
                        className="inline-block h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-full"
                        style={atteint ? { background: COULEUR_PALIER[k] } : { boxShadow: `inset 0 0 0 1.5px ${COULEUR_PALIER[0]}` }}
                      />
                      <span className={"text-[14px] " + (atteint ? "font-semibold" : "text-muted")}>{PALIERS[k]}</span>
                      <span className="t-small min-w-0 flex-1">{condition(e.def, seuil)}</span>
                      <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted">{atteint ? SCEAUX_TXT.atteint : p}</span>
                    </span>
                    {suivant && (
                      <span className="ink-bar ml-5 block h-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(e.avance * 100)} aria-label={`${PALIERS[k]} : ${p ?? ""}`}>
                        <span style={{ width: `${Math.max(3, Math.round(e.avance * 100))}%` }} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {e.def.unite === "maitrise" && <p className="t-micro m-0">{`${SCEAUX_TXT.mesure} ${SCEAUX_TXT.provisoire}`}</p>}
        </div>
      )}
    </Feuille>
  );
}
