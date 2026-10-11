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
import { CarteLieu } from "@/components/ui/CarteLieu";
import { Illustration } from "@/components/ui/Illustration";
import { RankBadge } from "@/components/ui/RankBadge";
import { agoLabel, countdown, plural } from "@/components/accueil/format";
import { EXAM_SOON_DAYS } from "@/components/accueil/CompeteCards";
import { ouReprendre } from "@/components/accueil/HomeCards";
import type { AccueilData } from "@/components/accueil/types";
import { reviewHref, rankLine, timeLeftLabel } from "@/lib/daily";
import { reviewLeftLabel } from "@/lib/duels";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { ACCUEIL, DUEL, ENCRE, SOMMET, joursEncre, jourJ, nombre, placement as placementLine, pointsAvant, retour, titreAccueil } from "@/lib/voice";
import { RDV } from "@/lib/voice-accueil";
import { REPRISE, TUILES, duelARevoir, ligneSerie, maitriseRequise, verrouCourt } from "@/lib/voice-z1";
import { voixDefi } from "@/lib/voice-z2c";
import s from "./Rendezvous.module.css";

// Accueil « Le rendez-vous » : la journée en héros, coiffée d'un bandeau peint
// et du grand anneau ; le rendez-vous de tous, Les 30 du jour, en carte
// « lieu » illustrée (comme l'Atelier) ; deux tuiles calmes (les 5 du jour, le
// duel à revoir) ; le rang en bande d'encre ; une rangée de liens. Tout vient
// de AccueilData : ni nom ni chiffre écrits ici. Sans état (le sceau « TENU »
// est le seul morceau client).

const TITRE_HEROS: React.CSSProperties = { fontSize: "clamp(34px, 4.4vw, 54px)", lineHeight: 1.02, letterSpacing: "-0.035em" };
const LIEU = "lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:self-start xl:self-stretch";

/* ------------------------------------------------------------------ */
/* Le héros : la journée                                               */
/* ------------------------------------------------------------------ */

/** Titre, jour J, bâtons de la série. */
function EnTeteJour({ d }: { d: AccueilData }) {
  const titre = titreAccueil({ nom: d.name, repondues: d.activity.today, objectif: d.dailyGoal, heure: d.hour, serie: d.streak });
  const jj = jourJ(d.examDaysLeft);
  const sec = d.dayState === "sec";
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="t-eyebrow">{d.dateLabel}</p>
      <h1 className="t-h1 m-0 [overflow-wrap:anywhere]" style={TITRE_HEROS}>
        {titre}
      </h1>
      <p className="t-micro m-0">
        {jj ? (
          <span title={d.examDateLabel ?? undefined} className="font-semibold text-white">
            {jj}
          </span>
        ) : (
          <Link href="/moi?onglet=reglages#date" className="font-semibold text-white underline decoration-line-2 underline-offset-4 hover:decoration-current">
            Fixe ton jour J
          </Link>
        )}
        {d.streak > 0 && <> · {joursEncre(d.streak)}</>}
      </p>
      {/* au retour après une absence, la série cassée ne s'affiche pas */}
      {!d.returning && (
        <div className="mt-1 flex items-center gap-3.5">
          <span className="shrink-0">
            <Batons jours={d.streak} jour={d.dayState} height={26} max={4} />
          </span>
          <span className={"t-micro min-w-0 " + (sec ? "font-semibold text-white" : "")}>{ligneSerie(d.streak, d.dayState, d.seenBefore)}</span>
        </div>
      )}
    </div>
  );
}

/** La prochaine action : reprendre le quiz, premier usage, ou la variante « retour ». */
function ActionReprise({ d }: { d: AccueilData }) {
  const r = d.resume;
  const now = Date.parse(d.nowIso);
  const evening = d.dayState === "sec" && d.streak > 0;
  const bouton = "btn btn-primary rl-press w-fit " + s.bouton;

  if (d.returning) {
    // la variante « retour » : du texte simple et une action, sans « tu nous as manqué »
    const [titre, ...suite] = retour(r ? ouReprendre(r) : null).split(". ");
    return (
      <>
        <div className="grid gap-1.5">
          {r && <p className="t-micro m-0 font-semibold">{ACCUEIL.repriseSurTitre(agoLabel(r.at, now))}</p>}
          <p className="t-body m-0 max-w-[480px] text-muted">
            <b className="font-semibold text-white">{titre}.</b> {suite.join(". ")}
            {r ? " Cinq questions pour te remettre en main." : ""}
          </p>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
          <Link href={r?.href ?? "/practice"} className={bouton}>
            {REPRISE.action} <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </>
    );
  }

  if (!r) {
    const p = ACCUEIL.premierUsage;
    return (
      <>
        <div className="grid gap-1.5">
          <p className="t-micro m-0 font-semibold">{p.surTitre}</p>
          <p className="t-body m-0 max-w-[480px] text-muted">
            <b className="font-semibold text-white">{p.titre}</b> {p.texte}
          </p>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
          <Link href="/reviser" className={bouton}>
            {REPRISE.choisir} <ArrowRight size={16} aria-hidden />
          </Link>
          <Link href="/entrainement" className="ink-link inline-flex items-center gap-1 text-[13px] font-semibold">
            {REPRISE.ouQcm}
          </Link>
        </div>
      </>
    );
  }

  const pct = r.total ? Math.min(100, Math.round(((r.done ?? 0) / r.total) * 100)) : null;
  return (
    <>
      <div className="grid gap-1.5">
        <p className="t-body m-0 max-w-[480px] text-muted">
          Ton dernier trait, {agoLabel(r.at, now)} : <b className="font-semibold text-white">{r.title}</b>
          {r.total ? `, ${r.done ?? 0}/${r.total} ${r.progressLabel}` : ""}.
        </p>
        <p className="t-small m-0">
          {r.context}
          {pct !== null ? ` · ${pct} %` : ""}
        </p>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
        <Link href={r.href} className={bouton}>
          {/* le soir, rien encore : une seule petite action pour garder l'encre */}
          {evening ? ENCRE.uneQuestion : r.cta} <ArrowRight size={16} aria-hidden />
        </Link>
        {r.audio && (
          <Link href={r.audio.href} title={r.audio.title} className="ink-link inline-flex items-center gap-1.5 text-[13px] font-semibold">
            <Icone nom="cours" size={14} /> {r.audio.label}
          </Link>
        )}
      </div>
    </>
  );
}

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
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{it.libelle}</span>
              <span className="t-micro shrink-0">{it.aside}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Heros({ d, leonardDefi }: { d: AccueilData; leonardDefi: boolean }) {
  const pctJour = Math.min(100, Math.round((d.activity.today / d.dailyGoal) * 100));
  const tenu = d.activity.today >= d.dailyGoal;
  return (
    <section data-leonard={leonardDefi ? "defi" : undefined} className="card-hero rl-in min-w-0 overflow-hidden" aria-label="Ta journée" style={{ padding: 0 }}>
      <div className="overflow-hidden border-b border-line" style={{ height: "clamp(64px, 7vw, 100px)" }}>
        <Illustration nom="accueil-bandeau" position="50% 50%" eager />
      </div>
      <div className="grid min-w-0 gap-x-8 gap-y-4 p-6 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:p-8">
        <div className="flex min-w-0 flex-col gap-4">
          <EnTeteJour d={d} />
          {/* téléphone : la barre des traits du jour (le grand anneau est réservé à l'ordinateur) */}
          <span data-leonard="anneau" className={s.tel + " max-w-[360px] items-center gap-2.5"}>
            <span className="ink-bar block h-1.5 flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pctJour} aria-label="Traits du jour">
              <span style={{ width: `${pctJour}%` }} />
            </span>
            <span className="font-mono text-[12px] font-semibold tabular-nums">
              {d.activity.today}/{d.dailyGoal}
            </span>
          </span>
          <ActionReprise d={d} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <ListeClassee titre={TUILES.titre} items={lignesAujourdhui(d)} />
          <div data-leonard="anneau" className={s.deskBloc + " self-center"}>
            <AnneauDuJour repondues={d.activity.today} objectif={d.dailyGoal} size={170} sceau={tenu ? <SceauTenu day={d.dayKey} /> : undefined} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Le rendez-vous de tous : Les 30 du jour                             */
/* ------------------------------------------------------------------ */

function Ligne({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <span className="flex justify-between gap-3 py-1.5">
      <span>{k}</span>
      <b className="font-mono font-semibold">{v}</b>
    </span>
  );
}

/** La carte « lieu » des 30 du jour : à rendre, en cours ou rendue. */
function CarteTrente({ d, className }: { d: AccueilData; className: string }) {
  const daily = d.daily!;
  const DEFI = voixDefi(daily.format);
  const T = RDV.trente;
  const seFige = timeLeftLabel(daily.closesAt, d.nowIso) ?? T.ceSoir;
  const total = daily.total ?? daily.questionCount;
  let etat: React.ReactNode;
  let action: { href: string; label: string };

  if (daily.status === "done") {
    etat = (
      <span className="flex flex-col divide-y divide-line">
        <Ligne
          k={T.tonScore}
          v={
            <span className="inline-flex items-baseline gap-2">
              {daily.score}/{total}
              <PctScore justes={daily.score} total={total} className="text-[12px]" />
            </span>
          }
        />
        <Ligne k={T.tonRang} v={rankLine(daily.rank, daily.players) ?? "—"} />
        <Ligne k={T.seFige} v={seFige} />
      </span>
    );
    action = { href: reviewHref(daily.day, undefined, daily.format), label: DEFI.revoir };
  } else if (daily.status === "playing") {
    etat = (
      <span className="flex flex-col divide-y divide-line">
        <span className="flex items-center gap-2.5 py-1.5">
          <InkBarCoches items={Array.from({ length: daily.questionCount }, (_, i) => (i < daily.answered ? true : null))} height={14} label={DEFI.tuile.repondues(daily.answered, daily.questionCount)} />
          <span aria-hidden className="shrink-0 font-mono text-[12px] tabular-nums text-muted">
            {daily.answered}/{daily.questionCount}
          </span>
        </span>
        {daily.deadline && timeLeftLabel(daily.deadline, d.nowIso) && <Ligne k="Chrono" v={timeLeftLabel(daily.deadline, d.nowIso)} />}
        <Ligne k={T.seFige} v={seFige} />
      </span>
    );
    action = { href: daily.href, label: DEFI.tuile.reprendre };
  } else {
    etat = (
      <span className="flex flex-col divide-y divide-line">
        <Ligne k={T.joueurs} v={daily.players} />
        {daily.topScore !== null && daily.players > 0 && <Ligne k={T.meilleure} v={`${daily.topScore}/${daily.questionCount}`} />}
        <Ligne k={T.seFige} v={seFige} />
      </span>
    );
    action = { href: daily.href, label: T.rendre };
  }

  return (
    <CarteLieu
      dataLeonard="defi"
      className={className}
      label={T.nom}
      visuel={<Illustration nom="accueil-trente-du-jour" position="50% 40%" />}
      vignette={<Illustration nom="accueil-trente-du-jour" position="42% 40%" decorative />}
      marque={
        <span aria-hidden className="grid size-[26px] shrink-0 place-items-center rounded-full bg-surface-2 lg:size-[44px]">
          <Icone nom="examen" size={18} />
        </span>
      }
      nom={T.nom}
      sousTitre={T.sousTitre}
      etat={etat}
      action={{ ...action, icon: <Icone nom="examen" size={18} /> }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Deux tuiles calmes : les 5 du jour, le duel à revoir                */
/* ------------------------------------------------------------------ */

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

function TuilesCalmes({ d }: { d: AccueilData }) {
  const cinq = cinqVisible(d.cinq) ? d.cinq : null;
  return (
    <div className={"rl-in grid gap-4 md:gap-[18px] " + (cinq ? "md:grid-cols-2" : "")} style={{ animationDelay: ".06s" }}>
      {cinq && <DefiTile daily={cinq} nowIso={d.nowIso} actionEnBas icone="serie" />}
      <TuileDuel d={d} />
    </div>
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

/* ------------------------------------------------------------------ */
/* L'ensemble                                                          */
/* ------------------------------------------------------------------ */

/** Héros + les 30 du jour + tuiles, puis la bande du rang et les liens. */
export function Rendezvous({ d }: { d: AccueilData }) {
  const daily = d.daily;
  const lieuJeu = !!daily && defiEnTete(daily);
  // téléphone : avec un quiz en cours, les 30 du jour passent après le héros et les tuiles
  const apres = d.resume ? s.lieuApres + " " : "";
  return (
    <div className="flex flex-col gap-4 md:gap-[18px]">
      <div className="grid gap-4 md:gap-[18px] lg:grid-cols-12">
        {daily &&
          (lieuJeu ? (
            <CarteTrente d={d} className={apres + LIEU} />
          ) : (
            // « bientôt » ou indisponible : la tuile calme du défi, sans bouton
            <div data-leonard="defi" className={apres + LIEU}>
              <DefiTile daily={daily} nowIso={d.nowIso} actionEnBas className="h-full" />
            </div>
          ))}
        <div className={"flex min-w-0 flex-col gap-4 md:gap-[18px] lg:col-start-1 lg:row-start-1 " + (daily ? "lg:col-span-8" : "lg:col-span-12")}>
          <Heros d={d} leonardDefi={!daily} />
          <TuilesCalmes d={d} />
        </div>
      </div>
      <BandeRang d={d} />
      <LiensDuJour d={d} />
    </div>
  );
}
