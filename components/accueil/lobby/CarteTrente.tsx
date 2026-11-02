import Link from "next/link";
import { Clock, FileText, PenLine, Play, Zap } from "lucide-react";
import { ClassementTrente } from "@/components/accueil/lobby/ClassementTrente";
import { Bouton, SceauUni } from "@/components/accueil/lobby/Encre";
import type { CarteDefi, ClassementLobby } from "@/components/accueil/lobby/types";
import { Illustration } from "@/components/ui/Illustration";
import { LOBBY } from "@/lib/voice-accueil-lobby";
import s from "./Lobby.module.css";

// Le héros de l'accueil : « Les 30 du jour », une grande carte peinte (le
// bandeau du défi, un voile en dégradé), trois tuiles et le bouton d'encre
// « Rendre ma copie », avec le classement des 30 accolé à droite (Aujourd'hui |
// Hier). Quand les 30 ne sont pas jouables, les 5 du jour prennent la carte
// (sans classement) ; sans classement lisible, la carte n'a qu'une colonne.
// Trois états : à rendre, en cours (la copie en trente coches), rendue (le
// bouton passe à contour : l'encre est pour l'action qui reste à faire).
// `data-leonard="defi"` : le repère des répliques de Léonard. Composant serveur ;
// seul le classement est un îlot client.

const ID = "lobby-defi";

export function CarteTrente({ d, classement, className }: { d: CarteDefi; classement: ClassementLobby | null; className?: string }) {
  const cinq = d.format === "cinq";
  const V = cinq ? LOBBY.defi.cinq : LOBBY.defi.trente;
  const aFaire = d.etat !== "done";
  return (
    <section data-leonard="defi" aria-labelledby={ID} className={[s.carte, s.heros, !classement && s.herosSeul, className].filter(Boolean).join(" ")}>
      <div className={s.peint + " " + s.herosPeint}>
        <span className={s.fond} aria-hidden>
          {cinq ? <Illustration nom="accueil-bandeau" position="50% 50%" decorative eager /> : <Illustration nom="accueil-trente-du-jour" position="50% 40%" decorative eager className={s.cadreTrente} />}
        </span>
        <div className={s.herosHaut}>
          <p className={s.eyebrow + " " + s.eyebrowC}>
            <SceauUni clair>{cinq ? <Zap size={15} aria-hidden /> : <FileText size={15} aria-hidden />}</SceauUni>
            {V.surTitre}
          </p>
          <span className={s.puce}>
            <Clock size={14} aria-hidden />
            {d.statut}
          </span>
        </div>
        <div className={s.herosCorps}>
          <p className={s.herosDate}>
            {d.date} · {LOBBY.defi.etat[d.etat]}
          </p>
          <h2 id={ID} className={"font-brand " + s.herosTitre}>
            {V.titre}
          </h2>
          <p className={s.herosSous}>{V.sous}</p>
          {d.progression && (
            <div className={s.copie} role="img" aria-label={LOBBY.defi.progression(d.progression.faites, d.progression.total)}>
              <span className={s.pips} aria-hidden>
                {Array.from({ length: d.progression.total }, (_, i) => (
                  <i key={i} className={s.pip + (i < d.progression!.faites ? " " + s.pipOn : "")} />
                ))}
              </span>
              <b aria-hidden>
                {d.progression.faites}/{d.progression.total}
              </b>
            </div>
          )}
          <ul className={s.tuiles}>
            {d.tuiles.map((t) => (
              <li key={t.lib} className={s.tuile}>
                <b>{t.val}</b>
                <span>{t.lib}</span>
              </li>
            ))}
          </ul>
          <div className={s.herosActions}>
            {aFaire ? (
              <Bouton href={d.action.href} taille="gd" sur>
                {cinq ? <Play size={17} aria-hidden /> : <PenLine size={17} aria-hidden />}
                {d.action.libelle}
              </Bouton>
            ) : (
              <Link href={d.action.href} className={[s.contour, s.contourC, s.gd].join(" ")}>
                {d.action.libelle}
              </Link>
            )}
            {d.second && (
              <Link href={d.second.href} className={s.lienc}>
                {d.second.libelle} →
              </Link>
            )}
          </div>
        </div>
      </div>
      {classement && <ClassementTrente c={classement} />}
    </section>
  );
}
