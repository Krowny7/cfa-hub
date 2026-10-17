import type { Tampon } from "@/lib/codex/calendrier";
import k from "./Calendrier.module.css";

// La veillée (J-7 à J-4, V3 §7.2) : sept tampons, un par jour de la dernière
// semaine, remplis les jours d'encre (10 questions ou plus) ; un jour à venir
// reste un cercle pointillé. Aucun compte à rebours : seulement les jours.

// noms écrits ici, pas par Intl : le serveur et le navigateur rendent la même chose (hydratation)
const COURTS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const LONGS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const date = (jour: string) => new Date(`${jour}T12:00:00Z`);
const court = (jour: string) => COURTS[date(jour).getUTCDay()];
const long = (jour: string) => {
  const d = date(jour);
  return `${LONGS[d.getUTCDay()]} ${d.getUTCDate() === 1 ? "1er" : d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
};

export function Veillee({ tampons }: { tampons: Tampon[] }) {
  const encre = tampons.filter((t) => t.encre).length;
  return (
    <section className={`card-quiet ${k.carte}`} aria-labelledby="veillee-titre">
      <p className={`t-micro ${k.sur}`}>La dernière semaine</p>
      <h2 id="veillee-titre" className={`font-brand ${k.titre}`}>
        La veillée
      </h2>
      <p className="t-small m-0">On entretient ce qui est acquis : un peu chaque jour, sans forcer.</p>
      <ol className={k.tampons} aria-label={`Un tampon par jour d'encre : ${encre} sur ${tampons.length}`}>
        {tampons.map((t) => {
          const etat = t.encre ? "encre" : t.aVenir ? "avenir" : "sec";
          const dit = t.encre ? "jour d'encre" : t.aVenir ? "à venir" : t.aujourdhui ? "pas encore d'encre" : "sans encre";
          return (
            <li key={t.jour} className={k.jour} data-etat={etat} data-ici={t.aujourdhui || undefined} aria-label={`${long(t.jour)}${t.aujourdhui ? " (aujourd'hui)" : ""} : ${dit}`}>
              <span className={k.rond} aria-hidden />
              <span className={k.jourNom} aria-hidden>
                {t.aujourdhui ? "auj." : court(t.jour)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
