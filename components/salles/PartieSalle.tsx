"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { poserTrait } from "@/components/adn/AnneauDuJourEvents";
import { EcranVs } from "@/components/arene/EcranVs";
import { PartieExamen } from "@/components/salles/PartieExamen";
import { usePresents } from "@/components/salles/presence";
import { VuePartie } from "@/components/salles/VuePartie";
import { effetsParDefaut, type Effets } from "@/components/salles/effets";
import { useHeureServeur } from "@/components/salles/anim";
import type { SuiviSalle } from "@/components/salles/useEtatSalle";
import { rendreCopie, repondreSalle } from "@/lib/salles/api";
import { estChronoGlobal, horlogeExamen, joueursPresents } from "@/lib/salles/examen";
import { clockDe, horlogeSession } from "@/lib/salles/logique";
import { chiffreDecompte, reponseVue, type ReponseOk } from "@/lib/salles/partie";
import type { CopieRendue, ReponseResultat } from "@/lib/salles/types";
import { createClient } from "@/lib/supabase/browser";
import { ARENE } from "@/lib/voice-arene";
import { PARTIE, SALLES } from "@/lib/voice-salles";
import { AnnonceRound } from "@/components/salles/AnnonceRound";
import type { RetourRound } from "@/components/salles/ActionsRound";
import { titreSession } from "@/lib/salles/partie";
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
//  - chrono global : rend ma copie (rendre_copie) et relit l'état tout de
//    suite, pour passer au débrief si j'étais le dernier à la rendre ;
//  - signale les moments forts à `effets` (sons, confettis, Léonard :
//    PLACEHOLDERS, voir effets.ts) ;
//  - relit l'état dès que la fin de partie tombe à l'horloge.
// La présentation est dans VuePartie (testée sans réseau). Au chrono global
// (correction à la fin, comme les 30 du jour), c'est PartieExamen : le serveur
// ne rend alors ni verdict ni correction avant la fin, et aucun effet « juste /
// faux » ne part pendant la partie.

export function PartieSalle({
  suivi,
  onArreter,
  onRejouer,
  onRetour,
  onLancerRound,
  onTerminerSerie,
  effets = effetsParDefaut,
  repondre,
  rendre,
}: {
  suivi: SuiviSalle;
  /** admin : arrête la partie */
  onArreter?: () => Promise<void>;
  /** admin : relance avec les mêmes réglages */
  onRejouer?: () => Promise<{ ok: boolean; erreur?: string }>;
  /** ferme l'écran de fin et revient au salon */
  onRetour?: () => void;
  /** admin, entre deux rounds : lance le suivant */
  onLancerRound?: () => Promise<RetourRound>;
  /** admin, entre deux rounds : s'arrête là */
  onTerminerSerie?: () => Promise<RetourRound>;
  effets?: Effets;
  /** aperçus : remplace l'appel au serveur */
  repondre?: (sessionId: string, position: number, rep: { choix: number } | { saisie: string }) => Promise<ReponseResultat>;
  /** aperçus : remplace l'appel au serveur pour rendre la copie */
  rendre?: (sessionId: string) => Promise<CopieRendue>;
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
        // le logo vivant de la barre du haut avance tout de suite, comme aux 30 du jour
        if (!r.deja) poserTrait(1);
        setLocales((l) => ({ ...l, [position]: r }));
        void rafraichir();
      }
      return r;
    },
    [ses, repondre, rafraichir],
  );

  const rendreMaCopie = useCallback(async (): Promise<CopieRendue> => {
    if (!ses) throw new Error("Partie introuvable.");
    const r = rendre ? await rendre(ses.id) : await rendreCopie((client.current ??= createClient()), ses.id);
    // relit tout de suite ; si la partie est finie (j'étais le dernier), une lecture déjà en vol
    // a pu partir avant la remise : on en relance une derrière, qui ouvre la correction
    void rafraichir().then(() => (r.terminee ? rafraichir() : undefined));
    return r;
  }, [ses, rendre, rafraichir]);

  // les moments forts, une fois chacun (réinitialisés à chaque nouvelle partie)
  const vus = useRef(new Set<string>());
  const sessionId = ses?.id ?? null;
  useEffect(() => {
    vus.current = new Set();
  }, [sessionId]);
  const global = estChronoGlobal(ses);
  const h = ses && t !== null && !global ? horlogeSession(clockDe(ses), t) : null;
  const hg = ses && t !== null && global ? horlogeExamen(ses, t) : null;
  const finLocale = global ? hg?.phase === "fin" : h?.phase === "fin";
  const chiffre = hg ? (hg.phase === "decompte" ? chiffreDecompte(hg.avantDebutMs) : null) : h?.phase === "decompte" ? chiffreDecompte(h.avantProchainMs ?? 0) : null;
  const premiereOuverte = hg ? hg.phase === "question" : h?.phase === "question" && h.index === 0;
  const verdictCourant = (() => {
    // chrono global : pas de verdict avant la fin (le serveur le masque)
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

  // chrono global : à la fin locale, le classement lu est encore celui de la partie (tout le
  // monde à 0 point) ; la place n'est connue qu'une fois la fin confirmée par le serveur
  const finConfirmee = !global || ses?.statut === "terminee";
  useEffect(() => {
    if (!finLocale || !ses) return;
    const moiLigne = etat.classement.find((l) => l.userId === etat.moi.userId);
    if (finConfirmee && !vus.current.has("fin")) {
      vus.current.add("fin");
      effets.surEvenement({ type: "fin", place: moiLigne?.rang ?? etat.monClassement?.rang ?? null, nbJoueurs: ses.nbJoueurs });
    }
    // la fin tombe à l'horloge avant que le serveur ne le dise : on relit tout de suite
    if (ses.statut !== "terminee") void rafraichir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finLocale, finConfirmee]);

  // chrono global : toutes les corrections arrivent à la fin ; s'il en manque, on relit (lecture
  // incrémentale à partir de la première correction manquante) en plus du rythme de useEtatSalle
  const nbCorrections = etat.corrections.length;
  const manqueCorrections = global && finLocale && ses ? nbCorrections < ses.nb : false;
  const statut = ses?.statut ?? null;
  useEffect(() => {
    if (!manqueCorrections) return;
    const id = setTimeout(() => void rafraichir(), 1200);
    return () => clearTimeout(id);
  }, [manqueCorrections, nbCorrections, statut, rafraichir]);

  // ma ligne pour le classement : un objet stable, pour que les lignes ne se redessinent pas à chaque tic
  const presents = usePresents();
  const moiMembre = etat.membres.find((m) => m.userId === etat.moi.userId);
  const moiId = etat.moi.userId;
  const moiNom = moiMembre?.username ?? null;
  const moiAvatar = moiMembre?.avatarUrl ?? null;
  const moi = useMemo(() => ({ userId: moiId, username: moiNom, avatarUrl: moiAvatar }), [moiId, moiNom, moiAvatar]);

  if (!ses) return null;

  // avant le montage, ou tant que l'horloge n'est pas calée sur celle du serveur
  if (t === null || !cale) {
    return (
      <section className={s.panneau} aria-label={titreSession(ses)}>
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

  if (global) {
    return (
      <PartieExamen
        session={ses}
        items={etat.items}
        corrections={etat.corrections}
        mesReponses={etat.mesReponses}
        locales={locales}
        classement={etat.classement}
        monClassement={etat.monClassement}
        membres={etat.membres}
        moi={moi}
        estAdmin={etat.moi.estAdmin}
        t={t}
        repondre={envoyer}
        rendreCopie={rendreMaCopie}
        onArreter={onArreter}
        onRejouer={onRejouer}
        onRetour={onRetour}
        serie={etat.serie}
        onLancerRound={onLancerRound}
        onTerminerSerie={onTerminerSerie}
      />
    );
  }

  return (
    <>
      {h?.phase === "decompte" && (ses.params.round ?? 1) > 1 && <AnnonceRound round={ses.params.round ?? 1} rounds={ses.params.rounds ?? 1} />}
      {h?.phase === "decompte" && (ses.params.round ?? 1) <= 1 && <EcranVs cle={`salle:${ses.id}`} joueurs={joueursPresents(etat.membres, presents, etat.moi.userId).map((m) => ({ id: m.userId, pseudo: m.username, photo: m.avatarUrl, elo: m.elo }))} moiId={etat.moi.userId} hud={ARENE.hudSalle(etat.membres.length)} />}
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
        serie={etat.serie}
        onLancerRound={onLancerRound}
        onTerminerSerie={onTerminerSerie}
      />
    </>
  );
}
