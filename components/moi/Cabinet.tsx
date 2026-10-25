import { largeurBrand } from "@/lib/largeur-brand";
import Link from "next/link";
import { ArrowRight, Bookmark, Eye, Palette, PenLine, Settings2, UserRound } from "lucide-react";
import { SceauPerso } from "@/components/adn/SceauPerso";
import { Icone } from "@/components/adn/icons";
import { Avatar } from "@/components/classement/Avatar";
import { daysUntil, fmtInt, ordinal } from "@/components/classement/format";
import { subjectByKey } from "@/components/reviser/catalog";
import { libellePct } from "@/lib/maitrise";
import { BoutonPlein, HerosMoi, ListeClassee } from "@/components/moi/Briques";
import { Detail } from "@/components/moi/Clients";
import { PointsFaiblesEtAteliers, ActivityCard, vuesMatieres } from "@/components/moi/StatsSection";
import { AnswerStatsCard } from "@/components/moi/AnswerStatsCard";
import { SessionHistory } from "@/components/moi/SessionHistory";
import { TrajectoirePanel } from "@/components/objectif/TrajectoirePanel";
import { CardLabel } from "@/components/ui/Titles";
import { BandeEncre, RangeeLiens } from "@/components/ui/BandeEncre";
import { CarteLieu } from "@/components/ui/CarteLieu";
import { Illustration } from "@/components/ui/Illustration";
import { RankBadge } from "@/components/ui/RankBadge";
import { TuileCalme } from "@/components/ui/Tuiles";
import { SalleDesTrophees } from "@/components/trophees/SalleDesTrophees";
import { BlocCodex, TuileCodex } from "@/components/moi/CodexMoi";
import { CURRENT_DOMAIN, CURRENT_PROGRAM } from "@/lib/domains";
import { PLACEMENT_GAMES, TIERS, rankFor } from "@/lib/ranks";
import { hrefOnglet } from "@/lib/profil/onglets";
import { jourJ, joursEncre } from "@/lib/voice";
import { MOI, SOURCES_RATURE } from "@/lib/voice-z1";
import { CAB } from "@/lib/voice-moi";
import { compter } from "@/lib/trophees";
import type { MoiData } from "@/components/moi/types";
import s from "@/components/moi/Moi.module.css";

// L'espace Moi (variante B « Le Cabinet ») : Moi devient ton cabinet de
// travail. Le héros est ton carnet de ratures (repli : ton objectif d'ici
// l'examen quand le carnet est vide) ; le lieu illustré, « Ton cabinet »,
// porte ton pseudo ; les tuiles calmes : le Codex d'abord (son entrée, depuis
// qu'il a quitté la barre), puis l'objectif ou le carnet, et les marquées ; le
// rang a la bande d'encre ; une rangée de liens ; la Salle des trophées et le
// bloc « Codex » (historique replié) ; « Tes points faibles » ;
// « Tes matières » sous le bandeau du cabinet de curiosités ; « Le détail »
// replié. Composant de présentation : tout vient des props.

const ONGLET = (o: string) => `/moi?onglet=${o}`;
const SOURCES: Record<string, string> = Object.fromEntries(SOURCES_RATURE);
const GAP = "gap-4 md:gap-[18px]";

/** Le visage : la photo, sinon le sceau d'initiales. */
function Visage({ d, taille }: { d: MoiData; taille: number }) {
  return d.avatarUrl ? <Avatar src={d.avatarUrl} name={d.name} size={taille} className="shrink-0" /> : <SceauPerso nom={d.name} taille={taille} className="shrink-0" />;
}

/** Tout ce que la page lit dans les données, une fois. */
function lire(d: MoiData, now?: number) {
  const j = d.examDate ? daysUntil(d.examDate, now) : null;
  const jj = jourJ(j);
  const examen = d.examDate ? new Date(d.examDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }) : null;
  const rank = rankFor(d.me.elo, d.me.mastery, d.me.leaderboardRank);
  const placement = d.me.gamesPlayed < PLACEMENT_GAMES;
  const palier = placement ? `Placement ${d.me.gamesPlayed}/${PLACEMENT_GAMES}` : `${rank.tier.name}${rank.division ? " " + rank.division : ""}`;
  const faibles = d.topics
    .filter((t) => t.pct !== null)
    .sort((a, b) => (a.pct as number) - (b.pct as number))
    .slice(0, 3)
    .map((t) => ({ key: t.key, nom: subjectByKey(t.key)?.name ?? t.label, pct: t.pct as number, valeur: libellePct(t) ?? `${t.pct} %` }));
  const r = d.ratures.available && d.ratures.total > 0 ? d.ratures : null;
  const source = r ? (Object.entries(r.sources).sort((a, b) => b[1] - a[1])[0] ?? null) : null;
  const o = d.objectif.etat === "trajectoire" ? d.objectif.t : null;
  const obj = o
    ? {
        fait: o.avant + o.jour,
        total: o.total,
        ecart: Math.round(o.avant - o.ideal),
        quotidien: o.plan.quotidien,
        reste: Math.max(0, o.plan.quotidien - o.jour),
        rythme: Math.round(o.rythme),
        projection: Math.round(o.projection),
      }
    : null;
  // ratures au carnet, d'où qu'elles viennent (repli : l'ancien carnet des fiches)
  const nRatures = d.ratures.available ? d.ratures.total : d.errors.available ? d.errors.total : 0;
  // les marquées : les questions, et les flashcards quand leur table répond
  const nCartesMarquees = d.nCartesMarquees ?? 0;
  return { jj, examen, rank, placement, palier, faibles, r, source: source ? { nom: SOURCES[source[0]] ?? source[0], n: source[1] } : null, obj, marquees: d.marquees.items.length, nCartesMarquees, nRatures };
}
type Lu = ReturnType<typeof lire>;

/** Le héros « objectif » : repli du carnet quand il est vide. L'action vise ta matière la plus faible. */
function HerosObjectif({ lu, className }: { lu: Lu; className?: string }) {
  const o = lu.obj;
  const f = lu.faibles[0];
  if (!o) {
    return (
      <HerosMoi
        className={className}
        kicker={CAB.objectif}
        titre={CAB.sansObjectifTitre}
        repere={CAB.sansObjectifRepere}
        phrase={CAB.sansObjectifPhrase}
        action={<BoutonPlein href="/moi?onglet=reglages#objectif" label={CAB.sansObjectifAction} />}
        liste={lu.faibles.length ? <ListeClassee titre={CAB.fragiles} lignes={lu.faibles.map((x) => ({ cle: x.key, nom: x.nom, pct: x.pct, valeur: x.valeur, href: `/practice?topic=${x.key}` }))} /> : undefined}
      />
    );
  }
  return (
    <HerosMoi
      className={className}
      kicker={CAB.objectif}
      titre={
        <>
          {fmtInt(o.fait)} <span className="text-muted">/ {fmtInt(o.total)}</span>
        </>
      }
      repere={CAB.objectifRepere(lu.examen, lu.jj)}
      phrase={o.ecart < 0 ? CAB.objectifRetard(-o.ecart, o.rythme, o.projection) : CAB.objectifAvance(o.ecart)}
      detail={CAB.objectifPlan(o.quotidien, f?.nom ?? null)}
      action={<BoutonPlein href={f ? `/practice?topic=${f.key}` : "/practice"} label={CAB.travailler(f?.nom ?? null)} />}
      lien={{ href: "#detail", label: CAB.courbe }}
      liste={lu.faibles.length ? <ListeClassee titre={CAB.ouPrendre} lignes={lu.faibles.map((x) => ({ cle: x.key, nom: x.nom, pct: x.pct, valeur: x.valeur, href: `/practice?topic=${x.key}` }))} /> : undefined}
    />
  );
}

/** Le héros : le carnet de ratures (repli : l'objectif). */
function Heros({ d, lu, className }: { d: MoiData; lu: Lu; className?: string }) {
  const r = lu.r;
  if (!r) return <HerosObjectif lu={lu} className={className} />;
  return (
    <HerosMoi
      className={className}
      kicker={CAB.carnet}
      titre={CAB.carnetTitre(r.total)}
      repere={CAB.carnetRepere(r.retirees, r.retireesSemaine)}
      phrase={CAB.carnetPhrase(lu.source?.nom ?? null, lu.source?.n ?? 0, r.total)}
      action={<BoutonPlein href={ONGLET("erreurs")} label={CAB.carnetAction} icon={<PenLine size={16} aria-hidden />} />}
      liste={lu.faibles.length ? <ListeClassee titre={CAB.fragiles} lignes={lu.faibles.map((f) => ({ cle: f.key, nom: f.nom, pct: f.pct, valeur: f.valeur, href: `/practice?topic=${f.key}` }))} /> : undefined}
    />
  );
}

/** Ton cabinet : la carte « lieu » de Moi, avec le pseudo en très grand. Sur téléphone, l'image est en bandeau en haut de page. */
function CarteCabinet({ d, lu, className }: { d: MoiData; lu: Lu; className?: string }) {
  const reperes = [lu.jj ?? null, lu.examen ? `examen le ${lu.examen}` : null, d.streak > 0 ? joursEncre(d.streak) : MOI.serieVide].filter(Boolean).join(" · ");
  return (
    <CarteLieu
      className={className}
      label={CAB.cabinet}
      sansVignette
      secondaire
      visuel={<Illustration nom="moi-cabinet" position="center 55%" />}
      vignette={null}
      marque={<Visage d={d} taille={36} />}
      nom={<span className="min-w-0 truncate">{d.name}</span>}
      largeurNom={largeurBrand(d.name)}
      tailleNom="text-[26px] lg:text-[40px]"
      sousTitre={CAB.cabinet}
      etat={reperes}
      action={{ href: hrefOnglet(d.userId, "profil"), label: CAB.monProfil, icon: <UserRound size={17} aria-hidden /> }}
    />
  );
}

const lienTuile = "ink-link inline-flex w-fit items-center gap-1 text-[14px] font-semibold";

export function Cabinet({ d, now }: { d: MoiData; now?: number }) {
  const lu = lire(d, now);
  const o = lu.obj;
  const { rail, radar } = vuesMatieres(d, false);
  const place = d.me.leaderboardRank !== null ? ordinal(d.me.leaderboardRank) : null;
  return (
    <div className="rl-wide flex flex-col gap-6 md:gap-10">
      {/* pas d'en-tête : le cabinet porte le pseudo ; une ligne de repères pour situer la page */}
      <p className="t-eyebrow m-0">{CAB.surtitre(CURRENT_DOMAIN.name, CURRENT_PROGRAM.name)}</p>
      <h1 className="sr-only">Moi · {d.name}</h1>
      <div className={"flex flex-col " + GAP}>
        {/* téléphone : une touche d'image dès le premier écran (le cabinet, en bandeau étroit) */}
        <figure className={"relative m-0 overflow-hidden rounded-[18px] border border-line " + s.bandeauTel}>
          <Illustration nom="moi-cabinet" position="center 55%" decorative />
          <figcaption className={"absolute bottom-2 left-3 rounded-full px-2.5 py-0.5 text-[12px] font-semibold " + s.legende}>{CAB.legendeBandeau(d.name)}</figcaption>
        </figure>
        <div className={"grid lg:grid-cols-12 " + GAP}>
          <Heros d={d} lu={lu} className="lg:col-span-8 lg:row-start-1" />
          {/* téléphone et tablette : la carte du cabinet après les tuiles, pour que la tuile Codex reste haut (l'image est déjà en bandeau) */}
          <CarteCabinet d={d} lu={lu} className="order-last lg:order-none lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1 lg:self-stretch" />
          {/* téléphone : les tuiles rejoignent la grille (display: contents), pour que la tuile Codex passe avant le héros, au premier écran */}
          <div className={"contents md:grid md:grid-cols-2 lg:col-span-8 lg:row-start-2 xl:grid-cols-3 " + GAP}>
            {/* le Codex : en tête des tuiles, sur toute la largeur tant qu'elles ne tiennent pas à trois ;
                seulement s'il est lisible (sans la table ou après une erreur, pas de lien vers un Codex fermé) */}
            {d.codex?.disponible && <TuileCodex c={d.codex} className="order-first md:order-none md:col-span-2 xl:col-span-1" />}
            {lu.r && o ? (
              <TuileCalme
                icone={<Icone nom="examen" size={18} />}
                titre={CAB.tuileObjectif}
                droite={lu.jj ? <span className="t-micro font-mono font-semibold">{lu.jj}</span> : undefined}
                ligne={CAB.objectifLigne(o.fait, o.total, o.reste)}
                actions={
                  <a href="#detail" className={lienTuile}>
                    {CAB.courbe} <ArrowRight size={14} aria-hidden />
                  </a>
                }
              />
            ) : lu.r ? (
              <TuileCalme
                icone={<Icone nom="examen" size={18} />}
                titre={CAB.tuileObjectif}
                ligne={CAB.objectifSans}
                actions={
                  <Link href="/moi?onglet=reglages#objectif" className={lienTuile}>
                    {CAB.objectifSansLien} <ArrowRight size={14} aria-hidden />
                  </Link>
                }
              />
            ) : (
              <TuileCalme
                icone={<PenLine size={18} aria-hidden />}
                titre={CAB.tuileCarnet}
                droite={<span className="t-micro font-mono font-semibold">{lu.nRatures}</span>}
                ligne={lu.nRatures > 0 ? `${lu.nRatures} ${MOI.aReprendre}. ${MOI.regle}` : CAB.carnetVide}
                actions={
                  <Link href={ONGLET("erreurs")} className={lienTuile}>
                    {CAB.carnetOuvrir} <ArrowRight size={14} aria-hidden />
                  </Link>
                }
              />
            )}
            <TuileCalme
              icone={<Bookmark size={18} aria-hidden />}
              titre={CAB.tuileMarquees}
              droite={<span className="t-micro font-mono font-semibold">{lu.marquees + lu.nCartesMarquees}</span>}
              ligne={
                lu.nCartesMarquees > 0 ? CAB.marqueesDetail(lu.marquees, lu.nCartesMarquees) : lu.marquees > 0 ? CAB.marqueesLigne : CAB.marqueesVide
              }
              actions={
                <Link href={ONGLET("marquees")} className={lienTuile}>
                  {CAB.marqueesLien} <ArrowRight size={14} aria-hidden />
                </Link>
              }
            />
          </div>
        </div>
        <BandeEncre
          icone={<RankBadge tier={lu.rank.tierIndex} size={30} mastery={d.me.mastery} division={null} onDark gray={lu.placement} />}
          titre={`${lu.palier} · ${fmtInt(d.me.elo)} ELO`}
          ligne={CAB.rangLigne(CAB.rangPlace(place, d.me.totalPlayers), d.me.mastery)}
          action={{ href: "/classement", label: CAB.rangAction }}
          lueur={TIERS[lu.rank.tierIndex].metal[1]}
        />
        <RangeeLiens
          label={CAB.liensLabel}
          liens={[
            { href: `/people/${d.userId}?vue=inconnu`, icon: <Eye size={19} aria-hidden />, title: CAB.voirCommeLesAutres, desc: CAB.voirCommeLesAutresDesc },
            // l'étagère des pièces (le détail des séances reste juste en dessous, et par la courbe de l'objectif)
            { href: ONGLET("pieces"), icon: <Palette size={19} aria-hidden />, title: "Mes pièces", desc: "Cadres, bannières, titres et folios : ce que tu as gagné, ce que tu portes." },
            { href: ONGLET("reglages"), icon: <Settings2 size={19} aria-hidden />, title: CAB.reglages, desc: CAB.reglagesDesc },
          ]}
        />
      </div>

      {/* la Salle des trophées, sous le résumé : les quatre paliers, le détail par source à la demande */}
      {d.trophees && (
        <div id="trophees" className="scroll-mt-24">
          <SalleDesTrophees compte={compter(d.trophees.lignes)} complet={d.trophees.complet} />
        </div>
      )}

      {/* le Codex : le résumé et l'historique des quêtes faites, replié */}
      {d.codex && <BlocCodex c={d.codex} now={now} />}

      {/* « Tes points faibles » (et l'historique des Ateliers) : la cible de la visite de Léonard et de plusieurs liens du site */}
      <PointsFaiblesEtAteliers d={d} />

      <section className="rl-section" aria-labelledby="moi-matieres" id="matieres">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="moi-matieres" className="t-h2 m-0">
            {CAB.matieres}
          </h2>
          <span className="t-micro">{CAB.matieresSous}</span>
        </div>
        <figure className="relative m-0 overflow-hidden rounded-[18px] border border-line">
          <div className={s.gravure + " " + s.bandeau}>
            <Illustration nom="moi-cabinet-curiosites" position="center 45%" decorative />
          </div>
          <figcaption className={"absolute bottom-2 left-3 rounded-full px-2.5 py-0.5 text-[12px] font-semibold " + s.legende}>{CAB.legendeCuriosites}</figcaption>
        </figure>
        {rail}
      </section>

      <section className="rl-section" aria-labelledby="moi-detail" id="detail">
        <Detail titre={CAB.detail} sous={CAB.detailSous}>
          <div className={"mt-5 grid " + GAP}>
            <TrajectoirePanel e={d.objectif} />
            <ActivityCard d={d} />
            <AnswerStatsCard stats={d.answers} />
            <section className="card flex min-w-0 flex-col gap-5 p-6 md:p-7" aria-label="Tes matières, en radar">
              <CardLabel>Tes matières, en radar</CardLabel>
              {radar}
            </section>
            <SessionHistory sessions={d.sessions} />
          </div>
        </Detail>
      </section>
    </div>
  );
}
