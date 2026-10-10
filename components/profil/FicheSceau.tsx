"use client";

import { Sceau, type SceauProps } from "@/components/adn/Sceau";
import { Feuille } from "@/components/ui/Feuille";
import { useChoixSceaux } from "@/components/profil/ChoixSceaux";
import { dateObtenu, defSceau, rareteDe, seuilAffiche, type EtatSceau } from "@/lib/profil/sceaux";
import { CADRE_DORURES, piecesDuSceau } from "@/lib/profil/catalogue";
import { FAMILLES_NOMS, PALIERS, SCEAUX_TXT, atteste, condition, dateCourte, inscription, nomSceau, progres, titreSceau } from "@/lib/voice-profil";

// Un sceau de la collection, et sa fiche. Le ton suit le palier : gaufré
// (pas encore gagné), encre, vermillon, dorure. La fiche (feuille du bas
// sur téléphone, panneau latéral sur ordinateur) : le grand sceau, ce qu'il
// atteste, sa date d'obtention et sa rareté (avec la base), ses trois
// paliers et l'avancée vers le suivant ; ce qu'il débloque (les pièces
// gagnées de Personnaliser) ; sur son propre profil, « Poser sur mon
// profil » (ChoixSceaux).

const TONS = ["gaufre", "ink", "pen", "dorure"] as const;
/** la pastille de chaque palier, dans la fiche et la collection */
export const COULEUR_PALIER = ["var(--pencil)", "var(--ink)", "var(--pen)", "#c4932f"] as const;

/** Ce que dit le sceau, en une ligne : « Duelliste · vermillon : 25 victoires en duel ». */
export function ditSceau(e: EtatSceau) {
  const c = condition(e.def, seuilAffiche(e));
  return e.palier ? `${titreSceau(e)} : ${c}` : `${nomSceau(e.def)}, ${SCEAUX_TXT.aGagner} : ${c}`;
}

/** Le sceau dessiné, à son palier (gaufré au premier palier s'il n'est pas gagné) ; déjà posé, sauf pour la cérémonie. */
export function SceauDe({ e, taille, angle = 0, pose = false, son = false }: { e: EtatSceau; taille: number | "remplir"; angle?: number } & Pick<SceauProps, "pose" | "son">) {
  return <Sceau {...inscription(e.def, seuilAffiche(e))} ton={TONS[e.palier]} taille={taille} angle={angle} pose={pose} son={son} title={ditSceau(e)} />;
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
            {/* pas encore gagné : ce qu'il atteste ; ses seuils sont dans les paliers, juste en dessous */}
            <p className="t-small m-0 mt-1">{e.palier ? condition(e.def, seuilAffiche(e)) : `${SCEAUX_TXT.aGagner} · ${atteste(e.def)}`}</p>
            <Obtention e={e} />
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
                      <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted">{atteint ? dateDuPalier(e, k) : p}</span>
                    </span>
                    {suivant && p !== null && (
                      <span className="ink-bar ml-5 block h-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(e.avance * 100)} aria-label={`${PALIERS[k]} : ${p ?? ""}`}>
                        <span style={{ width: `${Math.max(3, Math.round(e.avance * 100))}%` }} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            {/* la dorure de chaque sceau compte pour le cadre « Dorure » : une ligne discrète, tant qu'il n'est pas doré */}
            {CADRE_DORURES && e.palier < 3 && <p className="t-micro m-0 mt-2.5">{SCEAUX_TXT.debloqueDorures(CADRE_DORURES.nom, CADRE_DORURES.n)}</p>}
          </div>

          <Debloque cle={e.def.cle} />

          {e.def.unite === "maitrise" && <p className="t-micro m-0">{`${SCEAUX_TXT.mesure} ${e.enBase ? SCEAUX_TXT.garde : SCEAUX_TXT.provisoire}`}</p>}

          {e.palier > 0 && <Poser cle={e.def.cle} />}
        </div>
      )}
    </Feuille>
  );
}

/** Les pièces que ce sceau ouvre à un palier (une bannière, un cadre) ; rien s'il n'en ouvre aucune. */
function Debloque({ cle }: { cle: string }) {
  const lignes = piecesDuSceau(cle).map((p) => SCEAUX_TXT.debloquePiece(p.type, p.nom, p.palier));
  if (!lignes.length) return null;
  return (
    <div>
      <p className="t-eyebrow m-0 mb-1.5">{SCEAUX_TXT.debloque}</p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {lignes.map((l) => (
          <li key={l} className="t-small">
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** La date d'un palier atteint dans la liste (« 3 oct. », « avant le 9 oct. ») ; « atteint » si elle n'est pas gardée. */
function dateDuPalier(e: EtatSceau, palier: number): string {
  const d = e.dates?.[palier - 1];
  return d ? SCEAUX_TXT.le(dateCourte(d.iso), d.avant) : SCEAUX_TXT.atteint;
}

/** « obtenu le 3 oct. · 12 % des joueurs » (chacun s'il est connu). */
function Obtention({ e }: { e: EtatSceau }) {
  const d = dateObtenu(e);
  const part = rareteDe(e);
  if (!d && part === null) return null;
  return (
    <p className="t-small m-0 mt-1 font-mono text-[12.5px] tabular-nums">
      {d ? SCEAUX_TXT.obtenu(dateCourte(d.iso), d.avant) : null}
      {d && part !== null ? " · " : null}
      {part !== null ? <span title={SCEAUX_TXT.rareteAide}>{SCEAUX_TXT.rarete(part)}</span> : null}
    </p>
  );
}

/** Poser le sceau sur son profil, le retirer, ou en remplacer un des 3 (sur son propre profil, avec la base). */
function Poser({ cle }: { cle: string }) {
  const choix = useChoixSceaux();
  if (!choix) return null;
  const pose = choix.poses.includes(cle);
  return (
    <div className="flex flex-col gap-2.5 border-t border-line pt-4">
      {pose ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-[14px] font-semibold">{SCEAUX_TXT.pose}</p>
          <button type="button" className="btn btn-secondary min-h-[44px]" disabled={choix.enCours} onClick={() => choix.retirer(cle)}>
            {SCEAUX_TXT.retirer}
          </button>
        </div>
      ) : choix.poses.length < 3 ? (
        <button type="button" className="btn btn-primary min-h-[44px] w-full" disabled={choix.enCours} onClick={() => choix.poser(cle)}>
          {SCEAUX_TXT.poser}
        </button>
      ) : (
        <>
          <p className="t-small m-0">{SCEAUX_TXT.remplacer}</p>
          <div className="flex flex-wrap gap-2">
            {choix.poses.map((ancien) => {
              const d = defSceau(ancien);
              return (
                <button key={ancien} type="button" className="btn btn-secondary min-h-[44px]" disabled={choix.enCours} onClick={() => choix.remplacer(ancien, cle)}>
                  {d ? nomSceau(d) : ancien}
                </button>
              );
            })}
          </div>
        </>
      )}
      <p className="t-micro m-0">{SCEAUX_TXT.poserAide}</p>
      {choix.erreur && (
        <p role="alert" className="t-small m-0 text-pen">
          {choix.erreur}
        </p>
      )}
    </div>
  );
}
