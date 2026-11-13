"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { ActionContour, ActionEncre } from "@/components/ui/SousPage";
import { boucleDuJoueur, lireBoucleBrute, valider } from "@/lib/flashcards/boucle";
import { loadSRS } from "@/lib/srs";
import { nombre } from "@/lib/voice";
import { GRILLE_CARTES as G } from "@/lib/voice-postes";
import s from "./Grille.module.css";

// La grille des cartes d'une matière (Réviser A, 2026-11-13 ; la collection de Slay the Spire) : les
// 60 cartes en quatre rangs de 15, un rang par paquet. Une carte déjà vue est à l'endroit (papier, son
// terme écrit dessus en anglais, trois lignes au plus, son numéro en petit dans le coin, une pastille :
// pleine = maîtrisée, entourée = vue) ; une carte pas encore vue montre son dos ébène. Chaque carte,
// comme le nom de son rang, ouvre son paquet (/flashcards/<id>). Le paquet où reprendre (le premier
// entamé pas fini, sinon le premier neuf) a son nom entouré à l'encre (#rl-cercle-main, le signe
// « conseillé » du site). Le compte d'un rang n'est écrit que s'il reste des cartes de dos. D'où vient « vue » : le serveur donne les boucles du compte (premières marques et
// marques du dernier tour) ; après le montage, l'appareil s'y ajoute (boucles gardées par ce joueur,
// répétition espacée de chaque paquet). Ni Date ni hasard dans le rendu.

export type CarteGrille = { id: string; recto: string };
export type RangGrille = { cle: string; href?: string; titre?: string; fiche?: string | null; cartes: CarteGrille[] };
/** Ce que le serveur sait (le compte) et de quoi relire l'appareil après le montage. */
export type SourcesVues = { vues: string[]; tenues: string[]; joueur: string; boucles: string[]; paquets: string[] };
/** Sous la grille : UNE action à l'encre, des options à contour (en données : rendues ici, côté navigateur). */
export type ActionsGrille = { encre: { href: string; texte: string }; options?: { cle: string; href: string; texte: string; aide?: string; nouvelOnglet?: boolean }[] };

/** Le recto en texte simple, pour l'infobulle (formules et balises retirées). */
export function rectoSimple(t: string): string {
  return t
    .replace(/\$\$[^$]*\$\$/g, " … ")
    .replace(/\$[^$]*\$/g, " … ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_#`>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

/** Les cartes vues et maîtrisées : le compte, puis l'appareil après le montage. */
export function useVues(src: SourcesVues): { vues: ReadonlySet<string>; tenues: ReadonlySet<string> } {
  const [etat, setEtat] = useState(() => ({ vues: new Set(src.vues) as ReadonlySet<string>, tenues: new Set(src.tenues) as ReadonlySet<string> }));
  const cle = `${src.joueur}|${src.boucles.join(",")}|${src.paquets.join(",")}|${src.vues.length}|${src.tenues.length}`;
  useEffect(() => {
    const vues = new Set(src.vues);
    const tenues = new Set(src.tenues);
    for (const local of src.boucles) {
      const e = boucleDuJoueur(valider(lireBoucleBrute(local)), src.joueur);
      if (!e) continue;
      for (const id of Object.keys(e.premier)) vues.add(id);
      for (const [id, m] of Object.entries(e.marques)) if (m === true) tenues.add(id);
    }
    for (const p of src.paquets) for (const id of Object.keys(loadSRS(p))) vues.add(id);
    for (const id of tenues) vues.add(id);
    setEtat({ vues, tenues });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);
  return etat;
}

/** Le chiffre-héros de la porte : les cartes vues (même calcul que la grille). */
export function ChiffreVues({ src, ids }: { src: SourcesVues; ids: string[] }) {
  const { vues } = useVues(src);
  return <>{nombre(ids.filter((id) => vues.has(id)).length)}</>;
}

export function GrilleCartes({ rangs, src, actions }: { rangs: RangGrille[]; src: SourcesVues; actions?: ActionsGrille }) {
  const { vues, tenues } = useVues(src);
  // le rang où reprendre : le premier entamé pas fini, sinon le premier neuf (aucun si tout est vu)
  const compte = (r: RangGrille) => r.cartes.filter((c) => vues.has(c.id)).length;
  const conseil = (rangs.find((r) => r.href && compte(r) > 0 && compte(r) < r.cartes.length) ?? rangs.find((r) => r.href && compte(r) === 0 && r.cartes.length > 0))?.cle;
  let n = 0;
  return (
    <div className={s.grille}>
      {rangs.map((r) => {
        const vuesRang = compte(r);
        return (
          <section key={r.cle} className={s.rang} aria-label={r.titre ?? G.grille}>
            {r.titre && (
              <div className={s.rangTete}>
                {r.href ? (
                  <Link href={r.href} className={s.rangNom} title={G.paquetAide(r.titre)} data-conseil={conseil === r.cle ? "1" : undefined}>
                    {r.titre}
                    <span aria-hidden> →</span>
                    {conseil === r.cle && (
                      <svg className={s.entoure} viewBox="0 0 120 160" preserveAspectRatio="none" aria-hidden>
                        <use href="#rl-cercle-main" />
                      </svg>
                    )}
                  </Link>
                ) : (
                  <span className={s.rangNom}>{r.titre}</span>
                )}
                {vuesRang < r.cartes.length && (
                  <span className={s.rangCompte}>
                    {nombre(vuesRang)}/{nombre(r.cartes.length)}
                  </span>
                )}
                {r.fiche && (
                  <a href={r.fiche} target="_blank" rel="noopener noreferrer" className={s.rangFiche} title={G.ficheAide} aria-label={G.ficheAide}>
                    <FileText size={13} aria-hidden />
                    <span>{G.fiche}</span>
                  </a>
                )}
              </div>
            )}
            <ol className={s.cartes} data-n={r.cartes.length}>
              {r.cartes.map((c) => {
                n += 1;
                const vue = vues.has(c.id);
                const tenue = tenues.has(c.id);
                const recto = rectoSimple(c.recto);
                const aide = !vue ? G.carteDos(n) : tenue ? G.carteMaitrisee(n, recto) : G.carteVue(n, recto);
                const face = vue ? (
                  <>
                    <span className={s.num}>{String(n).padStart(2, "0")}</span>
                    <span className={s.terme} lang="en">
                      {recto}
                    </span>
                    <i className={s.pastille} aria-hidden />
                  </>
                ) : (
                  <i className={s.motif} aria-hidden />
                );
                return (
                  <li key={c.id} className={s.case} style={{ "--i": n - 1 } as React.CSSProperties}>
                    {r.href ? (
                      // au clavier, le nom du rang mène au même paquet : les 15 cartes ne prennent pas le focus
                      <Link href={r.href} prefetch={false} tabIndex={-1} className={s.carte + " rl-presse"} data-vue={vue ? "1" : undefined} data-tenue={tenue ? "1" : undefined} title={aide} aria-label={aide}>
                        {face}
                      </Link>
                    ) : (
                      <span role="img" className={s.carte} data-fixe="1" data-vue={vue ? "1" : undefined} data-tenue={tenue ? "1" : undefined} title={aide} aria-label={aide}>
                        {face}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      {actions && (
        <div className={s.pied}>
          <div className={s.actions}>
            <ActionEncre href={actions.encre.href}>{actions.encre.texte}</ActionEncre>
            {actions.options?.map((o) => (
              <ActionContour key={o.cle} href={o.href} aide={o.aide} nouvelOnglet={o.nouvelOnglet}>
                {o.texte}
              </ActionContour>
            ))}
          </div>
          <LegendeGrille dos={rangs.some((r) => r.cartes.some((c) => !vues.has(c.id)))} />
        </div>
      )}
    </div>
  );
}

/** La légende des états, une ligne en Mono (« pas encore vue » seulement s'il reste une carte de dos). */
export function LegendeGrille({ dos = true }: { dos?: boolean }) {
  return (
    <p className={s.legende}>
      <span>
        <i className={s.lVue} aria-hidden /> {G.legendeVue}
      </span>
      <span>
        <i className={s.lTenue} aria-hidden /> {G.legendeTenue}
      </span>
      {dos && (
        <span>
          <i className={s.lDos} aria-hidden /> {G.legendeDos}
        </span>
      )}
    </p>
  );
}
