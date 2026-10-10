"use client";

import { useState } from "react";
import { SectionTitle } from "@/components/ui/Titles";
import { COULEUR_PALIER, FicheSceau, SceauDe, ditSceau } from "@/components/profil/FicheSceau";
import { FAMILLES, sceauxGagnes, type EtatSceau, type Famille } from "@/lib/profil/sceaux";
import { FAMILLES_NOMS, PALIERS, SCEAUX_TXT, nomSceau, progres } from "@/lib/voice-profil";

// L'onglet Sceaux : la collection. Sur son propre profil, « À portée » (les
// 3 paliers les plus proches, avec leur barre) puis tous les sceaux, les
// verrouillés en gaufré ; sur le profil d'un autre, ses sceaux gagnés et
// son total. Rangés par famille (chacune comptée sur tous ses sceaux, même
// chez un autre) ; un filtre par famille. Toucher un sceau
// ouvre sa fiche (FicheSceau). `enPlus` : des familles rendues ailleurs
// (les saisons, FamilleSaisons), avec leur filtre, entre les petites
// familles et les matières : les plus rares ne finissent pas en bas de page.

const pente = (i: number) => ((i * 37) % 9) - 4;

export function Collection({
  etats,
  portee,
  proprietaire,
  enPlus = [],
}: {
  etats: EtatSceau[];
  portee: EtatSceau[];
  proprietaire: boolean;
  enPlus?: { cle: string; nom: string; contenu: React.ReactNode }[];
}) {
  const [filtre, setFiltre] = useState<string>("tous");
  const [fiche, setFiche] = useState<EtatSceau | null>(null);
  const visibles = proprietaire ? etats : etats.filter((e) => e.palier > 0);
  const familles = FAMILLES.filter((f) => visibles.some((e) => e.def.famille === f));
  const montrees = familles.filter((f) => filtre === "tous" || f === filtre);
  const gagnes = sceauxGagnes(etats);
  // une famille : son titre (compté sur tous ses sceaux), puis ses sceaux
  const rendreFamille = (f: Famille) => {
    const liste = visibles.filter((e) => e.def.famille === f);
    const sesSceaux = etats.filter((e) => e.def.famille === f);
    const petite = f !== "matieres";
    return (
      <div key={f} className="flex min-w-0 flex-col gap-3" style={petite ? { gridColumn: `span ${liste.length}` } : undefined}>
        <h3 className="t-eyebrow m-0">
          {FAMILLES_NOMS[f]} <span className="font-mono tabular-nums">· {sceauxGagnes(sesSceaux)}/{sesSceaux.length}</span>
        </h3>
        <ul
          className={"m-0 grid list-none grid-cols-3 gap-x-3 gap-y-5 p-0 sm:grid-cols-4 md:grid-cols-6 " + (petite ? "lg:grid-cols-[repeat(var(--n),minmax(0,1fr))]" : "lg:grid-cols-10")}
          style={petite ? { ["--n" as string]: liste.length } : undefined}
        >
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
  };
  // ordinateur : les petites familles côte à côte (chacune sur autant de colonnes que de sceaux), les matières sur toute la largeur
  const petites = montrees.filter((f) => f !== "matieres");
  const grandes = montrees.filter((f) => f === "matieres");

  return (
    <section className="flex flex-col gap-8 md:gap-10" aria-labelledby="profil-sceaux">
      <SectionTitle title={<span id="profil-sceaux">{SCEAUX_TXT.titre}</span>} sub={SCEAUX_TXT.totalLong(gagnes, etats.length)} />

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

      {familles.length + enPlus.length > 1 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" role="group" aria-label={SCEAUX_TXT.titre}>
          {["tous", ...familles, ...enPlus.map((x) => x.cle)].map((f) => (
            // 44 px à toucher, la pastille de 36 px dedans
            <button key={f} type="button" aria-pressed={filtre === f} onClick={() => setFiltre(f)} className="group/f flex min-h-[44px] shrink-0 items-center">
              <span
                className={
                  "inline-flex min-h-[36px] items-center rounded-full border px-3.5 text-[13px] font-semibold " +
                  (filtre === f ? "border-white bg-[var(--control)]" : "border-line-2 text-muted group-hover/f:border-white group-hover/f:text-white")
                }
              >
                {f === "tous" ? SCEAUX_TXT.tous : (FAMILLES_NOMS[f as Famille] ?? enPlus.find((x) => x.cle === f)?.nom)}
              </span>
            </button>
          ))}
        </div>
      )}

      {visibles.length === 0 && !enPlus.length && <p className="t-small m-0">{proprietaire ? SCEAUX_TXT.videMoi : SCEAUX_TXT.vide}</p>}
      {petites.length > 0 && <div className="flex flex-col gap-8 md:gap-10 lg:grid lg:grid-cols-6 lg:items-start lg:gap-x-6">{petites.map(rendreFamille)}</div>}
      {enPlus
        .filter((x) => filtre === "tous" || filtre === x.cle)
        .map((x) => (
          <div key={x.cle}>{x.contenu}</div>
        ))}
      {grandes.map(rendreFamille)}

      <FicheSceau e={fiche} onFermer={() => setFiche(null)} />
    </section>
  );
}
