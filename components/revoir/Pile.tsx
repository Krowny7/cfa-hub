import { PLAFOND_REVISIONS, type Revisions } from "@/lib/revisions";
import { PILE } from "@/lib/voice-revoir";
import { nombre } from "@/lib/voice";
import css from "./Pile.module.css";

// L'objet-héros de /revoir (direction « le lieu, puis l'objet », maquette validée par Théo le
// 2026-11-13) : la pile des questions dues aujourd'hui, en vrai volume (dos ébène du site,
// tranches, léger décalage), le nombre en Dela sur la carte du dessus et la répartition par
// matière en Mono ; à côté, la petite pile de demain (hauteur proportionnelle), et dessous, quand
// la file d'aujourd'hui remplit encore le plafond les jours suivants, « puis n jours à 25 » ;
// dessous, l'action. Une rangée de sept petites piles ne pouvait montrer que des piles de 25 (la
// file ne permet de connaître un jour qu'à saturation) : elle est retirée. Quand la table est
// vide : la trace de la pile en pointillé, le tampon « RIEN JUSQU'À DEMAIN » (ou « TOUT EST À
// JOUR » si rien ne revient demain), posé une fois, et « DEMAIN · n ». Sans état : ni Date, ni
// hasard (les décalages viennent du rang de la carte).

export type MatiereDue = { code: string; n: number };
export type JourVue = { cle: string; court: string; long: string; carte: string };
/** demain (calculé en base), et le nombre de jours suivants qu'on sait pleins (au plafond) */
export type Prevision = { demain: number; suite: number };

/**
 * Ce qu'on peut prévoir sans rien inventer : demain (calculé en base), puis les jours où la file
 * d'aujourd'hui, à 25 par jour, suffit encore à remplir le plafond (aucune nouvelle échéance ne
 * peut alors changer le compte) : du 2e au (⌊file / 25⌋ − 1)e jour. Rien demain : aucune prévision.
 */
export function previsionRevoir(file: Pick<Revisions, "demain" | "ratures" | "rappels">): Prevision | null {
  if (file.demain <= 0) return null;
  const total = file.ratures + file.rappels;
  const suite = file.demain >= PLAFOND_REVISIONS ? Math.max(0, Math.floor(total / PLAFOND_REVISIONS) - 2) : 0;
  return { demain: file.demain, suite };
}

/** Le compte en Mono dans l'action (« Lancer · 15 »). */
export function Compte({ children }: { children: React.ReactNode }) {
  return <span className={css.compte}>{children}</span>;
}

/** Une ligne discrète sous l'action (une erreur, par exemple). */
export function NotePile({ children, alerte }: { children: React.ReactNode; alerte?: boolean }) {
  return (
    <p className={css.note} role={alerte ? "alert" : undefined}>
      {children}
    </p>
  );
}

/**
 * Les matières de la carte du dessus : six lignes au plus. Ce qui n'y est pas écrit (au-delà de
 * cinq matières, ou des questions sans matière, un mock complet par exemple) va dans « AUTRES »,
 * pour que la répartition fasse toujours le compte de la carte.
 */
function matieresCarte(m: MatiereDue[], n: number): { liste: MatiereDue[]; reste: number } {
  const somme = (l: MatiereDue[]) => l.reduce((a, x) => a + x.n, 0);
  const sansMatiere = Math.max(0, n - somme(m));
  const liste = m.length + (sansMatiere > 0 ? 1 : 0) <= 6 ? m : m.slice(0, 5);
  return { liste, reste: Math.max(0, n - somme(liste)) };
}

/** Une ligne de matières trop large pour la carte (« FI 5 · QM 4 · ETH 3 · DER 2 » tient, pas « … · AUTRES 3 »). */
function tropLarge(l: MatiereDue[]): boolean {
  return l.reduce((a, m) => a + m.code.length + 1 + String(m.n).length, 0) > 18;
}

/** Le léger désordre d'une pile posée à la main, tiré du rang de la carte (même rendu partout). */
function decalage(i: number): React.CSSProperties {
  const dx = ((i * 37 + 11) % 7) - 3;
  const r = i % 6 === 3 ? ((i * 13) % 3) * 0.35 - 0.35 : 0;
  return { ["--i" as string]: i, ["--dx" as string]: `${dx}px`, ["--r" as string]: `${r}deg` };
}

export function TableRevoir({
  etat,
  n,
  matieres,
  date,
  jours,
  prevision,
  demain,
  action,
  note,
}: {
  /** « pile » : des questions sur la table ; « fini » : la table vide, tamponnée */
  etat: "pile" | "fini";
  /** le nombre de questions de la pile */
  n: number;
  matieres: MatiereDue[];
  /** le jour d'aujourd'hui sur la carte (« VEN 13 ») */
  date: string;
  /** les jours suivants (index 0 : demain) */
  jours: JourVue[];
  /** demain et la suite (previsionRevoir) */
  prevision: Prevision | null;
  demain: number;
  action?: React.ReactNode;
  note?: React.ReactNode;
}) {
  const sousCartes = Math.min(Math.max(n - 1, 0), PLAFOND_REVISIONS - 1);
  const { liste, reste } = matieresCarte(matieres, n);
  const lignes = reste > 0 ? [...liste, { code: PILE.autres, n: reste }] : liste;
  // la table vide dit déjà « DEMAIN · n » à son pied : pas de petite pile à côté
  const prev = etat === "pile" && prevision && jours[0] ? { ...prevision, jour: jours[0] } : null;
  const tampon = PILE.tampon(demain);

  return (
    <section className={css.table} data-etat={etat} data-prev={prev ? "seul" : undefined}>
      <div className={css.auj}>
        {etat === "pile" ? (
          <div className={css.pile} style={{ ["--sous" as string]: sousCartes }} role="img" aria-label={PILE.pileAria(n, lignes)}>
            <div className={css.ombre} aria-hidden />
            {Array.from({ length: sousCartes }, (_, k) => {
              const i = sousCartes - k;
              return <div key={i} className={css.carte + (i === sousCartes ? " " + css.fond : "")} style={decalage(i)} aria-hidden />;
            })}
            <div className={css.carte + " " + css.dessus} style={decalage(0)} aria-hidden>
              <div className={css.haut}>
                <span>{PILE.carte}</span>
                <span>{date}</span>
              </div>
              <div className={css.chiffre}>
                <b>{nombre(n)}</b>
                {lignes.length > 0 && (
                  // une ligne, séparées par des points, tant qu'elle tient sur la carte (quatre courtes au
                  // plus) ; sinon une grille de trois, pour qu'aucun point ne commence une ligne
                  <ul className={css.matieres} data-grille={lignes.length > 4 || tropLarge(lignes) ? "1" : undefined}>
                    {lignes.map((m) => (
                      <li key={m.code}>
                        {m.code} <i>{nombre(m.n)}</i>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className={css.bas}>
                <b>{PILE.signature}</b>
              </div>
            </div>
          </div>
        ) : (
          <div className={css.vide}>
            <div className={css.trace} aria-hidden />
            <p className={css.tampon}>
              <span>{tampon[0]}</span>
              <span>{tampon[1]}</span>
            </p>
          </div>
        )}
        <p className={css.sol + " " + css.solAuj}>{etat === "fini" && demain > 0 ? PILE.demain(demain) : PILE.aujourdhui}</p>
      </div>

      {(action || note) && (
        <div className={css.action}>
          {action}
          {note}
        </div>
      )}

      {prev && (
        <div className={css.prev} title={PILE.jour(prev.jour.long, prev.demain)}>
          <div className={css.mini}>
            <div className={css.miniFace}>{nombre(prev.demain)}</div>
            <div className={css.miniTranche} style={{ ["--n" as string]: Math.min(prev.demain, PLAFOND_REVISIONS) }} />
          </div>
          <p className={css.sol}>
            {PILE.demainSeul}
            {prev.suite > 0 && <span className={css.suite}>{PILE.suite(prev.suite, PLAFOND_REVISIONS)}</span>}
          </p>
        </div>
      )}
    </section>
  );
}
