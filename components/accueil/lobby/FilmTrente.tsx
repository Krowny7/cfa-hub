"use client";

import { useEffect, useRef, useState } from "react";
import { Illustration } from "@/components/ui/Illustration";
import s from "./FilmTrente.module.css";

// Le fond de la carte « Les 30 du jour » : « Duel à l'encre », un film muet en
// boucle de 7 s, pré-calculé (rendu WebGL image par image, hors du dépôt).
// Deux cadrages : `land` 1600×1000 et `port` 1000×1250. Le cadrage suit la
// forme réelle de la peinture, mesurée (ResizeObserver) : la largeur de la
// fenêtre ne la dit pas (sur ordinateur, la colonne peinte des 30 est plus
// haute que large), et elle change quand on tourne l'écran ou qu'on
// redimensionne. Affiche et vidéo changent de cadrage ensemble.
// L'affiche (l'image 0 du film, calme) est posée d'abord, au rendu serveur, en
// `port` (avant la mesure) : elle reste dessous tant que la vidéo n'a pas émis
// `playing`, et seule avec prefers-reduced-motion ou si la lecture automatique
// est refusée. La vidéo n'est montée qu'après l'hydratation (rien ne dépend de
// window au premier rendu) ; elle se met en pause hors de l'écran ou onglet
// caché. Si le film ne se charge pas : l'illustration d'avant revient.

// `land` ne garde ses deux duellistes (le second va jusqu'à 94 % de la largeur)
// que dans une peinture au moins 1,45 fois plus large que haute ; en dessous,
// `port` (duellistes entre 20 et 93 % de la largeur, vers 21-42 % de la hauteur)
// les garde tous les deux, même dans une carte assez large.
const LARGE = 1.45;
// les fichiers AV1 (WebM) sont plus légers ; le MP4 H.264 est le secours universel
const AV1 = true;
// cadrage du film dans la carte (object-position), affiche comprise
const CADRAGE = "50% 35%";

type Cadrage = "land" | "port";

const fichier = (c: Cadrage, ext: "mp4" | "webm" | "webp") => `/films/trente-duel-${c}.${ext}`;

export function FilmTrente() {
  const boite = useRef<HTMLSpanElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  // le cadrage de la peinture mesurée ; null avant la mesure (rendu serveur, hydratation)
  const [cadrage, setCadrage] = useState<Cadrage | null>(null);
  // false : mouvement réduit demandé (ou pas encore vérifié), l'affiche seule
  const [mouvement, setMouvement] = useState(false);
  // le cadrage dont la vidéo a émis `playing` : une vidéo remontée reste invisible jusqu'au sien
  const [joue, setJoue] = useState<Cadrage | null>(null);
  const [rate, setRate] = useState(false);

  useEffect(() => {
    setMouvement(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // la forme de la peinture : à la mesure, puis à chaque changement de taille
  useEffect(() => {
    const el = boite.current;
    if (rate || !el) return;
    const mesurer = () => {
      const l = el.clientWidth;
      const h = el.clientHeight;
      if (l > 0 && h > 0) setCadrage(l / h >= LARGE ? "land" : "port");
    };
    mesurer();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", mesurer);
      return () => window.removeEventListener("resize", mesurer);
    }
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rate]);

  // la lecture : seulement quand la carte est à l'écran et l'onglet visible
  useEffect(() => {
    const v = video.current;
    if (!mouvement || !cadrage || !v) return;
    // React peut omettre `muted` au rendu : sans lui, iOS refuse la lecture automatique
    v.muted = true;
    v.defaultMuted = true;
    let visible = true;
    const suivre = () => {
      if (visible && document.visibilityState === "visible") {
        v.play().catch(() => {
          // lecture refusée (économie d'énergie…) : l'affiche reste
        });
      } else {
        v.pause();
      }
    };
    const io = new IntersectionObserver(
      (entrees) => {
        // plusieurs entrées dans un même rappel (fil occupé) : la dernière est l'état actuel
        visible = entrees[entrees.length - 1].isIntersecting;
        suivre();
      },
      { threshold: 0.05 },
    );
    io.observe(v);
    document.addEventListener("visibilitychange", suivre);
    suivre();
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", suivre);
      v.pause();
    };
  }, [mouvement, cadrage]);

  if (rate) return <Illustration nom="accueil-trente-du-jour" position="50% 40%" decorative eager />;

  const tomber = () => setRate(true);
  return (
    <span ref={boite} className={s.film}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fichier(cadrage ?? "port", "webp")}
        alt=""
        className={s.affiche}
        style={{ objectPosition: CADRAGE }}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onError={tomber}
      />
      {mouvement && cadrage && (
        // key : un autre cadrage remonte la vidéo (changer ses <source> ne la recharge pas)
        <video
          key={cadrage}
          ref={video}
          className={s.video + (joue === cadrage ? " " + s.joue : "")}
          style={{ objectPosition: CADRAGE }}
          poster={fichier(cadrage, "webp")}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          tabIndex={-1}
          onPlaying={() => setJoue(cadrage)}
          onError={tomber}
        >
          {AV1 && <source src={fichier(cadrage, "webm")} type='video/webm; codecs="av01.0.08M.08"' />}
          {/* la dernière source qui échoue émet l'erreur : on revient à l'illustration */}
          <source src={fichier(cadrage, "mp4")} type='video/mp4; codecs="avc1.640028"' onError={tomber} />
        </video>
      )}
    </span>
  );
}
