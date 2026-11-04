import { plafonnerAvecReprise, FILET_CARTES_MS } from "@/components/accueil/lobby/plafond";
import { codexDisponible } from "@/lib/codex/disponible";
import type { Panneau } from "@/lib/codex/panneau";
import { lirePanneau, lireXpTotal } from "@/lib/codex/serveur";
import { levelInfoFromXp } from "@/lib/leveling";
import { createClient } from "@/lib/supabase/server";
import { nombre } from "@/lib/voice";
import { RV } from "@/lib/voice-reviser";
import s from "./Parcours.module.css";

// L'aperçu du Codex dans sa carte de Réviser : le niveau, ce qui attend d'être récupéré et la
// suite de la séance du jour. Le même panneau que celui de la barre du haut (gardé en base),
// lu en flux : la carte s'affiche tout de suite, sans chiffres si la lecture traîne.

type Joueur = Parameters<typeof lirePanneau>[1];

export function ApercuCodexVide() {
  return (
    <div className={s.apercuCodex} aria-hidden>
      <div className={s.apercuBloc + " " + s.apercuVide} />
      <div className={s.apercuBloc + " " + s.apercuVide} />
    </div>
  );
}

export function ContenuApercuCodex({ p, xp }: { p: Panneau; xp: number | null }) {
  const niveau = xp === null ? null : levelInfoFromXp(xp);
  const rec = p.recuperer;
  const seance = p.seance;
  return (
    <div className={s.apercuCodex}>
      <div className={s.apercuBloc}>
        {niveau && (
          <div className={s.apercuNiveau}>
            <span className={s.apercuLigne}>
              <b>{RV.codexNiveau(niveau.level)}</b>
              <span className={s.mono}>{RV.codexXp(niveau.xpIntoLevel, niveau.xpForNextLevel)}</span>
            </span>
            <span className={s.apercuJauge} aria-hidden>
              <i style={{ width: `${Math.round(niveau.progressPct * 100)}%` }} />
            </span>
          </div>
        )}
        <div className={s.apercuPartie}>
          <p className={s.eyebrow}>{RV.codexSuite}</p>
          {seance?.suivant ? (
            <>
              <p className={s.apercuTitre}>{seance.suivant.titre}</p>
              <p className={s.apercuSous}>{RV.codexSeance(seance.faits, seance.total, seance.suivant.duree)}</p>
            </>
          ) : (
            <p className={s.apercuSous}>{RV.codexSeanceFinie}</p>
          )}
        </div>
        <dl className={s.apercuChiffres}>
          <div>
            <dt>{RV.codexRevoir}</dt>
            <dd className="t-num">{nombre(p.revoir?.aujourdhui ?? 0)}</dd>
          </div>
          <div>
            <dt>{RV.codexFaitJour}</dt>
            <dd className="t-num">{nombre(p.fait.n)}</dd>
          </div>
        </dl>
      </div>
      <div className={s.apercuBloc}>
        <p className={s.eyebrow}>{RV.codexARecuperer(rec.n)}</p>
        {rec.items.length > 0 ? (
          <ul className={s.apercuListe}>
            {rec.items.slice(0, 4).map((q) => (
              <li key={q.quete + q.periode}>
                <span>{q.titre}</span>
                {!p.sobre && q.xp > 0 && <span className={s.mono}>+{nombre(q.xp)} XP</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.apercuSous}>{RV.codexRien}</p>
        )}
      </div>
    </div>
  );
}

export async function ApercuCodex({ user }: { user: Joueur }) {
  try {
    if (!(await codexDisponible())) return null;
    const supabase = await createClient();
    const [p, xp] = await Promise.all([plafonnerAvecReprise(() => lirePanneau(supabase, user), FILET_CARTES_MS), lireXpTotal(supabase, user.id)]);
    if (!p || !p.disponible) return null;
    return <ContenuApercuCodex p={p} xp={xp} />;
  } catch {
    return null;
  }
}
