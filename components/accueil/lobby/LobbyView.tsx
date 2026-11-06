import { AnneauDuJourSync } from "@/components/adn/AnneauDuJourSync";
import { CelebrationSerie } from "@/components/serie/CelebrationSerie";
import { BandeGrandeSalle } from "@/components/accueil/lobby/BandeGrandeSalle";
import { BandeVainqueur } from "@/components/accueil/lobby/BandeVainqueur";
import { CarnetJours } from "@/components/accueil/lobby/CarnetJours";
import { CarteCinq } from "@/components/accueil/lobby/CarteCinq";
import { CarteRang } from "@/components/accueil/lobby/CarteRang";
import { CarteTraits, CarteTraitsGrande } from "@/components/accueil/lobby/CarteTraits";
import { CarteTrente } from "@/components/accueil/lobby/CarteTrente";
import { DuNouveau } from "@/components/accueil/lobby/DuNouveau";
import { EnDirect } from "@/components/accueil/lobby/EnDirect";
import { PAL } from "@/components/accueil/lobby/Encre";
import { Entete } from "@/components/accueil/lobby/Entete";
import { PersoVainqueur } from "@/components/accueil/lobby/PersoVainqueur";
import { EnDirectEnContinu, RangeeJour, RangeeJourEnContinu, RangeeScores, RangeeScoresEnContinu, enCours } from "@/components/accueil/lobby/Rangees";
import { TesAmis } from "@/components/accueil/lobby/TesAmis";
import type { CartesDifferees, Lobby } from "@/components/accueil/lobby/types";
import { styleDePalette } from "@/lib/palettes";
import { LOBBY } from "@/lib/voice-accueil-lobby";
import s from "@/components/accueil/lobby/Lobby.module.css";

// L'accueil « Le lobby » (/dashboard), maquette D2 « Le lobby resserré » : un
// écran d'accueil de jeu en ligne, en cartes de papier aux aplats noirs, ocre
// et ivoire et au vrai liquide de la palette « Florence à l'aube » (seulement
// les boutons d'action principaux et les options actives des sélecteurs).
// De haut en bas :
//   1. l'en-tête : le salut à gauche, J-n et la date de l'examen à droite ;
//   2. les 30 du jour avec leur classement | les 5 du jour et les traits du jour ;
//   3. la carte du jour | ton rival | une affiche (la peinture « La Lice », à la
//      place de la ligue de la maquette : de l'air, aucun lien) ;
//   4. le vainqueur d'hier (et son personnage), le lobby en direct dessous | ton
//      rang et ta phase de révision ;
//   5. le prochain déblocage et ta prochaine quête | tes meilleurs scores | une
//      affiche (« La Cascade ») ;
//   6. la Grande Salle (le prochain examen blanc) ;
//   7. du nouveau | tes amis ;
//   8. ton carnet de jours (la carte sombre), tout en bas.
// Une carte dont la source manque (migration pas collée, pas de clé de service,
// lecture en échec ou au-delà du filet) se masque et sa rangée se recompose (data-n et classes de
// colonnes) : sans rival ni carte du jour, la rangée 3 disparaît (une affiche
// seule n'a pas de sens) ; sans rien dans une rangée, elle est retirée. Sur
// téléphone (requêtes de conteneur de Lobby.module.css), une seule colonne, dans
// l'ordre du document. Composant de présentation serveur : tout vient de `l`
// (lireLobby) ; les îlots clients (le classement, la carte du jour, la relance,
// le sceau, l'insigne) ne reçoivent que des données ou des nœuds rendus ici.
// Cinq cartes lentes (la carte du jour, le rival, le lobby en direct, le
// déblocage, la quête) peuvent arriver en `differees` : des promesses lues APRÈS
// la page. Chacune est alors rendue dans un <Suspense> (Rangees.tsx), avec son
// squelette de même taille à sa place EXACTE, ordinateur comme téléphone ; sans
// `differees` (aperçus, tests), elles viennent de `l`, rendues d'un bloc.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function LobbyView({ l, differees }: { l: Lobby; differees?: CartesDifferees }) {
  const heros = l.heros;
  const j = l.jour;
  const v = l.vainqueur;

  // les cinq cartes lentes : la promesse lue après la page, sinon la valeur lue d'avance (ou null)
  const carteDuJour = differees?.carteDuJour ?? l.carteDuJour;
  const rival = differees?.rival ?? l.rival;
  const enDirect = differees?.enDirect ?? l.enDirect;
  const deblocage = differees?.deblocage ?? l.deblocage;
  const quete = differees?.quete ?? l.quete;

  // rangée 4 : une colonne (le vainqueur, le lobby en direct) | le rang ; lu en continu, le lobby en direct
  // compte d'office (sa colonne est posée avant de savoir s'il arrive : voir .colonneDirect et .etireSeule)
  const colonneVq = !!(v || enDirect);
  const directEnCours = enCours(enDirect);

  return (
    <>
    <div className={"rl-wide rl-page " + s.cadre}>
      <div className={s.racine} style={styleDePalette(PAL)}>
        {/* le logo vivant de la barre du haut se recale sur la journée lue ici */}
        <AnneauDuJourSync repondues={j.repondues} />
        <div className="rl-cadre">
        <Entete e={l.entete} />

        {/* 2. les 30 du jour (ou, à défaut, les 5) et leur classement | les 5 et les traits ;
            rangeeHeros : sur ordinateur, la rangée est bornée par la hauteur de la fenêtre (Lobby.module.css) */}
        {heros ? (
          <div className={cx(s.rangee, s.rangeeHeros)}>
            <CarteTrente className={s.c8} d={heros} classement={l.classement} />
            {/* deux cartes côte à côte sur tablette seulement quand il y en a deux (sinon une demi-rangée vide) */}
            <div className={cx(s.colonne, s.c4, l.cinq && s.enDeux)}>
              {l.cinq && <CarteCinq c={l.cinq} />}
              <CarteTraits t={l.traits} className={s.etire} />
            </div>
          </div>
        ) : (
          /* ni les 30 ni les 5 ne sont jouables : les traits prennent le héros, une tuile calme dit où en sont les 30 */
          <div className={s.rangee} data-n={l.calme ? undefined : 1}>
            <CarteTraitsGrande t={l.traits} className={l.calme ? s.c8 : s.c12} />
            {l.calme && (
              <section data-leonard="defi" className={[s.carte, s.calme, s.c4].join(" ")} aria-labelledby="lobby-calme">
                <p className={s.eyebrow}>{LOBBY.calme.surTitre}</p>
                <h2 id="lobby-calme" className={"font-brand " + s.calmeTitre}>
                  {LOBBY.calme.titre}
                </h2>
                <p className={s.st}>
                  <span className={s.etat}>{l.calme.etat === "bientot" ? LOBBY.calme.bientot : LOBBY.calme.indispo}</span>
                </p>
                <p className={s.st}>{l.calme.etat === "bientot" ? LOBBY.calme.texteBientot : LOBBY.calme.texteIndispo}</p>
              </section>
            )}
          </div>
        )}
        </div>

        {/* 3. la carte du jour | ton rival | l'affiche (la peinture qui remplace la ligue) ;
            sans l'un des deux, l'affiche reste à côté de l'autre ; sans les deux, rien */}
        {enCours(carteDuJour) || enCours(rival) ? (
          <RangeeJourEnContinu carte={carteDuJour} rival={rival} affiche={l.affiches.rival} />
        ) : (
          <RangeeJour carte={carteDuJour} rival={rival} affiche={l.affiches.rival} />
        )}

        {/* 4. le vainqueur d'hier (et, dessous, le lobby en direct) | le rang et la phase */}
        <div className={[s.rangee, s.rangeeAeree].join(" ")} data-n={colonneVq ? undefined : 1}>
          {colonneVq && (
            <div className={cx(s.colonne, s.c7, directEnCours && !v && s.colonneDirect)}>
              {/* seule dans sa colonne, la bande remplit la hauteur du rang ; le lobby, lui, garde sa hauteur naturelle
                  (étiré à côté du rang, il montrait un grand vide blanc : la colonne finit alors un peu plus haut).
                  Lu en continu, on ne sait pas encore s'il arrive : .etireSeule étire la bande si elle reste seule */}
              {v && (
                <BandeVainqueur
                  v={v}
                  perso={v.perso ? <PersoVainqueur perso={v.perso} /> : undefined}
                  className={directEnCours ? s.etireSeule : enDirect ? undefined : s.etire}
                />
              )}
              {directEnCours ? <EnDirectEnContinu lu={enDirect} /> : enDirect && <EnDirect d={enDirect} />}
            </div>
          )}
          {/* sans vainqueur, le lobby en direct lu en continu est seul dans sa colonne : s'il n'arrive pas, la colonne
              vide se retire et le rang reprend toute la rangée (.colonneDirect:empty + .rangApresDirect) */}
          <CarteRang r={l.rang} className={cx(colonneVq ? s.c5 : s.c12, directEnCours && !v && s.rangApresDirect)} />
        </div>

        {/* 5. le déblocage et la quête | les scores | l'affiche de la bibliothèque */}
        {enCours(deblocage) || enCours(quete) ? (
          <RangeeScoresEnContinu deblocage={deblocage} quete={quete} scores={l.scores} affiche={l.affiches.scores} />
        ) : (
          <RangeeScores deblocage={deblocage} quete={quete} scores={l.scores} affiche={l.affiches.scores} />
        )}

        {/* 6. la Grande Salle : le prochain examen blanc, s'il y en a un */}
        {l.grandeSalle && <BandeGrandeSalle g={l.grandeSalle} />}

        {/* 7. du nouveau | tes amis ; l'un sans l'autre prend toute la rangée */}
        {(l.nouveau || l.amis) && (
          <div className={s.rangee}>
            {l.nouveau && <DuNouveau nouvelles={l.nouveau} aujourdhui={l.traits.jour} className={l.amis ? s.c8 : s.c12} />}
            {/* seule, la carte des amis prend toute la rangée mais en bande (tout sur une ligne), pas en colonne étirée et vide */}
            {l.amis && <TesAmis amis={l.amis} seule={!l.nouveau} className={l.nouveau ? s.c4 : s.c12} />}
          </div>
        )}

        {/* 8. ton carnet de jours, la carte sombre, tout en bas */}
        {l.carnet && <CarnetJours carnet={l.carnet} aujourdhui={{ traits: l.traits.repondues, objectif: l.traits.objectif }} />}
      </div>
    </div>
    {/* le palier de 7 jours de la série d'encre : une petite célébration, une fois par série, sauf en mode sobre.
        Posée HORS du cadre : le cadre et la racine sont des conteneurs (container-type), qui deviendraient le
        repère de son voile en position fixed (il ne couvrirait plus la fenêtre). */}
    {!j.sobre && j.serieAffichee >= 7 && j.cleSerie && <CelebrationSerie serie={j.serieAffichee} cle={j.cleSerie} doubleDeja={j.doubleDeja} />}
    </>
  );
}
