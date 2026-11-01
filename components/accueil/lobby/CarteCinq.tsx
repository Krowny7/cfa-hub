import { Play, Zap } from "lucide-react";
import { Bouton, Contour, Phrase, SceauUni } from "@/components/accueil/lobby/Encre";
import type { CarteCinqLobby } from "@/components/accueil/lobby/types";
import { nombre } from "@/lib/voice";
import { LOBBY } from "@/lib/voice-accueil-lobby";
import s from "./Lobby.module.css";

// Les 5 du jour : le défi éclair classé, une petite carte dense. Cinq cases (vides
// à jouer, pleines une fois répondues, noires pour les justes), le nombre de
// joueurs et la meilleure copie, un seul bouton : d'encre tant qu'il reste à
// jouer, à contour une fois les 5 rendues. Couleurs inversées (carte sombre,
// demande de l'utilisateur) : sceau, cases et boutons dans leur version claire.
// Composant serveur.

const ID = "lobby-cinq";

export function CarteCinq({ c, className }: { c: CarteCinqLobby; className?: string }) {
  const C = LOBBY.cinq;
  const justes = c.cases.filter((x) => x === "juste").length;
  const repondues = c.cases.filter((x) => x !== null).length;
  return (
    <section className={[s.carte, s.petite, s.inverse, className].filter(Boolean).join(" ")} aria-labelledby={ID}>
      <header className={s.tete}>
        <SceauUni clair>
          <Zap size={15} aria-hidden />
        </SceauUni>
        <div className={s.teteTexte}>
          <p className={s.eyebrow + " " + s.eyebrowC}>{C.surTitre}</p>
          <h2 id={ID} className={"font-brand " + s.ttl}>
            {C.titre}
          </h2>
        </div>
      </header>
      <div className={s.cinqRang}>
        <span className={s.cases} role="img" aria-label={C.caseAria(c.etat, justes, c.cases.length, repondues)}>
          {c.cases.map((x, i) => (
            <i key={i} className={s.case5 + (x === "juste" ? " " + s.case5Juste : x === "faite" ? " " + s.case5Faite : "")} />
          ))}
        </span>
        <p className={s.mono + " " + s.cinqTexte}>
          <b>{nombre(c.joueurs)}</b> {C.joueurs(c.joueurs)}
          {c.meilleur && (
            <>
              <br />
              {C.meilleur} <b>{c.meilleur}</b>
            </>
          )}
        </p>
      </div>
      {c.ligne && (
        <p className={s.cinqLigne}>
          <Phrase segments={c.ligne} />
        </p>
      )}
      {c.etat === "done" ? (
        <Contour href={c.action.href} className={s.sm + " " + s.contourC}>
          {c.action.libelle}
        </Contour>
      ) : (
        <Bouton href={c.action.href} taille="sm" sur>
          <Play size={15} aria-hidden />
          {c.action.libelle}
        </Bouton>
      )}
    </section>
  );
}
