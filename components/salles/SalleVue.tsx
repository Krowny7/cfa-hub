"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PartieSalle } from "@/components/salles/PartieSalle";
import { Reglages, type RetourLancement } from "@/components/salles/Reglages";
import { SalonView, type ActionsSalon } from "@/components/salles/SalonView";
import { Stage } from "@/components/salles/Stage";
import { useEtatSalle } from "@/components/salles/useEtatSalle";
import { lancerPartie } from "@/app/salles/actions";
import { arreterSession, getQuestionsDisponibles, messageErreurSalle, modifierSalle, quitterSalle, supprimerSalle } from "@/lib/salles/api";
import { finRecente, paramsPourRejouer } from "@/lib/salles/partie";
import type { EtatSalle, SalleParams, SalleSource } from "@/lib/salles/types";
import { createClient } from "@/lib/supabase/browser";
import { REGLAGES, SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";

// La salle, branchée : suit l'état en direct (useEtatSalle, une lecture toutes
// les 2 à 3 s), donne au salon ses données et ses actions (quitter, supprimer,
// publique / privée), le formulaire de réglages à l'admin (le lancement passe
// par l'action serveur lancerPartie, qui tire les calculs) et, tant qu'une
// partie court, l'écran de partie (PartieSalle) à la place du salon. À la fin
// de la partie, cet écran (podium, bilan) reste affiché jusqu'à « Retour au
// salon » — pour qui l'a vue se jouer, ou pour qui arrive dans les 10 minutes
// qui suivent ; « Rejouer » (admin) relance avec les mêmes réglages.
// La page serveur (app/salles/[id]/page.tsx) donne le premier état.

export function SalleVue({ salleId, initial }: { salleId: string; initial: EtatSalle }) {
  const router = useRouter();
  const suivi = useEtatSalle(salleId, initial);
  const client = useRef<SupabaseClient | null>(null);
  const sb = useCallback(() => (client.current ??= createClient()), []);
  const { etat, rafraichir } = suivi;
  // la partie vue en cours pendant cette visite, et la dernière dont on a fermé l'écran de fin
  const [vueEnCours, setVueEnCours] = useState<string | null>(null);
  const [fermee, setFermee] = useState<string | null>(null);
  const idSession = etat.session?.id ?? null;
  const enCours = etat.session !== null && etat.session.statut !== "terminee";
  useEffect(() => {
    if (enCours && idSession) setVueEnCours(idSession);
  }, [enCours, idSession]);

  const chargerDispos = useCallback(
    async (source: SalleSource) => {
      const r = await getQuestionsDisponibles(sb(), source);
      return r.ok ? r.data : null;
    },
    [sb],
  );

  const onLancer = useCallback(
    async (params: SalleParams): Promise<RetourLancement> => {
      const r = await lancerPartie(salleId, params);
      if (!r.ok) return { ok: false, erreur: r.erreur };
      await rafraichir();
      return { ok: true, message: r.manque ? REGLAGES.lanceeCourte(r.nb) : REGLAGES.lancee };
    },
    [salleId, rafraichir],
  );

  const actions: ActionsSalon = useMemo(
    () => ({
      quitter: async () => {
        try {
          await quitterSalle(sb(), salleId);
        } catch (e) {
          window.alert(messageErreurSalle(e));
          return;
        }
        router.push("/classement");
        router.refresh();
      },
      supprimer: async () => {
        try {
          await supprimerSalle(sb(), salleId);
        } catch (e) {
          window.alert(messageErreurSalle(e));
          return;
        }
        router.push("/classement");
        router.refresh();
      },
      basculerVisibilite: async () => {
        try {
          await modifierSalle(sb(), salleId, { publique: !etat.salle.publique });
        } catch (e) {
          window.alert(messageErreurSalle(e));
          return;
        }
        await rafraichir();
      },
    }),
    [sb, salleId, router, etat.salle.publique, rafraichir],
  );

  // « Rejouer » : les mêmes réglages, sans le décompte des tirages de la partie précédente
  const rejouer = useCallback(async (): Promise<{ ok: boolean; erreur?: string }> => {
    if (!etat.session) return { ok: false, erreur: "Aucune partie à rejouer." };
    const r = await onLancer(paramsPourRejouer(etat.session.params));
    return r.ok ? { ok: true } : { ok: false, erreur: r.erreur };
  }, [etat.session, onLancer]);

  const arreter = useCallback(async () => {
    try {
      await arreterSession(sb(), salleId);
    } catch (e) {
      window.alert(messageErreurSalle(e));
    }
    await rafraichir();
  }, [sb, salleId, rafraichir]);

  if (suivi.introuvable) {
    return (
      <Stage>
        <p className={s.surtitre}>{SALLES.salonKicker}</p>
        <h1 className={s.nomSalle}>{SALLES.introuvable}</h1>
        <p className={s.sous}>{SALLES.introuvableTexte}</p>
        <div className={s.piedActions}>
          <Link href="/classement" className={s.btn}>
            {SALLES.retourSalles}
          </Link>
        </div>
      </Stage>
    );
  }

  const session = etat.session;
  const active = enCours;
  const finAffichee = session !== null && session.statut === "terminee" && fermee !== session.id && (vueEnCours === session.id || finRecente(session.finAt, etat.serverNow));
  const partieAffichee = session !== null && (active || finAffichee);
  return (
    <SalonView
      donnees={etat}
      hors={suivi.hors}
      actions={actions}
      reglages={etat.moi.estAdmin ? <Reglages initial={session ? session.params : null} chargerDispos={chargerDispos} onLancer={onLancer} desactive={active} /> : null}
      partie={
        partieAffichee && session ? (
          <PartieSalle
            key={session.id}
            suivi={suivi}
            onArreter={etat.moi.estAdmin ? arreter : undefined}
            onRejouer={etat.moi.estAdmin ? rejouer : undefined}
            onRetour={() => setFermee(session.id)}
          />
        ) : null
      }
    />
  );
}
