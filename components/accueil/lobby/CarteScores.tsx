import Link from "next/link";
import { Award, ClipboardCheck, FileText, ShieldCheck, Target } from "lucide-react";
import { PARC } from "@/lib/voice-accueil-lobby-parcours";
import { Phrase, SceauUni } from "./Encre";
import l from "./Lobby.module.css";
import p from "./Parcours.module.css";
import type { RecordLobby, ScoresLobby } from "./types";

// « Tes meilleurs scores » : quatre records lisibles, un bloc chacun (la meilleure
// copie aux 30 du jour, la meilleure maîtrise globale avec sa meilleure matière, le
// meilleur examen blanc, le meilleur rang atteint). Un record qui manque garde sa
// place en « — » discret et dit pourquoi ; les quatre absents : la carte n'est pas
// posée du tout (scores = null, décidé par la page). Aucun bouton, donc aucune
// encre : un lien vers Moi. Composant serveur, sans état ; les nombres et les
// dates arrivent déjà écrits.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const ID = "lobby-scores-titre";

type Tuile = { cle: "copie" | "maitrise" | "examen" | "rang"; lib: string; icone: React.ReactNode; record: RecordLobby; vide: string };

export function CarteScores({ scores, className }: { scores: ScoresLobby; className?: string }) {
  const tuiles: Tuile[] = [
    { cle: "copie", lib: PARC.scores.copie, icone: <FileText size={14} aria-hidden />, record: scores.copie, vide: PARC.scores.vide.copie },
    { cle: "maitrise", lib: PARC.scores.maitrise, icone: <Target size={14} aria-hidden />, record: scores.maitrise, vide: PARC.scores.vide.maitrise },
    { cle: "examen", lib: PARC.scores.examen, icone: <ClipboardCheck size={14} aria-hidden />, record: scores.examen, vide: PARC.scores.vide.examen },
    { cle: "rang", lib: PARC.scores.rang, icone: <ShieldCheck size={14} aria-hidden />, record: scores.rang, vide: PARC.scores.vide.rang },
  ];
  return (
    <section aria-labelledby={ID} className={cx(l.carte, l.petite, className)}>
      <header className={l.tete}>
        <SceauUni>
          <Award size={15} aria-hidden />
        </SceauUni>
        <div className={l.teteTexte}>
          <p className={l.eyebrow}>{PARC.scores.eyebrow}</p>
          <h2 id={ID} className={cx("font-brand", l.ttlSm)}>
            {PARC.scores.titre}
          </h2>
        </div>
      </header>
      <ul className={p.recs}>
        {tuiles.map((t) => {
          const r = t.record;
          return (
            <li key={t.cle} className={p.rec} data-record={t.cle}>
              <p className={p.rlib}>
                <span className={p.ri} aria-hidden>
                  {t.icone}
                </span>
                {t.lib}
              </p>
              {r ? (
                <p className={cx("font-brand", p.rv, r.unite === null && p.rvTexte)}>
                  {r.val}
                  {r.unite && <small>{r.unite}</small>}
                </p>
              ) : (
                <p className={cx("font-brand", p.rv, p.rvVide)} aria-hidden>
                  —
                </p>
              )}
              <p className={cx(p.rd, t.cle === "rang" && l.mono)}>{r ? <Phrase segments={r.detail} /> : t.vide}</p>
            </li>
          );
        })}
      </ul>
      <Link href="/moi" className={cx(l.lien, p.basLien)}>
        {PARC.scores.lien} →
      </Link>
    </section>
  );
}
