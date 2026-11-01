import Link from "next/link";
import { Swords, Target } from "lucide-react";
import { EncreVive } from "@/components/nav/EncreVive";
import { PALETTES } from "@/lib/palettes";
import { RIV } from "@/lib/voice-accueil-lobby-rival";
import type { Segment } from "@/lib/voice-moi";
import { BoutonRelance } from "./BoutonRelance";
import { barres } from "./modele-rival";
import type { RivalLobby } from "./types";
import s from "./Rival.module.css";

// « Ton rival » de l'accueil « Le lobby » (lot 3), palette « florence » : la
// comparaison d'activité de la semaine entre toi et le joueur que tu as le plus
// croisé. De haut en bas : le sceau, le nom du rival et « Son profil », le
// face-à-face (cinq lignes, une barre de chaque côté d'un axe central), le
// verdict et ce qu'il reste à rattraper, puis les deux actions : « Lui lancer
// un défi » (le bouton d'encre : l'unique liquide de la carte) et « Relancer »
// (en contour, un îlot client). Sans assez de chiffres communs, le bilan des
// rencontres prend la place du face-à-face. Composant serveur : tout arrive
// en données (modele-rival.ts) ; `className` donne le placement dans la grille.

const PAL = PALETTES.florence;
const classes = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Une phrase en segments : du texte, du gras, un passage surligné, ou un chiffre en rouge. */
function Phrase({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((g, i) =>
        typeof g === "string" ? (
          g
        ) : "b" in g ? (
          <b key={i}>{g.b}</b>
        ) : "marque" in g ? (
          <span key={i} className={s.surligne}>
            {g.marque}
          </span>
        ) : (
          <span key={i} className={s.neg}>
            {g.neg}
          </span>
        ),
      )}
    </>
  );
}

export function CarteRival({ rival, className }: { rival: RivalLobby; className?: string }) {
  const compare = rival.mesures.length >= 2;
  return (
    <section className={classes(s.carte, className)} aria-labelledby="lobby-rival-titre">
      <header className={s.tete}>
        <div className={s.titreSceau}>
          <span className={s.sceau} aria-hidden>
            <Target size={15} />
          </span>
          <div className={s.titreTexte}>
            <p className={s.eyebrow}>{RIV.eyebrow}</p>
            <h2 id="lobby-rival-titre" className={classes("font-brand", s.ttl)}>
              {rival.nom}
            </h2>
          </div>
        </div>
        <Link href={rival.href} className={s.lien} aria-label={RIV.profilAria(rival.nom)}>
          {RIV.profil}
          <span aria-hidden>→</span>
        </Link>
      </header>

      {compare ? (
        <div className={s.duo}>
          <div className={s.duoTete}>
            <span className={s.qui}>
              <span className={classes(s.av, s.avMoi)} aria-hidden>
                {rival.initialesMoi}
              </span>
              <b>{RIV.toi}</b>
            </span>
            <span className={s.periode}>{RIV.periode}</span>
            <span className={classes(s.qui, s.quiD)}>
              <b>{rival.nom}</b>
              <span className={classes(s.av, s.avRival)} aria-hidden>
                {rival.initiales}
              </span>
            </span>
          </div>
          <ul className={s.acts} aria-label={RIV.liste(rival.prenom)}>
            {rival.mesures.map((m) => {
              const b = barres(m);
              return (
                <li key={m.cle} className={s.act}>
                  <span className={s.sr}>{m.aria}</span>
                  <span className={classes(s.v, m.toi < m.lui && s.bas)} aria-hidden>
                    {m.toiTxt}
                  </span>
                  <span className={s.lab} aria-hidden>
                    {m.lib}
                  </span>
                  <span className={classes(s.v, s.vD, m.lui < m.toi && s.bas)} aria-hidden>
                    {m.luiTxt}
                  </span>
                  <span className={s.barres} aria-hidden>
                    <span className={classes(s.b, s.bToi)}>
                      <i style={{ width: `${b.toi}%` }} />
                    </span>
                    <span className={classes(s.b, s.bLui)}>
                      <i style={{ width: `${b.lui}%` }} />
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        rival.bilan && (
          <div className={s.duo}>
            <p className={s.bilan}>{rival.bilan}</p>
            <p className={s.ns}>{RIV.bilanSous}</p>
          </div>
        )
      )}

      {compare && (
        <div className={s.verdict}>
          <p className={s.verdictTexte}>
            <Phrase segments={rival.verdict} />
          </p>
          {rival.rattrape && (
            <p className={s.rattrape}>
              <Phrase segments={rival.rattrape} />
            </p>
          )}
        </div>
      )}

      {rival.recue && <p className={s.recue}>{rival.recue}</p>}

      <div className={s.actions}>
        <Link href={rival.defi.href} className={classes("rl-encre", s.encre, s.bouton)} data-palette={PAL.key} aria-label={RIV.defiAria(rival.nom)}>
          <EncreVive tons={PAL.liquide} />
          <Swords size={15} aria-hidden />
          {rival.defi.libelle}
        </Link>
        {rival.relance.dispo && <BoutonRelance id={rival.id} nom={rival.nom} prenom={rival.prenom} apercu={rival.relance.apercu} envoyee={rival.relance.envoyee} />}
      </div>
    </section>
  );
}
