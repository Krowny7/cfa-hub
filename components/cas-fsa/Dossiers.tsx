"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ActionEncre, EnTeteSousPage, Scene, SousPage } from "@/components/ui/SousPage";
import { CAS } from "@/lib/voice-cas-fsa";
import { DOSSIERS as D } from "@/lib/voice-entrainement-b";
import { RETOUR_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import { nombre } from "@/lib/voice";
import { useAvancement, useFaites } from "./avancement";
import css from "./Dossiers.module.css";

// /cas-pratiques (direction « le lieu, puis l'objet », 2026-11-13) : la porte (la peinture de la
// carte cliquée sur S'entraîner, le chiffre-héros vrai : les dossiers bouclés, lus dans le
// navigateur), puis UN objet : la rangée des dossiers d'ébène posés sur la même ligne de sol, le nom
// de la société en Dela, l'exercice et le référentiel sur l'onglet, l'avancement en Mono et en
// cases. Le dossier conseillé (le premier pas encore bouclé) est avancé d'un cran et son nom
// entouré à l'encre de la palette ; dessous, la seule action à l'encre l'ouvre. Un dossier bouclé
// porte le tampon. Un dossier seul (aujourd'hui, LVMH) s'ouvre en sommaire : le nom en grand, ses
// questions sur deux colonnes en Mono, chacune avec sa case pleine (terminée) ou vide. L'avancement
// vit dans le navigateur (./avancement) : zéro au rendu serveur.

export type DossierVue = { id: string; societe: string; exercice: string; referentiel: string; etapes: { id: string; titre: string }[] };

/** Le cercle à la main, le même tracé que sur le calendrier des défis (components/defi/DefiCalendrier). */
const TRACE_CERCLE = "M150 14C110 2 50 6 24 30 4 50 6 92 34 114c28 22 104 24 140 2 24-15 26-60 6-86C164 10 120 4 84 10";

/** Le nom écrit en Dela sur la chemise : la raison sociale si elle est courte, sinon son premier mot (« LVMH »). */
const nomCourt = (societe: string) => (societe.length > 14 ? societe.split(" ")[0] : societe);

export function Dossiers({ cas }: { cas: DossierVue[] }) {
  const faites = useFaites(cas.map((c) => ({ id: c.id, etapes: c.etapes.map((e) => e.id) })));
  const seul = cas.length === 1;
  const boucles = cas.filter((c, i) => c.etapes.length > 0 && (faites[i] ?? 0) >= c.etapes.length).length;
  const iConseil = cas.findIndex((c, i) => (faites[i] ?? 0) < c.etapes.length);
  const conseil = iConseil >= 0 ? cas[iConseil] : null;
  const entame = conseil ? (faites[iConseil] ?? 0) > 0 : false;

  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={RETOUR_ENTRAINEMENT}
          titre={CAS.titre}
          ligne={D.ligne(cas.length)}
          illustration={{ nom: "practice-studiolo", position: "50% 68%" }}
          heros={boucles > 0 ? { valeur: `${nombre(boucles)}/${nombre(cas.length)}`, legende: D.heros(boucles) } : null}
        />
      }
    >
      <Scene>
        <svg width="0" height="0" className={css.defs} aria-hidden focusable="false">
          <defs>
            <path id="dossier-cercle" vectorEffect="non-scaling-stroke" d={TRACE_CERCLE} />
          </defs>
        </svg>
        <ol className={css.rangee} data-seul={seul ? "1" : undefined}>
          {cas.map((c, i) => {
            const n = c.etapes.length;
            const f = Math.min(faites[i] ?? 0, n);
            const fini = n > 0 && f >= n;
            const conseille = i === iConseil;
            return (
              <li key={c.id} className={css.place} data-conseille={conseille ? "1" : undefined} style={{ ["--i" as string]: i }}>
                <Link href={`/cas-pratiques/${c.id}`} className={css.dossier + " rl-presse"} aria-label={D.lecture(c.societe, f, n)}>
                  <span className={css.onglet}>{c.referentiel}</span>
                  <span className={css.nom} data-taille={nomCourt(c.societe).length > 10 ? "s" : nomCourt(c.societe).length > 6 ? "m" : undefined}>
                    <b>{nomCourt(c.societe)}</b>
                    {conseille && (
                      <svg className={css.entoure} viewBox="0 0 200 140" preserveAspectRatio="none" aria-hidden focusable="false">
                        <use href="#dossier-cercle" className={css.trait1} />
                        <use href="#dossier-cercle" className={css.trait2} transform="translate(2 -1)" />
                      </svg>
                    )}
                  </span>
                  <span className={css.exercice}>{c.exercice}</span>
                  {seul && <Sommaire id={c.id} etapes={c.etapes} />}
                  <span className={css.bas}>
                    {!seul && (
                      <span className={css.cases} aria-hidden>
                        {c.etapes.map((e, k) => (
                          <i key={e.id} data-faite={k < f ? "1" : undefined} />
                        ))}
                      </span>
                    )}
                    <span className={css.avancement}>
                      {D.avancement(f, n)} <small>{D.faites}</small>
                    </span>
                  </span>
                  {fini && <span className={css.tampon}>{D.boucle}</span>}
                </Link>
              </li>
            );
          })}
        </ol>
        {conseil && (
          <div className={css.action}>
            <ActionEncre href={`/cas-pratiques/${conseil.id}`}>
              {entame ? D.reprendre(nomCourt(conseil.societe)) : D.ouvrir(nomCourt(conseil.societe))} <ArrowRight size={16} aria-hidden />
            </ActionEncre>
          </div>
        )}
      </Scene>
    </SousPage>
  );
}

/** Le sommaire d'un dossier ouvert : ses questions, chacune avec sa case pleine (terminée) ou vide. */
function Sommaire({ id, etapes }: { id: string; etapes: { id: string; titre: string }[] }) {
  const a = useAvancement(id);
  return (
    <span className={css.sommaire} aria-hidden>
      {etapes.map((e, k) => (
        <span key={e.id} className={css.ligne} data-faite={a.etapes[e.id] ? "1" : undefined}>
          <i />
          <span className={css.rang}>{String(k + 1).padStart(2, "0")}</span>
          <span className={css.titre}>{e.titre}</span>
        </span>
      ))}
    </span>
  );
}
