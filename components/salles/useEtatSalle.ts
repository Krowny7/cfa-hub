"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lireEtatSalle } from "@/lib/salles/api";
import { clockDe, delaiAvantLecture, heureServeur } from "@/lib/salles/logique";
import type { EtatSalle } from "@/lib/salles/types";
import { createClient } from "@/lib/supabase/browser";

// Le suivi d'une salle depuis le navigateur : relit etat_salle toutes les 2 à
// 3 s (pas de Supabase Realtime), cale l'horloge sur celle du serveur et
// range les énoncés et corrections déjà reçus (fusionnerEtat).
//
//  - sans partie en cours, une lecture toutes les 4 s (15 s onglet masqué) :
//    de quoi voir arriver les joueurs et le lancement ;
//  - pendant une partie, delaiAvantLecture : le rythme de base (2,5 s),
//    raccourci pour tomber juste sur l'ouverture d'une question, la fin du
//    temps, la correction publique ;
//  - un onglet qui redevient visible relit tout de suite.
//
// Le premier état vient du serveur de la page (rendu initial) : son décalage
// d'horloge est celui du serveur Next, pas du navigateur ; la première
// lecture, faite à l'arrivée, cale l'horloge (`cale` passe à vrai).
// Utilisé par SalleVue ; l'écran de partie (PartieSalle) reçoit ce même suivi.

export type SuiviSalle = {
  etat: EtatSalle;
  /** à ajouter à Date.now() pour avoir l'heure du serveur ; 0 tant que `cale` est faux */
  decalageMs: number;
  /** l'horloge a été calée sur celle du serveur par au moins une lecture du navigateur */
  cale: boolean;
  /** la dernière lecture a échoué (réseau) : on réessaie tout seul */
  hors: boolean;
  /** la salle n'existe plus, ou tu n'en fais plus partie */
  introuvable: boolean;
  /** l'heure du serveur maintenant, en ms */
  maintenant: () => number;
  /** relit l'état tout de suite (après un lancement, une réponse…) */
  rafraichir: () => Promise<void>;
};

const IDLE_MS = 4000;
const IDLE_MASQUE_MS = 15000;

export function useEtatSalle(salleId: string, initial: EtatSalle): SuiviSalle {
  const [etat, setEtat] = useState<EtatSalle>(initial);
  const [decalageMs, setDecalage] = useState(0);
  const [cale, setCale] = useState(false);
  const [hors, setHors] = useState(false);
  const [introuvable, setIntrouvable] = useState(false);
  const courant = useRef({ etat: initial, decalageMs: 0, introuvable: false });
  const client = useRef<SupabaseClient | null>(null);
  const enVol = useRef<Promise<void> | null>(null);

  const rafraichir = useCallback((): Promise<void> => {
    if (enVol.current) return enVol.current;
    const p = (async () => {
      client.current ??= createClient();
      const lu = await lireEtatSalle(client.current, salleId, courant.current.etat);
      if (lu.ok) {
        courant.current = { ...courant.current, etat: lu.data, decalageMs: lu.data.decalageMs };
        setEtat(lu.data);
        setDecalage(lu.data.decalageMs);
        setCale(true);
        setHors(false);
      } else if (/introuvable/i.test(lu.message)) {
        courant.current.introuvable = true;
        setIntrouvable(true);
      } else {
        setHors(true);
      }
    })().finally(() => {
      enVol.current = null;
    });
    enVol.current = p;
    return p;
  }, [salleId]);

  useEffect(() => {
    let arret = false;
    let minuteur: ReturnType<typeof setTimeout> | undefined;
    const delai = () => {
      const { etat: e, decalageMs: d } = courant.current;
      if (e.session && e.session.statut !== "terminee") return delaiAvantLecture(clockDe(e.session), heureServeur(d));
      return typeof document !== "undefined" && document.hidden ? IDLE_MASQUE_MS : IDLE_MS;
    };
    const boucle = async () => {
      await rafraichir();
      if (arret || courant.current.introuvable) return;
      minuteur = setTimeout(boucle, delai());
    };
    // relit tout de suite quand l'onglet redevient visible
    const reveil = () => {
      if (document.hidden || arret || courant.current.introuvable) return;
      clearTimeout(minuteur);
      void boucle();
    };
    minuteur = setTimeout(boucle, 0);
    document.addEventListener("visibilitychange", reveil);
    return () => {
      arret = true;
      clearTimeout(minuteur);
      document.removeEventListener("visibilitychange", reveil);
    };
  }, [rafraichir]);

  const maintenant = useCallback(() => heureServeur(courant.current.decalageMs), []);
  return { etat, decalageMs, cale, hors, introuvable, maintenant, rafraichir };
}
