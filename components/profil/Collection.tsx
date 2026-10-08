"use client";

import { useState } from "react";
import { SectionTitle } from "@/components/ui/Titles";
import { COULEUR_PALIER, FicheSceau, SceauDe, ditSceau } from "@/components/profil/FicheSceau";
import { FAMILLES, MARCHES, marchesGagnees, type EtatSceau, type Famille } from "@/lib/profil/sceaux";
import { FAMILLES_NOMS, PALIERS, SCEAUX_TXT, nomSceau, progres } from "@/lib/voice-profil";

// L'onglet Sceaux : la collection. Sur son propre profil, « À portée » (les
// 3 marches les plus proches, avec leur barre) puis tous les sceaux, les
// verrouillés en gaufré ; sur le profil d'un autre, ses sceaux gagnés et
// son total. Rangés par famille ; un filtre par famille. Toucher un sceau
// ouvre sa fiche (FicheSceau).

const pente = (i: number) => ((i * 37) % 9) - 4;

export function Collection({ etats, portee, proprietaire }: { etats: EtatSceau[]; portee: EtatSceau[]; proprietaire: boolean }) {
  const [filtre, setFiltre] = useState<Famille | "tous">("tous");
  const [fiche, setFiche] = useState<EtatSceau | null>(null);
  const visibles = proprietaire ? etats : etats.filter((e) => e.palier > 0);
  const familles = FAMILLES.filter((f) => visibles.some((e) => e.def.famille === f));
  const montrees = familles.filter((f) => filtre === "tous" || f === filtre);
  const gagnees = marchesGagnees(etats);

  return (
    <section className="flex flex-col gap-8 md:gap-10" aria-labelledby="profil-sceaux">
      <SectionTitle title={<span id="profil-sceaux">{SCEAUX_TXT.titre}</span>} sub={SCEAUX_TXT.totalLong(gagnees, MARCHES)} />

      {proprietaire && portee.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="t-eyebrow m-0">{SCEAUX_TXT.aPortee}</h3>
            <span className="t-micro">{SCEAUX_TXT.aPorteeAide}</span>
          </div>
          <ul className="m-0 grid list-none gap-2 p-0 md:grid-cols-3 md:gap-3">
            {portee.map((e) => (
              <li key={e.def.cle} className="min-w-0">
                <button type="button" onClick={() => setFiche(e)} className="card-quiet rl-lift flex w-full min-w-0 flex-col gap-2 px-4 py-3 text-left" aria-label={SCEAUX_TXT.voir(nomSceau(e.def))}>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[14px] font-semibold">
                      {nomSceau(e.def)} <span className="font-normal text-muted">· {PALIERS[e.palier + 1]}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[12.5px] tabular-nums">{progres(e)}</span>
                  </span>
                  <span className="ink-bar block h-1.5" aria-hidden>
                    <span style={{ width: `${Math.max(3, Math.round(e.avance * 100))}%` }} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {familles.length > 1 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" role="group" aria-label={SCEAUX_TXT.titre}>
          {(["tous", ...familles] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filtre === f}
              onClick={() => setFiltre(f)}
              className={"min-h-[36px] shrink-0 rounded-full border px-3.5 text-[13px] font-semibold " + (filtre === f ? "border-white bg-[var(--control)]" : "border-line-2 text-muted hover:border-white hover:text-white")}
            >
              {f === "tous" ? SCEAUX_TXT.tous : FAMILLES_NOMS[f]}
            </button>
          ))}
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="t-small m-0">{proprietaire ? SCEAUX_TXT.videMoi : SCEAUX_TXT.vide}</p>
      ) : (
        montrees.map((f) => {
          const liste = visibles.filter((e) => e.def.famille === f);
          return (
            <div key={f} className="flex flex-col gap-3 lg:grid lg:grid-cols-[150px_minmax(0,1fr)] lg:items-start lg:gap-6">
              <h3 className="t-eyebrow m-0 lg:pt-11">
                {FAMILLES_NOMS[f]} <span className="font-mono tabular-nums">· {liste.filter((e) => e.palier > 0).length}/{liste.length}</span>
              </h3>
              <ul className="m-0 grid list-none grid-cols-3 gap-x-3 gap-y-5 p-0 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {liste.map((e, i) => (
                  <li key={e.def.cle} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setFiche(e)}
                      className="group flex w-full min-w-0 flex-col items-center gap-2 rounded-[14px] p-1 text-center outline-offset-2"
                      aria-label={ditSceau(e)}
                    >
                      <span className="block w-full max-w-[100px] transition-transform duration-200 group-hover:-translate-y-0.5 md:max-w-[112px]">
                        <SceauDe e={e} taille="remplir" angle={pente(i)} />
                      </span>
                      <span className="flex min-w-0 max-w-full flex-col items-center gap-0.5">
                        <span className={"truncate text-[13px] " + (e.palier ? "font-semibold" : "text-muted")}>{nomSceau(e.def)}</span>
                        <span className="flex items-center gap-1" aria-hidden>
                          {[1, 2, 3].map((k) => (
                            <span key={k} className="h-1.5 w-1.5 rounded-full" style={e.palier >= k ? { background: COULEUR_PALIER[k] } : { boxShadow: `inset 0 0 0 1px ${COULEUR_PALIER[0]}` }} />
                          ))}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}

      <FicheSceau e={fiche} onFermer={() => setFiche(null)} />
    </section>
  );
}
