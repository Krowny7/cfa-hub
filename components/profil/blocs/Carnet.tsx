import { Calendar } from "lucide-react";
import { OBJECTIF_DU_JOUR } from "@/components/adn/AnneauDuJourEvents";
import { decaleJour } from "@/lib/objectif-calc";
import type { DonneesBlocs, ExtraitCarnet } from "@/lib/profil/blocs-donnees";
import type { Format } from "@/lib/profil/disposition";
import { nombre } from "@/lib/voice";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_JOURNAL as V } from "@/lib/voice-blocs-journal";
import { JOURNAL } from "@/lib/voice-profil";
import { Cellule, Coque, DemiBande, Vide, type Ctx } from "./commun";
import k from "./Carnet.module.css";

// Le bloc Carnet de jours de la page de profil : « Calendrier d'encre ». La
// grille des jours (une colonne par semaine, sept lignes, lundi en haut),
// cinq niveaux d'encre selon les questions du jour (0 : la case vide),
// aujourd'hui cerclé, les jours d'encre en grand en tête, « série 12 j ·
// record 31 j » dessous. Le chiffre fort compte toujours les 52 semaines (comme
// le Journal). Mini-tuile : la grille des 26 dernières semaines ; colonne :
// ces 26 semaines à la verticale, une ligne par semaine ; héros, bande et
// demi-bande : les 52 semaines (18 sur téléphone). Le carnet suit la
// visibilité du Journal : fermé,
// la série et le record seulement (déjà publics) et « Carnet privé ».
// Une seule rendue pour tous : chez soi et chez un autre, le même dessin
// (aucune comparaison) ; seul « Visible par » reste au propriétaire, dans
// Personnaliser. Les calculs sont des fonctions pures. Sans état : rendu au
// serveur comme au client.

export const SEMAINES = 52;
export const SEMAINES_TELEPHONE = 18;
/** la mini-tuile et la colonne : six mois */
export const SEMAINES_TUILE = 26;

/** Les cinq niveaux d'encre : 0 rien ; 1 un quart de l'objectif du jour ; 2 la moitié ; 3 l'objectif presque ; 4 l'objectif du jour ou plus. */
export const niveau = (n: number): 0 | 1 | 2 | 3 | 4 =>
  n <= 0 ? 0 : n < OBJECTIF_DU_JOUR / 4 ? 1 : n < OBJECTIF_DU_JOUR / 2 ? 2 : n < OBJECTIF_DU_JOUR ? 3 : 4;

/** La première case : le lundi d'il y a 51 semaines (comme CarnetJours). */
export function debutCarnet(aujourdhui: string): string {
  const dow = (new Date(aujourdhui + "T12:00:00Z").getUTCDay() + 6) % 7;
  return decaleJour(aujourdhui, -dow - (SEMAINES - 1) * 7);
}

export type JourCarnet = { jour: string; n: number; avenir: boolean };

/** Les 364 cases, du lundi d'il y a 51 semaines au dimanche de cette semaine : ses questions, les jours à venir. */
export function casesCarnet(lui: [string, number][], aujourdhui: string): JourCarnet[] {
  const sien = new Map(lui);
  const debut = debutCarnet(aujourdhui);
  const out: JourCarnet[] = [];
  for (let i = 0; i < SEMAINES * 7; i++) {
    const jour = decaleJour(debut, i);
    const avenir = jour > aujourdhui;
    out.push({ jour, n: avenir ? 0 : (sien.get(jour) ?? 0), avenir });
  }
  return out;
}

/** Les cases des `semaines` dernières semaines (des semaines entières : le total est un multiple de 7). */
export const recentes = (cases: JourCarnet[], semaines: number) => cases.slice(-semaines * 7);

/** Les jours d'encre (au moins `seuil` questions). */
export const joursDEncre = (cases: JourCarnet[], seuil: number) => cases.filter((x) => x.n >= seuil).length;

// ── Le dessin ─────────────────────────────────────────────────────────────

/** Une case : à venir, ou son niveau d'encre (infobulle « 3 oct. · 42 traits » si elle en a), cerclée si c'est aujourd'hui. */
function Case({ x, aujourdhui }: { x: JourCarnet; aujourdhui: string }) {
  if (x.avenir) return <i data-f="" />;
  const auj = x.jour === aujourdhui ? { "data-auj": "" } : {};
  return <i data-n={niveau(x.n)} title={x.n > 0 ? JOURNAL.case(x.jour, x.n) : undefined} {...auj} />;
}

/** La grille : une colonne par semaine, lundi en haut. `classe` : le format (taille des cases). */
function Grille({ cases, aujourdhui, label, classe }: { cases: JourCarnet[]; aujourdhui: string; label: string; classe: string }) {
  return (
    <div className={k.grille + " " + classe} role="img" aria-label={label}>
      {cases.map((x) => (
        <Case key={x.jour} x={x} aujourdhui={aujourdhui} />
      ))}
    </div>
  );
}

/** La colonne : une ligne par semaine (la plus récente en bas), les sept jours en travers, les initiales au-dessus. */
function Calendrier({ cases, aujourdhui, label }: { cases: JourCarnet[]; aujourdhui: string; label: string }) {
  return (
    <div className={k.calendrier}>
      <div className={k.initiales} aria-hidden>
        {V.initialesJours.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      <div className={k.vertical} role="img" aria-label={label}>
        {cases.map((x) => (
          <Case key={x.jour} x={x} aujourdhui={aujourdhui} />
        ))}
      </div>
    </div>
  );
}

/** La légende des niveaux : « moins ▢▢▢▢▢ plus ». */
function Echelle() {
  return (
    <span className={k.legende} title={JOURNAL.legende(OBJECTIF_DU_JOUR)}>
      {V.moins}
      <span className={k.echelle} aria-hidden>
        <i />
        <i data-n={1} />
        <i data-n={2} />
        <i data-n={3} />
        <i data-n={4} />
      </span>
      {V.plus}
    </span>
  );
}

/** « série 12 j · record 31 j », les chiffres en gras. */
function LigneSerie({ serie, record }: { serie: number; record: number }) {
  return (
    <p className={k.ligne} title={V.serieRecord(serie, record)}>
      {V.serieMin} <b>{V.j(serie)}</b> · {V.recordMin} <b>{V.j(record)}</b>
    </p>
  );
}

/** Deux mesures : la série et le record (étiquette sous le chiffre, ou en rangées dans la colonne). */
function Mesures({ serie, record, classe }: { serie: number; record: number; classe: string }) {
  return (
    <dl className={classe}>
      <div>
        <dt>{V.serie}</dt>
        <dd>{V.j(serie)}</dd>
      </div>
      <div>
        <dt>{V.record}</dt>
        <dd>{V.j(record)}</dd>
      </div>
    </dl>
  );
}

const Tete = ({ droite }: { droite?: React.ReactNode }) => (
  <div className={k.tete}>
    <h3 className={k.lab}>{V.carnetDeJours}</h3>
    {droite}
  </div>
);

// ── Le carnet lu : le même dessin chez soi et chez un autre ──────────────
function CarnetOuvert({ d, f, edition, carnet }: { d: DonneesBlocs; f: Format; edition: boolean; carnet: ExtraitCarnet }) {
  const seuil = carnet.seuil ?? 1;
  const cases = casesCarnet(carnet.jours, carnet.aujourdhui);
  const label = V.grilleDe(d.nom, d.moi);
  // le chiffre fort : les jours d'encre des 52 semaines, quel que soit le format
  const an = joursDEncre(cases, seuil);
  const visible = edition ? <p className="t-micro m-0">{T.visiblePar(d.visibiliteJournal)}</p> : null;

  if (f === "demi")
    return (
      <DemiBande
        label={V.carnetDeJours}
        dessin={<Grille cases={cases} aujourdhui={carnet.aujourdhui} label={label} classe={k.annee + " " + k.demi} />}
        droite={edition ? <span className="t-micro">{T.visiblePar(d.visibiliteJournal)}</span> : undefined}
      >
        <Cellule etiquette={V.joursEncreMaj} chiffre={V.j(an)} petit={V.sur52} />
        <Cellule etiquette={V.serie} chiffre={V.j(carnet.serie)} petit={V.recordCourt(carnet.record)} />
      </DemiBande>
    );

  if (f === "tuile" || f === "colonne") {
    const six = recentes(cases, SEMAINES_TUILE);
    const grand = (
      <div className={k.chiffre} title={V.surSemaines(SEMAINES)}>
        <span className={"t-num " + k.grand}>{nombre(an)}</span>
        <span className={k.unite}>{V.joursEncre}</span>
      </div>
    );
    if (f === "tuile")
      return (
        <Coque f={f} label={V.carnetDeJours}>
          <div className={k.corps}>
            <Tete />
            {grand}
            <Grille cases={six} aujourdhui={carnet.aujourdhui} label={label} classe={k.tuile} />
            <LigneSerie serie={carnet.serie} record={carnet.record} />
            {visible}
          </div>
        </Coque>
      );
    return (
      <Coque f={f} label={V.carnetDeJours}>
        <div className={k.corps}>
          <Tete />
          <div className={k.colonneCorps}>
            <Calendrier cases={six} aujourdhui={carnet.aujourdhui} label={label} />
            <div className={k.stats}>
              <div className={k.chiffre + " " + k.empile}>
                <span className={"t-num " + k.grand}>{nombre(an)}</span>
                <span className={k.unite}>{V.joursEncreSur(SEMAINES)}</span>
              </div>
              <Mesures serie={carnet.serie} record={carnet.record} classe={k.liste} />
              <div className={k.pied}>
                <Echelle />
                {visible}
              </div>
            </div>
          </div>
        </div>
      </Coque>
    );
  }

  // héros et bande : les 52 semaines
  const bande = f === "bande";
  return (
    <Coque f={bande ? "bande" : "heros"} label={V.carnetDeJours}>
      <div className={k.corps}>
        <Tete droite={<Echelle />} />
        <div className={k.large + " " + (bande ? k.bandeV : k.herosV)}>
          <div className={k.resume}>
            <div className={k.chiffre + (bande ? " " + k.empile : "")}>
              <span className={"t-num " + k.grand}>{nombre(an)}</span>
              <span className={k.unite}>{V.joursEncreSur(SEMAINES)}</span>
            </div>
            <Mesures serie={carnet.serie} record={carnet.record} classe={k.mesures} />
          </div>
          <Grille cases={cases} aujourdhui={carnet.aujourdhui} label={label} classe={k.annee + " " + (bande ? k.bande : k.heros)} />
        </div>
        {visible}
      </div>
    </Coque>
  );
}

// ── Journal fermé (ou carnet non lu) : la série et le record, déjà publics ──
function CarnetFerme({ d, f, prive, edition }: { d: DonneesBlocs; f: Format; prive: boolean; edition: boolean }) {
  const serie = d.stats.serie;
  const record = d.stats.meilleureSerie;
  const mention = prive ? <span className={k.prive}>{V.carnetPrive}</span> : edition ? <span className="t-micro">{T.visiblePar(d.visibiliteJournal)}</span> : undefined;
  if (f === "demi")
    return (
      <DemiBande label={V.carnetDeJours} droite={mention}>
        <Cellule etiquette={V.serie} chiffre={V.j(serie)} />
        <Cellule etiquette={V.record} chiffre={V.j(record)} />
      </DemiBande>
    );
  return (
    <Coque f={f} label={V.carnetDeJours}>
      <div className={k.corps}>
        <Tete droite={mention} />
        <div className={k.deuxMesures}>
          {(
            [
              [V.serie, serie],
              [V.record, record],
            ] as [string, number][]
          ).map(([nom, n]) => (
            <span key={nom} className={k.mesureGrande}>
              <span className={k.unite}>{nom}</span>
              <span className={"t-num " + k.grand}>{V.j(n)}</span>
            </span>
          ))}
        </div>
      </div>
    </Coque>
  );
}

/**
 * Le bloc Carnet de jours. Rien à montrer (ni carnet lu, ni record) : rien
 * en vue publique, l'état vide dans Personnaliser.
 */
export function CarnetBloc({ d, f, edition }: Ctx): React.ReactNode {
  const carnet = d.carnet ?? null;
  if (!carnet && !(d.stats.meilleureSerie > 0)) return edition ? <Vide bloc={{ k: "carnet", f }} f={f} icone={<Calendar size={17} aria-hidden />} /> : null;
  if (!carnet) return <CarnetFerme d={d} f={f} prive={!d.moi} edition={edition} />;
  return <CarnetOuvert d={d} f={f} edition={edition} carnet={carnet} />;
}
