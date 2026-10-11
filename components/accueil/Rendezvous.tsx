import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { AnneauDuJour } from "@/components/adn/AnneauDuJour";
import { Batons } from "@/components/adn/Batons";
import { Icone } from "@/components/adn/icons";
import { InkBarCoches } from "@/components/adn/InkBarCoches";
import PctScore from "@/components/adn/PctScore";
import { SceauTenu } from "@/components/accueil/SceauTenu";
import { DefiTile } from "@/components/defi/DefiTile";
import { cinqVisible } from "@/components/defi/CinqCarte";
import { defiEnTete } from "@/components/defi/DefiHero";
import { BandeEncre, RangeeLiens } from "@/components/ui/BandeEncre";
import { Illustration } from "@/components/ui/Illustration";
import { RankBadge } from "@/components/ui/RankBadge";
import { TuileCalme } from "@/components/ui/Tuiles";
import { agoLabel, countdown, plural } from "@/components/accueil/format";
import { EXAM_SOON_DAYS } from "@/components/accueil/CompeteCards";
import { ouReprendre } from "@/components/accueil/HomeCards";
import type { AccueilData, TodayDaily } from "@/components/accueil/types";
import { reviewHref, rankLine, timeLeftLabel } from "@/lib/daily";
import { reviewLeftLabel } from "@/lib/duels";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { ACCUEIL, DUEL, ENCRE, SOMMET, joursEncre, jourJ, nombre, placement as placementLine, pointsAvant, retour, titreAccueil } from "@/lib/voice";
import { RDV } from "@/lib/voice-accueil";
import { MOI, REPRISE, TUILES, duelARevoir, ligneSerie, maitriseRequise, verrouCourt } from "@/lib/voice-z1";
import { joueurs, voixDefi } from "@/lib/voice-z2c";
import s from "./Rendezvous.module.css";

// Accueil « Le rendez-vous », dans l'ordre de ce qui compte le plus :
// 1. Les 30 du jour en héros (le rendez-vous de tous : l'état, les joueurs, la
//    meilleure copie, l'heure où ça se fige, l'action) ;
// 2. à droite, Les 5 du jour (la carte nette, son bouton), puis Tes traits du
//    jour (l'anneau, les bâtons, J-n) : ils restent dans le premier écran ;
// 3. dessous, « Reprendre » (le dernier trait) et le duel en tuiles calmes, le
//    rang en bande d'encre, une rangée de liens.
// Un seul bouton plein en haut de page : la première action pas encore faite
// dans l'ordre 30 du jour, 5 du jour, traits du jour. Si les 30 ne sont pas
// jouables (« bientôt », indisponibles), Les 5 prennent le héros ; sans les 5,
// la colonne de droite ne garde que les traits. Tout vient de AccueilData : ni
// nom ni chiffre écrits ici. Sans état (le sceau « TENU » est le seul morceau
// client).

const TITRE_HEROS: React.CSSProperties = { fontSize: "clamp(38px, 5.2vw, 68px)", lineHeight: 1.0, letterSpacing: "-0.038em" };

/** Un défi du jour à faire (à rendre ou en cours) : c'est lui qui peut porter le bouton plein. */
const aFaire = (x: TodayDaily | null | undefined): x is TodayDaily => !!x && (x.status === "todo" || x.status === "playing");
type Primaire = "trente" | "cinq" | "traits" | null;

/** Le bouton d'une carte : plein (le seul de la page) ou en contour. */
function Bouton({ href, plein, large = false, children }: { href: string; plein: boolean; large?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={"btn btn-lg rl-press " + (large ? "w-full " : "w-full sm:w-fit ") + (plein ? "btn-primary" : "btn-secondary")}>
      {children} <ArrowRight size={17} aria-hidden />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Les défis du jour : l'état, l'action                                */
/* ------------------------------------------------------------------ */

function Stat({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="t-micro m-0">{k}</dt>
      <dd className="m-0 mt-0.5 font-mono text-[20px] font-semibold leading-tight tabular-nums [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/** « dans 3 h » (timeLeftLabel dit « encore 3 h »), ou « ce soir » quand la fenêtre est close. */
function seFigeDans(daily: TodayDaily, nowIso: string) {
  const t = timeLeftLabel(daily.closesAt, nowIso);
  return t ? t.replace(/^encore /, RDV.trente.dans + " ") : RDV.trente.ceSoir;
}

/** L'état d'un défi (à rendre, en cours, rendu) en quelques chiffres, et son action. */
function etatDefi(d: AccueilData, daily: TodayDaily): { stats: React.ReactNode; action: { href: string; label: string } } {
  const cinq = daily.format === "cinq";
  const DEFI = voixDefi(daily.format);
  const T = RDV.trente;
  const total = daily.total ?? daily.questionCount;
  const fige = <Stat k={T.seFige}>{seFigeDans(daily, d.nowIso)}</Stat>;

  if (daily.status === "done") {
    return {
      stats: (
        <dl className="m-0 flex flex-wrap gap-x-7 gap-y-3">
          <Stat k={T.tonScore}>
            <span className="inline-flex items-baseline gap-2">
              {daily.score}/{total}
              <PctScore justes={daily.score} total={total} className="text-[13px]" />
            </span>
          </Stat>
          <Stat k={T.tonRang}>{rankLine(daily.rank, daily.players) ?? "—"}</Stat>
          {fige}
        </dl>
      ),
      action: { href: reviewHref(daily.day, undefined, daily.format), label: cinq ? RDV.cinq.revoir : DEFI.revoir },
    };
  }
  if (daily.status === "playing") {
    const chrono = daily.deadline ? timeLeftLabel(daily.deadline, d.nowIso) : null;
    return {
      stats: (
        <div className="flex min-w-0 flex-col gap-3">
          <span className="flex min-w-0 max-w-[420px] items-center gap-2.5">
            <InkBarCoches items={Array.from({ length: daily.questionCount }, (_, i) => (i < daily.answered ? true : null))} height={16} label={DEFI.tuile.repondues(daily.answered, daily.questionCount)} />
            <span aria-hidden className="shrink-0 font-mono text-[13px] tabular-nums text-muted">
              {daily.answered}/{daily.questionCount}
            </span>
          </span>
          <dl className="m-0 flex flex-wrap gap-x-7 gap-y-3">
            {chrono && <Stat k={T.chrono}>{chrono}</Stat>}
            {fige}
          </dl>
        </div>
      ),
      action: { href: daily.href, label: DEFI.tuile.reprendre },
    };
  }
  return {
    stats: (
      <dl className="m-0 flex flex-wrap gap-x-7 gap-y-3">
        <Stat k={T.joueurs}>{daily.players}</Stat>
        {daily.topScore !== null && daily.players > 0 && (
          <Stat k={T.meilleure}>
            {daily.topScore}/{daily.questionCount}
          </Stat>
        )}
        {fige}
      </dl>
    ),
    action: { href: daily.href, label: cinq ? RDV.cinq.jouer : T.rendre },
  };
}

/* ------------------------------------------------------------------ */
/* 1. Le héros : Les 30 du jour (ou, à défaut, Les 5 du jour)          */
/* ------------------------------------------------------------------ */
type ItemListe = { href: string; libelle: string; aside: React.ReactNode; cacheTel?: boolean };

/** « Aujourd'hui » : ce qui attend, au plus trois lignes (défi reçu, ami, examen proche, ratures). */
function lignesAujourdhui(d: AccueilData): ItemListe[] {
  const out: ItemListe[] = [];
  const x = d.incomingDuel;
  if (x) {
    out.push(
      x.kind === "incoming"
        ? { href: `/duel/${x.id}`, libelle: `${x.from ?? "Un joueur"} te défie`, aside: RDV.liste.aTonTour }
        : { href: `/duel/${x.id}`, libelle: x.from ? `Contre ${x.from}` : TUILES.duelEnCours, aside: RDV.liste.aTerminer },
    );
  }
  if (d.demandesAmi) {
    const { n, premier } = d.demandesAmi;
    out.push({ href: "/people?view=amis", libelle: n > 1 ? `${n} demandes d'ami` : `${premier.name} veut être ton ami`, aside: RDV.liste.repondre });
  }
  const e = d.mockExam;
  if (e && e.daysLeft <= EXAM_SOON_DAYS) {
    out.push({ href: `/mock-exams/${e.id}`, libelle: `Examen blanc · ${countdown(e.daysLeft)}`, aside: e.registered ? RDV.liste.inscrit : RDV.liste.inscris });
  }
  if (d.errors.available && d.errors.total > 0) {
    const matieres = d.errors.bySubject.slice(0, 2).map((m) => m.short).join(" · ");
    out.push({
      href: d.errors.carnet ? "/moi?onglet=erreurs" : (d.errors.bySubject[0]?.href ?? "/fiches"),
      libelle: `${d.errors.total} ${plural(d.errors.total, "rature")} à revoir`,
      aside: matieres,
      cacheTel: true,
    });
  }
  return out.slice(0, 3);
}

/** Une courte liste classée dans le héros. */
function ListeClassee({ titre, items }: { titre: string; items: ItemListe[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="t-eyebrow">{titre}</p>
      <ol className="m-0 list-none divide-y divide-line p-0">
        {items.map((it, i) => (
          <li key={it.libelle} className={"min-w-0" + (it.cacheTel ? " max-md:hidden" : "")}>
            <Link href={it.href} className="rl-row group flex min-w-0 items-center gap-3 px-1 py-3">
              <span className={"w-4 shrink-0 font-mono text-[13px] font-semibold " + (i === 0 ? "text-white" : "text-muted")}>{i + 1}</span>
              <span className="line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold leading-snug [overflow-wrap:anywhere]">{it.libelle}</span>
              <span className="t-micro max-w-[45%] shrink-0 truncate" title={typeof it.aside === "string" ? it.aside : undefined}>
                {it.aside}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Le héros : un défi du jour en grand (titre, une ligne, l'état, l'action), la liste « Aujourd'hui » à côté. */
function HerosDefi({ d, daily, primaire }: { d: AccueilData; daily: TodayDaily; primaire: Primaire }) {
  const cinq = daily.format === "cinq";
  const T = cinq ? RDV.cinq : RDV.trente;
  const { stats, action } = etatDefi(d, daily);
  const liste = lignesAujourdhui(d);
  const plein = primaire === (cinq ? "cinq" : "trente");
  return (
    <section data-leonard="defi" aria-label={T.nom} className="card-hero rl-in flex min-w-0 flex-1 flex-col overflow-hidden" style={{ padding: 0 }}>
      {/* la seule grande image de l'écran */}
      <div className="shrink-0 overflow-hidden border-b border-line" style={{ height: "clamp(84px, 10vw, 150px)" }}>
        {cinq ? <Illustration nom="accueil-bandeau" position="50% 50%" eager /> : <Illustration nom="accueil-trente-du-jour" position="50% 34%" eager />}
      </div>
      <div className={"grid min-w-0 flex-1 gap-x-8 gap-y-6 p-6 md:p-8 " + (liste.length > 0 ? "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : "")}>
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="t-eyebrow">{d.dateLabel}</p>
            <h1 className="t-h1 m-0 [overflow-wrap:anywhere]" style={TITRE_HEROS}>
              {T.nom}
            </h1>
            <p className="t-body m-0 max-w-[420px] text-muted">{T.sousTitre}</p>
          </div>
          {stats}
          <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
            <Bouton href={action.href} plein={plein}>
              {action.label}
            </Bouton>
            {daily.status === "done" && (
              <Link href={daily.href} className="ink-link inline-flex items-center gap-1 text-[13.5px] font-semibold">
                {RDV.reprise.classement}
              </Link>
            )}
          </div>
        </div>
        <ListeClassee titre={TUILES.titre} items={liste} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Colonne de droite : Les 5 du jour, puis Tes traits du jour       */
/* ------------------------------------------------------------------ */

/** Les 5 du jour : une carte nette, son état en une ligne, son bouton. */
function CarteCinq({ d, daily, primaire }: { d: AccueilData; daily: TodayDaily; primaire: Primaire }) {
  const DEFI = voixDefi("cinq");
  const T = DEFI.tuile;
  const { action } = etatDefi(d, daily);
  const total = daily.total ?? daily.questionCount;
  let etat: string;
  let ligne: React.ReactNode;
  if (daily.status === "done") {
    etat = T.rendue;
    ligne = (
      <>
        <b className="font-mono font-semibold text-white">
          {daily.score}/{total}
        </b>
        <PctScore justes={daily.score} total={total} />
        {rankLine(daily.rank, daily.players) ? ` · ${rankLine(daily.rank, daily.players)}` : ""}
      </>
    );
  } else if (daily.status === "playing") {
    etat = timeLeftLabel(daily.deadline, d.nowIso) ?? T.etatEnCours;
    ligne = T.repondues(daily.answered, daily.questionCount);
  } else {
    etat = timeLeftLabel(daily.closesAt, d.nowIso) ?? T.etatAujourdhui;
    ligne = daily.players > 0 ? `${joueurs(daily.players)}${daily.topScore !== null ? ` · ${DEFI.meilleur(daily.topScore, daily.questionCount)}` : ""}` : T.bientot;
  }
  return (
    <section aria-label={RDV.cinq.nom} className="card rl-in flex min-w-0 flex-col gap-3.5 p-5 md:p-6" style={{ animationDelay: ".04s" }}>
      <div className="flex min-w-0 items-center gap-3.5">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-surface-2">
          <Icone nom="serie" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-micro m-0 truncate">
            {T.label} · {etat}
          </p>
          <h2 className="t-h2 m-0 mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {RDV.cinq.nom}
            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11.5px] font-semibold">{RDV.cinq.duree}</span>
          </h2>
        </div>
      </div>
      <p className="t-small m-0 [overflow-wrap:anywhere]">{ligne}</p>
      <Bouton href={action.href} plein={primaire === "cinq"} large>
        {action.label}
      </Bouton>
    </section>
  );
}

/** J-n · n jours d'encre, puis les bâtons de la série. */
function LigneSerie({ d }: { d: AccueilData }) {
  const jj = jourJ(d.examDaysLeft);
  const sec = d.dayState === "sec";
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <p className="t-micro m-0">
        {jj ? (
          <span title={d.examDateLabel ?? undefined} className="font-semibold text-white">
            {jj}
          </span>
        ) : (
          <Link href="/moi?onglet=reglages#date" className="font-semibold text-white underline decoration-line-2 underline-offset-4 hover:decoration-current">
            {MOI.fixeJourJ}
          </Link>
        )}
        {d.streak > 0 && <> · {joursEncre(d.streak)}</>}
      </p>
      {/* au retour après une absence, la série cassée ne s'affiche pas */}
      {!d.returning && (
        <div className="flex items-center gap-3.5">
          <span className="shrink-0">
            <Batons jours={d.streak} jour={d.dayState} height={26} max={4} />
          </span>
          <span className={"t-micro min-w-0 " + (sec ? "font-semibold text-white" : "")}>{ligneSerie(d.streak, d.dayState, d.seenBefore)}</span>
        </div>
      )}
    </div>
  );
}

/** Téléphone : la barre des traits du jour (le grand anneau est réservé à l'ordinateur). */
function BarreTraits({ d }: { d: AccueilData }) {
  const pctJour = Math.min(100, Math.round((d.activity.today / d.dailyGoal) * 100));
  return (
    <span data-leonard="anneau" className={s.tel + " w-full items-center gap-2.5"}>
      <span className="ink-bar block h-1.5 flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pctJour} aria-label={RDV.traits.nom}>
        <span style={{ width: `${pctJour}%` }} />
      </span>
      <span className="font-mono text-[12px] font-semibold tabular-nums">
        {d.activity.today}/{d.dailyGoal}
      </span>
    </span>
  );
}

/** Ordinateur : le grand anneau du jour, avec le sceau « TENU » quand la journée l'est. */
function AnneauGrand({ d, size }: { d: AccueilData; size: number }) {
  const tenu = d.activity.today >= d.dailyGoal;
  return (
    <div data-leonard="anneau" className={s.deskBloc + " self-center"}>
      <AnneauDuJour repondues={d.activity.today} objectif={d.dailyGoal} size={size} sceau={tenu ? <SceauTenu day={d.dayKey} /> : undefined} />
    </div>
  );
}

function titreDuJour(d: AccueilData) {
  return titreAccueil({ nom: d.name, repondues: d.activity.today, objectif: d.dailyGoal, heure: d.hour, serie: d.streak });
}

/** Le bouton plein des traits : la dernière fiche, le soir une seule question, ou le choix d'une fiche. */
function ActionTraits({ d }: { d: AccueilData }) {
  const r = d.resume;
  const soir = d.dayState === "sec" && d.streak > 0;
  const label = d.returning ? REPRISE.action : !r ? REPRISE.choisir : soir ? ENCRE.uneQuestion : RDV.traits.gagner;
  return (
    <Bouton href={r?.href ?? "/reviser"} plein large>
      {label}
    </Bouton>
  );
}

/** Tes traits du jour : l'anneau, les bâtons, J-n. Le bouton plein n'y vient qu'après les 30 et les 5. */
function CarteTraits({ d, primaire }: { d: AccueilData; primaire: Primaire }) {
  return (
    <section aria-label={RDV.traits.nom} className="card rl-in flex min-w-0 flex-1 flex-col gap-4 p-5 md:p-6" style={{ animationDelay: ".08s" }}>
      <div className="min-w-0">
        <p className="t-eyebrow">{RDV.traits.nom}</p>
        <h2 className="t-h2 m-0 mt-1.5 [overflow-wrap:anywhere]">{titreDuJour(d)}</h2>
      </div>
      <BarreTraits d={d} />
      <div className="my-auto flex justify-center">
        <AnneauGrand d={d} size={170} />
      </div>
      <LigneSerie d={d} />
      {primaire === "traits" && <ActionTraits d={d} />}
    </section>
  );
}

/** Sans défi jouable : les traits du jour prennent le héros (l'ancienne journée, sans la reprise). */
function HerosTraits({ d, primaire }: { d: AccueilData; primaire: Primaire }) {
  return (
    <section aria-label={RDV.traits.nom} className="card-hero rl-in flex min-w-0 flex-1 flex-col overflow-hidden" style={{ padding: 0 }}>
      <div className="shrink-0 overflow-hidden border-b border-line" style={{ height: "clamp(64px, 7vw, 100px)" }}>
        <Illustration nom="accueil-bandeau" position="50% 50%" eager />
      </div>
      <div className="grid min-w-0 gap-x-8 gap-y-4 p-6 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:p-8">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="t-eyebrow">{d.dateLabel}</p>
          <h1 className="t-h1 m-0 [overflow-wrap:anywhere]" style={TITRE_HEROS}>
            {titreDuJour(d)}
          </h1>
          <LigneSerie d={d} />
          <BarreTraits d={d} />
          {primaire === "traits" && <ActionTraits d={d} />}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <ListeClassee titre={TUILES.titre} items={lignesAujourdhui(d)} />
          <AnneauGrand d={d} size={170} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Deux tuiles calmes : reprendre, le duel                          */
/* ------------------------------------------------------------------ */

/** « Reprendre » : le dernier trait (fiche, QCM, module), sans bouton plein. */
function TuileReprise({ d }: { d: AccueilData }) {
  const r = d.resume;
  const now = Date.parse(d.nowIso);
  const lien = "ink-link inline-flex items-center gap-1 text-[13.5px] font-semibold";
  const entete = (droite?: string) => (
    <span className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">
      <Icone nom="fiche" size={15} />
      <span className="truncate">{RDV.reprise.titre}</span>
      {droite && <span className="ml-auto shrink-0 truncate font-medium">{droite}</span>}
    </span>
  );
  const coque = "card-quiet flex h-full min-w-0 flex-col p-5";

  if (d.returning) {
    // la variante « retour » : du texte simple et une action, sans « tu nous as manqué »
    const [titre, ...suite] = retour(r ? ouReprendre(r) : null).split(". ");
    return (
      <section aria-label={RDV.reprise.titre} className={coque}>
        {entete(r ? agoLabel(r.at, now) : undefined)}
        <span className="mt-3 block min-w-0">
          <span className="t-h3 block [overflow-wrap:anywhere]">{titre}.</span>
          <span className="t-micro mt-1 block [overflow-wrap:anywhere]">
            {suite.join(". ")}
            {r ? " Cinq questions pour te remettre en main." : ""}
          </span>
        </span>
        <span className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
          <Link href={r?.href ?? "/practice"} className={lien}>
            {REPRISE.action} <ArrowRight size={14} aria-hidden />
          </Link>
        </span>
      </section>
    );
  }

  if (!r) {
    const p = ACCUEIL.premierUsage;
    return (
      <section aria-label={RDV.reprise.titre} className={coque}>
        {entete(p.surTitre)}
        <span className="mt-3 block min-w-0">
          <span className="t-h3 block">{p.titre}</span>
          <span className="t-micro mt-1 block">{p.texte}</span>
        </span>
        <span className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
          <Link href="/reviser" className={lien}>
            {REPRISE.choisir} <ArrowRight size={14} aria-hidden />
          </Link>
          <Link href="/entrainement" className={lien}>
            {REPRISE.ouQcm}
          </Link>
        </span>
      </section>
    );
  }

  return (
    <section aria-label={RDV.reprise.titre} className={coque}>
      {entete(agoLabel(r.at, now))}
      <span className="mt-3 block min-w-0">
        <span className="t-h3 line-clamp-2 block [overflow-wrap:anywhere]">{r.title}</span>
        <span className="t-micro mt-1 line-clamp-2 block [overflow-wrap:anywhere]">
          {r.context}
          {r.total ? ` · ${r.done ?? 0}/${r.total} ${r.progressLabel}` : ""}
        </span>
      </span>
      <span className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
        <Link href={r.href} className={lien}>
          {r.cta} <ArrowRight size={14} aria-hidden />
        </Link>
        {r.audio && (
          <Link href={r.audio.href} title={r.audio.title} className={lien}>
            <Icone nom="cours" size={14} /> {r.audio.label}
          </Link>
        )}
      </span>
    </section>
  );
}

function TuileDuel({ d }: { d: AccueilData }) {
  const x = d.reviewDuel;
  const v = x ? duelARevoir({ gagne: x.won, moi: x.myScore, lui: x.theirScore, adversaire: x.opponentName, delta: x.myDelta }) : null;
  const n = x && x.myScore !== null ? Math.max(0, x.total - x.myScore) : 0;
  const quand = x ? (reviewLeftLabel(x.finishedAt, d.nowIso) ?? agoLabel(x.finishedAt, Date.parse(d.nowIso))) : null;
  return (
    <Link href={x ? `/duel/${x.id}?revue=1` : "/duel"} className="card-quiet rl-lift group relative flex h-full min-w-0 flex-col p-5">
      <span className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">
        <Icone nom="duel" size={15} />
        <span className="truncate">{x ? TUILES.duelRevoir : TUILES.duel}</span>
        {quand && <span className="ml-auto shrink-0 font-medium">{quand}</span>}
      </span>
      <span className="mt-3 flex items-center gap-3.5">
        <span aria-hidden className="block size-[52px] shrink-0 overflow-hidden rounded-full border border-line-2 bg-surface-2">
          <Illustration nom="accueil-duel" decorative />
        </span>
        <span className="min-w-0">
          <span className="t-h3 block">{v ? v.titre : RDV.duel.lancer}</span>
          <span className="t-micro mt-1 block">{v ? v.ligne : RDV.duel.lancerLigne}</span>
        </span>
      </span>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[13.5px] font-semibold">
        {x ? DUEL.revue(n) : DUEL.trouver} <ArrowRight size={14} aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
/* ------------------------------------------------------------------ */
/* Le rang en bande d'encre, la rangée de liens                        */
/* ------------------------------------------------------------------ */

function BandeRang({ d }: { d: AccueilData }) {
  const { rating, mastery } = d;
  const r = rankFor(rating.elo, mastery, rating.leaderboardRank);
  const enPlacement = rating.gamesPlayed < PLACEMENT_GAMES;
  const nom = `${r.tier.name}${r.division ? " " + r.division : ""}`;
  const icone = <RankBadge tier={r.tierIndex} size={40} mastery={mastery} division={enPlacement ? null : r.division} onDark gray={enPlacement} />;

  if (enPlacement) {
    return (
      <BandeEncre
        icone={icone}
        titre={RDV.rang.pasClasse}
        ligne={placementLine(rating.gamesPlayed, PLACEMENT_GAMES)}
        action={{ href: "/duel", label: RDV.rang.lancer }}
      />
    );
  }

  // palier bloqué par la maîtrise : c'est le verrou du palier juste au-dessus qui compte
  const blocker = r.lockedBy ? (r.next ?? r.lockedBy) : null;
  const avant = blocker ? (
    <>
      <Lock size={12} aria-hidden className="mr-1 inline align-[-1px]" />
      {verrouCourt(blocker.name, blocker.lock ?? 0)}
    </>
  ) : r.next && r.pointsToNext !== null ? (
    pointsAvant(r.pointsToNext, r.next.name) + (r.next.lock !== null && mastery < r.next.lock ? ` · ${maitriseRequise(r.next.lock)}` : "")
  ) : (
    SOMMET
  );
  const dernier = rating.last && rating.last.delta !== 0 ? `${rating.last.delta > 0 ? "+" : "−"}${Math.abs(rating.last.delta)} au dernier duel` : null;
  const place = rating.leaderboardRank ? `${rating.leaderboardRank === 1 ? "1er" : rating.leaderboardRank + "e"} du classement` : null;
  return (
    <BandeEncre
      icone={icone}
      titre={`${nom} · ${nombre(rating.elo)} ELO`}
      ligne={
        <>
          {place && <>{place} · </>}
          {avant}
          {dernier && <> · {dernier}</>}
        </>
      }
      action={{ href: "/classement", label: RDV.rang.voir }}
    />
  );
}

function LiensDuJour({ d }: { d: AccueilData }) {
  const p = d.pointFaible;
  const audio = d.resume?.audio ?? null;
  // « Equity · module 3, Market Efficiency » : le domaine de la reprise, le module, son titre
  const domaine = d.resume?.context.split(" · ")[0];
  const leModule = audio?.label.replace(/^Écouter (le|la|l')\s*/i, "");
  return (
    <RangeeLiens
      label={RDV.liens.label}
      liens={[
        {
          href: p && p.action !== "voir" ? "/atelier" : "/moi?onglet=stats#points-faibles",
          icon: <Icone nom="entrainer" size={20} />,
          title: RDV.liens.pointFaible,
          desc: p ? `${p.libelle} · ${p.action === "atelier" ? RDV.liens.pointFaibleAtelier : p.action === "reprendre" ? RDV.liens.pointFaibleEnCours : p.repere}` : RDV.liens.pointFaibleVide,
        },
        {
          href: audio?.href ?? "/courses",
          icon: <Icone nom="cours" size={20} />,
          title: RDV.liens.cours,
          desc: audio ? `${[domaine, leModule].filter(Boolean).join(" · ")}, ${audio.title}` : RDV.liens.coursVide,
        },
        { href: "/people?view=amis", icon: <Icone nom="moi" size={20} />, title: RDV.liens.amis, desc: RDV.liens.amisLigne },
      ]}
    />
  );
}


function TuilesCalmes({ d, trenteCalme }: { d: AccueilData; trenteCalme: TodayDaily | null }) {
  return (
    <div className={"rl-in grid gap-4 md:grid-cols-2 md:gap-[18px] " + (trenteCalme ? "lg:grid-cols-3" : "")} style={{ animationDelay: ".1s" }}>
      <TuileReprise d={d} />
      <TuileDuel d={d} />
      {trenteCalme && (
        <div data-leonard="defi" className="md:max-lg:col-span-2">
          <DefiTile daily={trenteCalme} nowIso={d.nowIso} actionEnBas className="h-full" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* L'ensemble                                                          */
/* ------------------------------------------------------------------ */

/** Les 30 du jour en héros, les 5 et les traits à droite, puis reprendre et le duel, le rang, les liens. */
export function Rendezvous({ d }: { d: AccueilData }) {
  const daily = d.daily;
  const cinq = cinqVisible(d.cinq) ? d.cinq : null;
  const trente = daily && defiEnTete(daily) ? daily : null;
  // les 30 d'abord ; « bientôt » ou indisponibles, Les 5 prennent le héros
  const defiHeros = trente ?? cinq;
  const cinqColonne = trente ? cinq : null;
  // « bientôt » ou indisponibles : la tuile calme du défi, sans bouton, sous les traits (ou en troisième tuile sans colonne)
  const trenteCalme = daily && !trente ? daily : null;
  const primaire: Primaire = aFaire(trente) ? "trente" : aFaire(cinq) ? "cinq" : d.activity.today < d.dailyGoal ? "traits" : null;
  const colonne = !!defiHeros;
  return (
    <div className="flex flex-col gap-4 md:gap-[18px]">
      <div className="grid gap-4 md:gap-[18px] lg:grid-cols-12">
        <div className={"flex min-w-0 flex-col " + (colonne ? "lg:col-span-8" : "lg:col-span-12")}>
          {defiHeros ? <HerosDefi d={d} daily={defiHeros} primaire={primaire} /> : <HerosTraits d={d} primaire={primaire} />}
        </div>
        {colonne && (
          <div className="flex min-w-0 flex-col gap-4 md:gap-[18px] lg:col-span-4">
            {cinqColonne && <CarteCinq d={d} daily={cinqColonne} primaire={primaire} />}
            {defiHeros && <CarteTraits d={d} primaire={primaire} />}
            {trenteCalme && (
              <div data-leonard="defi">
                <DefiTile daily={trenteCalme} nowIso={d.nowIso} actionEnBas className="h-full" />
              </div>
            )}
          </div>
        )}
      </div>
      <TuilesCalmes d={d} trenteCalme={colonne ? null : trenteCalme} />
      <BandeRang d={d} />
      <LiensDuJour d={d} />
    </div>
  );
}
