import { BookOpen, Library, Users } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { Glyphe } from "@/components/entrainement/Glyphes";
import { SubjectBrowser } from "@/components/ContentFolderBlocks";
import type { BrowserGroup, BrowserRow } from "@/components/ContentDetailHeader";
import { Illustration } from "@/components/ui/Illustration";
import { CarteLieu } from "@/components/ui/CarteLieu";
import { Sceau } from "@/components/ui/Tuiles";
import { Bande, EnTete, Heros, Liens, Page, Rangee, Section } from "@/components/outils/Gabarit";
import { TOPICS } from "@/lib/practiceTopics";
import { pluriel } from "@/lib/voice";
import { BIBLIO } from "@/lib/voice-outils";

// /qcm (vue Système), « La Bibliothèque » : le héros reprend le QCM en cours
// (« Ta suite »), la carte du lieu propose la matière à ouvrir ensuite (la
// plus lourde à l'examen parmi les moins avancées), une rangée de liens mène
// aux quiz des fiches, à la communauté et au suivi, puis les matières. Sans
// requête : app/qcm charge les données.

export type QcmEntree = { r: BrowserRow; g: BrowserGroup };

/** « il y a 2 h », « il y a 3 j » */
function ilYa(ts: number, now: number) {
  const m = Math.max(0, Math.round((now - ts) / 60000));
  if (m < 2) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d < 7 ? `il y a ${d} j` : `le ${new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" })}`;
}

const intitule = (x: QcmEntree) => `${x.r.lead ? `${x.r.lead} · ` : ""}${x.r.main}`;
const pctDe = (r: BrowserRow) => (r.count ? Math.round(((r.done ?? 0) / r.count) * 100) : 0);

export function QcmAccueil({
  groups,
  next,
  recentes,
  last,
  communityCount,
  initialKey,
  now,
}: {
  groups: BrowserGroup[];
  /** « Ta suite » : le QCM entamé le plus récemment, sinon le premier du programme */
  next: QcmEntree | null;
  /** les QCM entamés et pas finis, le plus récent d'abord */
  recentes: QcmEntree[];
  /** dernière première bonne réponse par QCM (ms) */
  last: Record<string, number>;
  communityCount: number;
  initialKey: string | null;
  now: number;
}) {
  const cfa = groups.filter((g) => !g.key.startsWith("x-")).flatMap((g) => g.rows.map((r) => ({ r, g })));
  const totalCount = cfa.reduce((n, { r }) => n + (r.count ?? 0), 0);
  const totalDone = cfa.reduce((n, { r }) => n + (r.done ?? 0), 0);
  const parGroupe = groups
    .filter((g) => !g.key.startsWith("x-") && g.rows.length)
    .map((g) => {
      const c = g.rows.reduce((n, r) => n + (r.count ?? 0), 0);
      const d = g.rows.reduce((n, r) => n + (r.done ?? 0), 0);
      const w = TOPICS.find((t) => t.key === g.key)?.weight ?? 0;
      return { g, w, ecart: w * (1 - (c ? d / c : 0)) };
    });
  const entamees = groups.filter((g) => !g.key.startsWith("x-") && g.rows.some((r) => (r.done ?? 0) > 0)).length;
  const aOuvrir = [...parGroupe].sort((a, b) => b.ecart - a.ecart)[0] ?? null;
  const drills = cfa.filter(({ r }) => r.kind === "drill");
  const nTotal = groups.reduce((n, g) => n + g.rows.length, 0);

  const done = next?.r.done ?? 0;
  const count = next?.r.count ?? null;
  const phrase = !next
    ? ""
    : count === null
      ? `Une banque de questions de ${next.g.name}.`
      : done > 0
        ? `${done} réussies sur ${count}. Il t'en reste ${Math.max(0, count - done)} à réussir une première fois : c'est là que se gagne l'XP.`
        : `${pluriel(count, "question", "questions")}, aucune réussie pour l'instant : l'XP se gagne à la première bonne réponse.`;
  const quand = next && last[next.r.id] ? ilYa(last[next.r.id], now) : null;

  return (
    <Page
      entete={<EnTete icone={<Glyphe nom="qcm" size={16} />} titre="QCM par thème" ligne="Toutes les banques, classées par matière. L'XP se gagne une fois par question, à ta première bonne réponse." />}
      lead={
        <div className="flex flex-col gap-4 md:gap-[18px]">
          <Rangee
            cotePremier
            cote={
              <CarteLieu
                label={BIBLIO.nom}
                ratio="16 / 10"
                visuel={<Illustration nom="qcm-bibliotheque" position="50% 55%" />}
                vignette={<Illustration nom="qcm-bibliotheque" position="50% 55%" decorative />}
                marque={
                  <Sceau>
                    <Library size={19} aria-hidden />
                  </Sceau>
                }
                nom={BIBLIO.nom}
                tailleNom="text-[28px] lg:text-[26px] xl:text-[32px]"
                sousTitre={BIBLIO.banques(nTotal)}
                etat={
                  aOuvrir
                    ? `À ouvrir ensuite : ${aOuvrir.g.name}, ${String(aOuvrir.w).replace(".", ",")} % de l'examen, la plus lourde des moins avancées.`
                    : "Les banques de questions arrivent, matière par matière."
                }
                secondaire
                action={{ href: aOuvrir ? `/qcm?subject=${aOuvrir.g.key}#matieres` : "#matieres", label: aOuvrir ? `Ouvrir ${aOuvrir.g.short}` : "Voir les matières" }}
              />
            }
            heros={
              next ? (
                <Heros
                  eyebrow={quand ? `Ta suite · ${quand}` : done > 0 ? "Ta suite" : "Pour commencer"}
                  titre={next.r.main}
                  repere={`${next.g.name}${next.r.lead ? ` · ${next.r.lead}` : ""}`}
                  phrase={phrase}
                  action={{ href: `/qcm/${next.r.id}`, label: done > 0 ? "Reprendre" : "Commencer" }}
                  lien={{ href: "#matieres", label: "Toutes les matières" }}
                  listeTitre={recentes.length > 1 ? "Repris récemment" : undefined}
                  liste={recentes.slice(0, 3).map((x) => ({ label: intitule(x), meta: `${x.g.short} · ${x.r.done ?? 0}/${x.r.count ?? "?"} réussies`, pct: pctDe(x.r), href: `/qcm/${x.r.id}` }))}
                />
              ) : (
                <section className="card-hero rl-in flex min-h-[200px] flex-col justify-center gap-3 p-6 md:p-8">
                  <p className="t-eyebrow">Pour commencer</p>
                  <h2 className="t-h1 m-0">Les QCM de chaque matière arrivent bientôt.</h2>
                </section>
              )
            }
          />
          <Liens
            label="Autres banques"
            items={[
              { href: "#matieres", icon: <BookOpen size={20} aria-hidden />, title: BIBLIO.quizFiches, desc: BIBLIO.quizFichesLigne, meta: `${drills.length}` },
              { href: "/qcm?view=community", icon: <Users size={20} aria-hidden />, title: BIBLIO.communaute, desc: BIBLIO.communauteLigne, meta: `${communityCount}` },
              {
                href: "#matieres",
                icon: <Library size={20} aria-hidden />,
                title: BIBLIO.tesQcm,
                desc: `${totalDone} réussies sur ${totalCount}, ${pluriel(entamees, "matière entamée", "matières entamées")}.`,
              },
            ]}
          />
          <Bande icone={<Icone nom="entrainer" size={22} />} titre={BIBLIO.suiteTitre} ligne={BIBLIO.suiteLigne} action={{ href: "/practice", label: BIBLIO.suiteAction }} medaillon="qcm-machines" />
        </div>
      }
    >
      <Section id="matieres" titre="Par matière" meta={`${nTotal} QCM et quiz des fiches`}>
        <SubjectBrowser
          groups={groups}
          basePath="/qcm"
          unit={["question", "questions"]}
          setUnit={["QCM", "QCM"]}
          setLabel="QCM"
          drillLabel="Quiz des fiches"
          initialKey={initialKey}
          syncParam="subject"
          progressLabel="réussies"
          emptyLabel="Les QCM de cette matière arrivent bientôt."
          note="L'XP se gagne sur ces QCM : une fois par question, à ta première bonne réponse."
        />
      </Section>
    </Page>
  );
}
