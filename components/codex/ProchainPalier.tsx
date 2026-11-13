"use client";

import { ArrowRight, Lock } from "lucide-react";
import type { LigneQuete, VueCodex } from "@/lib/codex/vue";
import { texteAvancee, texteBaisse } from "@/lib/codex/unite";
import { PALIER } from "@/lib/voice-codex";
import { ActionEncre } from "@/components/ui/SousPage";
import { Banniere, CadreSceau } from "@/components/profil/Pieces";
import { TitrePorte } from "@/components/profil/TitrePorte";
import { STYLE_DEFAUT } from "@/lib/profil/catalogue";
import s from "./ProchainPalier.module.css";

// Le prochain palier, en grand sous la porte du Codex (direction du 2026-11-13, « le prochain palier en
// grand », façon passe de combat) : une plaque ébène (couleurs fixes, un liseré clair la nuit), le titre
// de la quête en Dela, sa raison en une ligne, son avancée si elle se mesure (texteAvancee / texteBaisse,
// comme LigneQuete), et à droite LA récompense posée comme un objet (le cadre ou la bannière en
// silhouette tant qu'elle n'est pas gagnée, « +120 XP » en Mono dessous). « Y aller » à l'encre : la
// seule action à l'encre de la page. Le titre ouvre le détail. Dessous, « Ensuite » : les quêtes qui
// suivent sur la trame, grisées (point creux, cadenas). Mode sobre (V3 §11.5) : ni XP, ni pièces.

/** Les quêtes qui suivent la prochaine sur la trame (pas faites, pas cachées), trois au plus. */
export function ensuiteDe(vue: Pick<VueCodex, "trame">, id: string, n = 3): LigneQuete[] {
  const toutes = vue.trame.flatMap((a) => a.quetes).filter((l) => l.affichage !== "cache");
  const i = toutes.findIndex((l) => l.id === id);
  return toutes
    .slice(i + 1)
    .filter((l) => l.etat !== "terminee" && l.id !== id)
    .slice(0, n);
}

/** La récompense posée comme un objet : la pièce (cadre, bannière, titre), en silhouette tant qu'elle n'est pas gagnée. */
function Lot({ ligne, sobre }: { ligne: LigneQuete; sobre: boolean }) {
  if (sobre) return null;
  const [type, ...reste] = (ligne.cosmetique ?? "").split(":");
  const nue = reste.join(":");
  const gagnee = ligne.etat === "terminee";
  const objet =
    type === "cadre" && nue ? (
      <CadreSceau frame={nue} name="?" avatarUrl={null} size={104} fige />
    ) : type === "banniere" && nue ? (
      <Banniere banner={nue} accent={STYLE_DEFAUT.accent} fige className={s.lotBanniere} />
    ) : ligne.titreNom ? (
      <span className={s.lotTitre}>
        <TitrePorte titre={ligne.titreNom} />
      </span>
    ) : null;
  const nom = ligne.cosmetiqueNom ?? ligne.titreNom ?? null;
  if (!objet && ligne.xp <= 0) return null;
  return (
    <div className={s.lot}>
      {objet && (
        <span className={s.lotObjet + (gagnee ? "" : " " + s.lotSilhouette)} aria-hidden>
          {objet}
        </span>
      )}
      {nom && objet && <span className={s.lotNom}>{nom}</span>}
      {ligne.xp > 0 && <span className={objet ? s.lotXp : s.lotXpSeul}>{PALIER.xp(ligne.xp)}</span>}
    </div>
  );
}

export function ProchainPalier({ ligne, pourquoi, ensuite, sobre = false, onQuete }: { ligne: LigneQuete; pourquoi?: string | null; ensuite: LigneQuete[]; sobre?: boolean; onQuete: (l: LigneQuete) => void }) {
  // mesurée comme LigneQuete : toute quête pas finie dont la cible dépasse 1
  const mesure = ligne.etat !== "terminee" && ligne.cible > 1;
  const texte = ligne.baisse ? texteBaisse(ligne.baisse, ligne.unite) : texteAvancee(ligne).texte;
  return (
    <section className={s.plaque} aria-label={PALIER.etiquette} data-leonard="prochaine">
      <div className={s.gauche}>
        <p className={s.etiquette}>{PALIER.etiquette}</p>
        <button type="button" className={s.titre} onClick={() => onQuete(ligne)} aria-label={`${PALIER.ouvrir} : ${ligne.titre}`}>
          {ligne.titre}
        </button>
        {(pourquoi || ligne.consigne) && <p className={s.pourquoi}>{pourquoi || ligne.consigne}</p>}
        {(mesure || ligne.destination) && (
          <div className={s.bas}>
            {mesure ? (
              <div className={s.avancee}>
                <span className={s.barre} aria-hidden>
                  <i style={{ width: `${Math.round(Math.max(0, Math.min(1, ligne.fraction)) * 100)}%` }} />
                </span>
                <span className={s.compte}>{texte}</span>
              </div>
            ) : (
              <span />
            )}
            {ligne.destination && (
              <ActionEncre href={ligne.destination.href}>
                {ligne.destination.libelle}
                {ligne.destination.duree > 0 && <span className={s.duree}>{PALIER.minutes(ligne.destination.duree)}</span>}
                <ArrowRight size={16} aria-hidden />
              </ActionEncre>
            )}
          </div>
        )}
      </div>
      <Lot ligne={ligne} sobre={sobre} />
      {ensuite.length > 0 && (
        <div className={s.ensuite}>
          <p className={s.etiquetteEnsuite}>{PALIER.ensuite}</p>
          <ol className={s.liste}>
            {ensuite.map((l) => (
              <li key={l.id + l.periode}>
                <button type="button" className={s.grise} onClick={() => onQuete(l)}>
                  {l.etat === "verrouillee" ? <Lock size={13} aria-hidden /> : <i className={s.point} aria-hidden />}
                  <span>{l.affichage === "indice" && l.indice ? l.indice : l.titre}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
