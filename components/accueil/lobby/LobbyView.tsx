import { AnneauDuJourSync } from "@/components/adn/AnneauDuJourSync";
import { CelebrationSerie } from "@/components/serie/CelebrationSerie";
import { Affiche } from "@/components/accueil/lobby/Affiche";
import { BandeGrandeSalle } from "@/components/accueil/lobby/BandeGrandeSalle";
import { BandeVainqueur } from "@/components/accueil/lobby/BandeVainqueur";
import { CarnetJours } from "@/components/accueil/lobby/CarnetJours";
import { CarteCinq } from "@/components/accueil/lobby/CarteCinq";
import { CarteDeblocage } from "@/components/accueil/lobby/CarteDeblocage";
import { CarteDuJour } from "@/components/accueil/lobby/CarteDuJour";
import { CarteQuete } from "@/components/accueil/lobby/CarteQuete";
import { CarteRang } from "@/components/accueil/lobby/CarteRang";
import { CarteRival } from "@/components/accueil/lobby/CarteRival";
import { CarteScores } from "@/components/accueil/lobby/CarteScores";
import { CarteTraits, CarteTraitsGrande } from "@/components/accueil/lobby/CarteTraits";
import { CarteTrente } from "@/components/accueil/lobby/CarteTrente";
import { DuNouveau } from "@/components/accueil/lobby/DuNouveau";
import { EnDirect } from "@/components/accueil/lobby/EnDirect";
import { PAL } from "@/components/accueil/lobby/Encre";
import { Entete } from "@/components/accueil/lobby/Entete";
import { PersoVainqueur } from "@/components/accueil/lobby/PersoVainqueur";
import { TesAmis } from "@/components/accueil/lobby/TesAmis";
import type { Lobby } from "@/components/accueil/lobby/types";
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
//      affiche (« La Bibliothèque ») ;
//   6. la Grande Salle (le prochain examen blanc) ;
//   7. du nouveau | tes amis ;
//   8. ton carnet de jours (la carte sombre), tout en bas.
// Une carte dont la source manque (migration pas collée, pas de clé de service,
// lecture trop lente) se masque et sa rangée se recompose (data-n et classes de
// colonnes) : sans rival ni carte du jour, la rangée 3 disparaît (une affiche
// seule n'a pas de sens) ; sans rien dans une rangée, elle est retirée. Sur
// téléphone (requêtes de conteneur de Lobby.module.css), une seule colonne, dans
// l'ordre du document. Composant de présentation serveur : tout vient de `l`
// (lireLobby) ; les îlots clients (le classement, la carte du jour, la relance,
// le sceau, l'insigne) ne reçoivent que des données ou des nœuds rendus ici.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function LobbyView({ l }: { l: Lobby }) {
  const heros = l.heros;
  const j = l.jour;
  const v = l.vainqueur;

  // rangée 3 : la carte du jour, le rival et l'affiche ; sans l'un des deux, l'affiche reste à côté de l'autre ; sans les deux, rien
  const rangeeJour = !!(l.carteDuJour || l.rival);
  const nJour = (l.carteDuJour ? 1 : 0) + (l.rival ? 1 : 0) + 1;

  // rangée 4 : une colonne (le vainqueur, le lobby en direct) | le rang
  const colonneVq = !!(v || l.enDirect);

  // rangée 5 : le déblocage et la quête empilés | les scores | l'affiche ; sans l'un, les autres s'étirent
  const colonneDeblocage = !!(l.deblocage || l.quete);
  const rangeeScores = colonneDeblocage || !!l.scores;

  return (
    <>
    <div className={"rl-wide rl-page " + s.cadre}>
      <div className={s.racine} style={styleDePalette(PAL)}>
        {/* le logo vivant de la barre du haut se recale sur la journée lue ici */}
        <AnneauDuJourSync repondues={j.repondues} />
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

        {/* 3. la carte du jour | ton rival | l'affiche (la peinture qui remplace la ligue) */}
        {rangeeJour && (
          <div className={s.rangeeJour} data-n={nJour === 2 ? 2 : undefined}>
            {l.carteDuJour && <CarteDuJour carte={l.carteDuJour} />}
            {l.rival && <CarteRival rival={l.rival} />}
            <Affiche a={l.affiches.rival} />
          </div>
        )}

        {/* 4. le vainqueur d'hier (et, dessous, le lobby en direct) | le rang et la phase */}
        <div className={[s.rangee, s.rangeeAeree].join(" ")} data-n={colonneVq ? undefined : 1}>
          {colonneVq && (
            <div className={[s.colonne, s.c7].join(" ")}>
              {/* seule dans sa colonne, la bande remplit la hauteur du rang ; le lobby, lui, garde sa hauteur naturelle
                  (étiré à côté du rang, il montrait un grand vide blanc : la colonne finit alors un peu plus haut) */}
              {v && <BandeVainqueur v={v} perso={v.perso ? <PersoVainqueur perso={v.perso} /> : undefined} className={l.enDirect ? undefined : s.etire} />}
              {l.enDirect && <EnDirect d={l.enDirect} />}
            </div>
          )}
          <CarteRang r={l.rang} className={colonneVq ? s.c5 : s.c12} />
        </div>

        {/* 5. le déblocage et la quête | les scores | l'affiche de la bibliothèque */}
        {rangeeScores && (
          <div className={s.rangee}>
            {colonneDeblocage && (
              <div className={cx(s.colonne, l.deblocage && l.quete && s.enDeux, l.scores ? s.c3 : s.c6)}>
                {l.deblocage && <CarteDeblocage d={l.deblocage} className={s.etire} />}
                {l.quete && <CarteQuete q={l.quete} className={s.etire} />}
              </div>
            )}
            {l.scores && <CarteScores scores={l.scores} className={colonneDeblocage ? s.c5 : s.c8} />}
            <Affiche a={l.affiches.scores} className={colonneDeblocage && !l.scores ? s.c6 : s.c4} />
          </div>
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
