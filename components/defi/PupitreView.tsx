"use client";

import Link from "next/link";
import { ArrowRight, Target, Zap } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { CeremonieSansFaute } from "@/components/adn/CeremonieSansFaute";
import { SignalLeonard } from "@/components/leonard/SignalLeonard";
import { CeremonieSceaux } from "@/components/profil/CeremonieSceaux";
import { DefiAiCopy } from "@/components/defi/DefiAiCopy";
import { SceauDefi } from "@/components/defi/SceauDefi";
import { BackLink, DefiBoard, DefiHeading, DefiHistory, Ticks } from "@/components/defi/parts";
import { HeroEpreuve, ListePodium, RangeeLieu, DepartCarte, LigneEpreuve } from "@/components/epreuves/Briques";
import { BandeEncre, RangeeLiens } from "@/components/ui/BandeEncre";
import { CarteLieu } from "@/components/ui/CarteLieu";
import { Illustration } from "@/components/ui/Illustration";
import { Medaillon, Sceau, TuileCalme } from "@/components/ui/Tuiles";
import { dayHref, reviewHref, timeLeftLabel, type DailyBoard, type DailyHistoryEntry, type DailyInfo, type DailyReviewItem, type TodayDaily } from "@/lib/daily";
import { ECLAIR_HREF } from "@/lib/eclair";
import { DEPART, PUPITRE as T } from "@/lib/voice-epreuves";
import { rangOrdinal } from "@/lib/voice-z2c";

// /defi (les 30 du jour) refait : « Le Pupitre ». La carte « lieu » porte
// l'action (commencer l'épreuve, ou revoir sa copie), le héros parle de toi
// (l'objectif du jour, ou ta copie rendue avec son rang), puis les deux
// épreuves voisines, la bande vers le duel, trois liens et, en bas, le
// classement du jour et les jours passés. À faire ou rendu seulement : la
// copie en cours et « pas de défi » restent à DefiToday. Les 5 du jour, eux,
// ont le départ minimal (DepartCinq). Sans requête : tout arrive en props.

type Props = {
  info: DailyInfo;
  board: DailyBoard | null;
  history: DailyHistoryEntry[];
  review: DailyReviewItem[];
  nowIso: string;
  /** les 5 du jour, pour la tuile voisine (null : lien neutre) */
  cinq?: TodayDaily | null;
  /** mes séries éclair rendues aujourd'hui (null : inconnu) */
  eclairToday?: number | null;
  onStart: () => void;
};

/** Ma moyenne sur les copies déjà rendues (les 14 dernières), null sans copie. */
function moyenneDe(history: DailyHistoryEntry[], jour: string): number | null {
  const joues = history.filter((h) => h.score !== null && h.day !== jour).slice(0, 14);
  if (joues.length === 0) return null;
  return Math.round(joues.reduce((s, h) => s + (h.score ?? 0), 0) / joues.length);
}

export function PupitreView({ info, board, history, review, nowIso, cinq = null, eclairToday = null, onStart }: Props) {
  const done = !!info.me?.finishedAt;
  const me = info.me;
  const n = info.questionCount;
  const rows = board?.rows ?? [];
  const podium = rows.length >= 3 ? rows[2].score : null;
  const moyenne = moyenneDe(history, info.day);
  const left = timeLeftLabel(info.closesAt, nowIso);
  const copies = board?.players ?? info.players;
  const total = me?.total ?? n;
  const score = me?.score ?? review.filter((r) => r.isCorrect).length;
  const rank = me?.rank ?? null;
  const joueurs = Math.max(board?.players ?? info.players, 1);
  const erreurs = review.length > 0 ? review.filter((r) => !r.isCorrect).length : Math.max(0, total - score);
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const top3 = rows.slice(0, 3).map((r) => ({ nom: r.username ?? "Joueur", note: `${r.score}/${r.total}`, pct: r.total > 0 ? (r.score / r.total) * 100 : 0, moi: r.isMe }));
  const dernierJoue = history.find((h) => h.finishedAt && h.day < info.today);
  const nbJoues = history.filter((h) => h.finishedAt).length;
  const resteCinq = cinq ? timeLeftLabel(cinq.closesAt, nowIso) : null;
  const image = <Illustration nom="defi-pupitre" position="85% 40%" />;

  return (
    <div className="rl-page">
      {done && info.isToday && (
        <>
          <SignalLeonard evt={pct >= 70 ? "defi-reussi" : "defi-rate"} vars={{ score: `${score}/${total}`, pct: `${pct} %` }} cle={"defi:" + info.day} delai={1800} />
          <CeremonieSansFaute score={score} total={total} epreuve="Défi du jour" cle={`defi:${info.format}:${info.day}`} rendueA={me?.finishedAt ?? null} />
        </>
      )}
      <div className="flex flex-col gap-7 md:gap-10">
        <DefiHeading day={info.day} today={info.today} isToday={info.isToday} format={info.format} />

        <div className="flex flex-col gap-4 md:gap-[18px]">
          <RangeeLieu
            droite={
              <CarteLieu
                visuel={image}
                vignette={image}
                marque={
                  <Sceau>
                    <Icone nom="examen" size={18} />
                  </Sceau>
                }
                nom={T.nom}
                sousTitre={T.sousTitre(n, Math.round(info.timeLimitSeconds / 60))}
                etat={done ? T.etatDone : T.etatTodo(left, info.playing)}
                action={done ? { href: reviewHref(info.day, undefined, info.format), label: T.revoir } : { href: "#", label: T.commencer, onClick: onStart }}
                label={T.nom}
              />
            }
            gauche={
              <>
                <HeroEpreuve
                  label={done ? "Ta copie du jour" : "Le tableau du jour"}
                  eyebrow={done ? T.copieDuJour : T.objectif}
                  titre={done ? T.rendu(score, total, rank !== null ? rangOrdinal(rank) : null, joueurs) : podium !== null ? T.podium(podium) : T.podiumLibre}
                  micro={T.microTodo(moyenne, n, copies)}
                  texte={
                    done
                      ? T.conseilDone(rank, podium !== null ? podium - score : null, erreurs)
                      : moyenne !== null
                        ? T.conseilTodo(moyenne, n, podium)
                        : T.conseilVide
                  }
                  actions={
                    <>
                      <Link href="#defi-classement" className="ink-link">
                        {T.tout}
                      </Link>
                      {done && <DefiAiCopy review={review} ctx={{ day: info.day, score, total, rank, players: joueurs }} layout="single" />}
                      {done && <SceauDefi day={info.day} taille={72} angle={-6} className="ml-auto" />}
                    </>
                  }
                  droite={top3.length > 0 ? <ListePodium titre={T.podiumTitre} items={top3} /> : undefined}
                />
                <div className="grid gap-4 md:gap-[18px] xl:grid-cols-2">
                  <TuileCalme
                    icone={<Target size={18} aria-hidden />}
                    surTitre={T.autreDefi(resteCinq)}
                    titre={T.cinq}
                    droite={<span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11.5px] font-semibold">≈ 2 min</span>}
                    ligne={cinq ? T.cinqLigne(cinq.players, cinq.topScore, cinq.questionCount) : T.cinqLigneNeutre}
                    actions={
                      <Link href={cinq?.href ?? "/defi/cinq"} className="btn btn-secondary rl-press min-h-[38px] px-3.5 text-[13.5px]">
                        {cinq?.status === "done" ? "Revoir" : cinq?.status === "playing" ? "Reprendre" : "Jouer"} <ArrowRight size={15} aria-hidden />
                      </Link>
                    }
                  />
                  <TuileCalme
                    icone={<Zap size={18} aria-hidden />}
                    surTitre={T.eclairSur}
                    titre={T.eclair}
                    droite={
                      <span aria-hidden className="block h-[56px] w-[72px] shrink-0 overflow-hidden rounded-[14px] border border-line bg-surface-2">
                        <Illustration nom="defi-eclair" position="center 40%" decorative />
                      </span>
                    }
                    ligne={T.eclairLigne(eclairToday)}
                    actions={
                      <Link href={ECLAIR_HREF} className="ink-link">
                        {T.eclairLancer}
                      </Link>
                    }
                  />
                </div>
              </>
            }
          />
          <BandeEncre icone={<Medaillon nom="duel-echecs" taille={48} position="50% 45%" />} titre={T.duelTitre} ligne={T.duelLigne} action={{ href: "/duel", label: T.duelAction }} />
          <RangeeLiens
            label={T.liensLabel}
            liens={[
              {
                href: dernierJoue ? dayHref(dernierJoue.day, info.format) : "#defi-jours",
                icon: <Icone nom="examen" size={20} />,
                title: T.copiesPassees,
                desc: T.copiesPasseesDesc,
                meta: nbJoues > 0 ? T.jours(nbJoues) : null,
              },
              { href: "/mock-exams", icon: <Icone nom="examen" size={20} />, title: T.examens, desc: T.examensDesc },
              { href: "/classement", icon: <Icone nom="classement" size={20} />, title: T.classement, desc: T.classementDesc },
            ]}
          />
        </div>
      </div>

      {done && info.isToday && <CeremonieSceaux className="mt-4 !max-w-none" />}

      {info.exists && (
        <section className="rl-section" aria-labelledby="defi-classement-titre" id="defi-classement">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="defi-classement-titre" className="t-h2 m-0">
              {T.classementDuJour}
            </h2>
            <span className="t-micro">{T.seFige}</span>
          </div>
          <DefiBoard board={board} isToday={info.isToday} closesAt={info.closesAt} nowIso={nowIso} limit={4} />
          {rows.length > 4 && (
            <details className="group">
              <summary className="ink-link w-fit cursor-pointer list-none">{T.voirCopies(rows.length)}</summary>
              <div className="pt-3">
                <DefiBoard board={board} isToday={info.isToday} closesAt={info.closesAt} nowIso={nowIso} limit={rows.length} />
              </div>
            </details>
          )}
        </section>
      )}
      <section className="rl-section" aria-label="Les jours passés" id="defi-jours">
        <DefiHistory entries={history} today={info.today} nowIso={nowIso} visible={3} format={info.format} />
      </section>
    </div>
  );
}

/**
 * /defi/cinq (les 5 du jour, à faire) : le départ minimal des épreuves
 * courtes (même carte que les séries éclair), puis le classement du jour et
 * les jours passés.
 */
export function DepartCinq({
  info,
  board,
  history,
  nowIso,
  eclairToday = null,
  onStart,
}: {
  info: DailyInfo;
  board: DailyBoard | null;
  history: DailyHistoryEntry[];
  nowIso: string;
  eclairToday?: number | null;
  onStart: () => void;
}) {
  const D = DEPART.cinq;
  const left = timeLeftLabel(info.closesAt, nowIso);
  return (
    <div className="rl-page">
      <div className="mx-auto grid w-full max-w-[680px] gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <BackLink href="/entrainement">{DEPART.retour}</BackLink>
          <p className="t-micro m-0">{left ?? T.seFige}</p>
        </div>
        <DepartCarte
          bandeau="cinq-depart"
          position="18% 22%"
          icone={<Zap size={14} aria-hidden />}
          kicker={D.kicker}
          titre={D.titre}
          traits={<Ticks marks={Array.from({ length: info.questionCount }, () => "todo" as const)} label={`${info.questionCount} traits à poser`} height={30} />}
          promesses={D.promesses}
          cta={{ label: D.lancer, onClick: onStart }}
          resume={info.players > 0 ? T.cinqLigne(info.players, info.topScore, info.questionCount) : null}
        />
        <LigneEpreuve
          href={ECLAIR_HREF}
          icone={<Zap size={17} aria-hidden />}
          titre={DEPART.lienEclair}
          sous={eclairToday !== null && eclairToday > 0 ? T.eclairLigne(eclairToday) : DEPART.lienEclairSous}
        />
      </div>
      {info.exists && (
        <section className="rl-section mx-auto w-full max-w-[680px]" aria-labelledby="defi-classement-titre" id="defi-classement">
          <h2 id="defi-classement-titre" className="t-h2 m-0">
            {T.classementDuJour}
          </h2>
          <DefiBoard board={board} isToday={info.isToday} closesAt={info.closesAt} nowIso={nowIso} limit={5} />
        </section>
      )}
      <section className="rl-section mx-auto w-full max-w-[680px]" aria-label="Les jours passés" id="defi-jours">
        <DefiHistory entries={history} today={info.today} nowIso={nowIso} visible={3} format={info.format} />
      </section>
    </div>
  );
}
