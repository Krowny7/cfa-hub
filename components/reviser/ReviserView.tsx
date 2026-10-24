import Link from "next/link";
import { Icone } from "@/components/adn/icons";
import { DomainSpace } from "@/components/reviser/DomainSpace";
import { BasculeSansCalcul, CarteCoursComplets } from "@/components/reviser/ParcoursClient";
import { SUBJECTS } from "@/components/reviser/catalog";
import type { DonneesReviser, EtatFiche } from "@/components/reviser/parcours";
import { Illustration } from "@/components/ui/Illustration";
import type { EcouteCours } from "@/lib/course-ecoute";
import { PALETTES, styleDePalette } from "@/lib/palettes";
import { nombre } from "@/lib/voice";
import { RV } from "@/lib/voice-reviser";
import { ESPACES } from "@/lib/voice-z4";
import s from "./Parcours.module.css";

// Espace « Réviser », le parcours (maquette validée) : deux lieux peints.
// La Bibliothèque, pour apprendre, avec un parcours 1 → 2 → 3 dont les
// cartes mordent sur l'illustration : 1 les cours complets (la seule carte
// sombre, le seul gros bouton du haut), 2 les fiches, 3 « pour la fin des
// révisions » les one-pagers et les flashcards, à égalité. L'Atelier, pour
// revoir ses erreurs : carnet de ratures, questions marquées, points
// faibles. Sans requête : app/reviser charge les données
// (components/reviser/parcours-data.ts), l'aperçu en fournit d'exemple ; ce
// qui vient de l'appareil (dernier cours, « Sans calcul ») est lu après le
// montage (ParcoursClient). Repères de Léonard (data-leonard) :
// bibliotheque, cours, fiches, fin, atelier.
// Couleurs : celles de l'onglet « Réviser » (palette studiolo, lib/palettes.ts :
// styleDePalette sur la racine pose --pal-1 noyer … --pal-4 ivoire). L'encre
// de l'onglet (.rl-encre, globals.css) revient sur la page : vivante dans la
// carte du cours (EncreVive, ParcoursClient), en texture qui dérive dans les
// boutons, les pastilles d'étape et les sceaux des lieux.

/** Les trois one-pagers de l'éventail (vraies vignettes, public/one-pagers). */
const EVENTAIL = ["ethics", "equity", "fixed-income"].filter((slug) => SUBJECTS.some((x) => x.onePager === slug));
const ONE_PAGERS = SUBJECTS.filter((x) => x.onePager).length;

const CASE: Record<EtatFiche, string | undefined> = { finie: s.f, entamee: s.e, neuve: undefined };
const ORDRE: Record<EtatFiche, number> = { finie: 0, entamee: 1, neuve: 2 };

/** Les aperçus : l'écoute et « Sans calcul » d'exemple, à la place de l'appareil. */
export type ApercuReviser = { ecoute?: EcouteCours | null; sansCalcul?: boolean };

const levable = (...cls: string[]) => [s.carte, s.papier, s.levable, ...cls].join(" ");

/** La palette de la page (celle de l'onglet « Réviser ») et l'encre de l'onglet (texture qui dérive). */
const PAL = PALETTES.studiolo;
const encre = (...cls: string[]) => ["rl-encre", s.encre, ...cls].join(" ");

function Bibliotheque({ d, apercu }: { d: DonneesReviser; apercu?: ApercuReviser }) {
  const f = d.fiches;
  const fc = d.flashcards;
  return (
    <section className={s.lieu} aria-labelledby="reviser-biblio">
      <div className={s.illu} data-leonard="bibliotheque">
        <Illustration nom="reviser-bibliotheque" position="50% 30%" decorative eager className={s.fond} />
        <div className={s.legende}>
          <span className={encre(s.sceau)} data-palette={PAL.key} aria-hidden>
            <Icone nom="reviser" size={22} />
          </span>
          <span>
            <h2 id="reviser-biblio" className={s.lieuNom}>
              {RV.biblio}
            </h2>
            <span className={s.lieuSous}>{RV.biblioSous}</span>
          </span>
        </div>
      </div>

      <ol className={s.parcours} aria-label={RV.parcours}>
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
              {RV.fichesAction}
            </span>
          </Link>
        </li>

        <li className={s.c3} data-leonard="fin">
          <h3 className={s.finTete}>
            <span className={encre(s.etape, "t-num")} data-palette={PAL.key} aria-hidden>
              3
            </span>
            <span className={s.plume}>{RV.fin}</span>
          </h3>
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
    </section>
  );
}

function Atelier({ d, apercu }: { d: DonneesReviser; apercu?: ApercuReviser }) {
  const r = d.ratures;
  const m = d.marquees;
  const p = d.pointsFaibles;
  const aRevoir = !!r && r.enCours > 0;
  return (
    <section className={s.lieu} aria-labelledby="reviser-atelier">
      <div className={s.illu + " " + s.illuAtelier} data-leonard="atelier">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/atelier/etabli-1024.webp"
          srcSet="/atelier/etabli-640.webp 640w, /atelier/etabli-1024.webp 1024w"
          sizes="(min-width: 1280px) 1240px, 100vw"
          alt=""
          width={1024}
          height={572}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={s.fond + " " + s.sombreNuit}
          style={{ objectPosition: "50% 62%" }}
        />
        <div className={s.legende}>
          <span className={encre(s.sceau)} data-palette={PAL.key} aria-hidden>
            <Icone nom="erreurs" size={22} />
          </span>
          <span>
            <h2 id="reviser-atelier" className={s.lieuNom}>
              {RV.atelier}
            </h2>
            <span className={s.lieuSous}>{RV.atelierSous}</span>
          </span>
        </div>
      </div>

      <ul className={s.grille}>
        {/* le carnet : deux gestes (l'interrupteur, la mise au propre), la carte n'est pas un lien */}
        <li className={s.case}>
          <div className={s.carte + " " + s.papier + " " + s.err}>
            <div className={s.haut}>
              <h3 className={s.eyebrow}>{RV.carnetTitre}</h3>
            </div>
            <span className={s.rature} aria-hidden lang={r?.derniere ? "en" : undefined}>
              {r?.derniere ?? RV.carnetNeutre}
            </span>
            {r && aRevoir ? (
              <p className={s.chiffre}>
                <b className="t-num">{nombre(r.enCours)}</b>
                <span>{RV.carnetEnCours(r.enCours)}</span>
              </p>
            ) : (
              <p className={s.ligne}>{r ? RV.carnetPropre : RV.carnetSansChiffre}</p>
            )}
            {r?.calcul && <BasculeSansCalcul masquees={r.calcul.masquees} apercu={apercu?.sansCalcul} />}
            {/* rempli de l'encre quand il y a des ratures à revoir ; en filet sinon */}
            <Link href="/moi?onglet=erreurs" className={aRevoir ? encre(s.bouton) : s.bouton + " " + s.boutonTrait} data-palette={aRevoir ? PAL.key : undefined}>
              {RV.carnetOuvrir}
            </Link>
          </div>
        </li>

        <li className={s.case}>
          <Link href="/moi?onglet=marquees" className={levable(s.err)}>
            <span className={s.signet} aria-hidden />
            <span className={s.haut}>
              <h3 className={s.eyebrow}>{RV.marqueesTitre}</h3>
            </span>
            {m && m.total > 0 ? (
              <>
                <span className={s.chiffre}>
                  <b className="t-num">{nombre(m.total)}</b>
                  <span>{RV.marqueesGardees(m.total)}</span>
                </span>
                <span className={s.extraits}>
                  {m.apercus.map((q, i) => (
                    <span key={i} lang="en" className={s.extrait}>
                      {q}
                    </span>
                  ))}
                </span>
              </>
            ) : (
              <span className={s.ligne}>{m ? RV.marqueesVide : RV.marqueesSansChiffre}</span>
            )}
            <span className={s.lien}>{m && m.total > 0 ? RV.marqueesAction : RV.marqueesOuvrir}</span>
          </Link>
        </li>

        <li className={s.case}>
          <Link href="/atelier" className={levable(s.err)}>
            <span className={s.haut}>
              <h3 className={s.eyebrow}>{RV.faiblesTitre}</h3>
            </span>
            {p && p.etat === "faibles" && p.notions.length > 0 ? (
              <span className={s.notions}>
                {p.notions.map((n) => (
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
                      <span className={s.pc}>{RV.faiblesRatures(n.ratures)}</span>
                    )}
                  </span>
                ))}
              </span>
            ) : (
              <span className={s.ligne}>{!p ? RV.faiblesSansChiffre : p.etat === "peu" ? RV.faiblesPeu : RV.faiblesRien}</span>
            )}
            <span className={s.lien}>{RV.faiblesAction}</span>
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
          <Bibliotheque d={d} apercu={apercu} />
          <Atelier d={d} apercu={apercu} />
        </div>
      }
    />
  );
}
