"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VuePartie } from "@/components/salles/VuePartie";
import { effetsParDefaut, type Effets } from "@/components/salles/effets";
import { useHeureServeur } from "@/components/salles/anim";
import type { SuiviSalle } from "@/components/salles/useEtatSalle";
import { repondreSalle } from "@/lib/salles/api";
import { clockDe, horlogeSession } from "@/lib/salles/logique";
import { chiffreDecompte, reponseVue, type ReponseOk } from "@/lib/salles/partie";
import type { ReponseResultat } from "@/lib/salles/types";
import { createClient } from "@/lib/supabase/browser";
import { PARTIE, SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";
import p from "./Partie.module.css";

// L'écran de partie, branché. SalleVue l'affiche à la place du salon tant
// qu'une partie court (et, après la dernière question, jusqu'à « Retour au
// salon »). Il reçoit le suivi de la salle (useEtatSalle : l'état relu toutes
// les 2 à 3 s, l'horloge calée sur celle du serveur) et :
//  - fait tourner l'heure du serveur plusieurs fois par seconde (le rendu
//    n'en lit aucune avant le montage : pas d'erreur d'hydratation) ;
//  - envoie ma réponse (repondre_salle), garde ce que le serveur me rend
//    (verdict et correction tout de suite) et relit l'état ;
//  - signale les moments forts à `effets` (sons, confettis, Léonard :
//    PLACEHOLDERS, voir effets.ts) ;
//  - relit l'état dès que la fin de partie tombe à l'horloge.
// La présentation est dans VuePartie (testée sans réseau).

export function PartieSalle({
  suivi,
  onArreter,
  onRejouer,
  onRetour,
  effets = effetsParDefaut,
  repondre,
}: {
  suivi: SuiviSalle;
  /** admin : arrête la partie */
  onArreter?: () => Promise<void>;
  /** admin : relance avec les mêmes réglages */
  onRejouer?: () => Promise<{ ok: boolean; erreur?: string }>;
  /** ferme l'écran de fin et revient au salon */
  onRetour?: () => void;
  effets?: Effets;
  /** aperçus : remplace l'appel au serveur */
  repondre?: (sessionId: string, position: number, rep: { choix: number } | { saisie: string }) => Promise<ReponseResultat>;
}) {
  const { etat, rafraichir, maintenant, cale } = suivi;
  const ses = etat.session;
  const t = useHeureServeur(maintenant);
  const [locales, setLocales] = useState<Record<number, ReponseOk | undefined>>({});
  const client = useRef<ReturnType<typeof createClient> | null>(null);

  const envoyer = useCallback(
    async (position: number, rep: { choix: number } | { saisie: string }): Promise<ReponseResultat> => {
      if (!ses) throw new Error("Partie introuvable.");
      const r = repondre ? await repondre(ses.id, position, rep) : await repondreSalle((client.current ??= createClient()), ses.id, position, rep);
      if (r.ok) {
        setLocales((l) => ({ ...l, [position]: r }));
        void rafraichir();
      }
      return r;
    },
    [ses, repondre, rafraichir],
  );

  // les moments forts, une fois chacun (réinitialisés à chaque nouvelle partie)
  const vus = useRef(new Set<string>());
  const sessionId = ses?.id ?? null;
  useEffect(() => {
    vus.current = new Set();
  }, [sessionId]);
  const h = ses && t !== null ? horlogeSession(clockDe(ses), t) : null;
  const finLocale = h?.phase === "fin";
  const chiffre = h?.phase === "decompte" ? chiffreDecompte(h.avantProchainMs ?? 0) : null;
  const premiereOuverte = h?.phase === "question" && h.index === 0;
  const verdictCourant = (() => {
    if (!h || (h.phase !== "question" && h.phase !== "revelation")) return null;
    const r = reponseVue(h.index, locales, etat.mesReponses);
    return { index: h.index, phase: h.phase, juste: r ? r.juste : null, points: r?.points ?? 0 };
  })();
  const clef = verdictCourant ? `${verdictCourant.index}-${verdictCourant.phase}-${verdictCourant.juste}` : "";

  useEffect(() => {
    const une = (cle: string, f: () => void) => {
      if (vus.current.has(cle)) return;
      vus.current.add(cle);
      f();
    };
    if (chiffre) une(`decompte-${chiffre}`, () => effets.surEvenement({ type: "decompte", chiffre }));
    if (premiereOuverte) une("go", () => effets.surEvenement({ type: "go" }));
    if (verdictCourant) {
      const { index, phase, juste, points } = verdictCourant;
      if (juste === true) une(`${index}-juste`, () => effets.surEvenement({ type: "juste", points }));
      else if (juste === false) une(`${index}-faux`, () => effets.surEvenement({ type: "faux" }));
      else if (phase === "revelation") une(`${index}-sans`, () => effets.surEvenement({ type: "temps_ecoule" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiffre, premiereOuverte, clef]);

  useEffect(() => {
    if (!finLocale || !ses) return;
    const moiLigne = etat.classement.find((l) => l.userId === etat.moi.userId);
    if (!vus.current.has("fin")) {
      vus.current.add("fin");
      effets.surEvenement({ type: "fin", place: moiLigne?.rang ?? etat.monClassement?.rang ?? null, nbJoueurs: ses.nbJoueurs });
    }
    // la fin tombe à l'horloge avant que le serveur ne le dise : on relit tout de suite
    if (ses.statut !== "terminee") void rafraichir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finLocale]);

  // ma ligne pour le classement : un objet stable, pour que les lignes ne se redessinent pas à chaque tic
  const moiMembre = etat.membres.find((m) => m.userId === etat.moi.userId);
  const moiId = etat.moi.userId;
  const moiNom = moiMembre?.username ?? null;
  const moiAvatar = moiMembre?.avatarUrl ?? null;
  const moi = useMemo(() => ({ userId: moiId, username: moiNom, avatarUrl: moiAvatar }), [moiId, moiNom, moiAvatar]);

  if (!ses) return null;

  // avant le montage, ou tant que l'horloge n'est pas calée sur celle du serveur
  if (t === null || !cale) {
    return (
      <section className={s.panneau} aria-label={SALLES.partieTitre(ses.numero)}>
        <div className={p.synchro} role="status">
          <span className={s.barres} aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span>{PARTIE.synchro}</span>
        </div>
      </section>
    );
  }

  return (
    <VuePartie
      session={ses}
      items={etat.items}
      corrections={etat.corrections}
      mesReponses={etat.mesReponses}
      locales={locales}
      classement={etat.classement}
      monClassement={etat.monClassement}
      moi={moi}
      estAdmin={etat.moi.estAdmin}
      t={t}
      repondre={envoyer}
      onArreter={onArreter}
      onRejouer={onRejouer}
      onRetour={onRetour}
    />
  );
}
