"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SUBJECTS } from "@/components/reviser/catalog";
import { COURS_PROGRAMME, carteCours } from "@/components/reviser/parcours";
import { PlatineEcoute, SIGNAL_ECOUTE } from "@/components/reviser/PlatineEcoute";
import { lireEcoute, SANS_ECOUTE, type EcouteCours } from "@/lib/course-ecoute";
import { ETAGERE } from "@/lib/voice-reviser-b";
import type { Course } from "@/lib/courses";
import b from "./Cours.module.css";

// /courses, version classique (Théo, 2026-11-14 : « revenir à quelque chose de plus classique, dans
// notre DA, des éléments simplifiés pour que ce soit compréhensible pour tout le monde, avec notre
// disposition actuelle »). À gauche « Ouvrir un cours » : les dix cours en cartes simples sur deux
// rangées (code, nom, durée et modules, barre des modules écoutés, « À reprendre » sur celui du moment) ;
// chaque carte ouvre son cours (le deck et l'audio). À droite « Jouer juste l'audio » : le lecteur
// (components/reviser/PlatineEcoute) qui joue l'audio sur place. Avant : une bibliothèque en 3D et une
// platine (jugées « too much »).
// L'écoute est gardée sur l'appareil (localStorage) : lue après le montage seulement, et relue à chaque
// signal du lecteur. Tant qu'elle n'est pas lue (rendu serveur, hydratation), tout ce qui en dépend
// (avancement, « À reprendre », lecteur, chiffre-héros) garde sa place mais reste invisible.

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

export function EtagereCours({ apercu, sources = {} }: { apercu?: EcouteCours | null; sources?: Record<string, string | null> }) {
  const e = useEcoute(apercu);
  const lu = e !== null;
  const carte = carteCours(e ?? SANS_ECOUTE);
  /** invisible (place gardée) tant que l'appareil n'est pas lu, puis révélé en fondu */
  const cache = lu ? b.revele : b.attente;
  return (
    <div className={b.salle}>
      <section className={b.colonne} aria-labelledby="cours-ouvrir">
        <h2 id="cours-ouvrir" className={b.titre}>
          {ETAGERE.ouvrirTitre}
        </h2>
        <ul className={b.grille}>
          {SUBJECTS.map((m) => {
            const c = COURS_PROGRAMME.find((x) => x.slug === m.course) ?? null;
            if (!c)
              return (
                <li key={m.key}>
                  <div className={b.carte} data-indispo="1">
                    <span className={b.haut}>
                      <span className={b.code}>{m.code}</span>
                    </span>
                    <p className={b.nom}>{m.name}</p>
                    <span className={b.meta}>{ETAGERE.bientot}</span>
                  </div>
                </li>
              );
            const av = avancement(c, e ?? SANS_ECOUTE);
            const conseil = lu && carte?.slug === c.slug;
            return (
              <li key={m.key}>
                <Link
                  href={`/courses/${c.slug}`}
                  className={b.carte}
                  data-conseil={conseil ? "1" : undefined}
                  aria-label={ETAGERE.livretAria(c.title, av.modules, c.chapters.length, conseil)}
                >
                  <span className={b.haut}>
                    <span className={b.code}>{m.code}</span>
                    {conseil && <span className={b.tag}>{ETAGERE.aReprendre}</span>}
                  </span>
                  <p className={b.nom}>{c.title}</p>
                  <span className={b.bas}>
                    <span className={b.meta}>
                      {ETAGERE.minutes(c.minutes)} · {ETAGERE.modules(c.chapters.length)}
                    </span>
                    <span className={b.avance + " " + cache} aria-hidden>
                      <span className={b.jauge}>
                        <i style={{ width: `${Math.round((av.modules / Math.max(1, c.chapters.length)) * 100)}%` }} />
                      </span>
                      <span className={b.compte}>
                        {av.modules}/{c.chapters.length}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={b.colonne} aria-labelledby="cours-audio">
        <h2 id="cours-audio" className={b.titre}>
          {ETAGERE.platineTitre}
        </h2>
        <PlatineEcoute sources={sources} depart={lu ? (carte?.slug ?? null) : null} pret={lu} positions={e?.positions} />
      </section>
    </div>
  );
}
