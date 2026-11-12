import Link from "next/link";
import { Search } from "lucide-react";
import type { PlayerLite } from "@/components/classement/PlayerRow";
import { LinkSeg } from "@/components/classement/Seg";
import { Avatar } from "@/components/classement/Avatar";
import { AmiBouton } from "@/components/profil/AmiBouton";
import { PresenceText } from "@/components/presence/Presence";
import { Carrousel } from "@/components/ui/Carrousel";
import { ListeCourte, type Ligne } from "@/components/ui/Decors";
import type { Piece } from "@/components/ui/Presentoir";
import { CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { VIDE } from "@/lib/voice";
import { JOUEURS } from "@/lib/voice-z2a";
import { PJ } from "@/lib/voice-classement";
import { RETOUR_AFFRONTER, SOUS_AFFRONTER } from "@/lib/voice-affronter-sous";
import type { AmiLite } from "@/lib/profil/donnees";

/** Plus montré (le Top 10 copiait le classement) ; le type reste pour l'aperçu. */
export type TopRow = { userId: string; name: string; elo: number; rank: number; mastery: number | null; isMe: boolean };

const J = SOUS_AFFRONTER.joueurs;

// L'annuaire des joueurs, sur le modèle des sous-pages validé par Théo (2026-11-12) : l'en-tête commun
// (retour à S'affronter, la place de la Seigneurie), puis le cadre à zones. À gauche, la recherche et
// les joueurs en carrousel de portraits (les joueurs à ta mesure devant) : un clic sur le portrait de
// devant ouvre son profil. Dans la colonne grise, tes amis (en ligne d'abord), et les demandes reçues
// à accepter. Composant de présentation (page serveur ou page d'aperçu).
export function PeopleView({
  rows,
  view,
  q,
  hasGroups,
  demandes = null,
  total = null,
  aTaMesure = [],
  amis = null,
}: {
  rows: PlayerLite[];
  /** « amis » (ancienne vue) : les amis sont dans la colonne grise, la liste montre tout le monde */
  view: "all" | "groups" | "amis";
  q: string;
  /** je suis dans au moins un groupe */
  hasGroups: boolean;
  /** demandes d'ami reçues et envoyées (null : amis pas encore disponibles) */
  demandes?: { recues: AmiLite[]; envoyees: AmiLite[] } | null;
  /** joueurs au classement du domaine (null : inconnu, on compte la liste) */
  total?: number | null;
  /** les joueurs dont l'ELO est le plus proche du tien (hors toi) */
  aTaMesure?: PlayerLite[];
  /** tes amis, en ligne d'abord (null : amis pas encore disponibles) */
  amis?: AmiLite[] | null;
}) {
  const groupes = view === "groups";
  const qs = (v: string) => `/people?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const recues = demandes?.recues ?? [];
  const envoyees = demandes?.envoyees ?? [];

  // le carrousel : sans recherche, les joueurs à ta mesure devant, puis les autres ; jamais toi
  const devant = !q && !groupes ? aTaMesure : [];
  const dejaDevant = new Set(devant.map((p) => p.id));
  const joueurs = [...devant, ...rows.filter((p) => !p.isMe && !dejaDevant.has(p.id))];
  const pieces: Piece[] = joueurs.map((p, i) => ({
    cle: p.id,
    href: `/people/${p.id}`,
    numero: String(i + 1).padStart(2, "0"),
    code: p.name,
    titre: p.name,
    image: p.avatarUrl,
  }));

  const lignesAmis: Ligne[] = (amis ?? []).map((a) => ({
    cle: a.id,
    titre: a.name,
    detail: <PresenceText userId={a.id} court />,
    href: `/people/${a.id}`,
  }));

  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={RETOUR_AFFRONTER}
          titre={J.titre}
          ligne={PJ.joueurs(total ?? rows.length)}
          illustration={{ nom: "joueurs-seigneurie", position: "50% 60%" }}
        />
      }
    >
      <CadreZones
        gauche={{
          titre: J.trouver,
          contenu: (
            <div className="grid min-w-0 gap-4">
              <form className="flex w-full min-w-0 max-w-[560px] gap-2 justify-self-center" action="/people" method="get" role="search">
                {groupes && <input type="hidden" name="view" value="groups" />}
                <label htmlFor="rl-people-q" className="sr-only">
                  {JOUEURS.chercher}
                </label>
                <div className="relative min-w-0 flex-1">
                  <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
                  <input id="rl-people-q" name="q" defaultValue={q} placeholder={J.placeholder} className="input h-[46px] pl-11 text-[15px]" />
                </div>
                <button type="submit" className="btn btn-secondary rl-press h-[46px] shrink-0 px-5">
                  {J.chercher}
                </button>
              </form>
              {hasGroups && (
                <div className="justify-self-center">
                  <LinkSeg
                    label={JOUEURS.filtre}
                    active={groupes ? "groups" : "all"}
                    items={[
                      { key: "all", label: JOUEURS.tous, href: qs("all") },
                      { key: "groups", label: JOUEURS.groupes, href: qs("groups") },
                    ]}
                  />
                </div>
              )}
              {pieces.length > 0 ? (
                <Carrousel key={`${view}:${q}`} forme="portrait" pieces={pieces} action={J.ouvrir} />
              ) : (
                <p className="t-h3 m-0 text-center">{q ? JOUEURS.aucun(q) : groupes && !hasGroups ? JOUEURS.sansGroupe : VIDE.adversaires}</p>
              )}
            </div>
          ),
        }}
        droite={{
          titre: J.amis,
          contenu: (
            <div className="grid min-w-0 gap-3">
              {/* les demandes reçues : à accepter ici */}
              {recues.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-3">
                  <Link href={`/people/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar src={a.avatarUrl} name={a.name} size={34} userId={a.id} />
                    <span className="min-w-0">
                      <span className="block truncate text-[14.5px] font-semibold">{a.name}</span>
                      <span className="t-micro block">{PJ.veutEtreAmi}</span>
                    </span>
                  </Link>
                  <AmiBouton autre={a.id} relation="recue" compact />
                </div>
              ))}
              <ListeCourte lignes={lignesAmis} vide={amis === null ? J.amisBientot : J.amisVide} />
              {/* les demandes envoyées, en attente : on peut les annuler */}
              {envoyees.length > 0 && <h3 className="t-eyebrow m-0 mt-1">{J.envoyees}</h3>}
              {envoyees.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-3">
                  <Link href={`/people/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar src={a.avatarUrl} name={a.name} size={28} userId={a.id} />
                    <span className="truncate text-[14px] font-medium">{a.name}</span>
                  </Link>
                  <AmiBouton autre={a.id} relation="envoyee" compact />
                </div>
              ))}
            </div>
          ),
        }}
      />
    </SousPage>
  );
}
