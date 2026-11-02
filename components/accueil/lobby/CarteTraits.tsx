import { CalendarDays, Flame, PenLine, Star } from "lucide-react";
import { AnneauDuJour } from "@/components/adn/AnneauDuJour";
import { SceauTenu } from "@/components/accueil/SceauTenu";
import { Bouton, Phrase, SceauUni } from "@/components/accueil/lobby/Encre";
import type { CarteTraitsLobby } from "@/components/accueil/lobby/types";
import { LOBBY } from "@/lib/voice-accueil-lobby";
import s from "./Lobby.module.css";

// Tes traits du jour : l'anneau du jour (celui du logo, qui se trace avec les
// réponses) et le titre vivant, rien d'autre (demande de l'utilisateur : peu de
// texte, plus de place au logo). La petite carte n'a ni la phrase d'explication
// ni la liste du bas (série d'encre, joker de la semaine, J-n) : ces données
// restent dans CarteTraitsLobby et la grande variante les affiche encore. Le
// sceau « TENU » se pose quand l'objectif est atteint (le vrai coup de tampon,
// une fois par jour) ; avant, un sceau en pointillé dit à combien de traits il
// se pose. Le bouton d'encre n'arrive qu'après les 30 et les 5
// (CarteTraitsLobby.action). `data-leonard="anneau"` : le repère des répliques
// de Léonard. Un seul anneau par page (le masque SVG porte un id fixe).
// Composant serveur ; seul SceauTenu est un îlot client.

const ID = "lobby-traits";

/** L'anneau et, au survol ou au focus (clavier, toucher), une bulle : les questions et les calculs du jour (demande de l'utilisateur). */
function Anneau({ t, taille }: { t: CarteTraitsLobby; taille: number }) {
  return (
    <div data-leonard="anneau" className={"self-center " + s.anneauInfo} tabIndex={0} role="img" aria-label={t.detail.aria}>
      {/* le sceau, lui, est posé dans l'en-tête de la carte : l'ouverture de l'anneau reste vide */}
      <AnneauDuJour repondues={t.repondues} objectif={t.objectif} size={taille} sceau={t.tenu ? <span aria-hidden /> : undefined} />
      <span className={s.bulle} aria-hidden>
        {t.detail.texte}
      </span>
    </div>
  );
}

function Lignes({ t }: { t: CarteTraitsLobby }) {
  const T = LOBBY.traits;
  if (!t.serie && !t.joker && t.jn === null) return null;
  return (
    <ul className={s.kvl + " " + s.traitsPied}>
      {t.serie && (
        <li>
          <span className={s.ic} aria-hidden>
            <Flame size={14} />
          </span>
          <span>{T.serie}</span>
          <span className={s.teteEntre}>
            <b className={s.mono}>{T.jours(t.serie.jours)}</b>
            {t.serie.mult && <span className={s.feuille}>{t.serie.mult}</span>}
          </span>
        </li>
      )}
      {t.joker && (
        <li>
          <span className={s.ic} aria-hidden>
            <Star size={14} />
          </span>
          <span>{T.joker}</span>
          <span className={s.etat}>{t.joker === "disponible" ? T.jokerDispo : T.jokerPris}</span>
        </li>
      )}
      {t.jn !== null && (
        <li>
          <span className={s.ic} aria-hidden>
            <CalendarDays size={14} />
          </span>
          <span>{T.examen}</span>
          <b className={s.mono}>{t.jn === 0 ? LOBBY.entete.jourJ : `J-${t.jn}`}</b>
        </li>
      )}
    </ul>
  );
}

/** Le sceau de l'en-tête : le vrai « TENU » une fois la journée tenue, un sceau en pointillé avant. */
function Sceau({ t }: { t: CarteTraitsLobby }) {
  const T = LOBBY.traits;
  return t.tenu ? (
    <span className={s.sceauTenu}>
      <SceauTenu day={t.jour} />
    </span>
  ) : (
    <span className={"font-brand " + s.tenu} title={T.sceauTitre(t.objectif)} aria-label={T.sceauAria(t.objectif)}>
      {T.sceau}
    </span>
  );
}

export function CarteTraits({ t, className }: { t: CarteTraitsLobby; className?: string }) {
  const T = LOBBY.traits;
  return (
    <section className={[s.carte, s.petite, className].filter(Boolean).join(" ")} aria-labelledby={ID}>
      <header className={s.teteEntre}>
        <div className={s.tete}>
          <SceauUni>
            <PenLine size={15} aria-hidden />
          </SceauUni>
          <div className={s.teteTexte}>
            <p className={s.eyebrow}>{T.surTitre}</p>
            <h2 id={ID} className={"font-brand " + s.ttl}>
              {T.titre}
            </h2>
          </div>
        </div>
        <Sceau t={t} />
      </header>
      <div className={s.traitsCorps}>
        <Anneau t={t} taille={156} />
        <p className={s.traitsTitre}>{t.titre}</p>
      </div>
      {t.action && (
        <Bouton href={t.action.href} taille="sm">
          <PenLine size={15} aria-hidden />
          {t.action.libelle}
        </Bouton>
      )}
    </section>
  );
}

/**
 * Ni les 30 ni les 5 ne sont jouables : les traits du jour prennent le héros,
 * avec le grand anneau (170 px). Même contenu que la petite carte, autre mise en page.
 */
export function CarteTraitsGrande({ t, className }: { t: CarteTraitsLobby; className?: string }) {
  const T = LOBBY.traits;
  return (
    <section className={[s.carte, s.traitsGrand, className].filter(Boolean).join(" ")} aria-labelledby={ID}>
      <div className={s.traitsGrandTexte}>
        <header className={s.tete}>
          <SceauUni>
            <PenLine size={15} aria-hidden />
          </SceauUni>
          <p className={s.eyebrow}>{T.titre}</p>
        </header>
        <h2 id={ID} className={"font-brand " + s.traitsGrandTitre}>
          {t.titre}
        </h2>
        <p className={s.st}>
          <Phrase segments={t.phrase} />
        </p>
        {t.action && (
          <Bouton href={t.action.href} taille="gd">
            <PenLine size={17} aria-hidden />
            {t.action.libelle}
          </Bouton>
        )}
        <Lignes t={t} />
      </div>
      <div className={s.teteEntre}>
        <Anneau t={t} taille={170} />
        <Sceau t={t} />
      </div>
    </section>
  );
}
