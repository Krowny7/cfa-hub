import { BookOpen } from "lucide-react";
import type { ExtraitCodex } from "@/lib/profil/blocs-donnees";
import { BLOCS_NEUVES as V } from "@/lib/voice-blocs-neuves";
import { Cellule, Coque, DemiBande, Vide, type Ctx } from "./commun";
import { Tete, vars } from "./neuves";
import n from "./neuves.module.css";

// Le bloc « Codex » (codex) : « Les actes ». Le fil principal du Codex en
// cases (le prologue, puis les actes II à VI) : les actes faits pleins, l'acte
// en cours cerné et à moitié peint, ceux à venir au trait ; en repère « acte
// IV sur VI » ; dessous la quête en cours de cet acte et ce qu'elle
// rapporte. Fil achevé : « Le fil principal est achevé. ». En colonne, les
// étapes se lisent en liste, avec leur titre ; en héros et en bande, leur
// titre est sous chaque case. Public. Le même dessin chez soi et chez un
// autre. Le Codex absent (pas de table, pas de lecture) : rien en vue
// publique, l'état vide dans Personnaliser. Sans état.

const ICONE = <BookOpen size={17} aria-hidden />;

/** Le fil : une case par étape (la marque : « P », « II »…), son titre dessous (ou à côté, en colonne). */
function Fil({ c }: { c: ExtraitCodex }) {
  const faits = c.fil.filter((e) => e.etat === "fait").length;
  return (
    <ol className={n.xFil} style={vars({ "--n": c.fil.length })} aria-label={V.filDit(faits, c.fil.length)}>
      {c.fil.map((e, i) => (
        <li key={e.marque} className={n.xEtape} data-e={e.etat} style={vars({ "--i": i })} title={e.titre}>
          <span className={n.xMarque}>{e.marque}</span>
          <span className={n.xTitre}>{e.titre}</span>
        </li>
      ))}
    </ol>
  );
}

/** La quête en cours et sa récompense ; le fil achevé le dit. */
function Quete({ c }: { c: ExtraitCodex }) {
  if (!c.acte)
    return (
      <div className={n.xQuete}>
        <p className={n.xQTitre}>{V.filAcheveTexte}</p>
      </div>
    );
  if (!c.quete) return null;
  return (
    <div className={n.xQuete}>
      <p className={n.xQLab}>{V.queteEnCours}</p>
      <p className={n.xQTitre}>{c.quete.titre}</p>
      {c.quete.recompense && <p className={n.petit}>{V.recompense(c.quete.recompense)}</p>}
    </div>
  );
}

export function CodexBloc({ d, f, edition }: Ctx): React.ReactNode {
  const c = d.codex ?? null;
  if (!c) return edition ? <Vide bloc={{ k: "codex", f }} f={f} icone={ICONE} /> : null;
  const repere = c.acte ? V.acteSur(c.acte.numero, c.acte.total) : V.filAcheve;

  if (f === "demi")
    return (
      <DemiBande
        label={V.codex}
        dessin={
          <div className={n.xDemi}>
            <Fil c={c} />
            {c.quete && c.acte && <p className={n.xDemiQuete}>{c.quete.titre}</p>}
          </div>
        }
      >
        <Cellule etiquette={V.codex} chiffre={c.acte ? V.acteCourt(c.acte.numero) : "✓"} petit={c.acte ? (c.acte.numero === 0 ? undefined : V.surTotal(c.acte.total)) : V.filAcheve} />
      </DemiBande>
    );

  return (
    <Coque f={f} label={V.codex} className={n.coque + " " + n.codex + " " + n[f]}>
      <Tete titre={V.codex} repere={repere} />
      <div className={n.xCorps}>
        <Fil c={c} />
        <Quete c={c} />
      </div>
    </Coque>
  );
}
