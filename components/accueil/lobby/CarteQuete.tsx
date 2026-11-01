import Link from "next/link";
import { Map as IconeCarte } from "lucide-react";
import { nombre } from "@/lib/voice";
import { PARC } from "@/lib/voice-accueil-lobby-parcours";
import { SceauUni } from "./Encre";
import l from "./Lobby.module.css";
import p from "./Parcours.module.css";
import type { QueteLobby } from "./types";

// « Ta prochaine quête » : la quête que le Codex recommande, sa progression et, hors
// mode sobre, l'XP qu'elle rapporte. Jusqu'à 12 étapes, des pastilles ; au-delà, une
// piste. Un lien vers le Codex, pas de bouton, donc pas d'encre. Le Codex
// indisponible : la carte n'est pas posée (quete = null). Composant serveur, sans état.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const ID = "lobby-quete-titre";
const PASTILLES_MAX = 12;

export function CarteQuete({ q, className }: { q: QueteLobby; className?: string }) {
  const pastilles = q.cible <= PASTILLES_MAX;
  const pct = q.cible > 0 ? Math.max(0, Math.min(100, Math.round((100 * q.valeur) / q.cible))) : 0;
  return (
    <section aria-labelledby={ID} className={cx(l.carte, l.petite, className)}>
      <header className={l.tete}>
        <SceauUni>
          <IconeCarte size={15} aria-hidden />
        </SceauUni>
        <div className={l.teteTexte}>
          <p className={l.eyebrow}>{PARC.quete.eyebrow}</p>
          <h2 id={ID} className={cx("font-brand", l.ttlSm)}>
            {PARC.quete.titre}
          </h2>
        </div>
      </header>
      <p className={p.queteNom}>{PARC.quete.nom(q.titre)}</p>
      <div className={p.queteLigne}>
        {pastilles ? (
          <span className={cx(l.pips, p.queteBarre)} role="img" aria-label={PARC.quete.aria(q.valeur, q.cible)}>
            {Array.from({ length: q.cible }, (_, i) => (
              <i key={i} className={cx(l.pip, i < q.valeur && l.pipOn)} />
            ))}
          </span>
        ) : (
          <span className={cx(l.piste, p.queteBarre)} role="img" aria-label={PARC.quete.aria(q.valeur, q.cible)}>
            <i style={{ width: `${pct}%` }} />
          </span>
        )}
        <b className={cx(l.mono, p.queteChiffre)}>
          {nombre(q.valeur)}/{nombre(q.cible)}
        </b>
        {q.xp !== null && <span className={l.feuille}>{PARC.quete.xp(q.xp)}</span>}
      </div>
      <Link href={q.href} className={cx(l.lien, p.basLien)}>
        {PARC.quete.lien} →
      </Link>
    </section>
  );
}
