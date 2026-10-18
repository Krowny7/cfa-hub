import { Calendar } from "lucide-react";
import { OBJECTIF_DU_JOUR } from "@/components/adn/AnneauDuJourEvents";
import { CarnetJours } from "@/components/profil/CarnetJours";
import { decaleJour } from "@/lib/objectif-calc";
import { couleurSens, ecart, questionsSur7, sensScore, type Ecart, type Score } from "@/lib/profil/ecart";
import type { DonneesBlocs, ExtraitCarnet } from "@/lib/profil/blocs-donnees";
import type { Format } from "@/lib/profil/disposition";
import { nombre } from "@/lib/voice";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_JOURNAL as V } from "@/lib/voice-blocs-journal";
import { JOURNAL, jourCourt } from "@/lib/voice-profil";
import { Cellule, Chiffre, Coque, DemiBande, Etiquette, Jeton, RubanSemaines, ScoreTuile, Vide, jourCourt as jourSemaineCourt, maCouleur, type Ctx } from "./commun";
import c from "./commun.module.css";
import k from "./Carnet.module.css";

// Le bloc Carnet de jours de la page de profil : la grille des 52 semaines
// du Journal (une case par jour, l'encre de CarnetJours), qui suit la
// visibilité du Journal. Chez un autre : « travaille-t-il plus
// régulièrement que moi ? » : le chiffre fort est ses jours d'encre sur 52
// semaines (« 212 j », son seuil appliqué aux deux), le jeton ton écart
// (« toi −64 j »), la série et les 7 derniers jours en mesures courtes ; le
// ruban des semaines sous sa grille (vert : tu as fait plus de questions
// cette semaine-là ; rouge : lui) et le score en semaines (« toi 21 – 31 »).
// Journal fermé : la série et le record seulement (déjà publics), et
// « Carnet privé ». Chez soi : le CarnetJours du Journal (mini-tuile et
// demi-bande : un rendu compact). Au téléphone, 18 semaines.
// Le ruban, les jours d'encre et les 7 jours se calculent ici, par des
// fonctions pures, sans Map dans les données. Sans état.

export const SEMAINES = 52;
export const SEMAINES_TELEPHONE = 18;

/** Les niveaux d'encre de CarnetJours : 0 rien ; 1 sous la moitié de l'objectif du jour ; 2 sous l'objectif ; 3 l'objectif ou plus. */
export const niveau = (n: number) => (n <= 0 ? 0 : n < OBJECTIF_DU_JOUR / 2 ? 1 : n < OBJECTIF_DU_JOUR ? 2 : 3);

/** La première case : le lundi d'il y a 51 semaines (comme CarnetJours). */
export function debutCarnet(aujourdhui: string): string {
  const dow = (new Date(aujourdhui + "T12:00:00Z").getUTCDay() + 6) % 7;
  return decaleJour(aujourdhui, -dow - (SEMAINES - 1) * 7);
}

export type JourCarnet = { jour: string; n: number; toi: number; avenir: boolean };

/** Les 364 cases, du lundi d'il y a 51 semaines au dimanche de cette semaine : ses questions, les tiennes (0 sans toi), les jours à venir. */
export function casesCarnet(lui: [string, number][], toi: [string, number][] | null, aujourdhui: string): JourCarnet[] {
  const sien = new Map(lui);
  const tien = new Map(toi ?? []);
  const debut = debutCarnet(aujourdhui);
  const out: JourCarnet[] = [];
  for (let i = 0; i < SEMAINES * 7; i++) {
    const jour = decaleJour(debut, i);
    const avenir = jour > aujourdhui;
    out.push({ jour, n: avenir ? 0 : (sien.get(jour) ?? 0), toi: avenir ? 0 : (tien.get(jour) ?? 0), avenir });
  }
  return out;
}

/** Les jours d'encre d'un côté (au moins `seuil` questions ; le seuil est le sien, appliqué aux deux). */
export const joursDEncre = (cases: JourCarnet[], seuil: number, qui: "lui" | "toi") => cases.filter((x) => (qui === "lui" ? x.n : x.toi) >= seuil).length;

/** Les 52 semaines : [lundi, ses questions, les tiennes], de la plus ancienne à la plus récente (le ruban). */
export function semainesCarnet(cases: JourCarnet[]): [string, number, number][] {
  const out: [string, number, number][] = [];
  for (let w = 0; w < cases.length / 7; w++) {
    const sem = cases.slice(w * 7, w * 7 + 7);
    out.push([sem[0].jour, sem.reduce((t, x) => t + x.n, 0), sem.reduce((t, x) => t + x.toi, 0)]);
  }
  return out;
}

/** Le score en semaines : celles où tu as fait plus de questions, celles où lui, les égalités (une semaine vide des deux côtés ne compte pas). */
export function scoreSemaines(semaines: [string, number, number][]): Score {
  return {
    toi: semaines.filter(([, l, t]) => t > l).length,
    lui: semaines.filter(([, l, t]) => l > t).length,
    egal: semaines.filter(([, l, t]) => l === t && l > 0).length,
  };
}

/** « mar. 7 oct. » */
const jourLong = (jour: string) => `${V.joursSemaine[new Date(jour + "T12:00:00Z").getUTCDay()]} ${jourCourt(jour)}`;

type Mode = "moi" | "autre" | "compare";

/** L'infobulle d'une case (rien pour un jour vide, sauf en comparaison : tu as pu y écrire). */
function bulleCase(x: JourCarnet, mode: Mode, nom: string, qui: "lui" | "toi" = "lui"): string | undefined {
  if (x.avenir) return undefined;
  if (mode === "compare") return V.jourCompare(jourLong(x.jour), nom, x.n, x.toi);
  const n = qui === "lui" ? x.n : x.toi;
  if (n <= 0) return undefined;
  return mode === "moi" ? JOURNAL.case(x.jour, n) : V.jourSeul(jourLong(x.jour), nom, n);
}

/** Une case de grille : à venir, encrée (son niveau), ou au trait. */
function Case({ x, mode, nom, qui = "lui" }: { x: JourCarnet; mode: Mode; nom: string; qui?: "lui" | "toi" }) {
  if (x.avenir) return <i data-f="" />;
  const n = qui === "lui" ? x.n : x.toi;
  const titre = bulleCase(x, mode, nom, qui);
  return n > 0 ? <i data-n={niveau(n)} title={titre} /> : <i title={titre} />;
}

/** La grille de 52 × 7 (une colonne par semaine, lundi en haut), et le ruban dessous s'il y a de quoi comparer. */
function GrilleRuban({ cases, mode, nom, semaines, variante }: { cases: JourCarnet[]; mode: Mode; nom: string; semaines: [string, number, number][] | null; variante: "tuile" | "heros" | "bande" | "demi" }) {
  return (
    <div className={k.carnet + " " + k[variante]}>
      <div className={k.grille} aria-hidden>
        {cases.map((x) => (
          <Case key={x.jour} x={x} mode={mode} nom={nom} />
        ))}
      </div>
      {semaines && (
        <div className={k.ruban}>
          <RubanSemaines semaines={semaines} nom={nom} />
        </div>
      )}
    </div>
  );
}

/** Un carnet vertical (la colonne) : 7 colonnes, une ligne par semaine, la plus récente en haut. */
function Vertical({ cases, mode, nom, qui, label }: { cases: JourCarnet[]; mode: Mode; nom: string; qui: "lui" | "toi"; label: string }) {
  const lignes: JourCarnet[] = [];
  for (let w = cases.length / 7 - 1; w >= 0; w--) lignes.push(...cases.slice(w * 7, w * 7 + 7));
  return (
    <div className={k.vertical} role="img" aria-label={label}>
      {lignes.map((x) => (
        <Case key={x.jour} x={x} mode={mode} nom={nom} qui={qui} />
      ))}
    </div>
  );
}

/** Le ruban des semaines à la verticale, entre les deux carnets de la colonne (la plus récente en haut). */
function RubanVertical({ semaines, nom }: { semaines: [string, number, number][]; nom: string }) {
  return (
    <div className={k.rubanV} aria-hidden>
      {[...semaines].reverse().map(([debut, lui, toi]) => (
        <span
          key={debut}
          style={{ background: toi > lui ? "var(--gain)" : lui > toi ? "var(--perte)" : "var(--line-2)" }}
          title={T.semaineBulle(jourSemaineCourt(debut), nom, lui, toi)}
        />
      ))}
    </div>
  );
}

/** Le score en semaines : « toi 21 – 31 » ; aperçu : « toi – – » ; visiteur non connecté : rien. */
function ScoreSemaines({ sc, d }: { sc: Score | null; d: DonneesBlocs }) {
  if (!d.toi) return <ScoreTuile s={null} d={d} />;
  if (!sc) return null;
  const bulle = V.scoreSemaines(sc.toi, sc.lui, sc.egal, d.nom);
  return (
    <span className={c.score} style={{ color: couleurSens(sensScore(sc)) }} title={bulle} aria-label={bulle}>
      toi {sc.toi} – {sc.lui}
    </span>
  );
}

/** Une mesure courte, sur une ligne : « Série 23 j −18 j ». */
function Ligne({ etiquette, valeur, jeton }: { etiquette: string; valeur: string; jeton?: React.ReactNode }) {
  return (
    <span className={k.ligne}>
      <span className={k.ligneEtiquette}>{etiquette}</span>
      <span className={k.ligneValeur}>{valeur}</span>
      {jeton}
    </span>
  );
}

/** Une mesure et son jeton : le jeton, son infobulle ; sans toi connecté, pas de jeton (et « pas encore mesuré » si toi l'est mais la valeur manque). */
type Mesure = { lui: number; e: Ecart | null; bulle?: string; titre?: string };
function mesure(d: DonneesBlocs, nom: string, lui: number, toi: number | null, nature: "jours" | "compte", dit: (n: number) => string): Mesure {
  const e = d.toi && toi !== null ? ecart(lui, toi, nature) : null;
  return { lui, e, bulle: e && toi !== null ? T.bulle(nom, d.nom, dit(lui), dit(toi)) : undefined, titre: d.toi && !e ? T.pasMesure : undefined };
}

// ── Chez un autre, Journal ouvert ─────────────────────────────────────────
function CarnetAutre({ d, f, carnet }: { d: DonneesBlocs; f: Format; carnet: ExtraitCarnet }) {
  const toi = d.toi ?? null;
  const seuil = carnet.seuil ?? 1;
  const cases = casesCarnet(carnet.jours, toi?.jours ?? null, carnet.aujourdhui);
  const mode: Mode = toi ? "compare" : "autre";
  const semaines = toi ? semainesCarnet(cases) : null;
  const sc = semaines ? scoreSemaines(semaines) : null;
  const encre = mesure(d, V.joursEncre, joursDEncre(cases, seuil, "lui"), toi ? joursDEncre(cases, seuil, "toi") : null, "jours", V.j);
  const serie = mesure(d, V.serie, carnet.serie, toi ? toi.stats.serie : null, "jours", V.j);
  const sept = mesure(d, V.septDerniers, questionsSur7(carnet.jours, carnet.aujourdhui), toi ? questionsSur7(toi.jours, toi.aujourdhui) : null, "compte", nombre);
  const score = <ScoreSemaines sc={sc} d={d} />;
  const court = (m: Mesure) => <Jeton e={m.e} d={d} bulle={m.bulle} forme="court" taille={12} />;

  if (f === "demi")
    return (
      <DemiBande label={V.carnetDeJours} dessin={<GrilleRuban cases={cases} mode={mode} nom={d.nom} semaines={semaines} variante="demi" />} droite={score}>
        <Cellule etiquette={V.carnet} chiffre={V.j(encre.lui)} jeton={<Jeton e={encre.e} d={d} bulle={encre.bulle} />} titre={encre.titre} />
        <Cellule etiquette={V.serie} chiffre={V.j(serie.lui)} jeton={<Jeton e={serie.e} d={d} bulle={serie.bulle} />} titre={serie.titre} />
      </DemiBande>
    );

  const grand = f === "heros" || f === "bande";
  const etiquette = <Etiquette f={f} icone={<Calendar size={17} aria-hidden />} titre={V.carnet} droite={score} />;
  const chiffre = (
    <span className={f === "bande" ? "flex flex-wrap items-baseline gap-x-4 gap-y-1" : "flex flex-col gap-1"}>
      <Chiffre f={f} titre={encre.titre}>
        {V.j(encre.lui)}
      </Chiffre>
      <Jeton e={encre.e} d={d} bulle={encre.bulle} taille={grand ? 16 : undefined} />
    </span>
  );
  const lSerie = <Ligne etiquette={V.serie} valeur={V.j(serie.lui)} jeton={court(serie)} />;
  const lSept = <Ligne etiquette={V.septJours} valeur={nombre(sept.lui)} jeton={court(sept)} />;

  if (f === "tuile")
    return (
      <Coque f={f} label={V.carnetDeJours}>
        {etiquette}
        {chiffre}
        <GrilleRuban cases={cases} mode={mode} nom={d.nom} semaines={semaines} variante="tuile" />
        {lSerie}
      </Coque>
    );
  if (f === "colonne")
    return (
      <Coque f={f} label={V.carnetDeJours}>
        {etiquette}
        {chiffre}
        <span className="flex flex-col gap-1">
          {lSerie}
          {lSept}
        </span>
        {/* deux carnets verticaux côte à côte, le ruban entre les deux */}
        <div className={k.colonnes}>
          <div className={k.pile}>
            <span className={k.tete}>{d.nom}</span>
            <Vertical cases={cases} mode={mode} nom={d.nom} qui="lui" label={V.carnetDe(d.nom)} />
          </div>
          {semaines && toi && (
            <>
              <div className={k.pile}>
                <span className={k.tete} aria-hidden>
                  {" "}
                </span>
                <RubanVertical semaines={semaines} nom={d.nom} />
              </div>
              <div className={k.pile} style={{ ["--encre" as string]: maCouleur(d) }}>
                <span className={k.tete}>{V.toi}</span>
                <Vertical cases={cases} mode={mode} nom={d.nom} qui="toi" label={V.tonCarnet} />
              </div>
            </>
          )}
        </div>
      </Coque>
    );
  if (f === "heros")
    return (
      <Coque f={f} label={V.carnetDeJours}>
        {etiquette}
        <div className={k.herosCorps}>
          <GrilleRuban cases={cases} mode={mode} nom={d.nom} semaines={semaines} variante="heros" />
          <div className="flex flex-col gap-2">
            {chiffre}
            {lSerie}
            {lSept}
          </div>
        </div>
      </Coque>
    );
  // bande : la série et les 7 jours en ligne au-dessus, la grille en pleine largeur, le ruban dessous
  return (
    <Coque f={f} label={V.carnetDeJours}>
      {etiquette}
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
        {chiffre}
        {lSerie}
        {lSept}
      </div>
      <GrilleRuban cases={cases} mode={mode} nom={d.nom} semaines={semaines} variante="bande" />
    </Coque>
  );
}

// ── Journal fermé (ou carnet non lu) : la série et le record, déjà publics ──
function CarnetFerme({ d, f, prive, edition }: { d: DonneesBlocs; f: Format; prive: boolean; edition: boolean }) {
  const toi = d.moi ? null : (d.toi ?? null);
  const serie = mesure(d, V.serie, d.stats.serie, toi ? toi.stats.serie : null, "jours", V.j);
  const record = mesure(d, V.record, d.stats.meilleureSerie, toi ? toi.stats.meilleureSerie : null, "jours", V.j);
  const mention = prive ? <span className={k.prive}>{V.carnetPrive}</span> : edition ? <span className="t-micro">{T.visiblePar(d.visibiliteJournal)}</span> : undefined;
  const jeton = (m: Mesure) => (d.moi ? undefined : <Jeton e={m.e} d={d} bulle={m.bulle} taille={f === "heros" || f === "bande" ? 16 : undefined} />);
  if (f === "demi")
    return (
      <DemiBande label={V.carnetDeJours} droite={mention}>
        <Cellule etiquette={V.serie} chiffre={V.j(serie.lui)} jeton={jeton(serie)} titre={serie.titre} />
        <Cellule etiquette={V.record} chiffre={V.j(record.lui)} jeton={jeton(record)} titre={record.titre} />
      </DemiBande>
    );
  return (
    <Coque f={f} label={V.carnetDeJours}>
      <Etiquette f={f} icone={<Calendar size={17} aria-hidden />} titre={V.carnet} droite={mention} />
      <div className={k.deuxMesures}>
        {([
          [V.serie, serie],
          [V.record, record],
        ] as [string, Mesure][]).map(([nom, m]) => (
          <span key={nom} className="flex flex-col gap-1">
            <span className={k.ligneEtiquette}>{nom}</span>
            <Chiffre f={f} titre={m.titre}>
              {V.j(m.lui)}
            </Chiffre>
            {jeton(m)}
          </span>
        ))}
      </div>
    </Coque>
  );
}

// ── Chez soi ──────────────────────────────────────────────────────────────
function CarnetMoi({ d, f, edition, carnet }: { d: DonneesBlocs; f: Format; edition: boolean; carnet: ExtraitCarnet }) {
  const seuil = carnet.seuil ?? 1;
  const cases = casesCarnet(carnet.jours, null, carnet.aujourdhui);
  const encre = joursDEncre(cases, seuil, "lui");
  const visible = edition ? <span className="t-micro">{T.visiblePar(d.visibiliteJournal)}</span> : undefined;
  if (f === "demi")
    return (
      <DemiBande label={V.carnetDeJours} dessin={<GrilleRuban cases={cases} mode="moi" nom={d.nom} semaines={null} variante="demi" />} droite={visible}>
        <Cellule etiquette={V.carnet} chiffre={V.j(encre)} petit={V.sur52} />
        <Cellule etiquette={V.serie} chiffre={V.j(carnet.serie)} petit={V.recordCourt(carnet.record)} />
      </DemiBande>
    );
  if (f === "tuile")
    return (
      <Coque f={f} label={V.carnetDeJours}>
        <Etiquette f={f} icone={<Calendar size={17} aria-hidden />} titre={V.carnetDeJours} />
        <GrilleRuban cases={cases} mode="moi" nom={d.nom} semaines={null} variante="tuile" />
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold tabular-nums">{V.dEncre(encre)}</span>
          <span className="t-small">{V.serieRecord(carnet.serie, carnet.record)}</span>
        </span>
        {edition && <p className="t-micro m-0 mt-auto">{T.visiblePar(d.visibiliteJournal)}</p>}
      </Coque>
    );
  // colonne, héros, bande : le carnet du Journal, tel quel
  return (
    <Coque f={f} label={V.carnetDeJours}>
      <CarnetJours jours={new Map(carnet.jours)} aujourdhui={carnet.aujourdhui} serie={carnet.serie} record={carnet.record} seuil={carnet.seuil} />
      {edition && <p className="t-micro m-0 mt-auto">{T.visiblePar(d.visibiliteJournal)}</p>}
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
  if (d.moi) return <CarnetMoi d={d} f={f} edition={edition} carnet={carnet} />;
  return <CarnetAutre d={d} f={f} carnet={carnet} />;
}
