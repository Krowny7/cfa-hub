import Link from "next/link";
import { BookOpen, Crown, Frame, Image as IconeImage, Lock, Sparkles } from "lucide-react";
import { nombre } from "@/lib/voice";
import { PARC } from "@/lib/voice-accueil-lobby-parcours";
import { SceauUni } from "./Encre";
import l from "./Lobby.module.css";
import type { DeblocageVue } from "./modele-parcours";
import p from "./Parcours.module.css";

// « Prochain déblocage » : la pièce de collection (cadre, bannière, titre, folio,
// ornement de bannière) la plus proche de s'ouvrir, en silhouette, avec ce qu'il
// reste à faire et une barre pleine d'aplat. La silhouette est une petite icône au
// trait par type (jamais l'art de la pièce : elle n'est pas encore gagnée). Aucune
// pièce qui se mesure : la carte n'est pas posée (deblocage = null). Un lien vers
// Mes pièces, pas de bouton, donc pas d'encre. Composant serveur, sans état.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const ID = "lobby-deblocage-titre";

const SILHOUETTE = { cadre: Frame, banniere: IconeImage, titre: Crown, folio: BookOpen, ornement: Sparkles } as const;

export function CarteDeblocage({ d, className }: { d: DeblocageVue; className?: string }) {
  const Silhouette = SILHOUETTE[d.type] ?? Sparkles;
  const pct = d.total > 0 ? Math.max(0, Math.min(100, Math.round((100 * d.fait) / d.total))) : 0;
  return (
    <section aria-labelledby={ID} className={cx(l.carte, l.petite, className)}>
      <header className={l.tete}>
        <SceauUni>
          <Lock size={15} aria-hidden />
        </SceauUni>
        <div className={l.teteTexte}>
          <p className={l.eyebrow}>{PARC.deblocage.eyebrow}</p>
          <h2 id={ID} className={cx("font-brand", l.ttlSm)}>
            {PARC.deblocage.titre}
          </h2>
        </div>
      </header>
      <div className={p.debCorps}>
        <span className={p.silh} aria-hidden>
          <Silhouette size={30} strokeWidth={1.6} />
        </span>
        <div className={p.debTexte}>
          <b className={p.debNom}>{PARC.deblocage.nom(PARC.deblocage.type[d.type], d.nom)}</b>
          <span className={l.st}>
            {PARC.deblocage.pour[d.type]} : <b>{d.reste}</b>
          </span>
        </div>
      </div>
      <div className={p.debBarre}>
        <span className={cx(l.piste, p.piste8)} role="img" aria-label={PARC.deblocage.aria(d.fait, d.total, d.unite)}>
          <i style={{ width: `${pct}%` }} />
        </span>
        <span className={p.debPied}>
          <span>{d.unite}</span>
          <b className={l.mono}>
            {nombre(d.fait)}/{nombre(d.total)}
          </b>
        </span>
      </div>
      <Link href={d.href} className={cx(l.lien, p.basLien)}>
        {PARC.deblocage.lien} →
      </Link>
    </section>
  );
}
