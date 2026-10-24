"use client";

import { useEffect, useRef } from "react";
import { enregistrerBoucle } from "@/app/flashcards/actions";
import type { EtatBoucle } from "@/lib/flashcards/boucle";
import { SuiviCompte, type LigneProgression } from "@/lib/flashcards/progression";

// La boucle des flashcards envoyée sur le compte (flashcard_progress), sans
// jamais bloquer la révision : chaque geste repousse l'envoi de 1,5 s
// (anti-rebond) ; la fin d'un tour et la fin de la boucle partent tout de
// suite, par l'action serveur. Page cachée, fermée, démontée, ou lien suivi :
// par navigator.sendBeacon (ou fetch keepalive) vers
// /api/flashcards/progression, qui survit à la fermeture et ne passe pas par
// le routeur de Next (une navigation abandonne l'action serveur en cours :
// la liste peut alors s'afficher avant que l'écriture n'arrive, d'où la
// relecture de l'appareil dans les listes, useEtatListe).
//
// Ne jamais écraser une progression faite ailleurs (SuiviCompte) : chaque
// geste porte la version du compte sur laquelle il s'appuie, et la base
// ignore celui qui s'appuie sur une version dépassée (l'action rend alors
// « conflit » avec la ligne du compte). Quand l'onglet revient au premier
// plan après 30 s cachée, ou est resservi par le cache du navigateur, le
// compte est relu ; une version écrite ailleurs remplace ce qui attend
// d'être envoyé, et `surCompte` la passe à la révision.
//
// `cle` null (pas de compte, table pas encore créée) : rien n'est envoyé ni
// relu. Table absente ou session perdue en cours de route : on cesse
// d'essayer, en silence ; une erreur passagère est retentée deux fois, puis
// le geste suivant renverra l'état (l'appareil le garde de toute façon).

const DELAI = 1_500;
const RETENTE = 8_000;
/** cachée au moins ce temps : le compte est relu au retour */
const RELIRE_APRES = 30_000;
const ROUTE = "/api/flashcards/progression";

export function useSynchroBoucle(cle: string | null, surCompte: (ligne: LigneProgression) => void) {
  const actif = useRef(!!cle);
  const suiviRef = useRef<SuiviCompte | null>(null);
  const suivi = () => (suiviRef.current ??= new SuiviCompte());
  const attente = useRef<EtatBoucle | null>(null);
  const minuteur = useRef<number | null>(null);
  const echecs = useRef(0);
  const cacheeA = useRef<number | null>(null);
  const relueA = useRef(0);
  const rappel = useRef(surCompte);
  useEffect(() => {
    rappel.current = surCompte;
  });

  const enMarche = () => !!cle && actif.current;

  function arreterMinuteur() {
    if (minuteur.current !== null) {
      window.clearTimeout(minuteur.current);
      minuteur.current = null;
    }
  }

  /** Une ligne du compte, relue ou rendue par un refus : écrite ailleurs, elle remplace ce qui attend et la révision la prend. */
  function recu(ligne: LigneProgression | null | undefined) {
    if (!ligne || !suivi().recue(ligne)) return;
    arreterMinuteur();
    attente.current = null;
    echecs.current = 0;
    rappel.current(ligne);
  }

  function envoyer() {
    arreterMinuteur();
    const e = attente.current;
    if (!e || !cle || !actif.current) return;
    attente.current = null;
    suivi().envoye(e);
    enregistrerBoucle(cle, e)
      .then((r) => {
        if (r.ok) {
          echecs.current = 0;
          return;
        }
        if (r.raison === "conflit") {
          echecs.current = 0;
          recu(r.ligne);
          return;
        }
        if (r.raison !== "erreur") {
          actif.current = false;
          return;
        }
        reessayer(e);
      })
      .catch(() => reessayer(e));
  }

  function reessayer(e: EtatBoucle) {
    if (++echecs.current > 2 || attente.current) return;
    attente.current = e;
    minuteur.current = window.setTimeout(envoyer, RETENTE);
  }

  /** Garde l'état à envoyer ; `toutDeSuite` : fin de tour, fin de boucle. */
  function planifier(e: EtatBoucle, toutDeSuite = false) {
    if (!enMarche()) return;
    attente.current = e;
    echecs.current = 0;
    arreterMinuteur();
    if (toutDeSuite) envoyer();
    else minuteur.current = window.setTimeout(envoyer, DELAI);
  }

  /** Le dernier envoi quand la page se cache, se ferme ou quitte la révision. */
  function balise() {
    arreterMinuteur();
    const e = attente.current;
    if (!e || !cle || !actif.current) return;
    attente.current = null;
    suivi().envoye(e);
    const corps = JSON.stringify({ cle, etat: e });
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon?.(ROUTE, new Blob([corps], { type: "text/plain;charset=UTF-8" }))) return;
    } catch {
      // pas de balise : fetch keepalive
    }
    try {
      void fetch(ROUTE, { method: "POST", body: corps, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
    } catch {
      // l'état reste sur l'appareil, renvoyé à la prochaine visite
    }
  }

  /** Relit le compte (au plus une fois toutes les 5 s) : une version écrite ailleurs l'emporte. */
  function relire() {
    if (!cle || !actif.current) return;
    const t = Date.now();
    if (t - relueA.current < 5_000) return;
    relueA.current = t;
    fetch(`${ROUTE}?cle=${encodeURIComponent(cle)}`, { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<{ ligne?: LigneProgression | null }>) : null))
      .then((j) => recu(j?.ligne))
      .catch(() => undefined);
  }

  /** La ligne lue par la page : sa version est connue (la base des prochains gestes). */
  function connaitre(ligne: LigneProgression | null | undefined) {
    suivi().lue(ligne);
  }

  /** Horodate un geste (voir SuiviCompte.horodater) ; `avant` : le maj de l'état qu'il remplace. */
  function horodater(suite: EtatBoucle, avant?: number): EtatBoucle {
    return suivi().horodater(suite, { synchro: enMarche(), avant });
  }

  // les fonctions ne lisent que des refs et `cle` : les écouteurs sont posés une fois par clé
  useEffect(() => {
    if (!cle) return;
    const visibilite = () => {
      if (document.visibilityState === "hidden") {
        cacheeA.current = Date.now();
        balise();
        return;
      }
      const depuis = cacheeA.current;
      cacheeA.current = null;
      // revenue au premier plan après un moment : on a pu avancer ailleurs
      if (depuis !== null && Date.now() - depuis >= RELIRE_APRES) relire();
    };
    const fermer = () => balise();
    // resservie par le cache du navigateur (retour arrière) : la page date
    const montrer = (ev: PageTransitionEvent) => {
      if (ev.persisted) relire();
    };
    // un lien suivi (souris, doigt, clavier) : l'envoi en attente part avant la navigation, par la balise
    const versLien = (ev: Event) => {
      if (ev instanceof KeyboardEvent && ev.key !== "Enter") return;
      const t = ev.target as Element | null;
      if (t?.closest?.("a[href]")) balise();
    };
    document.addEventListener("visibilitychange", visibilite);
    window.addEventListener("pagehide", fermer);
    window.addEventListener("pageshow", montrer);
    document.addEventListener("pointerdown", versLien, true);
    document.addEventListener("keydown", versLien, true);
    return () => {
      document.removeEventListener("visibilitychange", visibilite);
      window.removeEventListener("pagehide", fermer);
      window.removeEventListener("pageshow", montrer);
      document.removeEventListener("pointerdown", versLien, true);
      document.removeEventListener("keydown", versLien, true);
      // la révision se démonte (navigation sans lien, fermeture) : ce qui attend part
      balise();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  return { planifier, horodater, connaitre, relire };
}
