import Link from "next/link";
import { ChevronRight, CircleCheck } from "lucide-react";
import { SUBJECTS } from "@/components/reviser/catalog";
import { couleurCss } from "@/lib/profil/catalogue";
import type { DonneesBlocs, ResumeReponses } from "@/lib/profil/blocs-donnees";
import type { Format } from "@/lib/profil/disposition";
import { ecart, type Ecart } from "@/lib/profil/ecart";
import { nombre } from "@/lib/voice";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_CHIFFRES as V } from "@/lib/voice-blocs-chiffres";
import { Cellule, Chiffre, Coque, DemiBande, Detail, Etiquette, Jeton, Lien, Vide, maCouleur, type Ctx } from "./commun";
import { DoubleBarre, rattrapageQuestions, scoreVisible } from "./Chiffres";
import r from "./Reponses.module.css";

// Le bloc « Questions répondues » (reponses). Une seule mesure, dans les
// deux vues : ses questions posées (stats.questions, comme la vitrine et le
// bandeau). Chez un autre : ton jeton (« toi −1 692 », le rattrapage en
// infobulle), le score par matière (« toi 3 – 7 », volumes répondus), les
// lignes par matière aux plus grands écarts (« ETH 420 −300 ») et, fermé,
// « Le détail » (sa précision, ses sources). Chez soi : le chiffre, « NN %
// justes », les sources et le lien vers le détail par matière.

const ICONE = <CircleCheck size={17} aria-hidden />;
/** les lignes par matière de chaque format, chez un autre */
const LIGNES: Record<Format, number> = { tuile: 3, colonne: 10, heros: 5, bande: 10, demi: 4 };
/** le jeton long : 16 px en colonne, en héros et en bande */
const tailleJeton = (f: Format) => (f === "tuile" || f === "demi" ? undefined : 16);

type LigneMatiere = { key: string; code: string; nom: string; lui: number; toi: number | null; e: Ecart | null };

/** Ses volumes par matière et les tiens (une matière où l'un des deux a répondu), avec l'écart. */
function lignesMatieres(d: DonneesBlocs): LigneMatiere[] {
  const toi = d.toi?.stats.matieres ?? null;
  return SUBJECTS.map((sub) => {
    const lui = d.stats.matieres.find((m) => m.key === sub.key)?.answered ?? 0;
    const mien = toi ? (toi.find((m) => m.key === sub.key)?.answered ?? 0) : null;
    return { key: sub.key, code: sub.code, nom: sub.short, lui, toi: mien, e: mien !== null ? ecart(lui, mien, "compte") : null };
  }).filter((l) => l.lui > 0 || (l.toi ?? 0) > 0);
}

/** Les lignes montrées : en colonne, toutes par son volume ; ailleurs, les plus grands écarts (sans toi : ses plus gros volumes). */
function choisir(lignes: LigneMatiere[], f: Format, avecToi: boolean): LigneMatiere[] {
  const parVolume = [...lignes].sort((a, b) => b.lui - a.lui);
  if (f === "colonne" || !avecToi) return parVolume.slice(0, LIGNES[f]);
  return [...lignes].sort((a, b) => Math.abs(b.e?.delta ?? 0) - Math.abs(a.e?.delta ?? 0) || b.lui - a.lui).slice(0, LIGNES[f]);
}

const bulleMatiere = (l: LigneMatiere, nom: string) => (l.toi !== null ? T.bulle(V.questionsEn(l.nom), nom, nombre(l.lui), nombre(l.toi)) : undefined);

/** Ses sources (nom, barre, « n · pct % ») : les plus jouées d'abord. */
function Sources({ res, n, accent }: { res: ResumeReponses; n: number; accent: string }) {
  const max = Math.max(1, ...res.sources.map((x) => x.n));
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label={T.parSource}>
      {res.sources.slice(0, n).map((x) => (
        <li key={x.source} className="grid items-center gap-3" style={{ gridTemplateColumns: "112px minmax(0,1fr) 96px" }}>
          <span className="truncate text-[13px] font-semibold">{x.nom}</span>
          <span className={r.piste}>
            <span className={r.remplie} style={{ width: `${(x.n / max) * 100}%`, background: accent }} />
          </span>
          {/* le volume, puis la précision de la source (comme AnswerSummary) */}
          <span className="text-right font-mono text-[12px] tabular-nums">
            {nombre(x.n)}
            <span className="text-muted"> · {x.pct} %</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Le bloc Questions répondues, à son format, dans sa vue. Sans question : rien (son état vide dans Personnaliser). */
export function ReponsesBloc({ d, f, edition }: Ctx): React.ReactNode {
  const n = d.stats.questions;
  if (!(n > 0)) return edition ? <Vide bloc={{ k: "reponses", f }} f={f} icone={ICONE} /> : null;
  return d.moi ? <ChezSoi d={d} f={f} n={n} /> : <ChezAutre d={d} f={f} n={n} />;
}

function ChezAutre({ d, f, n }: { d: DonneesBlocs; f: Format; n: number }) {
  const res = d.reponses;
  const toiQ = d.toi?.stats.questions ?? null;
  const e = toiQ !== null ? ecart(n, toiQ, "compte") : null;
  const bulle = e && toiQ !== null ? T.bulle(V.questions, d.nom, nombre(n), nombre(toiQ)) + rattrapageQuestions(e, d) : undefined;
  const toutes = lignesMatieres(d);
  const sc = scoreVisible(
    d,
    toutes.map((l) => l.e),
    toutes.filter((l) => l.lui > 0).length,
  );
  const lignes = choisir(toutes, f, !!d.toi);
  const jeton = <Jeton e={e} d={d} bulle={bulle} taille={tailleJeton(f)} />;

  if (f === "demi")
    return (
      <DemiBande label={T.reponses} droite={sc ?? undefined}>
        <Cellule etiquette={V.questions} chiffre={nombre(n)} jeton={jeton} />
        {lignes.map((l) => (
          <Cellule key={l.key} etiquette={l.code} chiffre={nombre(l.lui)} titre={l.nom} jeton={<Jeton e={l.e} d={d} bulle={bulleMatiere(l, d.nom)} forme="court" taille={12} />} />
        ))}
      </DemiBande>
    );

  const barres = f !== "tuile";
  const couleur = maCouleur(d);
  const max = Math.max(1, ...lignes.map((l) => Math.max(l.lui, l.toi ?? 0)));
  const ligne = (l: LigneMatiere) => (
    <li key={l.key} className={r.ligne + (barres ? " " + r.avecBarres : "")}>
      <span className={r.code} title={l.nom}>
        {l.code}
      </span>
      {barres && <DoubleBarre lui={l.lui} toi={l.toi} couleur={couleur} max={max} bulle={T.doubleTrait(d.nom)} />}
      <span className={r.volume}>
        <span>{nombre(l.lui)}</span>
        <span className={r.court}>
          <Jeton e={l.e} d={d} bulle={bulleMatiere(l, d.nom)} forme="court" taille={12} />
        </span>
      </span>
    </li>
  );
  const liste = (ls: LigneMatiere[]) =>
    ls.length > 0 ? (
      <ul className={r.lignes} aria-label={V.parMatiere}>
        {ls.map(ligne)}
      </ul>
    ) : null;
  const chiffre = (
    <div className="flex flex-col gap-1">
      <Chiffre f={f}>{nombre(n)}</Chiffre>
      {jeton}
    </div>
  );
  // fermé : sa précision, ses sources, la mention des sources illisibles (rien sans le résumé)
  const repli =
    res && res.total > 0 ? (
      <div className="mt-auto">
        <Detail libelle={T.leDetail}>
          <div className="flex flex-col gap-3">
            <p className="t-small m-0 font-semibold">{T.justes(res.precision)}</p>
            <Sources res={res} n={f === "tuile" ? 3 : 5} accent={couleurCss(d.accent)} />
            {res.incomplet && <p className="t-micro m-0">{T.incomplet}</p>}
          </div>
        </Detail>
      </div>
    ) : null;

  return (
    <Coque f={f} label={T.reponses}>
      <Etiquette f={f} icone={ICONE} titre={V.questions} droite={sc ?? undefined} />
      {f === "heros" ? (
        // le chiffre à gauche, 5 matières à droite
        <div className={r.deux}>
          {chiffre}
          {liste(lignes)}
        </div>
      ) : f === "bande" ? (
        // le chiffre, puis 10 matières sur 2 colonnes de 5
        <div className={r.bande}>
          {chiffre}
          {liste(lignes.slice(0, 5))}
          {liste(lignes.slice(5))}
        </div>
      ) : (
        <>
          {chiffre}
          {liste(lignes)}
        </>
      )}
      {repli}
    </Coque>
  );
}

function ChezSoi({ d, f, n }: { d: DonneesBlocs; f: Format; n: number }) {
  const res = d.reponses;
  const justes = res && res.total > 0 && res.precision !== null ? T.justes(res.precision) : undefined;
  const accent = couleurCss(d.accent);

  if (f === "demi")
    // Questions, 3 sources, puis le lien vers le détail par matière
    return (
      <DemiBande
        label={T.reponses}
        droite={
          <Link href="/moi?onglet=stats" className="ink-link inline-flex items-center gap-1 text-[14px] font-semibold">
            {V.leDetailCourt} <ChevronRight size={14} aria-hidden />
          </Link>
        }
      >
        <Cellule etiquette={V.questions} chiffre={nombre(n)} petit={justes} />
        {(res?.sources ?? []).slice(0, 3).map((x) => (
          <Cellule key={x.source} etiquette={x.nom} chiffre={nombre(x.n)} petit={`${x.pct} %`} />
        ))}
      </DemiBande>
    );

  const chiffre = (
    <div className="flex flex-col gap-1">
      <Chiffre f={f}>{nombre(n)}</Chiffre>
      {justes && <span className="t-small">{justes}</span>}
    </div>
  );
  const sources = res && res.sources.length > 0 ? <Sources res={res} n={f === "tuile" ? 3 : 5} accent={accent} /> : null;
  return (
    <Coque f={f} label={T.reponses}>
      <Etiquette f={f} icone={ICONE} titre={T.reponses} />
      {f === "heros" || f === "bande" ? (
        <div className={r.deux}>
          {chiffre}
          {sources}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {chiffre}
          {sources}
        </div>
      )}
      {res?.incomplet && <p className="t-micro m-0">{T.incomplet}</p>}
      <Lien href="/moi?onglet=stats">{T.detailMatieres}</Lien>
    </Coque>
  );
}
