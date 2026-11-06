"use client";

import { useEffect, useState } from "react";
import { RideauFin, type GagnantFin } from "@/components/arene/RideauFin";
import { lireMoi } from "@/lib/arene/donnees";
import { examenReussi, gagnantSalle } from "@/lib/arene/regles";
import type { SalleClassementLigne, SalleSession } from "@/lib/salles/types";
import { createClient } from "@/lib/supabase/browser";
import { ARENE } from "@/lib/voice-arene";

// Le rideau de fin d'une Salle et celui d'un examen blanc officiel : qui gagne, et
// ce qu'on écrit sous sa vidéo (le rideau lui-même : RideauFin).

/** Le bouton ne reste jamais inerte : passé ce délai, le résultat au clic. */
const ATTENTE_MS = 2500;
const pct = (bonnes: number, total: number) => ARENE.pct(Math.round((100 * bonnes) / Math.max(1, total)));

/**
 * Une partie de Salle : le vainqueur du classement ; seul dans la partie, le
 * joueur s'il réussit (70 %). Cet écran n'est jamais rendu par le serveur du site
 * (PartieSalle attend l'heure du serveur) : `serveur="resultat"` garde lisibles
 * les tests de rendu, sans navigateur.
 */
export function RideauSalle({ session, classement, titre, children }: { session: Pick<SalleSession, "id" | "nb" | "nbJoueurs" | "params">; classement: SalleClassementLigne[]; titre?: string; children: React.ReactNode }) {
  const nb = session.nb;
  const id = gagnantSalle(classement, nb, session.nbJoueurs);
  const ligne = classement.find((l) => l.userId === id) ?? null;
  const second = classement.find((l) => l.userId !== id) ?? null;
  const pseudo = ligne?.username?.trim();
  const suite = !ligne ? null : session.nbJoueurs <= 1 ? pct(ligne.bonnes, nb) : second ? ARENE.scoreAdverse(second.username?.trim() || ARENE.joueur, second.bonnes, nb) : null;
  const gagnant: GagnantFin | null = ligne && pseudo ? { id: ligne.userId, pseudo, photo: ligne.avatarUrl, score: ARENE.score(ligne.bonnes, nb), ligne: suite } : null;
  return (
    <RideauFin cle={`salle:${session.id}`} kicker={session.params.mock ? ARENE.kickerExamen(nb) : ARENE.kickerSalle(nb)} gagnant={gagnant} serveur="resultat" titre={titre}>
      {children}
    </RideauFin>
  );
}

/** Un examen blanc officiel, joué seul : sa propre scène s'il réussit (70 %), sinon le résultat au clic. `actif` : la copie vient d'être rendue. */
export function RideauExamen({ cle, actif, score, total, children }: { cle: string; actif: boolean; score: number; total: number; children: React.ReactNode }) {
  const reussi = examenReussi(score, total);
  const [moi, setMoi] = useState<{ id: string; pseudo: string; photo: string | null } | null>(null);
  const [pret, setPret] = useState(!reussi);

  useEffect(() => {
    if (!actif || !reussi) return;
    let abandon = false;
    void (async () => {
      let m: Awaited<ReturnType<typeof lireMoi>> = null;
      try {
        m = await Promise.race([lireMoi(createClient()), new Promise<null>((fin) => setTimeout(() => fin(null), ATTENTE_MS))]);
      } catch {
        // pas de client : le résultat au clic
      }
      if (abandon) return;
      setMoi(m);
      setPret(true);
    })();
    return () => {
      abandon = true;
    };
  }, [actif, reussi]);

  const gagnant: GagnantFin | null = reussi && moi ? { ...moi, score: ARENE.score(score, total), ligne: pct(score, total) } : null;
  return (
    <RideauFin cle={cle} kicker={ARENE.kickerExamen(total)} gagnant={gagnant} actif={actif} pret={pret}>
      {children}
    </RideauFin>
  );
}
