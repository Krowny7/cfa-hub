import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnneauDuJour } from "@/components/adn/AnneauDuJour";
import { Batons } from "@/components/adn/Batons";
import { Icone, type IconeNom } from "@/components/adn/icons";
import { SceauTenu } from "@/components/accueil/SceauTenu";
import { ACCUEIL, ENCRE, joursEncre, jourJ, retour, titreAccueil } from "@/lib/voice";
import { ligneSerie, REPRISE } from "@/lib/voice-z1";
import { agoLabel } from "@/components/accueil/format";
import type { AccueilData, ResumeItem } from "@/components/accueil/types";

// Le point focal de l'accueil (moments 1 et 2) : le titre qui dit l'anneau du
// jour (« Encore 14 traits, Théo. »), la ligne de contexte (« J-212 · 6 jours
// d'encre ») et les bâtons de la série ; à côté, l'anneau du jour en grand
// (le logo qui se dessine avec toi, le sceau « TENU » posé à l'objectif) ;
// juste dessous, la prochaine action (seule card-hero et seul bouton en
// encre de l'écran). Sans état.

const KIND_ICON: Record<ResumeItem["kind"], IconeNom> = { fiche: "fiche", qcm: "entrainer", flashcards: "flashcards", practice: "entrainer" };

/** Titre, contexte et bâtons. */
export function JourHero({ d }: { d: AccueilData }) {
  const titre = titreAccueil({ nom: d.name, repondues: d.activity.today, objectif: d.dailyGoal, heure: d.hour, serie: d.streak });
  const jj = jourJ(d.examDaysLeft);
  const sec = d.dayState === "sec";
  return (
    <div className="min-w-0">
      <p className="t-eyebrow">{d.dateLabel}</p>
      <h1 className="rl-hero t-hero rl-in mt-3 font-sans [overflow-wrap:anywhere]">{titre}</h1>
      {/* ligne de contexte (ligneContexte) : le jour J, puis les jours d'encre */}
      <p className="t-small mt-4 font-medium">
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
      {/* les bâtons : le bâton du jour tracé, en attente au crayon, ou sec le
          soir ; au retour après une absence, la série cassée ne s'affiche pas */}
      {!d.returning && (
        <div className="mt-3.5 flex items-center gap-3.5">
          <span className="shrink-0">
            <Batons jours={d.streak} jour={d.dayState} height={30} max={4} />
          </span>
          <span className={"t-micro min-w-0 " + (sec ? "font-semibold text-white" : "")}>{ligneSerie(d.streak, d.dayState, d.seenBefore)}</span>
        </div>
      )}
    </div>
  );
}

/** L'anneau du jour en grand (Geste) ; le sceau « TENU » se pose dans l'ouverture à l'objectif. */
export function JourAnneau({ d }: { d: AccueilData }) {
  const tenu = d.activity.today >= d.dailyGoal;
  return (
    <div className="mx-auto w-full max-w-[264px] sm:max-w-[380px] lg:max-w-[500px]">
      <AnneauDuJour repondues={d.activity.today} objectif={d.dailyGoal} taille="geste" sceau={tenu ? <SceauTenu day={d.dayKey} /> : undefined} />
    </div>
  );
}

/** « Market Efficiency, page 3 » : où reprendre, pour la variante « retour ». */
function ouReprendre(r: ResumeItem) {
  const page = /page ([0-9]+)/.exec(r.context)?.[1];
  return page ? `${r.title}, page ${page}` : r.title;
}

/** La prochaine action : reprendre, premier usage, ou la variante « retour ». */
export function ResumeHero({ resume, returning = false, evening = false, now }: { resume: ResumeItem | null; returning?: boolean; evening?: boolean; now?: number }) {
  if (returning) {
    // la variante « retour » (3 jours sans venir, voix `retour()`) : du texte
    // simple et une action ; pas de « tu nous as manqué », la série cassée
    // n'est pas montrée. Même phrase que PremierTraitRetour (kit), posée en
    // titre de la carte héros.
    const [titre, ...suite] = retour(resume ? ouReprendre(resume) : null).split(". ");
    return (
      <section className="card-hero rl-in p-6 sm:p-7" style={{ animationDelay: ".08s" }} aria-label="Reprendre">
        {resume && <p className="t-micro font-semibold">{ACCUEIL.repriseSurTitre(agoLabel(resume.at, now))}</p>}
        <h2 className="t-h1 mt-2">{titre}.</h2>
        <p className="t-small mt-2 max-w-[460px]">
          {suite.join(". ")}
          {resume ? " Cinq questions pour te remettre en main." : ""}
        </p>
        <div className="mt-6">
          <Link href={resume?.href ?? "/practice"} className="btn btn-primary btn-lg">
            {REPRISE.action} <ArrowRight size={17} aria-hidden />
          </Link>
        </div>
      </section>
    );
  }

  if (!resume) {
    const p = ACCUEIL.premierUsage;
    return (
      <section className="card-hero rl-in p-6 sm:p-7" style={{ animationDelay: ".08s" }} aria-label={p.surTitre}>
        <p className="t-micro font-semibold">{p.surTitre}</p>
        <h2 className="t-h1 mt-2">{p.titre}</h2>
        <p className="t-small mt-2">{p.texte}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/reviser" className="btn btn-primary btn-lg">
            {REPRISE.choisir} <ArrowRight size={17} aria-hidden />
          </Link>
          <Link href="/entrainement" className="t-small font-semibold hover:text-white">
            {REPRISE.ouQcm}
          </Link>
        </div>
      </section>
    );
  }

  const pct = resume.total ? Math.min(100, Math.round(((resume.done ?? 0) / resume.total) * 100)) : null;

  return (
    <section className="card-hero rl-in p-6 sm:p-7" style={{ animationDelay: ".08s" }} aria-label="Reprendre">
      <div className="flex min-w-0 items-start gap-5">
        <span aria-hidden className="hidden h-[56px] w-[56px] flex-none place-items-center rounded-[16px] bg-surface-2 sm:grid">
          <Icone nom={KIND_ICON[resume.kind]} size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-micro font-semibold">{ACCUEIL.repriseSurTitre(agoLabel(resume.at, now))}</p>
          <h2 className="t-h1 mt-1.5 [overflow-wrap:anywhere]">{resume.title}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="t-micro">{resume.context}</span>
            {pct !== null && (
              <span className="flex min-w-[160px] max-w-[300px] flex-1 items-center gap-2.5">
                <span className="ink-bar block h-1.5 flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={resume.progressLabel}>
                  <span className="rl-grow" style={{ width: `${pct}%`, animationDelay: ".5s" }} />
                </span>
                <span className="font-mono text-[12px] font-semibold tabular-nums" title={resume.progressLabel}>
                  {resume.done}/{resume.total}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 sm:pl-[76px]">
        <Link href={resume.href} className="btn btn-primary btn-lg">
          {/* le soir, rien encore : une seule petite action pour garder l'encre */}
          {evening ? ENCRE.uneQuestion : resume.cta} <ArrowRight size={17} aria-hidden />
        </Link>
        {resume.audio && (
          <Link href={resume.audio.href} title={resume.audio.title} className="t-small inline-flex items-center gap-2 font-semibold hover:text-white">
            <Icone nom="cours" size={17} /> {resume.audio.label}
          </Link>
        )}
      </div>
    </section>
  );
}

/**
 * « Ton dernier trait » en tuile de « Aujourd'hui », quand le défi du jour
 * tient la carte héros : où reprendre, la barre de la série, l'action, et
 * l'écoute du module à part (toute la tuile mène à la reprise). Sans
 * reprise (nouveau joueur) : la première fiche.
 */
export function ResumeTile({ resume, now }: { resume: ResumeItem | null; now?: number }) {
  const shell = "card-quiet rl-lift group relative flex h-full min-w-0 flex-col p-5";
  const label = (text: string, aside?: string, icon: IconeNom = "fiche") => (
    <span className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">
      <Icone nom={icon} size={15} />
      <span className="truncate">{text}</span>
      {aside && <span className="ml-auto shrink-0 font-medium">{aside}</span>}
    </span>
  );
  if (!resume) {
    const p = ACCUEIL.premierUsage;
    return (
      <Link href="/reviser" className={shell}>
        {label(p.surTitre)}
        <span className="t-h3 mt-3 block">{p.titre}</span>
        <span className="t-micro mt-1 block">{p.texte}</span>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[13.5px] font-semibold">
          {REPRISE.choisir} <ArrowRight size={14} aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </Link>
    );
  }
  const pct = resume.total ? Math.min(100, Math.round(((resume.done ?? 0) / resume.total) * 100)) : null;
  return (
    <div className={shell}>
      {label("Ton dernier trait", agoLabel(resume.at, now), KIND_ICON[resume.kind])}
      <span className="t-h3 mt-3 block truncate">{resume.title}</span>
      <span className="mt-1 flex min-w-0 items-center gap-2.5">
        <span className="t-micro shrink-0">{resume.context}</span>
        {pct !== null && (
          <>
            <span className="ink-bar block h-1 min-w-[40px] flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={resume.progressLabel}>
              <span style={{ width: `${pct}%` }} />
            </span>
            <span className="shrink-0 font-mono text-[11.5px] font-semibold tabular-nums" title={resume.progressLabel}>
              {resume.done}/{resume.total}
            </span>
          </>
        )}
      </span>
      <span className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3">
        {/* toute la tuile mène à la reprise ; l'écoute passe au-dessus */}
        <Link href={resume.href} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold after:absolute after:inset-0 after:rounded-[inherit] after:content-['']">
          {resume.cta} <ArrowRight size={14} aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
        {resume.audio && (
          <Link href={resume.audio.href} title={resume.audio.title} className="relative z-[1] inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted hover:text-white">
            <Icone nom="cours" size={14} /> {resume.audio.label}
          </Link>
        )}
      </span>
    </div>
  );
}
