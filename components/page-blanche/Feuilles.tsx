import Link from "next/link";
import { ActionEncre } from "@/components/ui/SousPage";
import { FEUILLES_PB as F } from "@/lib/voice-postes";
import s from "./Feuilles.module.css";

// /page-blanche (Réviser A, 2026-11-13) : les dix matières en feuilles nues, posées sur le fond
// classique, à peine de travers (angles fixes : ni hasard ni Date dans le rendu). Sur chaque feuille :
// son numéro, le code de la matière en Dela, son nom, puis dix lignes réglées qui se remplissent à vue
// (une ligne écrite à l'encre par dixième de formules maîtrisées, comme les bâtons de craie des
// calculs ; tracé partagé #rl-trait-ecrit d'InkDefs, en <use href>), et le compte en Mono. Une feuille
// rendue en entier porte le tampon. La feuille conseillée (une matière entamée d'abord, sinon la
// première pas commencée) est entourée à l'encre de la palette (#rl-cercle-main), et l'action à
// l'encre la prend (au-dessus des feuilles sur téléphone).

export type Feuille = { cle: string; numero: string; code: string; nom: string; faites: number; total: number };

const ANGLES = [-1.4, 0.9, -0.5, 1.3, -1, 0.6, -1.2, 1, -0.4, 1.4];
/** la longueur de chaque ligne écrite (en % de la feuille), fixe : une main, pas une machine */
const LONGUEURS = [92, 76, 88, 62, 94, 70, 84, 56, 90, 68];
const LIGNES = 10;

/** La feuille à prendre : une matière entamée, sinon la première pas commencée ; null si tout est rendu. */
export function feuilleConseillee(fs: Feuille[]): Feuille | null {
  return fs.find((f) => f.faites > 0 && f.faites < f.total) ?? fs.find((f) => f.faites === 0 && f.total > 0) ?? null;
}

/** Les lignes écrites d'une feuille : un dixième chacune ; au moins une dès la première formule. */
export function lignesEcrites(faites: number, total: number): number {
  if (total <= 0 || faites <= 0) return 0;
  return Math.min(LIGNES, Math.max(1, Math.round((LIGNES * faites) / total)));
}

export function Feuilles({ feuilles, rendue }: { feuilles: Feuille[]; rendue: string }) {
  const conseil = feuilleConseillee(feuilles);
  return (
    <div className={s.scene}>
      <ol className={s.feuilles}>
        {feuilles.map((f, i) => {
          const fini = f.total > 0 && f.faites >= f.total;
          const conseillee = conseil?.cle === f.cle;
          const ecrites = lignesEcrites(f.faites, f.total);
          return (
            <li key={f.cle} className={s.place} style={{ "--a": `${ANGLES[i % ANGLES.length]}deg`, "--i": i } as React.CSSProperties}>
              <Link href={`/page-blanche/${f.cle}`} className={s.feuille + " rl-presse"} data-conseil={conseillee ? "1" : undefined} title={F.feuilleAide(f.nom, f.faites, f.total)}>
                <span className={s.num}>{f.numero}</span>
                <b className={s.code}>{f.code}</b>
                <span className={s.nom}>{f.nom}</span>
                <span className={s.lignes} aria-hidden>
                  {Array.from({ length: ecrites }, (_, k) => (
                    <svg key={k} className={s.ecrit} style={{ width: `${LONGUEURS[k]}%` }} viewBox="0 0 100 10" preserveAspectRatio="none">
                      <use href="#rl-trait-ecrit" />
                    </svg>
                  ))}
                </span>
                <span className={s.compte} data-zero={f.faites === 0 ? "1" : undefined}>
                  {F.compte(f.faites, f.total)}
                </span>
                {fini && <span className={s.tampon}>{rendue}</span>}
              </Link>
              {conseillee && (
                <svg className={s.entoure} viewBox="0 0 120 160" preserveAspectRatio="none" aria-hidden>
                  <use href="#rl-cercle-main" />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
      {conseil && (
        <div className={s.action}>
          <ActionEncre href={`/page-blanche/${conseil.cle}`}>{F.prendre(conseil.code)}</ActionEncre>
        </div>
      )}
    </div>
  );
}
