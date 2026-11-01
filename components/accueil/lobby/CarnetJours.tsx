import { LayoutGrid } from "lucide-react";
import { nombre } from "@/lib/voice";
import { PARC } from "@/lib/voice-accueil-lobby-parcours";
import k from "./CarnetJours.module.css";
import { carnetVue, legendeCarnet, type AujourdhuiCarnet } from "./modele-parcours";
import type { CarnetLobby } from "./types";

// « Ton carnet de jours » : la carte SOMBRE toute en bas de l'accueil. C'est la grille
// de 52 semaines du profil (components/profil/blocs/Carnet.tsx : mêmes cases, mêmes
// niveaux, même seuil d'un jour d'encre), en cinq gris du plus sombre au plus clair,
// avec « 34 jours d'encre sur 52 semaines », la série et le record. La case cerclée,
// c'est aujourd'hui, et son infobulle dit où en est la journée. La grille est fluide ;
// au téléphone, les 18 dernières semaines seulement. Aucune encre. Le carnet est
// toujours posé : ses données sont celles du joueur, même vide. Composant serveur,
// sans état ; les 364 cases sont de simples <i>.
//   - carnet : les jours, la série, le record, le seuil (CarnetLobby) ;
//   - aujourdhui : les traits répondus et l'objectif du jour (CarteTraitsLobby), pour
//     l'infobulle et la phrase sous la grille ; null : la phrase reste générale.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const ID = "lobby-carnet-titre";

export function CarnetJours({ carnet, aujourdhui, className }: { carnet: CarnetLobby; aujourdhui: AujourdhuiCarnet | null; className?: string }) {
  const v = carnetVue(carnet, aujourdhui);
  const [joursA, joursB] = PARC.carnet.joursLib;
  const [serieA, serieB] = PARC.carnet.serieLib;
  const [recordA, recordB] = PARC.carnet.recordLib;
  return (
    <section aria-labelledby={ID} className={cx(k.carnet, className)}>
      <header className={k.tete}>
        <div className={k.titreBloc}>
          <h2 id={ID} className={cx("font-brand", k.titre)}>
            <span className={k.sceau} aria-hidden>
              <LayoutGrid size={15} />
            </span>
            {PARC.carnet.titre}
          </h2>
          <p className={k.sous}>{PARC.carnet.sous}</p>
        </div>
        <ul className={k.stats}>
          <li>
            <b>{nombre(v.joursEncre)}</b>
            <span>
              {joursA}
              <br />
              {joursB}
            </span>
          </li>
          <li>
            <b>{PARC.carnet.j(v.serie)}</b>
            <span>
              {serieA}
              <br />
              {serieB}
            </span>
          </li>
          <li>
            <b>{PARC.carnet.j(v.record)}</b>
            <span>
              {recordA}
              <br />
              {recordB}
            </span>
          </li>
        </ul>
      </header>
      <div className={k.grille}>
        <span />
        <div className={k.mois} aria-hidden>
          {v.mois.map((m, i) => (
            <span key={i} data-ancien={m.ancien ? "" : undefined}>
              {m.texte}
            </span>
          ))}
        </div>
        <div className={k.jours} aria-hidden>
          {PARC.carnet.jours.map((j, i) => (
            <span key={i}>{j}</span>
          ))}
        </div>
        <div className={k.cases} role="img" aria-label={PARC.carnet.aria(v.joursEncre, v.serie, v.record)}>
          {v.cases.map((c) => (
            <i key={c.jour} data-n={c.niveau} data-f={c.avenir ? "" : undefined} data-auj={c.auj ? "" : undefined} data-ancien={c.ancien ? "" : undefined} title={c.titre ?? undefined} />
          ))}
        </div>
      </div>
      <div className={k.pied}>
        <span>{legendeCarnet(aujourdhui)}</span>
        <span className={k.legende}>
          {PARC.carnet.moins}
          <span className={k.echelle} aria-hidden>
            <i />
            <i data-n={1} />
            <i data-n={2} />
            <i data-n={3} />
            <i data-n={4} />
          </span>
          {PARC.carnet.plus}
        </span>
      </div>
    </section>
  );
}
