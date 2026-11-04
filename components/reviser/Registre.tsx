import Link from "next/link";
import { Icone } from "@/components/adn/icons";
import { EncreVive } from "@/components/nav/EncreVive";
import { CalculCarnet } from "@/components/reviser/ParcoursClient";
import type { DonneesReviser } from "@/components/reviser/parcours";
import { PALETTES } from "@/lib/palettes";
import { nombre } from "@/lib/voice";
import { RV } from "@/lib/voice-reviser";
import s from "./Parcours.module.css";

// Le registre de l'Atelier : le carnet de ratures, les questions marquées et les points
// faibles, en trois lignes à filets. Affiché sur la page de l'Atelier, en attendant son rework.

const PAL = PALETTES.studiolo;
const encre = (...cls: string[]) => ["rl-encre", s.encre, ...cls].join(" ");

export function Registre({ d, apercu }: { d: Pick<DonneesReviser, "ratures" | "marquees" | "pointsFaibles">; apercu?: { sansCalcul?: boolean } }) {
  const r = d.ratures;
  const m = d.marquees;
  const p = d.pointsFaibles;
  const aRevoir = !!r && r.enCours > 0;
  return (
    <section className={s.lieu} aria-label={RV.registre}>
      {/* le registre : une seule carte, les trois outils en trois lignes à filets (signe · nom, chiffre et geste · aperçu) */}
      <ul className={s.carte + " " + s.papier + " " + s.registre}>
        {/* le carnet : deux gestes (l'interrupteur, la mise au propre), la ligne n'est pas un lien */}
        {/* le bouton vient après l'interrupteur dans le DOM (ordre de tabulation = ordre affiché au
            téléphone, où il passe en dernier) ; sur ordinateur, il est replacé en bas de la 2e colonne */}
        <li className={s.ligne + " " + s.ligneCarnet}>
          <span className={s.carre} aria-hidden>
            <Icone nom="erreurs" size={20} />
          </span>
          <div className={s.lCol}>
            <h3 className={s.lNom}>{RV.carnetTitre}</h3>
            {r && aRevoir ? (
              <p className={s.chiffre + " " + s.lSous}>
                <b className="t-num">{nombre(r.enCours)}</b>
                <span>{RV.carnetEnCours(r.enCours)}</span>
              </p>
            ) : (
              <p className={s.texte + " " + s.lSous}>{r ? RV.carnetPropre : RV.carnetSansChiffre}</p>
            )}
          </div>
          <div className={s.lCol + " " + s.lDroite}>
            <span className={s.rature} aria-hidden lang={r?.derniere ? "en" : undefined}>
              {r?.derniere ?? RV.carnetNeutre}
            </span>
            {r?.calcul && <CalculCarnet enCours={r.enCours} masquees={r.calcul.masquees} apercu={apercu?.sansCalcul} />}
          </div>
          {/* rempli de l'encre quand il y a des ratures à revoir ; en filet sinon */}
          <Link
            href="/moi?onglet=erreurs"
            className={(aRevoir ? encre(s.bouton) : s.bouton + " " + s.boutonTrait) + " " + s.lGeste}
            data-palette={aRevoir ? PAL.key : undefined}
          >
            {aRevoir && <EncreVive tons={PAL.liquide} />}
            {RV.carnetOuvrir}
          </Link>
        </li>

        <li>
          <Link href="/moi?onglet=marquees" className={s.ligne + " " + s.ligneLien}>
            <span className={s.carre} aria-hidden>
              <span className={s.signet} />
            </span>
            <div className={s.lCol}>
              <h3 className={s.lNom}>{RV.marqueesTitre}</h3>
              {m && m.total > 0 && (
                <span className={s.chiffre + " " + s.lSous}>
                  <b className="t-num">{nombre(m.total)}</b>
                  <span>{RV.marqueesGardees(m.total)}</span>
                </span>
              )}
              <span className={s.lien + " " + s.lGeste}>{m && m.total > 0 ? RV.marqueesAction : RV.marqueesOuvrir}</span>
            </div>
            <div className={s.lCol + " " + s.lApercu}>
              {m && m.total > 0 ? (
                m.apercus.map((q, i) => (
                  <span key={i} lang="en" className={s.extrait}>
                    {q}
                  </span>
                ))
              ) : (
                <span className={s.texte}>{m ? RV.marqueesVide : RV.marqueesSansChiffre}</span>
              )}
            </div>
          </Link>
        </li>

        <li>
          <Link href="/moi?onglet=stats#points-faibles" className={s.ligne + " " + s.ligneLien}>
            <span className={s.carre} aria-hidden>
              <span className={s.barres}>
                <i />
                <i />
                <i />
              </span>
            </span>
            <div className={s.lCol}>
              <h3 className={s.lNom}>{RV.faiblesTitre}</h3>
              <span className={s.texte + " " + s.lSous}>{RV.faiblesSous}</span>
              <span className={s.lien + " " + s.lGeste}>{RV.faiblesAction}</span>
            </div>
            <div className={s.lCol + " " + s.lApercu}>
              {p && p.etat === "faibles" && p.notions.length > 0 ? (
                p.notions.map((n) => (
                  <span key={n.cle} className={s.notion} title={`${n.matiere} · ${n.libelle}`}>
                    <b>{n.libelle}</b>
                    {n.pct !== null ? (
                      <>
                        <span className={s.pc}>
                          {n.pct} %<span className="sr-only"> {RV.faiblesPctAide}</span>
                        </span>
                        <span className={s.jauge} aria-hidden>
                          <i style={{ "--p": n.pct / 100 } as React.CSSProperties} />
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={s.pc}>{RV.faiblesRatures(n.ratures)}</span>
                        <span className={s.pointille} aria-hidden />
                      </>
                    )}
                  </span>
                ))
              ) : (
                <span className={s.texte}>{!p ? RV.faiblesSansChiffre : p.etat === "peu" ? RV.faiblesPeu : RV.faiblesRien}</span>
              )}
            </div>
          </Link>
        </li>
      </ul>
    </section>
  );
}
