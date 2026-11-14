"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SUBJECTS } from "@/components/reviser/catalog";
import { COURS_PROGRAMME, carteCours } from "@/components/reviser/parcours";
import { PlatineEcoute, SIGNAL_ECOUTE } from "@/components/reviser/PlatineEcoute";
import { lireEcoute, SANS_ECOUTE, type EcouteCours } from "@/lib/course-ecoute";
import { ETAGERE } from "@/lib/voice-reviser-b";
import type { Course } from "@/lib/courses";
import b from "./Bibliotheque.module.css";

// L'objet-héros de /courses. Direction « le lieu, puis l'objet » (2026-11-13), puis les retours de Théo
// le soir même : « les livres sur deux étages ; quand on reste dessus avec la souris, qu'il sorte de la
// bibliothèque et se tourne légèrement, en 3D ; que le vinyle prenne plus de place, mais ne serve qu'à
// lancer directement les audios (on sélectionne en dessous la matière) » ; et plus de vidéos ici (elles
// ont leur page, /videos). Donc : la bibliothèque d'ébène à deux étages de cinq livres (la tranche : code,
// titre en or, une encoche par module, dorée une fois écoutée ; la couverture se découvre quand le livre
// pivote), le livre à reprendre entouré ; chaque livre ouvre son cours (le deck et l'audio). À côté, la
// grande platine (components/reviser/PlatineEcoute) qui joue l'audio sur place.
// L'écoute est gardée sur l'appareil (localStorage) : lue après le montage seulement, et relue à chaque
// signal de la platine. Tant qu'elle n'est pas lue (rendu serveur, hydratation), tout ce qui en dépend
// (encoches, « n/19 », cercle, disque, chiffre-héros) garde sa place mais reste invisible.

const SLUGS = COURS_PROGRAMME.map((c) => c.slug);
/** l'écoute de l'appareil, après le montage, relue quand la platine change quelque chose (null : pas encore lue) */
function useEcoute(apercu?: EcouteCours | null): EcouteCours | null {
  const [e, setE] = useState<EcouteCours | null>(apercu ?? null);
  useEffect(() => {
    if (apercu !== undefined) return;
    const lire = () => setE(lireEcoute(SLUGS));
    lire();
    window.addEventListener(SIGNAL_ECOUTE, lire);
    return () => window.removeEventListener(SIGNAL_ECOUTE, lire);
  }, [apercu]);
  return e;
}

/** Secondes écoutées d'un cours (1 pour un cours fini), et ses modules passés. */
function avancement(c: Course, e: EcouteCours): { position: number; modules: number; fini: boolean } {
  const total = c.minutes * 60;
  if (e.finis.includes(c.slug) && (e.positions[c.slug] ?? 0) <= 5) return { position: total, modules: c.chapters.length, fini: true };
  const position = Math.min(e.positions[c.slug] ?? 0, total);
  const modules = c.chapters.filter((_, k) => (c.chapters[k + 1]?.start ?? total) <= position).length;
  return { position, modules, fini: e.finis.includes(c.slug) };
}

/** Les minutes d'audio qu'il reste à écouter, tous cours confondus (un cours fini ne compte plus). */
export function minutesRestantes(e: EcouteCours): number {
  return COURS_PROGRAMME.reduce((a, c) => a + Math.max(0, c.minutes * 60 - avancement(c, e).position), 0) / 60;
}

/** Le chiffre-héros de la porte : « 8 H 40 », lu sur l'appareil ; « 10/10 » quand tout est écouté. Caché tant qu'il n'est pas lu, pour ne jamais montrer un faux chiffre. */
export function HerosHeures({ apercu }: { apercu?: EcouteCours | null }) {
  const e = useEcoute(apercu);
  const min = minutesRestantes(e ?? SANS_ECOUTE);
  // un <i> (pas un <span> : la légende de la porte stylise ses span)
  return (
    <i style={{ fontStyle: "normal", opacity: e ? 1 : 0, transition: "opacity 0.25s ease" }}>
      {min < 1 ? ETAGERE.herosFini(COURS_PROGRAMME.length) : ETAGERE.heures(min)}
    </i>
  );
}

/** La légende du chiffre-héros (« restantes », ou « tout est écouté »), lue et révélée avec lui. */
export function HerosLegendeHeures({ apercu }: { apercu?: EcouteCours | null }) {
  const e = useEcoute(apercu);
  const fini = !!e && minutesRestantes(e) < 1;
  return <i style={{ fontStyle: "normal", opacity: e ? 1 : 0, transition: "opacity 0.25s ease" }}>{fini ? ETAGERE.herosLegendeFini : ETAGERE.herosLegende}</i>;
}

/** La ligne d'état de la porte : les cours, entamés, écoutés en entier (« 10 cours » seul tant que l'appareil n'est pas lu). */
export function LigneCours({ apercu }: { apercu?: EcouteCours | null }) {
  const e = useEcoute(apercu);
  if (!e) return <>{ETAGERE.ligne(COURS_PROGRAMME.length, 0, 0)}</>;
  const av = COURS_PROGRAMME.map((c) => avancement(c, e));
  return <>{ETAGERE.ligne(COURS_PROGRAMME.length, av.filter((a) => !a.fini && a.position > 5).length, av.filter((a) => a.fini).length)}</>;
}

/** Les deux tons des reliures, en plus de l'ébène (le même livre garde toujours le sien). */
const TON = (i: number) => (i % 3 === 1 ? "1" : i % 3 === 2 ? "2" : undefined);
/** l'épaisseur et la hauteur de chaque livre, autour de la moyenne : une vraie rangée n'est jamais au cordeau */
const EPAISSEUR = [1.04, 0.92, 1, 0.95, 1.08, 0.97, 1.06, 0.93, 1, 0.96];
const HAUTEUR = [1, 0.95, 0.98, 0.93, 1, 0.97, 1, 0.94, 0.98, 0.96];
const gabarit = (i: number) => ({ ["--k" as string]: EPAISSEUR[i] ?? 1, ["--j" as string]: HAUTEUR[i] ?? 1 });
/** les deux étages : cinq matières chacun, dans l'ordre du programme */
const ETAGES = [SUBJECTS.slice(0, 5), SUBJECTS.slice(5)];

export function EtagereCours({ apercu, sources = {} }: { apercu?: EcouteCours | null; sources?: Record<string, string | null> }) {
  const e = useEcoute(apercu);
  const lu = e !== null;
  const carte = carteCours(e ?? SANS_ECOUTE);
  /** invisible (place gardée) tant que l'appareil n'est pas lu, puis révélé en fondu */
  const cache = lu ? b.revele : b.attente;
  const parts = Object.fromEntries(COURS_PROGRAMME.map((c) => [c.slug, avancement(c, e ?? SANS_ECOUTE).position / (c.minutes * 60)]));
  return (
    <div className={b.salle}>
      <div className={b.bibliotheque} role="group" aria-label={ETAGERE.bibliotheque}>
        {ETAGES.map((rang, k) => (
          <ul key={k} className={b.etage}>
            {rang.map((m, j) => {
              const i = k * 5 + j;
              const c = COURS_PROGRAMME.find((x) => x.slug === m.course) ?? null;
              if (!c)
                return (
                  <li key={m.key} className={b.place} style={gabarit(i)} data-indispo="1">
                    <span className={b.livre} title={m.name} data-ton={TON(i)}>
                      <span className={b.tranche}>
                        <span className={b.code}>
                          {m.code}
                          <small>{ETAGERE.bientot}</small>
                        </span>
                        <span className={b.titre}>{m.name}</span>
                      </span>
                    </span>
                  </li>
                );
              const av = avancement(c, e ?? SANS_ECOUTE);
              const conseil = lu && carte?.slug === c.slug;
              return (
                <li key={m.key} className={b.place} style={gabarit(i)} data-conseil={conseil ? "1" : undefined}>
                  <Link href={`/courses/${c.slug}`} className={b.livre} data-ton={TON(i)} aria-label={ETAGERE.livretAria(c.title, av.modules, c.chapters.length, conseil)} title={c.title}>
                    <span className={b.tranche}>
                      <span className={b.encoches + " " + cache} aria-hidden>
                        {c.chapters.map((_, n) => (
                          <i key={n} data-fait={n < av.modules ? "1" : undefined} />
                        ))}
                      </span>
                      <span className={b.code}>
                        {m.code}
                        <small>{ETAGERE.minutes(c.minutes)}</small>
                      </span>
                      <span className={b.titre}>{c.title}</span>
                      <span className={b.compte + " " + cache}>
                        {av.modules}/{c.chapters.length}
                      </span>
                      <span className={b.eclat} aria-hidden />
                    </span>
                    {/* le volume : le plat (il se découvre quand le livre pivote), le contre-plat, la tête des pages */}
                    <span className={b.plat} aria-hidden>
                      <span className={b.couvCode}>{m.code}</span>
                      <span className={b.couvTitre}>{c.title}</span>
                      <span className={b.couvPied}>
                        {ETAGERE.modules(c.chapters.length)} · {ETAGERE.minutes(c.minutes)}
                      </span>
                    </span>
                    <span className={b.contrePlat} aria-hidden />
                    <span className={b.tete} aria-hidden />
                  </Link>
                  {conseil && (
                    <svg className={b.entoure} viewBox="0 0 120 160" preserveAspectRatio="none" aria-hidden>
                      <use href="#rl-cercle-main" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        ))}
      </div>

      {/* au-dessus de la platine, ce qu'elle fait, en titre comme « Cours complets » (Théo) ; la colonne
          prend la hauteur de la bibliothèque : le titre en haut, la platine jusqu'en bas */}
      <div className={b.colonnePlatine}>
        <h2 className={b.titrePlatine}>{ETAGERE.platineTitre}</h2>
        <PlatineEcoute sources={sources} depart={lu ? (carte?.slug ?? null) : null} pret={lu} parts={parts} positions={e?.positions} />
      </div>
    </div>
  );
}
