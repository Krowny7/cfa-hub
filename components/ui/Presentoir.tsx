import Link from "next/link";
import s from "./Presentoir.module.css";

// Le présentoir (chantier des sous-pages, 2026-11-12, demande de Théo : « une disposition sympa,
// animée, réutilisable ») : les matières posées sur la table, chacune un objet du lieu, une
// feuille (fiches, cours, one-pagers) ou un paquet de cartes (flashcards), légèrement de
// travers, sa pile derrière. À l'arrivée, elles se posent l'une après l'autre ; au survol (ou au
// clavier), la pièce se redresse et se soulève, et sa pile s'ouvre en éventail. Sans mouvement
// réduit : tout est posé, rien ne bouge. Les couleurs viennent de la palette de l'espace
// (--pal-*, posées par SousPage). Sans état ni requête : composant serveur.

export type Piece = {
  cle: string;
  /** null : pas encore disponible (pièce en filigrane, sans lien) */
  href: string | null;
  /** un fichier hors du site (PDF signé) : ouvert dans un nouvel onglet */
  externe?: boolean;
  /** « 01 » à « 10 » */
  numero: string;
  /** « ETH », « QM »… : sur la face quand il n'y a pas d'image */
  code: string;
  titre: string;
  ligne?: string;
  /** la maîtrise, de 0 à 100 ; null : pas encore de mesure */
  pct?: number | null;
  /** la vignette de la pièce (one-pager) ; sinon une face dessinée */
  image?: string | null;
  /** sous la légende (ex. l'avancement des flashcards) */
  pied?: React.ReactNode;
  aria?: string;
};

export function Presentoir({ pieces, forme = "feuille", label }: { pieces: Piece[]; forme?: "feuille" | "paquet"; label?: string }) {
  return (
    <ul className={s.table} data-forme={forme} aria-label={label}>
      {pieces.map((p, i) => (
        <li key={p.cle} className={s.place} style={{ "--i": i } as React.CSSProperties} data-indispo={p.href ? undefined : "1"}>
          <Lien piece={p}>
            <span className={s.objet}>
              <span className={s.pile} aria-hidden>
                <i />
                <i />
              </span>
              <span className={s.face}>
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className={s.dessin} aria-hidden>
                    <span className={s.coin}>{p.numero}</span>
                    <b className={s.code}>{p.code}</b>
                    <span className={s.lignes} />
                    <span className={s.coinBas}>{p.numero}</span>
                  </span>
                )}
              </span>
            </span>
            <span className={s.legende}>
              <span className={s.surtitre}>
                {p.numero} · {p.code}
              </span>
              <span className={s.titre}>{p.titre}</span>
              {p.ligne && <span className={s.ligne}>{p.ligne}</span>}
              {p.href && p.pct !== undefined && (
                <span className={s.mesure}>
                  <span className={s.jauge} aria-hidden>
                    <i style={{ width: `${Math.max(0, Math.min(100, p.pct ?? 0))}%` }} />
                  </span>
                  <span className={s.pct}>{p.pct === null ? "–" : `${p.pct} %`}</span>
                </span>
              )}
            </span>
          </Lien>
          {p.pied && <div className={s.pied}>{p.pied}</div>}
        </li>
      ))}
    </ul>
  );
}

function Lien({ piece, children }: { piece: Piece; children: React.ReactNode }) {
  if (!piece.href)
    return (
      <div className={s.lien} aria-disabled>
        {children}
      </div>
    );
  if (piece.externe)
    return (
      <a href={piece.href} target="_blank" rel="noopener noreferrer" className={s.lien} aria-label={piece.aria}>
        {children}
      </a>
    );
  return (
    <Link href={piece.href} className={s.lien} aria-label={piece.aria}>
      {children}
    </Link>
  );
}
