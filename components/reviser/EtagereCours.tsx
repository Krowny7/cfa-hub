"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SUBJECTS } from "@/components/reviser/catalog";
import { COURS_PROGRAMME, carteCours, mmss } from "@/components/reviser/parcours";
import { RangeeDefilante } from "@/components/reviser/RangeeDefilante";
import { ActionEncre, Etiquette } from "@/components/ui/SousPage";
import { DisqueTournant } from "@/components/ui/DisqueTournant";
import { lireEcoute, SANS_ECOUTE, type EcouteCours } from "@/lib/course-ecoute";
import { dureeVideo, type VideoResume } from "@/lib/videos";
import { VIDEOS_TXT, dureeTexte } from "@/lib/voice-videos";
import { ETAGERE } from "@/lib/voice-reviser-b";
import type { Course } from "@/lib/courses";
import s from "./Rayons.module.css";

// L'objet-héros de /courses (direction « le lieu, puis l'objet », 2026-11-13) : les dix cours en
// livrets sombres debout comme chez Stripe Press (titre or sobre, une encoche par module sur le dos,
// dorée une fois le module écouté), le livret à reprendre avancé et entouré ; la platine au bout de
// la rangée (son disque accélère au survol et ralentit sans retour sec : DisqueTournant) ; l'action
// à l'encre ; puis le rayon des vidéos de révision (/videos?v=… : le lecteur), avec « Vue à X % ·
// encore N min ». L'écoute et les vidéos vues sont gardées sur l'appareil (localStorage) : lues
// après le montage seulement. Tant qu'elles ne sont pas lues (rendu serveur, hydratation), tout ce
// qui en dépend (platine, action, encoches, « n/19 », chiffre-héros et sa légende) garde sa place
// mais reste invisible : jamais un état par défaut qui basculerait ensuite (ni un bouton qui
// ouvrirait le mauvais cours pendant l'hydratation).

const SLUGS = COURS_PROGRAMME.map((c) => c.slug);
/** l'écoute de l'appareil, après le montage (null : pas encore lue) */
function useEcoute(apercu?: EcouteCours | null): EcouteCours | null {
  const [e, setE] = useState<EcouteCours | null>(apercu ?? null);
  useEffect(() => {
    if (apercu === undefined) setE(lireEcoute(SLUGS));
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

/** Les deux tons des couvertures, en plus de l'ébène (le même livret garde toujours le sien). */
const TON = (i: number) => (i % 3 === 1 ? "1" : i % 3 === 2 ? "2" : undefined);

export function EtagereCours({ apercu, videos }: { apercu?: EcouteCours | null; videos: VideoResume[] }) {
  const e = useEcoute(apercu);
  const lu = e !== null;
  const carte = carteCours(e ?? SANS_ECOUTE);
  /** invisible (place gardée) tant que l'appareil n'est pas lu, puis révélé en fondu */
  const cache = lu ? s.revele : s.attente;
  return (
    <div className={s.rayon}>
      <RangeeDefilante className={s.rangee} label={ETAGERE.etiquette} cle={lu ? (carte?.slug ?? null) : null}>
        {SUBJECTS.map((m, i) => {
          const c = COURS_PROGRAMME.find((x) => x.slug === m.course) ?? null;
          if (!c)
            return (
              <li key={m.key} className={s.place} style={{ ["--i" as string]: i }} data-indispo="1">
                <span className={s.lien}>
                  <span className={s.objet + " " + s.livret} data-ton={TON(i)}>
                    <p className={s.livretHaut}>
                      <b>{m.code}</b>
                    </p>
                    <p className={s.livretTitre}>{m.name}</p>
                    <p className={s.livretBas}>{ETAGERE.bientot}</p>
                  </span>
                </span>
              </li>
            );
          const av = avancement(c, e ?? SANS_ECOUTE);
          const conseil = !!e && carte?.slug === c.slug;
          return (
            <li key={m.key} className={s.place} style={{ ["--i" as string]: i }} data-conseil={conseil ? "1" : undefined}>
              <Link href={`/courses/${c.slug}`} className={s.lien + " rl-presse"} aria-label={ETAGERE.livretAria(c.title, av.modules, c.chapters.length, conseil)} title={c.title}>
                <span className={s.objet + " " + s.livret} data-ton={TON(i)}>
                  <span className={s.dos + " " + cache} aria-hidden>
                    {c.chapters.map((_, k) => (
                      <i key={k} data-fait={k < av.modules ? "1" : undefined} />
                    ))}
                  </span>
                  <p className={s.livretHaut}>
                    <b>{m.code}</b>
                    <span>{ETAGERE.minutes(c.minutes)}</span>
                  </p>
                  <p className={s.livretTitre}>{c.title}</p>
                  <span className={s.filet} aria-hidden />
                  <p className={s.livretBas + " " + cache}>
                    <b>
                      {av.modules}/{c.chapters.length}
                    </b>
                  </p>
                  <span className={s.reflet} aria-hidden />
                </span>
                {conseil && (
                  <svg className={s.entoure} viewBox="0 0 120 160" preserveAspectRatio="none" aria-hidden>
                    <use href="#rl-cercle-main" />
                  </svg>
                )}
              </Link>
            </li>
          );
        })}
        {carte && (
          <li className={s.place + " " + s.placePlatine + " " + cache} style={{ ["--i" as string]: SUBJECTS.length }} aria-hidden={lu ? undefined : true}>
            <Link href={carte.href} tabIndex={lu ? undefined : -1} className={s.lien + " rl-presse"} aria-label={ETAGERE.platineAide(carte.titre, carte.mode === "reprise")} title={ETAGERE.platineAide(carte.titre, carte.mode === "reprise")}>
              <span className={s.objet + " " + s.platine}>
                <span className={s.plateau}>
                  <DisqueTournant className={s.disque} hote="lien">
                    <span className={s.label}>
                      <span>{SUBJECTS.find((x) => x.course === carte.slug)?.code}</span>
                    </span>
                  </DisqueTournant>
                </span>
                <span className={s.bras} aria-hidden />
                <span className={s.platineBas}>
                  <b>{carte.titre}</b>
                  <span>
                    {mmss(carte.position)} / {mmss(carte.total)}
                  </span>
                  <span className={s.barre} style={{ ["--part" as string]: carte.part }} aria-hidden>
                    <i />
                  </span>
                </span>
              </span>
            </Link>
          </li>
        )}
      </RangeeDefilante>

      {carte && (
        <div className={s.action + " " + cache} aria-hidden={lu ? undefined : true} inert={!lu}>
          <ActionEncre href={carte.href}>
            {carte.mode === "reprise" ? ETAGERE.reprendre(carte.titre) : ETAGERE.commencer(carte.titre)}
            {carte.module && <span className={s.compteAction}>{ETAGERE.module(carte.module.n)}</span>}
            <span aria-hidden>→</span>
          </ActionEncre>
        </div>
      )}

      <RayonVideos videos={videos} />
    </div>
  );
}

// ——— le rayon des vidéos (ce que /videos montrait : la part vue et ce qu'il en reste) ———

/** La part vue d'une vidéo, lue comme le lecteur la garde (components/videos/VideosView : rl_video_<slug>). */
function partVue(v: VideoResume): number {
  try {
    const x = JSON.parse(localStorage.getItem(`rl_video_${v.slug}`) ?? "null") as { vu?: unknown[] } | null;
    if (!x || !Array.isArray(x.vu)) return 0;
    const total = dureeVideo(v);
    if (!total) return 0;
    const vus = v.parties.reduce((a, p, k) => a + Math.min(Number(x.vu?.[k]) || 0, p.secondes), 0);
    return Math.min(100, Math.round((vus / total) * 100));
  } catch {
    return 0;
  }
}

function RayonVideos({ videos }: { videos: VideoResume[] }) {
  const [vues, setVues] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    setVues(Object.fromEntries(videos.map((v) => [v.slug, partVue(v)])));
  }, [videos]);
  if (!videos.length) return null;
  return (
    <section id="videos" className={s.rayonVideos} aria-label={ETAGERE.videos}>
      <Etiquette as="h2">{ETAGERE.videos}</Etiquette>
      <ul className={s.videos}>
        {videos.map((v) => {
          const enLigne = v.etat === "en-ligne" && v.parties.length > 0;
          const pct = vues?.[v.slug] ?? 0;
          const duree = dureeVideo(v);
          const etat = !enLigne
            ? ETAGERE.enPreparation
            : pct <= 0
              ? `${VIDEOS_TXT.pasCommencee} · ${dureeTexte(duree)}`
              : pct < 100
                ? `${VIDEOS_TXT.vue(pct)} · ${VIDEOS_TXT.reste(dureeTexte(duree * (1 - pct / 100)))}`
                : VIDEOS_TXT.vue(pct);
          const corps = (
            <span className={s.objet + " " + s.video} data-avenir={enLigne ? undefined : "1"}>
              <span className={s.videoNum}>{v.numero}</span>
              <span className={s.videoCorps}>
                <p className={s.videoTitre}>{v.titre}</p>
                <p className={s.videoEtat} data-vue={pct > 0 ? "1" : undefined} style={{ opacity: vues || !enLigne ? 1 : 0 }}>
                  {etat}
                </p>
                <span className={s.videoBarre} style={{ ["--part" as string]: pct }} aria-hidden>
                  <i />
                </span>
              </span>
              <span className={s.reflet} aria-hidden />
            </span>
          );
          return (
            <li key={v.slug} className={s.placeVideo}>
              {enLigne ? (
                <Link href={`/videos?v=${v.slug}`} className={s.lien + " rl-presse"} aria-label={ETAGERE.videoAria(v.numero, v.titre, etat)}>
                  {corps}
                </Link>
              ) : (
                <span className={s.lien}>{corps}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
