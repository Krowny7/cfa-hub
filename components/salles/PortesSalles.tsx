import Link from "next/link";
import { SOUS_AFFRONTER } from "@/lib/voice-affronter-sous";
import { ArriveeUneFois } from "@/components/ArriveeUneFois";
import s from "./PortesSalles.module.css";

// La rangée des portes de /salles (direction « le lieu, puis l'objet », lot 4 du 2026-11-13) : une
// porte d'ébène par salle, posées sur une même ligne de sol. Le moment est écrit sur la plaque de la
// porte : « EN DIRECT » en vert quand une partie tourne, « SALON OUVERT » quand quelqu'un attend,
// « PERSONNE » sinon ; la lumière passe sous la porte et, en direct, un filet vert entre les battants
// (une image fixe, rien en boucle). Les présents écrits en Dela sur les battants (« 3 ICI » ; rien dans
// une salle vide), le nom dessous. La première salle en direct est avancée et entourée à l'encre de la
// palette. Une salle publique où tu n'es pas encore porte « À rejoindre » (sa page offre de la rejoindre).
// Présentation seule : aucune requête, aucune logique de jeu (les données viennent de la page).

const S = SOUS_AFFRONTER.salles;

export type PorteSalle = {
  id: string;
  nom: string;
  enCours: boolean;
  presents: number;
  /** une salle publique où tu n'es pas encore */
  aRejoindre: boolean;
};

export function PortesSalles({ portes }: { portes: PorteSalle[] }) {
  const conseil = portes.find((p) => p.enCours)?.id ?? null;
  return (
    <section className={s.vitrine} aria-label={S.choisir}>
      <ArriveeUneFois className={s.arrivee}>
        <ul className={s.rangee}>
          {portes.map((p, i) => {
            const moment = p.enCours ? "direct" : p.presents > 0 ? "salon" : "vide";
            const etat = p.enCours ? S.enDirect : p.presents > 0 ? S.salonOuvert : S.endormie;
            return (
              <li key={p.id} className={s.place} data-conseil={conseil === p.id ? "1" : undefined} style={{ "--i": i } as React.CSSProperties}>
                <Link href={`/salles/${p.id}`} className={s.lien + " rl-presse"} aria-label={`${S.entrer(p.nom)} · ${etat} · ${S.ici(p.presents)}${p.aRejoindre ? ` · ${S.aRejoindre}` : ""}`}>
                  <span className={s.porte} data-moment={moment}>
                    {moment === "direct" && <span className={s.fente} aria-hidden />}
                    <span className={s.plaque}>
                      <i aria-hidden />
                      {etat}
                    </span>
                    {p.presents > 0 ? (
                      <span className={s.compte} aria-hidden>
                        <b>{p.presents}</b>
                        <small>{S.iciCourt}</small>
                      </span>
                    ) : (
                      <span aria-hidden />
                    )}
                    <span className={s.poignees} aria-hidden />
                  </span>
                  <span className={s.lumiere} data-moment={moment} aria-hidden />
                  {conseil === p.id && (
                    <svg className={s.entoure} viewBox="0 0 120 160" preserveAspectRatio="none" aria-hidden>
                      <use href="#rl-cercle-main" />
                    </svg>
                  )}
                  <span className={s.nom}>{p.nom}</span>
                  {p.aRejoindre && <span className={s.sous}>{S.aRejoindre}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </ArriveeUneFois>
      <div className={s.sol} aria-hidden />
    </section>
  );
}
