import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { EnteteLobby } from "@/components/accueil/lobby/types";
import { LOBBY } from "@/lib/voice-accueil-lobby";
import s from "./Lobby.module.css";

// L'en-tête de l'accueil (demande de l'utilisateur, qui prime sur la maquette) :
// « Bon retour, Theo » à gauche, « J-110 avant l'examen · 18 février 2027 » à
// droite, et RIEN d'autre en haut (ni l'heure du gel, ni la date du jour, ni
// sur-titre). Le salut est l'unique h1 de la page : les cartes sont en h2.
// Sans date d'examen, la droite propose de la fixer ; une fois l'examen passé,
// elle le dit. Composant serveur, aucun hook.

export function Entete({ e }: { e: EnteteLobby }) {
  const E = LOBBY.entete;
  return (
    <header className={s.entete}>
      <h1 className={s.salut}>{e.salut}</h1>
      {e.jn !== null && e.dateExamen ? (
        <p className={s.examen}>
          <b className={"font-brand " + s.examenJ}>{e.jn === 0 ? E.jourJ : `J-${e.jn}`}</b>
          <span className={s.examenTexte}>
            {e.jn === 0 ? null : <b>{E.avant}</b>}
            {e.jn === 0 ? e.dateExamen : ` · ${e.dateExamen}`}
          </span>
        </p>
      ) : e.dateExamen ? (
        <p className={s.examenTexte}>
          <b>{E.passe}</b> · {e.dateExamen}
        </p>
      ) : (
        <Link href={E.fixerHref} className={s.fixer}>
          {E.fixer} <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </header>
  );
}
