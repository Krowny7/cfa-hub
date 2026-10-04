import Link from "next/link";
import { RankBadge } from "@/components/ui/RankBadge";
import { SectionTitle } from "@/components/ui/Titles";
import { Avatar } from "@/components/classement/Avatar";
import { classesProfil as s, styleAccent } from "@/components/profil/Pieces";
import { SUBJECTS } from "@/components/reviser/catalog";
import { TIERS } from "@/lib/ranks";
import { VITRINE, type ProfilStats, type StyleProfil, type VitrineKey } from "@/lib/profil/catalogue";
import type { AmiLite } from "@/lib/profil/donnees";
import { nombre, pct } from "@/lib/voice";

// Le bas du profil : la vitrine (trois pièces choisies par le joueur) et ses
// amis (le radar : RadarComparable). Sans état.

type Rang = { tierIndex: number; division: string | null; elo: number; mastery: number | null };

function Piece({ k, st, rang }: { k: VitrineKey; st: ProfilStats; rang: Rang }) {
  const nom = VITRINE.find((v) => v.key === k)?.nom ?? k;
  let grand: React.ReactNode;
  let petit: string;
  switch (k) {
    case "rang": {
      const t = TIERS[rang.tierIndex] ?? TIERS[0];
      grand = (
        <span className="flex items-center gap-3">
          <RankBadge tier={rang.tierIndex} size={46} mastery={rang.mastery} division={rang.division} glow={false} />
          <span>
            {t.name}
            {rang.division ? ` ${rang.division}` : ""}
          </span>
        </span>
      );
      petit = `${nombre(rang.elo)} ELO${st.palierMax > rang.tierIndex ? ` · record ${TIERS[st.palierMax].name}` : ""}`;
      break;
    }
    case "questions":
      grand = nombre(st.questions);
      petit = "questions posées";
      break;
    case "serie":
      grand = `${nombre(st.serie)} j`;
      petit = `série en cours · record ${nombre(st.meilleureSerie)} j`;
      break;
    case "duels":
      grand = nombre(st.duelsGagnes);
      petit = `${st.duelsGagnes > 1 ? "victoires" : "victoire"} sur ${nombre(st.duelsJoues)} ${st.duelsJoues > 1 ? "duels" : "duel"}`;
      break;
    case "matiere": {
      const best = [...st.matieres].filter((m) => m.pct !== null && m.answered >= 10).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0];
      const m = best ? SUBJECTS.find((x) => x.key === best.key) : null;
      grand = m ? m.short : "—";
      petit = best ? `${pct(best.pct ?? 0)} de maîtrise` : "pas encore mesurée";
      break;
    }
    case "defis":
      grand = nombre(st.defisRendus);
      petit = st.defisRendus > 1 ? "défis du jour rendus" : "défi du jour rendu";
      break;
    default:
      grand = nombre(st.calculsJustes);
      petit = "calculs justes";
  }
  return (
    <div className="card-quiet flex min-w-0 flex-col gap-2 p-5">
      <span className="t-eyebrow">{nom}</span>
      <span className={`t-num text-[28px] leading-none sm:text-[32px] ${s.accent}`}>{grand}</span>
      <span className="t-micro">{petit}</span>
    </div>
  );
}

export function Vitrine({ style, stats, rang }: { style: StyleProfil; stats: ProfilStats; rang: Rang }) {
  const keys = style.showcase.length ? style.showcase : (["rang", "questions", "serie"] as VitrineKey[]);
  return (
    <section aria-label="Vitrine" style={styleAccent(style.accent)}>
      <div className={"grid gap-3 sm:gap-4 " + (keys.length >= 3 ? "sm:grid-cols-3" : keys.length === 2 ? "sm:grid-cols-2" : "")}>
        {keys.map((k) => (
          <Piece key={k} k={k} st={stats} rang={rang} />
        ))}
      </div>
    </section>
  );
}

/** Les amis du joueur : sceaux et noms, vers leurs profils. */
export function ListeAmis({ amis, total, moi }: { amis: AmiLite[]; total: number; moi: boolean }) {
  return (
    <section className="rl-section" aria-labelledby="profil-amis">
      <SectionTitle
        title={<span id="profil-amis">Amis</span>}
        action={
          moi ? (
            <Link href="/people?view=amis" className="t-small font-semibold hover:text-white">
              Gérer mes amis →
            </Link>
          ) : (
            <span className="t-micro font-mono tabular-nums">{nombre(total)}</span>
          )
        }
      />
      {amis.length === 0 ? (
        <p className="t-small m-0">{moi ? "Pas encore d'amis : ajoute les joueurs que tu croises en duel ou au classement." : "Pas encore d'amis."}</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:grid-cols-6">
          {amis.map((a) => (
            <li key={a.id} className="min-w-0">
              <Link href={`/people/${a.id}`} className="card-quiet rl-lift flex min-w-0 items-center gap-2.5 p-2.5">
                <Avatar src={a.avatarUrl} name={a.name} size={32} />
                <span className="truncate text-[13.5px] font-semibold">{a.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
