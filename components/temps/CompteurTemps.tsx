"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { TEMPS_ENVOI_MS, TEMPS_INACTIF_IFRAME_MS, TEMPS_INACTIF_MS, TEMPS_MAX_ENVOI, tempsIndisponible } from "@/lib/temps-site";

// Le compteur exact du temps passé sur le site (migration_temps_site.sql),
// pour le joueur connecté : monté une fois, dans la barre du haut, à côté du
// signal de présence (qu'il ne touche pas). Il ne compte que le temps ACTIF :
// l'onglet visible ET (une action — clavier, souris, toucher, défilement —
// dans les 2 dernières minutes, OU un média qui joue avec le son, l'audio des
// cours par exemple). La lecture d'une fiche ou d'un cours en PDF se fait
// dans une iframe, où l'on ne voit ni la souris ni le défilement : tant que
// le focus y reste, l'onglet compte jusqu'à 10 min après la dernière action.
// Un pas toutes les 5 s ajoute le temps écoulé ; le cumul part toutes les
// minutes (ajouter_temps), et quand l'onglet se cache ou se ferme (une
// balise vers /api/temps, qui survit à la fermeture). Un seul onglet compte
// à la fois : un verrou dans le navigateur, que l'onglet actif rafraîchit à
// chaque pas et lâche dès qu'il ne compte plus (la base borne aussi chaque
// ajout au temps réellement écoulé). Rien sur les aperçus (/preview-da) ni
// sur un aperçu local (localhost), sauf avec localStorage rl_temps_essai = 1.
// Sans la migration : silence 15 min, puis un nouvel essai.

/** Un pas toutes les 5 s. */
const PAS_MS = 5_000;
/** Un pas ne compte jamais plus de 15 s (minuterie gelée, ordinateur en veille). */
const PAS_MAX_MS = 15_000;
/** Le cumul ne dépasse pas ce qu'un envoi peut compter (2 min). */
const CUMUL_MAX_MS = TEMPS_MAX_ENVOI * 1000;
/** Le verrou entre onglets : plus vieux que 15 s, il est libre. */
const VERROU = "rl_temps_onglet";
const VERROU_MS = 15_000;
/** Sans la migration : 15 min de silence avant de réessayer. */
const PAUSE_MS = 15 * 60_000;
const ESSAI_LOCAL = "rl_temps_essai";
const ROUTE = "/api/temps";
const ACTIONS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

const lireLs = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

/** Le verrou : l'onglet qui compte et son dernier pas. */
function lireVerrou(): { id: string; t: number } | null {
  try {
    const v = JSON.parse(lireLs(VERROU) ?? "null") as { id?: unknown; t?: unknown } | null;
    return v && typeof v.id === "string" && typeof v.t === "number" ? { id: v.id, t: v.t } : null;
  } catch {
    return null;
  }
}

/** Un média qui joue avec le son (une vidéo muette en boucle ne compte pas). */
function mediaJoue(): boolean {
  for (const m of document.querySelectorAll<HTMLMediaElement>("audio, video")) {
    if (!m.paused && !m.ended && !m.muted && m.volume > 0) return true;
  }
  return false;
}

/** Le focus est dans une iframe (une fiche ou un cours en PDF), la fenêtre au premier plan. */
const focusDansIframe = () => document.activeElement?.tagName === "IFRAME" && document.hasFocus();

export function CompteurTemps() {
  const chemin = usePathname();
  // les aperçus (/preview-da) ne comptent pas ; lu à chaque pas (la barre reste montée d'une page à l'autre)
  const apercu = useRef(false);
  useEffect(() => {
    apercu.current = (chemin ?? "").startsWith("/preview-da");
  }, [chemin]);

  useEffect(() => {
    // un aperçu local du site (la base est la vraie) : rien, sauf pour un essai
    if (/^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/.test(location.hostname) && lireLs(ESSAI_LOCAL) !== "1") return;
    const sb = createClient();
    const moi = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    let derniereAction = Date.now();
    let dernierPas = Date.now();
    let etaitActif = false;
    let cumulMs = 0;
    let dernierEnvoi = Date.now();
    let enCours = false;
    let pauseJusqua = 0;

    const action = () => {
      derniereAction = Date.now();
    };
    // le focus qui part dans une iframe : un clic dans la fiche
    const surBlur = () => {
      if (document.activeElement?.tagName === "IFRAME") action();
    };

    const actif = (t: number) => {
      if (apercu.current || document.visibilityState !== "visible") return false;
      const calme = t - derniereAction;
      return calme <= TEMPS_INACTIF_MS || (calme <= TEMPS_INACTIF_IFRAME_MS && focusDansIframe()) || mediaJoue();
    };

    /** Prend (ou garde) le verrou ; false : un autre onglet compte déjà. Sans stockage, on compte (la base borne). */
    const prendre = (t: number) => {
      const v = lireVerrou();
      if (v && v.id !== moi && t - v.t < VERROU_MS) return false;
      try {
        localStorage.setItem(VERROU, JSON.stringify({ id: moi, t }));
      } catch {
        // stockage bloqué : on compte quand même
      }
      return true;
    };
    const lacher = () => {
      if (lireVerrou()?.id !== moi) return;
      try {
        localStorage.removeItem(VERROU);
      } catch {
        // rien
      }
    };

    /** Ajoute au cumul le temps écoulé depuis le dernier pas (borné). */
    const crediter = (t: number) => {
      if (t >= pauseJusqua) cumulMs = Math.min(CUMUL_MAX_MS, cumulMs + Math.min(PAS_MAX_MS, Math.max(0, t - dernierPas)));
    };

    /** L'envoi de chaque minute, par le client Supabase ; un échec réseau rend le temps (renvoyé au tour suivant). */
    const envoyer = (t: number) => {
      dernierEnvoi = t;
      const s = Math.floor(cumulMs / 1000);
      if (s < 1 || enCours || t < pauseJusqua) return;
      cumulMs -= s * 1000;
      enCours = true;
      const rendre = () => {
        cumulMs = Math.min(CUMUL_MAX_MS, cumulMs + s * 1000);
      };
      void sb.rpc("ajouter_temps", { p_secondes: s }).then(
        ({ error }) => {
          enCours = false;
          if (!error) return;
          if (tempsIndisponible(error)) {
            // migration absente : silence, puis un nouvel essai
            pauseJusqua = Date.now() + PAUSE_MS;
            cumulMs = 0;
          } else rendre();
        },
        () => {
          enCours = false;
          rendre();
        },
      );
    };

    /** L'onglet se cache ou se ferme : le cumul part par une balise (elle survit à la fermeture). */
    const vider = (t: number) => {
      const s = Math.floor(cumulMs / 1000);
      if (s < 1 || t < pauseJusqua) return;
      cumulMs -= s * 1000;
      dernierEnvoi = t;
      const corps = JSON.stringify({ secondes: s });
      try {
        if (navigator.sendBeacon?.(ROUTE, new Blob([corps], { type: "text/plain;charset=UTF-8" }))) return;
      } catch {
        // pas de balise : fetch keepalive
      }
      void fetch(ROUTE, { method: "POST", body: corps, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
    };

    const pas = () => {
      const t = Date.now();
      const a = actif(t) && prendre(t);
      if (a) crediter(t);
      else lacher();
      etaitActif = a;
      dernierPas = t;
      if (t - dernierEnvoi >= TEMPS_ENVOI_MS) envoyer(t);
    };

    const cacher = () => {
      const t = Date.now();
      // le bout de temps depuis le dernier pas, s'il comptait
      if (etaitActif) crediter(t);
      etaitActif = false;
      dernierPas = t;
      lacher();
      vider(t);
    };

    const surVisibilite = () => {
      if (document.visibilityState === "hidden") return cacher();
      // retour sur l'onglet : le temps caché ne compte pas ; revenir est une action
      const t = Date.now();
      dernierPas = t;
      derniereAction = t;
    };

    const t = setInterval(pas, PAS_MS);
    for (const e of ACTIONS) window.addEventListener(e, action, { capture: true, passive: true });
    window.addEventListener("blur", surBlur);
    document.addEventListener("visibilitychange", surVisibilite);
    window.addEventListener("pagehide", cacher);
    return () => {
      clearInterval(t);
      for (const e of ACTIONS) window.removeEventListener(e, action, { capture: true });
      window.removeEventListener("blur", surBlur);
      document.removeEventListener("visibilitychange", surVisibilite);
      window.removeEventListener("pagehide", cacher);
      cacher();
    };
  }, []);

  return null;
}
