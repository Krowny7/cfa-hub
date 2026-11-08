"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BanniereVs, LigneVainqueur } from "@/components/arene/BanniereVs";
import { BoutonEnvoi, PorteeEncre } from "@/components/classement/Encre";
import { dejaJoue, lancerVideo, marquerJoue, modeDiscret, mouvementReduit } from "@/lib/arene/client";
import { joueurArene, lireArene, lireElos } from "@/lib/arene/donnees";
import { ARENE_VIDE, type Arene } from "@/lib/arene/perso";
import { BANNIERE_DUREE_MS, VIDEO_FILET_MS, VIDEO_MAX_MS, formatDe, relancerVideo, rideauFerme, sceneFin } from "@/lib/arene/regles";
import { VideoCadree } from "@/components/arene/VideoCadree";
import { createClient } from "@/lib/supabase/browser";
import { ARENE } from "@/lib/voice-arene";
import s from "./Arene.module.css";

// La fin d'une partie : le résultat (`children`) n'est pas monté tant que le
// joueur n'a pas touché « Voir le résultat », sur un calque posé sur la page en
// cours. Au clic, la vidéo du vainqueur au milieu de l'écran, dans son cadre en
// coup de pinceau (paysage ou vertical), le pseudo et le score dessous, puis le
// résultat. Les règles de Théo : 15 secondes au plus, ni bouton Passer ni
// fermeture avant la fin, mais personne ne reste bloqué (vidéo en panne : le
// résultat ; filet de 20 s). Égalité ou examen raté (`gagnant` null) : le
// résultat tout de suite. Vainqueur sans vidéo : sa bannière et son score, 3 s.
// Une fois par partie (`cle`) ; en mode discret, le résultat s'affiche directement.
// La vidéo se charge derrière le bouton ; `play()` part dans le clic, pour que le
// son passe ; refusé, elle repart en muet.

export type GagnantFin = {
  id: string;
  pseudo: string;
  photo: string | null;
  /** connu de l'appelant ; absent : lu dans ratings */
  elo?: number | null;
  /** « 24 / 30 » */
  score: string;
  /** ce qui suit le score : « Inès 19 / 30 », « 80 % » */
  ligne: string | null;
};

type Etape = "attente" | "cache" | "video" | "banniere" | "resultat";
type Profil = { id: string; arene: Arene; elo: number | null };

const ATTENTE_LECTURE_MS = 2500;

/** Ce qu'il faut pour la scène du vainqueur ; jamais d'erreur ni d'attente sans fin : au pire, les réglages de départ. */
async function lireProfil(id: string, eloConnu: number | null): Promise<Profil> {
  const repli: Profil = { id, arene: ARENE_VIDE, elo: eloConnu };
  try {
    const sb = createClient();
    const lecture = Promise.all([lireArene(sb, [id]), eloConnu === null ? lireElos(sb, [id]) : Promise.resolve(null)]);
    const lu = await Promise.race([lecture, new Promise<null>((fin) => setTimeout(() => fin(null), ATTENTE_LECTURE_MS))]);
    if (!lu) return repli;
    const [arenes, elos] = lu;
    return { id, arene: arenes.get(id) ?? ARENE_VIDE, elo: eloConnu ?? elos?.get(id) ?? null };
  } catch {
    return repli;
  }
}

export function RideauFin({
  cle,
  kicker,
  gagnant,
  actif = true,
  pret = true,
  serveur = "attente",
  titre = ARENE.finTitre,
  children,
}: {
  /** la partie (« duel:<id> », « salle:<id> ») : le rideau ne se joue qu'une fois pour elle */
  cle: string;
  /** la ligne du haut (« Duel · 30 questions ») */
  kicker: string;
  /** celui dont on joue la scène ; null : pas de scène, le résultat au clic */
  gagnant: GagnantFin | null;
  /** faux : pas de rideau, le résultat tout de suite (une partie ancienne, un aperçu) */
  actif?: boolean;
  /** faux tant que l'appelant cherche encore le gagnant */
  pret?: boolean;
  /** ce que rend un serveur : rien (le score ne se devine pas dans la page) ou le résultat (écran jamais rendu par le serveur du site) */
  serveur?: "attente" | "resultat";
  /** le grand titre : « Partie terminée », ou la fin d'un round */
  titre?: string;
  children: React.ReactNode;
}) {
  const [etape, setEtape] = useState<Etape>(() => (!actif || (serveur === "resultat" && typeof window === "undefined") ? "resultat" : "attente"));
  const [profil, setProfil] = useState<Profil | null>(null);
  const [reduit, setReduit] = useState(false);
  // le gagnant au moment du clic : un classement relu pendant la vidéo ne la coupe pas
  const [fige, setFige] = useState<GagnantFin | null>(null);
  const calque = useRef<HTMLDivElement | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const panne = useRef(false);
  const plafond = useRef<ReturnType<typeof setTimeout> | null>(null);
  const departVideo = useRef<number | null>(null);
  const gagnantId = gagnant?.id ?? null;
  const eloConnu = gagnant?.elo ?? null;
  const vu = `fin:${cle}`;

  const terminer = useCallback(() => {
    marquerJoue(vu);
    setEtape("resultat");
  }, [vu]);

  useEffect(() => {
    if (etape !== "attente") return;
    if (!rideauFerme({ discret: modeDiscret(), dejaVu: dejaJoue(vu) })) {
      setEtape("resultat");
      return;
    }
    setReduit(mouvementReduit());
    setEtape("cache");
  }, [etape, vu]);

  // le vainqueur et sa vidéo se préparent derrière le bouton
  useEffect(() => {
    if (etape !== "cache" || !gagnantId) return;
    let abandon = false;
    void lireProfil(gagnantId, eloConnu).then((p) => {
      if (!abandon) setProfil(p);
    });
    return () => {
      abandon = true;
    };
  }, [etape, gagnantId, eloConnu]);

  useEffect(() => {
    if (etape === "cache") calque.current?.focus();
    if (etape !== "video" && etape !== "banniere") return;
    const t = setTimeout(terminer, etape === "video" ? VIDEO_FILET_MS : BANNIERE_DUREE_MS);
    return () => clearTimeout(t);
  }, [etape, terminer]);

  useEffect(
    () => () => {
      if (plafond.current) clearTimeout(plafond.current);
    },
    [],
  );

  if (etape === "resultat") return <>{children}</>;
  if (etape === "attente") return <div className={s.place} aria-hidden />;

  const g = fige ?? gagnant;
  const lu = g && profil?.id === g.id ? profil : null;
  const pretTout = pret && (!g || !!lu);
  const victoire = lu && !reduit ? lu.arene.video : null;

  function voir() {
    const scene = sceneFin({ gagnantId: lu ? (g?.id ?? null) : null, aVideo: !!lu?.arene.video, reduit });
    if (scene === "aucune") return terminer();
    setFige(g);
    if (scene === "banniere") return setEtape("banniere");
    const v = video.current;
    if (!v || panne.current) return terminer();
    setEtape("video");
    void lancerVideo(v).then((ok) => {
      if (!ok) terminer();
    });
  }

  return (
    <div className={s.place} aria-hidden>
      {createPortal(
        <div ref={calque} className={s.calque} role="dialog" aria-modal="true" aria-label={titre} tabIndex={-1}>
          {etape === "cache" && (
            <div className={s.scene}>
              <p className={s.rideauKicker}>{kicker}</p>
              <div className={s.rideauTrait} />
              <h2 className={s.rideauTitre}>{titre}</h2>
              <p className={s.rideauSous}>{ARENE.finSous}</p>
              <div className={s.rideauBouton}>
                <PorteeEncre>
                  <BoutonEnvoi type="button" className={s.boutonPinceau} disabled={!pretTout} onClick={voir}>
                    {ARENE.voirResultat}
                  </BoutonEnvoi>
                </PorteeEncre>
              </div>
            </div>
          )}
          {victoire && g && (
            <div className={s.fin} data-cachee={etape === "video" ? "0" : "1"}>
              <div className={[s.video, s.videoScene].join(" ")} data-format={formatDe(victoire)}>
                <VideoCadree
                  ref={video}
                  cadre={victoire.cadre}
                  src={victoire.url}
                  aria-label={ARENE.videoAria(g.pseudo)}
                  preload="auto"
                  playsInline
                  disablePictureInPicture
                  onEnded={() => {
                    const v = video.current;
                    if (!v || departVideo.current === null || !relancerVideo(Date.now() - departVideo.current)) return terminer();
                    v.currentTime = 0;
                    void v.play().catch(terminer);
                  }}
                  onError={() => {
                    panne.current = true;
                    if (etape === "video") terminer();
                  }}
                  onPlaying={() => {
                    departVideo.current ??= Date.now();
                    plafond.current ??= setTimeout(terminer, VIDEO_MAX_MS);
                  }}
                />
                <div className={s.videoCadre} />
              </div>
              <LigneVainqueur pseudo={g.pseudo} score={g.score} ligne={g.ligne} />
            </div>
          )}
          {etape === "banniere" && lu && g && (
            <div className={s.fin}>
              <div className={s.finBan}>
                <BanniereVs j={joueurArene({ id: g.id, pseudo: g.pseudo, photo: g.photo, elo: lu.elo }, lu.arene)} />
              </div>
              <LigneVainqueur pseudo={g.pseudo} score={g.score} ligne={g.ligne} />
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
