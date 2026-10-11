import { ArrowRight, Bookmark, PenLine } from "lucide-react";
import { BoutonPlein, FilMoi, HerosMoi, ListeClassee } from "@/components/moi/Briques";
import { LienCarnet } from "@/components/moi/Clients";
import { ErrorsTab } from "@/components/moi/ErrorsSection";
import { MarqueesTab } from "@/components/moi/MarqueesTab";
import { RaturesTab } from "@/components/moi/RaturesTab";
import { Illustration } from "@/components/ui/Illustration";
import { SOURCES_RATURE } from "@/lib/voice-z1";
import { REG } from "@/lib/voice-moi";
import type { MoiData } from "@/components/moi/types";
import s from "@/components/moi/Moi.module.css";

// Le gabarit commun des pages de liste de Moi (variante A « Le registre ») :
// le carnet de ratures (?onglet=erreurs) et les questions marquées
// (?onglet=marquees). Un fil « ← Moi », un héros (titre énorme, une phrase,
// un bouton plein, la liste des trois sources ou rubriques, ou une phrase s'il
// n'y a rien à classer), une carte illustrée à côté, puis la liste complète,
// réduite à ses filtres et à ses lignes. Composant de présentation.

const SOURCES: Record<string, string> = Object.fromEntries(SOURCES_RATURE);

type Resume = {
  kicker: string;
  titre: string;
  repere: string;
  phrase: string;
  action: React.ReactNode;
  listeTitre: string;
  lignes: { nom: string; n: number }[];
  aside: { kicker: string; titre: string; ligne: string; lien: React.ReactNode; image: "moi-carnet" | "moi-marquees" };
  titreListe: string;
};

/** La courte liste du héros ; rien à classer (moins de deux lignes, ou toutes égales) : une phrase. */
function ListeHeros({ titre, lignes }: { titre: string; lignes: Resume["lignes"] }) {
  if (lignes.length === 0) return undefined;
  const max = Math.max(1, ...lignes.map((l) => l.n));
  if (lignes.length < 2 || lignes.every((l) => l.n === lignes[0].n)) {
    return <p className="t-small m-0 self-center">{REG.rubriquesEgales(lignes.map((l) => l.nom), lignes[0].n)}</p>;
  }
  return <ListeClassee titre={titre} lignes={lignes.map((l) => ({ cle: l.nom, nom: l.nom, pct: (l.n / max) * 100, valeur: String(l.n) }))} />;
}

function resumeRatures(d: MoiData): Resume | null {
  if (!d.ratures.available) return null;
  const r = d.ratures;
  const T = REG.ratures;
  return {
    kicker: T.kicker,
    titre: T.titre(r.total),
    repere: T.repere(r.retirees, r.retireesSemaine),
    phrase: r.total > 0 ? T.phrase : T.phraseVide,
    action:
      r.total > 0 ? (
        <LienCarnet action="propre" className="btn btn-primary rl-press w-fit max-md:min-h-[44px]">
          <PenLine size={16} aria-hidden /> {T.action} <ArrowRight size={16} aria-hidden />
        </LienCarnet>
      ) : undefined,
    listeTitre: T.liste,
    lignes: Object.entries(r.sources)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, n]) => ({ nom: SOURCES[k] ?? k, n })),
    aside: {
      kicker: T.asideKicker,
      titre: T.asideTitre(r.retirees),
      ligne: T.asideLigne(r.retirees, r.retireesSemaine),
      lien:
        r.retirees > 0 ? (
          <LienCarnet action="anciennes" className="ink-link mt-auto inline-flex w-fit items-center gap-1 pt-1 text-[14px] font-semibold">
            {T.asideLien} <ArrowRight size={14} aria-hidden />
          </LienCarnet>
        ) : null,
      image: "moi-carnet",
    },
    titreListe: T.listeTitre,
  };
}

function resumeMarquees(d: MoiData): Resume | null {
  const m = d.marquees.items;
  if (!d.marquees.available || m.length === 0) return null;
  const T = REG.marquees;
  const parRubrique = new Map<string, number>();
  for (const x of m) parRubrique.set(x.rubrique, (parRubrique.get(x.rubrique) ?? 0) + 1);
  const recente = new Date(m[0].flaggedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
  return {
    kicker: T.kicker,
    titre: T.titre(m.length),
    repere: T.repere(`le ${recente}`, m.filter((x) => !x.answered).length),
    phrase: T.phrase,
    action: <BoutonPlein href="#liste" label={T.action} icon={<Bookmark size={16} aria-hidden />} />,
    listeTitre: T.liste,
    lignes: [...parRubrique].sort((a, b) => b[1] - a[1]).map(([nom, n]) => ({ nom, n })).slice(0, 3),
    aside: {
      kicker: T.asideKicker,
      titre: T.asideTitre,
      ligne: T.asideLigne,
      lien: (
        <a href="#liste" className="ink-link mt-auto inline-flex w-fit items-center gap-1 pt-1 text-[14px] font-semibold">
          {T.asideLien} <ArrowRight size={14} aria-hidden />
        </a>
      ),
      image: "moi-marquees",
    },
    titreListe: T.listeTitre,
  };
}

export function Registre({ d, liste, now }: { d: MoiData; liste: "ratures" | "marquees"; now?: number }) {
  const res = liste === "ratures" ? resumeRatures(d) : resumeMarquees(d);

  // la liste complète : le carnet de ratures sans son résumé (le héros le remplace), l'ancien carnet des fiches tant que la migration manque, ou les marquées
  const corps =
    liste === "ratures" ? (
      d.ratures.available ? (
        <RaturesTab initial={d.ratures} notions={d.ratures.parNotion} now={now} sansResume />
      ) : (
        <ErrorsTab errors={d.errors} now={now} />
      )
    ) : (
      <MarqueesTab marquees={d.marquees} />
    );

  // sans carnet activé, ou sans marquée : la liste seule (elle explique l'état)
  if (!res) {
    return (
      <div className="rl-wide flex flex-col gap-4">
        <FilMoi label={REG.fil} />
        <h1 className="t-h1 m-0">{liste === "ratures" ? REG.ratures.kicker : REG.marquees.kicker}</h1>
        {corps}
      </div>
    );
  }

  return (
    <div className="rl-wide flex flex-col gap-8 md:gap-12">
      <div className="flex flex-col gap-4">
        <FilMoi label={REG.fil} />
        <div className="grid gap-4 md:gap-[18px] lg:grid-cols-12">
          <HerosMoi
            className="lg:col-span-8"
            titreNiveau={1}
            kicker={res.kicker}
            titre={res.titre}
            repere={res.repere}
            phrase={res.phrase}
            action={res.action}
            liste={ListeHeros({ titre: res.listeTitre, lignes: res.lignes })}
          />
          <section className={"card-quiet min-w-0 overflow-hidden lg:col-span-4 " + s.aside} aria-label={res.aside.titre}>
            <div className={s.asideImg}>
              <Illustration nom={res.aside.image} decorative />
            </div>
            <div className={"flex min-w-0 flex-col gap-3 " + s.asideTxt}>
              <p className="t-eyebrow m-0">{res.aside.kicker}</p>
              <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">{res.aside.titre}</h2>
              <p className="t-small m-0">{res.aside.ligne}</p>
              {res.aside.lien}
            </div>
          </section>
        </div>
      </div>
      <section id="liste" className="rl-section" aria-labelledby="liste-titre">
        <h2 id="liste-titre" className="t-h2 m-0">
          {res.titreListe}
        </h2>
        {corps}
      </section>
    </div>
  );
}
