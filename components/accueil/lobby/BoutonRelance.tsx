"use client";

import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { RIV } from "@/lib/voice-accueil-lobby-rival";
import { relancerRival } from "./actions-rival";
import s from "./Rival.module.css";

// « Relancer Marie » : le bouton secondaire (en contour, jamais d'encre) de la
// carte « Ton rival ». Un clic envoie la relance (actions-rival.ts) ; le bouton
// devient « Relance envoyée » et dit ce que l'autre verra. Îlot client : il ne
// reçoit que des textes et un identifiant, déjà écrits par le serveur (aucun
// formatage de date ni de nombre dans le navigateur). Il rend un fragment : le
// bouton (ou l'état) et la note se posent comme enfants de la rangée d'actions
// de la carte.

type Etat = "pret" | "envoi" | "fait" | "limite" | "erreur";

export function BoutonRelance({ id, nom, prenom, apercu, envoyee }: { id: string; nom: string; prenom: string; apercu: string; envoyee: boolean }) {
  const [etat, setEtat] = useState<Etat>(envoyee ? "fait" : "pret");

  async function relancer() {
    if (etat === "envoi" || etat === "fait") return;
    setEtat("envoi");
    try {
      const r = await relancerRival(id);
      setEtat(r === "ok" || r === "deja" ? "fait" : r === "limite" ? "limite" : "erreur");
    } catch {
      setEtat("erreur");
    }
  }

  const mot = RIV.verra(prenom, apercu);
  const probleme = etat === "limite" ? RIV.limite : etat === "erreur" ? RIV.indisponible : null;
  return (
    <>
      {etat === "fait" ? (
        <span className={s.etat}>
          <Check size={15} strokeWidth={2.4} aria-hidden />
          {RIV.envoyee}
        </span>
      ) : (
        <button type="button" className={s.plus} onClick={relancer} disabled={etat === "envoi"} aria-label={RIV.relancerAria(nom)} title={mot}>
          <Bell size={15} aria-hidden />
          {etat === "envoi" ? RIV.envoi : RIV.relancer(prenom)}
        </button>
      )}
      {/* la note visible, et la même annonce pour un lecteur d'écran (la zone existe avant le message) */}
      {etat === "fait" && (
        <p className={s.note} aria-hidden>
          {mot}
        </p>
      )}
      {probleme && (
        <p className={s.note} aria-hidden>
          {probleme}
        </p>
      )}
      <span className={s.sr} role="status" aria-live="polite">
        {etat === "fait" ? `${RIV.envoyee}. ${mot}` : (probleme ?? "")}
      </span>
    </>
  );
}
