"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FastForward, Pause, Play, Rewind } from "lucide-react";
import { SUBJECTS } from "@/components/reviser/catalog";
import { COURS_PROGRAMME, mmss } from "@/components/reviser/parcours";
import { codexNoter } from "@/lib/codex/actions";
import { POS_PREFIX, noterCoursFini, noterDernierCours } from "@/lib/course-ecoute";
import { createClient } from "@/lib/supabase/browser";
import { ETAGERE } from "@/lib/voice-reviser-b";
import b from "./Cours.module.css";

// Le lecteur de /courses, « Jouer juste l'audio » (Théo, 2026-11-13 : « ne serve qu'à lancer directement
// les audios ; on sélectionne en dessous la matière » ; version classique le 2026-11-14 : plus de platine).
// Les dix matières en pastilles, le cours choisi et son module, un gros bouton de lecture, la barre et
// trois commandes (−15 s, vitesse, +15 s). En choisir une autre change de cours (l'écoute en cours passe
// au nouveau cours). L'audio joue sur place : le cours entier (le deck et l'audio) s'ouvre par sa carte.
// L'écoute suit les mêmes règles que le lecteur d'un cours (components/CourseAudioPlayer) : même position
// gardée sur l'appareil (rl_course_pos:<slug>), même vitesse (rl_audio_rate), dernier cours écouté noté
// au démarrage, cours fini noté à la fin, minutes comptées pour le Codex, lien signé renouvelé s'il
// expire. Chaque changement est signalé (SIGNAL_ECOUTE) : les encoches des livres et la porte suivent.
// Tant que l'appareil n'est pas lu (`pret` faux : rendu serveur, hydratation), le disque ne montre
// aucun cours et ne joue pas : jamais un disque par défaut qui basculerait ensuite.

const VITESSES = [1, 1.25, 1.5, 1.75, 2, 0.75];
/** la vitesse choisie, partagée avec le lecteur d'un cours */
const CLE_VITESSE = "rl_audio_rate";
/** l'événement envoyé à chaque changement de l'écoute (la bibliothèque et la porte relisent l'appareil) */
export const SIGNAL_ECOUTE = "rl-ecoute-cours";

const virgule = (r: number) => `${String(r).replace(".", ",")}×`;
const cleMatiere = (slug: string) => SUBJECTS.find((m) => m.course === slug)?.key ?? "";

function signaler() {
  try {
    window.dispatchEvent(new Event(SIGNAL_ECOUTE));
  } catch {
    // rien : la page se relira à la prochaine visite
  }
}

/** La position gardée d'un cours ; en fin de cours, elle s'efface et le cours est noté fini (comme le lecteur d'un cours). */
function sauver(slug: string, t: number, total: number) {
  try {
    if (total > 0 && t > total - 15) {
      localStorage.removeItem(POS_PREFIX + slug);
      noterCoursFini(slug);
    } else if (t > 5) localStorage.setItem(POS_PREFIX + slug, String(Math.round(t)));
  } catch {
    // stockage indisponible : l'écoute marche, sans reprise
  }
}

export function PlatineEcoute({
  sources,
  depart,
  pret,
  positions = {},
}: {
  /** l'audio signé de chaque cours (null : pas de lien) */
  sources: Record<string, string | null>;
  /** le disque posé à l'arrivée (le dernier cours écouté, sinon le suivant à écouter) */
  depart: string | null;
  /** l'appareil est lu */
  pret: boolean;
  /** les positions lues avec la bibliothèque (le même appareil) : la reprise si le stockage ne répond pas */
  positions?: Record<string, number>;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  /** le cours choisi par le joueur (null : celui de départ) */
  const [choix, setChoix] = useState<string | null>(null);
  const cours = COURS_PROGRAMME.find((c) => c.slug === (choix ?? depart)) ?? COURS_PROGRAMME[0];
  const code = SUBJECTS.find((m) => m.course === cours.slug)?.code ?? "";
  const src = sources[cours.slug] ?? null;
  const [joue, setJoue] = useState(false);
  const [t, setT] = useState(0);
  const [duree, setDuree] = useState(cours.minutes * 60);
  const [vitesse, setVitesse] = useState(1);
  const [panne, setPanne] = useState(false);
  /** la position gardée, à appliquer dès que les métadonnées arrivent */
  const attente = useRef<number | null>(null);
  const derniereSauvee = useRef(0);
  /** relancer la lecture une fois le nouveau disque chargé (on changeait de matière en pleine écoute) */
  const rejouer = useRef(false);
  /** minutes réellement jouées pour le Codex (pas les sauts), notées par paquets */
  const ecoute = useRef({ acc: 0, dernier: -1 });

  // le disque de départ est figé dès la lecture de l'appareil : il ne change plus tout seul quand
  // l'écoute avance (carteCours se recalcule à chaque signal), seulement quand le joueur choisit
  useEffect(() => {
    if (pret && choix === null && depart) setChoix(depart);
  }, [pret, depart, choix]);

  function noter(force: boolean, slug: string) {
    const e = ecoute.current;
    const minutes = Math.floor(e.acc / 60);
    if (minutes < 1 || (!force && minutes < 5)) return;
    e.acc -= minutes * 60;
    codexNoter("cours_ecoute", { matiere: cleMatiere(slug), minutes }).catch(() => undefined);
  }

  // un disque posé : sa position gardée, la vitesse, et l'écoute qui suit
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const slug = cours.slug;
    // un changement de source met l'audio en pause sans événement « pause » : l'interface suit
    setJoue(false);
    setDuree(cours.minutes * 60);
    setPanne(false);
    // pas de lien pour ce disque : on vide l'élément (retirer src ne recharge pas, l'ancien audio resterait)
    if (!(pret && sources[slug]) && a.currentSrc) {
      a.removeAttribute("src");
      a.load();
    }
    derniereSauvee.current = 0;
    ecoute.current = { acc: 0, dernier: -1 };
    attente.current = null;
    try {
      const r = Number(localStorage.getItem(CLE_VITESSE));
      if (VITESSES.includes(r)) {
        a.defaultPlaybackRate = r;
        a.playbackRate = r;
        setVitesse(r);
      }
      const p = Number(localStorage.getItem(POS_PREFIX + slug));
      if (Number.isFinite(p) && p > 5) attente.current = p;
    } catch {
      // stockage indisponible : le disque part de la position lue avec la bibliothèque, sinon du début
    }
    if (attente.current === null && (positions[slug] ?? 0) > 5) attente.current = positions[slug];
    setT(attente.current ?? 0);

    const appliquer = () => {
      const p = attente.current;
      if (p === null) return;
      attente.current = null;
      if (!a.duration || p < a.duration - 5) a.currentTime = p;
    };
    const onMeta = () => {
      if (a.duration && Number.isFinite(a.duration)) setDuree(a.duration);
      appliquer();
      if (rejouer.current) {
        rejouer.current = false;
        a.play().catch(() => undefined);
      }
    };
    const onTemps = () => {
      const e = ecoute.current;
      const d = a.currentTime - e.dernier;
      if (e.dernier >= 0 && d > 0 && d < 1.5) e.acc += d;
      e.dernier = a.currentTime;
      noter(false, slug);
      // tant que la position gardée attend les métadonnées, l'affichage la garde (pas le 0 du rechargement)
      if (attente.current === null) setT(a.currentTime);
      if (Math.abs(a.currentTime - derniereSauvee.current) >= 5) {
        derniereSauvee.current = a.currentTime;
        sauver(slug, a.currentTime, a.duration || 0);
      }
    };
    const onJoue = () => {
      setJoue(true);
      setPanne(false);
      noterDernierCours(slug);
      signaler();
    };
    const onPause = () => {
      ecoute.current.dernier = -1;
      noter(true, slug);
      setJoue(false);
      sauver(slug, a.currentTime, a.duration || 0);
      signaler();
    };
    const onFin = () => {
      noter(true, slug);
      setJoue(false);
      sauver(slug, a.duration || 0, a.duration || 0);
      signaler();
    };
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate", onTemps);
    a.addEventListener("play", onJoue);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onFin);
    if (a.readyState >= 1 && a.currentSrc) onMeta();
    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate", onTemps);
      a.removeEventListener("play", onJoue);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onFin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cours.slug]);

  // Le lien signé expire (six heures) et le réseau peut couper : à l'erreur, un lien neuf (même chemin
  // dans le bucket « courses »), repris au même endroit. Trois reprises au plus par tranche de 5 min.
  // Par disque : rien ne passe d'un cours à l'autre (position vue, essais, réponse tardive).
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    let vivant = true;
    let vu = 0;
    let jouait = false;
    let essais = 0;
    let surMeta: (() => void) | null = null;
    const panneSeche = () => {
      rejouer.current = false;
      setJoue(false);
      setPanne(true);
    };
    const suivre = () => {
      if (a.currentTime > 0) vu = a.currentTime;
      jouait = !a.paused;
    };
    const reprendre = async () => {
      const chemin = /\/object\/sign\/courses\/([^?]+)/.exec(a.currentSrc || a.src)?.[1];
      if (!chemin || essais >= 3) {
        panneSeche();
        return;
      }
      essais++;
      const pos = vu > 0 ? vu : (attente.current ?? 0);
      const relancer = jouait || rejouer.current;
      const { data } = await createClient().storage.from("courses").createSignedUrl(decodeURIComponent(chemin), 21600);
      // le joueur a changé de disque pendant l'aller-retour : ce lien n'est plus le bon
      if (!vivant) return;
      if (!data?.signedUrl) {
        panneSeche();
        return;
      }
      if (surMeta) a.removeEventListener("loadedmetadata", surMeta);
      surMeta = () => {
        surMeta = null;
        if (pos > 0) a.currentTime = pos;
        if (relancer) a.play().catch(() => undefined);
      };
      a.addEventListener("loadedmetadata", surMeta, { once: true });
      a.src = data.signedUrl;
      a.load();
    };
    const remise = window.setInterval(() => (essais = 0), 300_000);
    a.addEventListener("timeupdate", suivre);
    a.addEventListener("play", suivre);
    a.addEventListener("error", reprendre);
    return () => {
      vivant = false;
      window.clearInterval(remise);
      if (surMeta) a.removeEventListener("loadedmetadata", surMeta);
      a.removeEventListener("timeupdate", suivre);
      a.removeEventListener("play", suivre);
      a.removeEventListener("error", reprendre);
    };
  }, [cours.slug]);

  // l'écran verrouillé (téléphone, casque) : le cours et le module en cours, lecture et pause
  const i = cours.chapters.reduce((acc, ch, k) => (t >= ch.start ? k : acc), 0);
  const module = cours.chapters[i];
  useEffect(() => {
    if (!joue || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: module?.title ?? cours.title, artist: cours.title, album: "Ranked Lobby" });
      navigator.mediaSession.setActionHandler("play", () => audio.current?.play().catch(() => undefined));
      navigator.mediaSession.setActionHandler("pause", () => audio.current?.pause());
      navigator.mediaSession.setActionHandler("seekbackward", () => sauter(-15));
      navigator.mediaSession.setActionHandler("seekforward", () => sauter(15));
    } catch {
      // navigateur sans Media Session
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joue, i, cours.slug]);

  function basculer() {
    const a = audio.current;
    if (!a || !pret) return;
    if (!src) {
      setPanne(true);
      return;
    }
    if (a.paused) {
      if (attente.current !== null && a.readyState >= 1) {
        a.currentTime = attente.current;
        attente.current = null;
      }
      a.play().catch(() => undefined);
    } else a.pause();
  }

  function choisir(slug: string) {
    if (slug === cours.slug) return;
    const a = audio.current;
    if (a) {
      // l'écoute en cours est gardée sous SON cours avant de changer de disque
      // deux changements rapprochés : la relance demandée au premier tient toujours
      rejouer.current = (rejouer.current || !a.paused) && !!sources[slug];
      if (a.currentTime > 0) sauver(cours.slug, a.currentTime, a.duration || 0);
      ecoute.current.dernier = -1;
      noter(true, cours.slug);
      a.pause();
    }
    setChoix(slug);
    signaler();
  }

  function sauter(delta: number) {
    const a = audio.current;
    if (!a) return;
    const max = a.duration || duree;
    const base = attente.current ?? a.currentTime;
    const n = Math.max(0, Math.min(max, base + delta));
    if (a.readyState >= 1) {
      attente.current = null;
      a.currentTime = n;
    } else attente.current = n;
    setT(n);
  }

  function changerVitesse() {
    const r = VITESSES[(VITESSES.indexOf(vitesse) + 1) % VITESSES.length];
    setVitesse(r);
    const a = audio.current;
    if (a) {
      a.defaultPlaybackRate = r;
      a.playbackRate = r;
    }
    try {
      localStorage.setItem(CLE_VITESSE, String(r));
    } catch {
      // stockage indisponible : la vitesse vaut pour cette écoute
    }
  }

  function glisser(e: React.ChangeEvent<HTMLInputElement>) {
    const a = audio.current;
    const n = Number(e.target.value);
    if (a && a.readyState >= 1) {
      attente.current = null;
      a.currentTime = n;
    } else attente.current = n;
    setT(n);
  }

  const pct = duree > 0 ? Math.min(100, (t / duree) * 100) : 0;
  const voile = pret ? undefined : b.attente;
  const aide = !pret ? ETAGERE.platine : joue ? ETAGERE.pause(cours.title) : t > 5 ? ETAGERE.reprendreA(cours.title, mmss(t)) : ETAGERE.ecouter(cours.title);

  return (
    <div className={b.lecteur} data-joue={joue ? "1" : undefined}>
      <audio ref={audio} src={pret && src ? src : undefined} preload="metadata" />

      <div className={b.matieres} role="group" aria-label={ETAGERE.matieres}>
        {COURS_PROGRAMME.map((c) => {
          const on = pret && c.slug === cours.slug;
          const codeM = SUBJECTS.find((m) => m.course === c.slug)?.code ?? "";
          return (
            <button
              key={c.slug}
              type="button"
              className={b.pastille + " rl-presse"}
              aria-pressed={on}
              onClick={() => choisir(c.slug)}
              disabled={!pret}
              title={c.title}
              aria-label={`${codeM} · ${c.title}`}
            >
              {codeM}
            </button>
          );
        })}
      </div>

      <div className={b.enCours}>
        <button type="button" className={b.lecture} onClick={basculer} aria-label={aide} title={aide} disabled={!pret}>
          {joue ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="translate-x-[2px]" />}
        </button>
        <div className={b.titres + (voile ? " " + voile : "")}>
          <p className={b.coursTitre}>{cours.title}</p>
          <p className={b.module}>
            <span>{ETAGERE.moduleDe(i + 1, cours.chapters.length)}</span>
            <b>{module?.title ?? cours.title}</b>
          </p>
        </div>
      </div>

      <div className={b.ecoute + (voile ? " " + voile : "")}>
        <div className={b.barre}>
          <span className={b.piste} aria-hidden>
            <i style={{ width: `${pct}%` }} />
          </span>
          {duree > 0 &&
            cours.chapters.slice(1).map((ch) => <span key={ch.start} className={b.cran} style={{ left: `${(ch.start / duree) * 100}%` }} aria-hidden />)}
          <span className={b.curseur} style={{ left: `${pct}%` }} aria-hidden />
          <input
            type="range"
            min={0}
            max={duree || 0}
            step={1}
            value={Math.min(t, duree || t)}
            onChange={glisser}
            disabled={!pret}
            aria-label={ETAGERE.position}
            aria-valuetext={`${mmss(t)} / ${mmss(duree)}`}
          />
        </div>
        <div className={b.commandes}>
          <span className={b.temps}>{mmss(t)}</span>
          <button type="button" className={b.commande + " rl-presse"} onClick={() => sauter(-15)} aria-label={ETAGERE.reculer} title={ETAGERE.reculer} disabled={!pret}>
            <Rewind size={16} aria-hidden />
          </button>
          <button type="button" className={b.commande + " " + b.vitesse + " rl-presse"} onClick={changerVitesse} aria-label={ETAGERE.vitesse(virgule(vitesse))} title={ETAGERE.vitesse(virgule(vitesse))} disabled={!pret}>
            {virgule(vitesse)}
          </button>
          <button type="button" className={b.commande + " rl-presse"} onClick={() => sauter(15)} aria-label={ETAGERE.avancer} title={ETAGERE.avancer} disabled={!pret}>
            <FastForward size={16} aria-hidden />
          </button>
          <span className={b.temps}>{mmss(duree)}</span>
        </div>
        {panne && (
          <p className={b.panne} role="status">
            <Link href={`/courses/${cours.slug}`}>{ETAGERE.sansAudio} →</Link>
          </p>
        )}
      </div>
    </div>
  );
}
