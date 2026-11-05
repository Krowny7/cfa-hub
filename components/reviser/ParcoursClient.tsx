"use client";

import { Illustration } from "@/components/ui/Illustration";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause } from "lucide-react";
import { COURS_PROGRAMME, ONDE, carteCours, mmss } from "@/components/reviser/parcours";
import { SUBJECTS } from "@/components/reviser/catalog";
import { EncreVive } from "@/components/nav/EncreVive";
import { codexNoter } from "@/lib/codex/actions";
import { POS_PREFIX, lireEcoute, noterCoursFini, noterDernierCours, type EcouteCours } from "@/lib/course-ecoute";
import { createClient } from "@/lib/supabase/browser";
import { PALETTES } from "@/lib/palettes";
import { ecrireSansCalcul, lireSansCalcul } from "@/lib/sans-calcul";
import { CARNET } from "@/lib/voice-z1";
import { RV } from "@/lib/voice-reviser";
import s from "./Parcours.module.css";

// Les deux morceaux de la page Réviser qui lisent l'appareil (localStorage) :
// la carte « Cours complets » (le dernier cours ouvert et sa position) et,
// dans le registre de l'Atelier, la jauge et l'interrupteur « Sans calcul » du carnet. Le serveur rend l'état sans
// historique ; l'appareil n'est lu qu'après le montage (pas d'écart de rendu).
// `apercu` : l'écoute d'exemple des aperçus, à la place de l'appareil.
// La carte du cours est une carte sombre unie (noyer ; pas d'encre : demande
// de l'utilisateur). Son bouton est rempli du vrai fluide de l'onglet
// « Réviser » (EncreVive, palette studiolo ; texture de repli et voile :
// .rl-encre de globals.css), comme sa pastille d'étape.
// Les variables --pal-* viennent de la racine de la page (ReviserView). La
// carte garde .card-ink : en mode discret, la carte sombre neutre du site.

const SLUGS = COURS_PROGRAMME.map((c) => c.slug);
const PAL = PALETTES.studiolo;

/**
 * La carte « Cours complets » : le lecteur joue l'audio sur place, sans changer de page, et
 * les badges de matière choisissent le cours qu'il lit. La position, le dernier cours écouté
 * et les minutes du Codex sont gardés comme dans le lecteur de la page du cours
 * (components/CourseAudioPlayer). Le lien signé n'est demandé qu'au premier appui.
 */
export function CarteCoursComplets({ apercu }: { apercu?: EcouteCours | null }) {
  const [ecoute, setEcoute] = useState<EcouteCours | null>(apercu ?? null);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [lecture, setLecture] = useState(false);
  const [attente, setAttente] = useState(false);
  const [echec, setEchec] = useState(false);
  // null : la position gardée sur l'appareil, tant que le lecteur n'a pas tourné
  const [temps, setTemps] = useState<number | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const charge = useRef<string | null>(null);
  const garde = useRef(0);
  const compte = useRef({ acc: 0, dernier: -1 });

  useEffect(() => {
    if (apercu === undefined) setEcoute(lireEcoute(SLUGS));
  }, [apercu]);

  const c = carteCours(ecoute);
  if (!c) return null;
  const slug = choisi ?? c.slug;
  const cours = COURS_PROGRAMME.find((x) => x.slug === slug) ?? COURS_PROGRAMME[0];
  const total = cours.minutes * 60;
  const position = temps ?? Math.min(ecoute?.positions[cours.slug] ?? 0, total);
  const chapitre = cours.chapters.reduce((acc, ch, k) => (position >= ch.start ? k : acc), 0);
  const lues = Math.round(ONDE.length * (total > 0 ? position / total : 0));

  function garder(a: HTMLAudioElement) {
    const s2 = charge.current;
    if (!s2) return;
    try {
      const d = a.duration || 0;
      if (d > 0 && a.currentTime > d - 15) {
        localStorage.removeItem(POS_PREFIX + s2);
        noterCoursFini(s2);
      } else if (a.currentTime > 5) localStorage.setItem(POS_PREFIX + s2, String(Math.round(a.currentTime)));
    } catch {
      // stockage indisponible : la position ne sera pas gardée
    }
  }

  function noterMinutes(force = false) {
    const e = compte.current;
    const minutes = Math.floor(e.acc / 60);
    if (minutes < 1 || (!force && minutes < 5)) return;
    e.acc -= minutes * 60;
    const matiere = SUBJECTS.find((x) => x.course === charge.current)?.key ?? "";
    codexNoter("cours_ecoute", { matiere, minutes }).catch(() => undefined);
  }

  /** `depuis` : où reprendre ; null : là où le lecteur s'est arrêté. */
  async function lancer(cible: (typeof COURS_PROGRAMME)[number], depuis: number | null) {
    const a = audio.current;
    if (!a) return;
    setEchec(false);
    if (charge.current !== cible.slug) {
      setAttente(true);
      const { data } = await createClient().storage.from("courses").createSignedUrl(`${cible.file}.mp3`, 21600);
      setAttente(false);
      if (!data?.signedUrl) {
        setEchec(true);
        return;
      }
      charge.current = cible.slug;
      compte.current.dernier = -1;
      a.addEventListener(
        "loadedmetadata",
        () => {
          a.currentTime = depuis ?? 0;
        },
        { once: true },
      );
      a.src = data.signedUrl;
      a.load();
    } else if (depuis !== null) a.currentTime = depuis;
    a.play().catch(() => setEchec(true));
  }

  function basculer() {
    const a = audio.current;
    if (!a) return;
    if (!a.paused) a.pause();
    else void lancer(cours, charge.current === cours.slug ? null : position);
  }

  function choisir(nouveau: string) {
    if (nouveau === cours.slug) return;
    const cible = COURS_PROGRAMME.find((x) => x.slug === nouveau);
    if (!cible) return;
    const a = audio.current;
    const jouait = !!a && !a.paused;
    if (a) {
      garder(a);
      a.pause();
    }
    const lue = apercu === undefined ? lireEcoute(SLUGS) : ecoute;
    setEcoute(lue);
    setChoisi(nouveau);
    setTemps(null);
    if (jouait) void lancer(cible, lue?.positions[nouveau] ?? 0);
  }

  function aller(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const cible = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total;
    setTemps(cible);
    void lancer(cours, cible);
  }

  return (
    <li className={"card-ink " + s.carte + " " + s.c1} data-leonard="cours">
      <Illustration nom="reviser-bibliotheque" position="50% 100%" decorative eager className={s.fond} />
      <span className={s.c1Voile} aria-hidden />
      <audio
        ref={audio}
        preload="none"
        onPlay={() => {
          setLecture(true);
          if (charge.current) noterDernierCours(charge.current);
        }}
        onPause={(e) => {
          compte.current.dernier = -1;
          noterMinutes(true);
          setLecture(false);
          garder(e.currentTarget);
        }}
        onEnded={(e) => {
          noterMinutes(true);
          setLecture(false);
          garder(e.currentTarget);
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          const n = compte.current;
          const d = a.currentTime - n.dernier;
          if (n.dernier >= 0 && d > 0 && d < 1.5) n.acc += d;
          n.dernier = a.currentTime;
          noterMinutes();
          setTemps(a.currentTime);
          if (Math.abs(a.currentTime - garde.current) >= 5) {
            garde.current = a.currentTime;
            garder(a);
          }
        }}
      />
      <h3 className={s.c1Titre}>{RV.coursTitre}</h3>
      <div className={s.lecteur}>
        <button type="button" className={s.play} onClick={basculer} disabled={attente} aria-label={lecture ? RV.coursPause(cours.title) : RV.coursLire(cours.title)}>
          {lecture ? (
            <Pause size={18} fill="currentColor" aria-hidden />
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M6 4l14 8-14 8z" />
            </svg>
          )}
        </button>
        <span className={s.piste}>
          <span className={s.l1}>
            <b>{cours.title}</b>
            <span className={s.temps + " " + s.mono}>
              {mmss(position)} / {mmss(total)}
            </span>
          </span>
          {cours.chapters[chapitre] && <span className={s.chap}>{RV.coursModule(chapitre + 1, cours.chapters[chapitre].title)}</span>}
          <button type="button" className={s.onde} onClick={aller} aria-label={RV.coursAller}>
            {ONDE.map((h, i) => (
              <i key={i} style={{ height: h }} className={i < lues ? s.lu : undefined} />
            ))}
          </button>
        </span>
      </div>
      {echec && (
        <p role="alert" className={s.sous}>
          {RV.coursEchec}
        </p>
      )}
      <ul className={s.matieres} aria-label={RV.coursMatieres}>
        {c.matieres.map((m) => {
          const pct = Math.round(m.part * 100);
          const k = SUBJECTS.find((x) => x.key === m.key)?.course ?? null;
          return (
            <li key={m.key} className={pct > 0 ? s.fait : undefined} data-actif={k === cours.slug ? "1" : undefined} style={pct > 0 ? ({ "--p": m.part } as React.CSSProperties) : undefined}>
              <button type="button" disabled={!k} aria-pressed={k === cours.slug} title={RV.coursMatiere(m.nom, pct)} onClick={() => k && choisir(k)}>
                <span aria-hidden>{m.code}</span>
                <span className="sr-only">{RV.coursMatiere(m.nom, pct)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Link href="/courses" className={"rl-encre " + s.bouton + " " + s.encre} data-palette={PAL.key}>
        <EncreVive tons={PAL.liquide} />
        {RV.coursOuvrir}
      </Link>
    </li>
  );
}

/**
 * La ligne du carnet, côté appareil : la jauge « sans calcul / à calcul » des
 * ratures en cours et l'interrupteur « Sans calcul » de cet appareil (la même
 * clé que Moi › Erreurs), qui partagent leur état : allumé, la part « à
 * calcul » s'efface. Coupé au rendu serveur, relu après le montage.
 * `masquees` : les ratures à calcul en cours (null : inconnu, pas de jauge).
 */
export function CalculCarnet({ enCours, masquees, apercu }: { enCours: number; masquees: number | null; apercu?: boolean }) {
  const [on, setOn] = useState(apercu ?? false);
  useEffect(() => {
    if (apercu === undefined) setOn(lireSansCalcul());
  }, [apercu]);
  const etat = !on ? RV.carnetCalculCoupe : masquees === null ? RV.carnetCalculActif : masquees > 0 ? CARNET.calculMasquees(masquees) : CARNET.sansCalculAucune;
  const aCalcul = masquees === null ? 0 : Math.min(masquees, enCours);
  const sansCalcul = enCours - aCalcul;
  return (
    <>
      {masquees !== null && enCours > 0 && (
        <span className={s.calcul} data-on={on ? "1" : undefined}>
          <span className={s.calculBarre} aria-hidden>
            {sansCalcul > 0 && <i className={s.partSans} style={{ flexGrow: sansCalcul }} />}
            {aCalcul > 0 && <i className={s.partAvec} style={{ flexGrow: aCalcul }} />}
          </span>
          <span className={s.calculLegende}>
            <span className={s.calculSans}>{RV.carnetSansCalcul(sansCalcul)}</span>
            <span aria-hidden> · </span>
            <span className={s.calculAvec}>{RV.carnetACalcul(aCalcul)}</span>
          </span>
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={s.bascule}
        title={CARNET.sansCalculSous}
        onClick={() => {
          const v = !on;
          setOn(v);
          if (apercu === undefined) ecrireSansCalcul(v);
        }}
      >
        <span aria-hidden className={"switch" + (on ? " is-on" : "")} />
        <span>
          <b>{CARNET.sansCalcul}</b> · {etat}
        </span>
      </button>
    </>
  );
}
