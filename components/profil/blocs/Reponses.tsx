import Link from "next/link";
import { ChevronRight, CircleCheck } from "lucide-react";
import type { ResumeReponses } from "@/lib/profil/blocs-donnees";
import { nombre, pct } from "@/lib/voice";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_CHIFFRES as V } from "@/lib/voice-blocs-chiffres";
import { Cellule, Coque, DemiBande, Lien, Vide, type Ctx } from "./commun";
import { poidsChiffre } from "./Chiffres";
import r from "./Reponses.module.css";

// Le bloc « Questions répondues » (reponses) : « Anneau de justesse ». Un
// anneau vert se remplit jusqu'à la précision (le % au centre) ; à côté, le
// total en grand (ses questions posées, comme la vitrine et le bandeau) et
// « N justes ». En colonne, en héros et en bande, ses sources en petites
// lignes (nom, nombre) sous le total. Aucune comparaison : le même dessin
// chez soi, chez un autre et en aperçu ; seul le lien « Le détail par
// matière » reste à celui dont c'est la page. Sans le résumé des réponses (pas
// de client admin) : le total seul, sans anneau.

const ICONE = <CircleCheck size={17} aria-hidden />;
/** les sources montrées (nom, nombre) */
const SOURCES_MAX = 5;

/** L'anneau de justesse : une piste de crayon, l'arc vert jusqu'à `p` (0–100), le % au centre (sauf `mini`). */
function Anneau({ p, mini = false }: { p: number; mini?: boolean }) {
  const texte = pct(p);
  return (
    <span className={r.anneau + (mini ? " " + r.mini : "")} role="img" aria-label={V.anneau(p)}>
      <svg viewBox="0 0 100 100" aria-hidden focusable="false">
        <circle className={r.piste} cx="50" cy="50" r="42" pathLength={100} />
        {p > 0 && <circle className={r.rempli} cx="50" cy="50" r="42" pathLength={100} transform="rotate(-90 50 50)" style={{ ["--p" as string]: p } as React.CSSProperties} />}
      </svg>
      {!mini && (
        <b className={"t-num tabular-nums " + r.centre} style={{ ["--wp" as string]: poidsChiffre(texte) } as React.CSSProperties}>
          {texte}
        </b>
      )}
    </span>
  );
}

/** Ses sources en petites lignes : le nom, un guide en pointillés, le nombre (les plus jouées d'abord). */
function Sources({ res }: { res: ResumeReponses }) {
  return (
    <ul className={r.sources} aria-label={V.parSource}>
      {res.sources.slice(0, SOURCES_MAX).map((x, i) => (
        <li key={x.source} style={{ ["--i" as string]: i } as React.CSSProperties}>
          <span className={r.nom}>{x.nom}</span>
          <span className={r.guide} aria-hidden />
          <span className={r.nb}>{nombre(x.n)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Le bloc Questions répondues, à son format. Sans question : rien (son état vide dans Personnaliser). */
export function ReponsesBloc({ d, f, edition }: Ctx): React.ReactNode {
  const n = d.stats.questions;
  if (!(n > 0)) return edition ? <Vide bloc={{ k: "reponses", f }} f={f} icone={ICONE} /> : null;

  // le résumé des réponses, s'il a de quoi dire quelque chose
  const lu = d.reponses && d.reponses.total > 0 ? d.reponses : null;
  const precision = lu && lu.precision !== null ? Math.max(0, Math.min(100, Math.round(lu.precision))) : null;
  const avecSources = !!lu && lu.sources.length > 0 && f !== "tuile";
  // le lien du bas : à celui dont c'est la page seulement
  const detail = "/moi?onglet=stats";

  if (f === "demi")
    return (
      <DemiBande
        label={T.reponses}
        droite={
          d.moi ? (
            <Link href={detail} className={"ink-link " + r.lienDemi}>
              {V.leDetailCourt} <ChevronRight size={14} aria-hidden />
            </Link>
          ) : undefined
        }
      >
        <Cellule etiquette={V.questions} chiffre={nombre(n)} />
        {lu && <Cellule etiquette={V.justesEtiquette} chiffre={nombre(lu.justes)} />}
        {precision !== null && (
          <Cellule
            etiquette={V.precision}
            chiffre={
              <span className={r.miniLigne}>
                <Anneau p={precision} mini />
                {pct(precision)}
              </span>
            }
          />
        )}
      </DemiBande>
    );

  return (
    <Coque f={f} label={T.reponses} className={r[f]}>
      <h3 className={"t-eyebrow m-0 " + r.lab}>{V.reponses}</h3>
      <div className={r.scene + (precision === null ? " " + r.seul : "")}>
        {precision !== null && <Anneau p={precision} />}
        <div className={r.corps}>
          <b className={"t-num tabular-nums " + r.grand} style={{ ["--w" as string]: poidsChiffre(nombre(n)) } as React.CSSProperties}>
            {nombre(n)}
          </b>
          <p className={r.legende}>
            <span>{V.questionsLegende}</span>
            {lu && (
              <span className={r.justes}>
                <b>{nombre(lu.justes)}</b> {V.justes(lu.justes)}
              </span>
            )}
          </p>
          {avecSources && lu && <Sources res={lu} />}
        </div>
      </div>
      {lu?.incomplet && <p className="t-micro m-0">{T.incomplet}</p>}
      {d.moi && <Lien href={detail}>{T.detailMatieres}</Lien>}
    </Coque>
  );
}
