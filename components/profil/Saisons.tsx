"use client";

import { useEffect, useState } from "react";
import { Sceau, SceauDivision } from "@/components/adn/Sceau";
import { Feuille } from "@/components/ui/Feuille";
import { decaleJour } from "@/lib/objectif-calc";
import type { ResultatSaison, SaisonCourante, Saisons } from "@/lib/profil/saisons";
import { SAISONS, inscriptionSaison } from "@/lib/voice-saisons";

// Les saisons du profil (étape 6) : le sceau de saison (hexagone
// SceauDivision « OR · I · S1 » : vermillon une fois gravé, dorure pour
// Top 10, gaufré pour la saison en cours), sa fiche (Feuille), le compte à
// rebours (calculé dans le navigateur seulement : au rendu du serveur,
// « jusqu'au 30 nov. »), la ligne de la carte du rang, la carte du Journal
// (saison en cours et palmarès) et la famille « Saisons » de la collection.

/** une saison close (gravée), ou la saison en cours (sur son propre profil) */
type Entree = { close: ResultatSaison } | { cours: SaisonCourante };

const pente = (i: number) => ((i * 37) % 9) - 4;

function SceauSaison({ e, taille, angle = 0 }: { e: Entree; taille: number | "remplir"; angle?: number }) {
  const commun = { taille, angle, pose: false as const, son: false as const };
  if ("close" in e) {
    const i = inscriptionSaison(e.close.pic, e.close.numero);
    return <SceauDivision palier={i.palier} division={i.division} sous={i.sous} ton={e.close.pic.division ? "pen" : "dorure"} title={SAISONS.dit(e.close.numero, e.close.pic)} {...commun} />;
  }
  const c = e.cours;
  if (c.moi) {
    const i = inscriptionSaison(c.moi.pic, c.numero);
    return <SceauDivision palier={i.palier} division={i.division} sous={i.sous} ton="gaufre" title={SAISONS.ditEnCours(c.numero)} {...commun} />;
  }
  return <Sceau texte={SAISONS.court(c.numero)} sous={SAISONS.enCours.toUpperCase()} ton="gaufre" title={SAISONS.ditEnCours(c.numero)} {...commun} />;
}

/** « fin dans 52 j » (navigateur) ; « jusqu'au 30 nov. » au rendu du serveur. */
export function FinDeSaison({ fin, dernierJour, className = "" }: { fin: string; dernierJour: string; className?: string }) {
  const [reste, setReste] = useState<number | null>(null);
  useEffect(() => {
    const ms = Date.parse(fin) - Date.now();
    if (!Number.isNaN(ms)) setReste(Math.ceil(ms / 86_400_000));
  }, [fin]);
  return (
    <time dateTime={fin} className={className}>
      {reste === null ? SAISONS.jusquau(dernierJour) : SAISONS.finDans(reste)}
    </time>
  );
}

function FicheSaison({ e, onFermer }: { e: Entree | null; onFermer: () => void }) {
  const ligne = (terme: string, valeur: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-b-0">
      <dt className="t-small m-0 shrink-0">{terme}</dt>
      <dd className="m-0 min-w-0 text-right text-[14px] font-semibold tabular-nums">{valeur}</dd>
    </div>
  );
  return (
    <Feuille ouvert={!!e} onFermer={onFermer} titre={SAISONS.fiche} fermer={SAISONS.fermer}>
      {e && (
        <div className="flex flex-col gap-5 pt-2">
          <div className="grid place-items-center py-2">
            <SceauSaison e={e} taille={180} angle={-4} />
          </div>
          {"close" in e ? (
            <>
              <div>
                <p className="t-h2 m-0">{SAISONS.saison(e.close.numero, e.close.nom)}</p>
                <p className="t-small m-0 mt-1">{SAISONS.periode(e.close.debut, e.close.dernierJour)}</p>
              </div>
              <dl className="m-0">
                {ligne(SAISONS.picDeSaison, SAISONS.palierElo(e.close.pic, e.close.eloPic))}
                {ligne(SAISONS.finDeSaison, SAISONS.palierPlace(e.close.final, e.close.eloFinal, e.close.place, e.close.joueurs))}
                {ligne(SAISONS.matchs, SAISONS.nbMatchs(e.close.matchs))}
              </dl>
              <p className="t-micro m-0">{SAISONS.grave}</p>
            </>
          ) : (
            <>
              <div>
                <p className="t-h2 m-0">{SAISONS.saison(e.cours.numero, e.cours.nom)}</p>
                <p className="t-small m-0 mt-1">
                  {SAISONS.periode(e.cours.debut, e.cours.dernierJour)} · <FinDeSaison fin={e.cours.fin} dernierJour={e.cours.dernierJour} />
                </p>
              </div>
              {e.cours.moi ? (
                <dl className="m-0">
                  {ligne(SAISONS.picJusquIci, SAISONS.palierElo(e.cours.moi.pic, e.cours.moi.eloPic))}
                  {ligne(SAISONS.matchs, SAISONS.nbMatchs(e.cours.moi.matchs))}
                </dl>
              ) : (
                <p className="t-small m-0">{SAISONS.sansMatch}</p>
              )}
              <p className="t-micro m-0">{SAISONS.aGraver(decaleJour(e.cours.dernierJour, 1))}</p>
            </>
          )}
        </div>
      )}
    </Feuille>
  );
}

/** La saison en cours, au bas de la carte du rang (sur fond sombre). */
export function SaisonRang({ c }: { c: SaisonCourante }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-3 text-[13px] font-semibold text-[rgba(255,255,255,.85)]">
        <span className="min-w-0 truncate">{SAISONS.saison(c.numero, c.nom)}</span>
        <FinDeSaison fin={c.fin} dernierJour={c.dernierJour} className="shrink-0 font-mono text-[12px] tabular-nums text-[rgba(255,255,255,.62)]" />
      </span>
      <span className="text-[12.5px] font-semibold text-[rgba(255,255,255,.62)]">{c.moi ? SAISONS.picEnCours(c.moi.pic, c.moi.eloPic) : SAISONS.sansMatch}</span>
    </span>
  );
}

/** La carte « Saisons » du Journal : la saison en cours, puis le palmarès. */
export function SaisonsJournal({ saisons }: { saisons: Saisons }) {
  const [fiche, setFiche] = useState<Entree | null>(null);
  const { courante: c, palmares } = saisons;
  return (
    <div className="card flex flex-col gap-4 p-5 sm:p-6">
      <h3 className="t-eyebrow m-0">{SAISONS.titre}</h3>
      {c && (
        <div className="flex flex-col gap-1">
          <p className="m-0 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
            <span className="text-[15px] font-semibold">{SAISONS.saison(c.numero, c.nom)}</span>
            <FinDeSaison fin={c.fin} dernierJour={c.dernierJour} className="font-mono text-[12.5px] font-semibold tabular-nums" />
          </p>
          <p className="t-small m-0">{c.moi ? SAISONS.picEnCours(c.moi.pic, c.moi.eloPic) : SAISONS.sansMatch}</p>
          <p className="t-micro m-0 mt-1">{SAISONS.regle}</p>
        </div>
      )}
      <div className={"flex flex-col gap-1 " + (c ? "border-t border-line pt-3" : "")}>
        <p className="t-eyebrow m-0">{SAISONS.palmares}</p>
        {palmares.length ? (
          <ul className="m-0 list-none p-0">
            {palmares.map((r, i) => (
              <li key={r.cle} className="border-b border-line last:border-b-0">
                <button type="button" onClick={() => setFiche({ close: r })} className="flex min-h-[44px] w-full items-center gap-3 py-2.5 text-left" aria-label={SAISONS.voir(SAISONS.saison(r.numero, r.nom))}>
                  <span className="w-[60px] shrink-0">
                    <SceauSaison e={{ close: r }} taille="remplir" angle={pente(i)} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[14.5px] font-semibold">{SAISONS.saison(r.numero, r.nom)}</span>
                    <span className="font-mono text-[12.5px] font-semibold tabular-nums">{SAISONS.pic(r.pic, r.eloPic)}</span>
                    <span className="t-small">{SAISONS.fin(r.final, r.place, r.joueurs)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          c && <p className="t-small m-0">{SAISONS.palmaresVide(decaleJour(c.dernierJour, 1))}</p>
        )}
      </div>
      <FicheSaison e={fiche} onFermer={() => setFiche(null)} />
    </div>
  );
}

/**
 * La famille « Saisons » de la collection : un sceau par saison gravée et,
 * sur son propre profil, la saison en cours en gaufré (son pic jusqu'ici,
 * pas encore gravé). Toucher un sceau ouvre sa fiche.
 */
export function FamilleSaisons({ palmares, courante }: { palmares: ResultatSaison[]; /** sur son propre profil seulement */ courante: SaisonCourante | null }) {
  const [fiche, setFiche] = useState<Entree | null>(null);
  const entrees: Entree[] = [...(courante ? [{ cours: courante }] : []), ...palmares.map((r) => ({ close: r }))];
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h3 className="t-eyebrow m-0">
        {SAISONS.titre} <span className="font-mono tabular-nums">· {palmares.length}</span>
      </h3>
      <ul className="m-0 grid list-none grid-cols-3 gap-x-3 gap-y-5 p-0 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10">
        {entrees.map((e, i) => {
          const numero = "close" in e ? e.close.numero : e.cours.numero;
          const nom = "close" in e ? e.close.nom : e.cours.nom;
          return (
            <li key={"close" in e ? e.close.cle : e.cours.cle} className="min-w-0">
              <button
                type="button"
                onClick={() => setFiche(e)}
                className="group flex w-full min-w-0 flex-col items-center gap-2 rounded-[14px] p-1 text-center outline-offset-2"
                aria-label={SAISONS.voir(SAISONS.saison(numero, nom))}
              >
                <span className="block w-full max-w-[100px] transition-transform duration-200 group-hover:-translate-y-0.5 md:max-w-[112px]">
                  <SceauSaison e={e} taille="remplir" angle={pente(i)} />
                </span>
                <span className="flex min-w-0 max-w-full flex-col items-center gap-0.5">
                  <span className={"truncate text-[13px] " + ("close" in e ? "font-semibold" : "text-muted")}>{SAISONS.court(numero)} · {nom}</span>
                  <span className="t-micro truncate">{"close" in e ? SAISONS.picCourt(e.close.pic) : SAISONS.enCours}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <FicheSaison e={fiche} onFermer={() => setFiche(null)} />
    </div>
  );
}
