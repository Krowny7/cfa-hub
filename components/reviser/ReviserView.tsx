import { EncreVive } from "@/components/nav/EncreVive";
import Link from "next/link";
import { Icone } from "@/components/adn/icons";
import { DomainSpace } from "@/components/reviser/DomainSpace";
import { CalculCarnet, CarteCoursComplets } from "@/components/reviser/ParcoursClient";
import { SUBJECTS } from "@/components/reviser/catalog";
import type { DonneesReviser, EtatFiche } from "@/components/reviser/parcours";
import { Illustration } from "@/components/ui/Illustration";
import { TOTAL_FORMULES } from "@/lib/formules";
import type { EcouteCours } from "@/lib/course-ecoute";
import { PALETTES, styleDePalette } from "@/lib/palettes";
import { nombre } from "@/lib/voice";
import { RV } from "@/lib/voice-reviser";
import { ESPACES } from "@/lib/voice-z4";
import s from "./Parcours.module.css";

// Espace « Réviser », disposition choisie par Théo : dans le cadre commun (.rl-cadre), le
// cours complet en grand sur la peinture de la bibliothèque, les fiches et les flashcards à
// sa droite ; dessous, la rangée des outils (page blanche, one-pagers, vidéos résumé,
// Atelier), le Codex sous son illustration, puis le registre (carnet de ratures, questions
// marquées, points faibles). Sans requête : app/reviser charge les données
// (components/reviser/parcours-data.ts), l'aperçu en fournit d'exemple ; ce qui vient de
// l'appareil (dernier cours, « Sans calcul ») est lu après le montage (ParcoursClient).
// Repères de Léonard (data-leonard) : bibliotheque, cours, fiches, fin, atelier.
// Couleurs : celles de l'onglet « Réviser » (palette studiolo, lib/palettes.ts :
// styleDePalette sur la racine pose --pal-1 noyer … --pal-4 ivoire). L'encre de l'onglet
// (.rl-encre, globals.css) revient sur la page : le vrai fluide (EncreVive) dans les
// boutons, les pastilles d'étape et les sceaux.

/** Les trois one-pagers de l'éventail (vraies vignettes, public/one-pagers). */
const EVENTAIL = ["ethics", "equity", "fixed-income"].filter((slug) => SUBJECTS.some((x) => x.onePager === slug));
const ONE_PAGERS = SUBJECTS.filter((x) => x.onePager).length;

const CASE: Record<EtatFiche, string | undefined> = { finie: s.f, entamee: s.e, neuve: undefined };
const ORDRE: Record<EtatFiche, number> = { finie: 0, entamee: 1, neuve: 2 };

/** Les aperçus : l'écoute et « Sans calcul » d'exemple, à la place de l'appareil. */
export type ApercuReviser = { ecoute?: EcouteCours | null; sansCalcul?: boolean };

const levable = (...cls: string[]) => [s.carte, s.papier, s.levable, ...cls].join(" ");

/** La palette de la page (celle de l'onglet « Réviser ») et l'encre de l'onglet : le vrai fluide (EncreVive) dans les boutons, les pastilles et les sceaux. */
const PAL = PALETTES.studiolo;
const encre = (...cls: string[]) => ["rl-encre", s.encre, ...cls].join(" ");

/** Le premier bloc de la page : le cours en grand, les fiches et les flashcards à sa droite. */
function Haut({ d, apercu }: { d: DonneesReviser; apercu?: ApercuReviser }) {
  const f = d.fiches;
  const fc = d.flashcards;
  return (
    <ol className={s.tete} aria-label={RV.parcours} data-leonard="bibliotheque">
      <CarteCoursComplets apercu={apercu?.ecoute} />

      <li className={s.case} data-leonard="fiches">
          <Link href="/fiches" className={levable(s.c2)}>
            <span className={s.feuillets} aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className={s.texteC2}>
              <span className={s.haut}>
                <span className={encre(s.etape, "t-num")} data-palette={PAL.key} aria-hidden>
                  <EncreVive tons={PAL.liquide} echelle={48} />
                  2
                </span>
                <span className={s.eyebrow}>{RV.fichesEtape}</span>
              </span>
              <span>
                <h3 className={s.c2Titre}>{RV.fichesTitre}</h3>
                <span className={s.sous}>{RV.fichesSous}</span>
              </span>
            </span>
            {f && (
              <span className={s.avancement} title={RV.fichesAide}>
                <span className={s.cases} aria-hidden>
                  {[...f.etats]
                    .sort((a, b) => ORDRE[a.etat] - ORDRE[b.etat])
                    .map((e) => (
                      <i key={e.key} className={CASE[e.etat]} />
                    ))}
                </span>
                <span className={s.avancementTexte}>
                  <span>{RV.fichesAvancement(f.finies, f.entamees)}</span>
                  <span className={s.mono}>{RV.fichesSur(f.total)}</span>
                </span>
              </span>
            )}
            <span className={encre(s.bouton)} data-palette={PAL.key}>
              <EncreVive tons={PAL.liquide} />
              {RV.fichesAction}
            </span>
          </Link>
        </li>

      <li className={s.case} data-leonard="fin">
        <Link href="/flashcards" className={levable(s.petite)}>
            <h4 className={s.petiteTitre}>{RV.fcTitre}</h4>
            {fc.cartes !== null && fc.cartes > 0 && <span className={s.nb + " t-num"}>{nombre(fc.cartes)}</span>}
            <span className={s.sous}>{RV.fcSous(fc.parMatiere)}</span>
            <span className={s.visuel + " " + s.pile}>
              <i aria-hidden />
              <i aria-hidden />
              <i aria-hidden>
                <small>{RV.fcCarteTete}</small>
                <span>
                  ModDur = <span className={s.surligne}>MacDur / (1 + r)</span>
                </span>
              </i>
              {fc.boucle && (
                <span className={s.etat} title={fc.boucle.aide}>
                  {fc.boucle.texte}
                </span>
              )}
            </span>
          </Link>
      </li>
    </ol>
  );
}

/** La rangée des outils, à égalité. */
function Outils({ d }: { d: DonneesReviser }) {
  const r = d.ratures;
  return (
    <ul className={s.outils}>
      <li className={s.case}>
        <Link href="/page-blanche" className={levable(s.petite)}>
          <h3 className={s.petiteTitre}>{RV.pbTitre}</h3>
          <span className={s.nb + " t-num"}>{nombre(TOTAL_FORMULES)}</span>
          <span className={s.sous}>{RV.pbSous}</span>
          <span className={s.visuel + " " + s.peinture} aria-hidden>
            <Illustration nom="reviser-page-blanche" position="50% 72%" decorative />
          </span>
        </Link>
      </li>
      <li className={s.case}>
        <Link href="/fiches/one-pagers" className={levable(s.petite)}>
            <h4 className={s.petiteTitre}>{RV.opTitre}</h4>
            <span className={s.nb + " t-num"}>{ONE_PAGERS}</span>
            <span className={s.sous}>{RV.opSous}</span>
            <span className={s.visuel + " " + s.eventail} aria-hidden>
              {EVENTAIL.map((slug) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={slug} src={`/one-pagers/${slug}-mini.webp`} alt="" width={46} height={62} loading="lazy" decoding="async" />
              ))}
            </span>
          </Link>
      </li>
      <li className={s.case}>
        <div className={[s.carte, s.papier, s.petite].join(" ")}>
          <h3 className={s.petiteTitre}>{RV.videosTitre}</h3>
          <span className={s.bientot}>{RV.videosBientot}</span>
          <span className={s.sous}>{RV.videosSous}</span>
          <span className={s.visuel + " " + s.ecran} aria-hidden>
            <i />
          </span>
        </div>
      </li>
      <li className={s.case} data-leonard="atelier">
        <Link href="/atelier" className={levable(s.petite)}>
          <h3 className={s.petiteTitre}>{RV.atelier}</h3>
          {r && r.enCours > 0 && <span className={s.nb + " t-num"}>{nombre(r.enCours)}</span>}
          <span className={s.sous}>{RV.atelierSous}</span>
          <span className={s.visuel} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/atelier/etabli-640.webp" alt="" width={640} height={358} loading="lazy" decoding="async" draggable={false} className={s.vignette + " " + s.sombreNuit} />
          </span>
        </Link>
      </li>
    </ul>
  );
}

/** Le Codex, sous son illustration. */
function Codex() {
  return (
    <Link href="/codex" className={levable(s.codex)}>
      <span className={s.codexImage}>
        <Illustration nom="calculs-abaque" position="50% 45%" decorative className={s.fond} />
      </span>
      <span className={s.codexCorps}>
        <span>
          <h2 className={"font-brand " + s.lieuTitre}>{RV.codexTitre}</h2>
          <span className={s.sous}>{RV.codexSous}</span>
        </span>
        <span className={encre(s.bouton)} data-palette={PAL.key}>
          <EncreVive tons={PAL.liquide} />
          {RV.codexAction}
        </span>
      </span>
    </Link>
  );
}

function Registre({ d, apercu }: { d: DonneesReviser; apercu?: ApercuReviser }) {
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

export function ReviserView({ d, apercu }: { d: DonneesReviser; apercu?: ApercuReviser }) {
  return (
    <DomainSpace
      kicker="Réviser"
      icon={<Icone nom="reviser" size={18} />}
      title={ESPACES.reviserTitre}
      lead={
        <div className={s.racine} style={styleDePalette(PAL)}>
          <Haut d={d} apercu={apercu} />
        </div>
      }
      suite={
        <div className={s.racine} style={styleDePalette(PAL)}>
          <Outils d={d} />
          <Codex />
          <Registre d={d} apercu={apercu} />
        </div>
      }
    />
  );
}
