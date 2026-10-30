"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { BADGES_MAX, STATS_MAX, STATS_PANNEAU, formaterStat, type CleStat, type GenreBadge, type Panneau } from "@/lib/profil/banniere";
import type { BadgeChoix } from "@/lib/profil/banniere-badges";
import { statsCompletees, type DonneesPanneau } from "@/lib/profil/panneau-editeur";
import { BANNIERE_ED } from "@/lib/voice-banniere";
import c from "./EditeurBanniere.module.css";

// Le choix du panneau de gauche de la bannière (Personnaliser › Ta bannière) :
// ce que la carte du joueur montre, le reste étant dessiné par le site.
//   - TROIS BADGES parmi ce qu'il a gagné (sceaux, trophées, titres :
//     lib/profil/banniere-badges.ts) : une liste de cases (toucher pour poser ou
//     retirer), et trois emplacements qu'on range en les glissant ou avec les
//     flèches. Rien de choisi : le site pose d'office ses trois sceaux les
//     plus rares (la ligne le dit).
//   - TROIS CHIFFRES dans des listes, chacun avec sa vraie valeur ; une
//     statistique ne se pose qu'une fois.
// L'aperçu de la carte complète est à côté (EditeurBanniere.tsx) et suit chaque
// choix. Le serveur revalide tout à l'enregistrement (validerComposition).

const GENRES: { genre: GenreBadge; titre: string }[] = [
  { genre: "sceau", titre: BANNIERE_ED.sceaux },
  { genre: "trophee", titre: BANNIERE_ED.trophees },
  { genre: "titre", titre: BANNIERE_ED.titres },
];

/** Les mêmes identifiants, la place `de` mise à la place `vers`. */
export function deplacerDans<T>(liste: readonly T[], de: number, vers: number): T[] {
  const out = [...liste];
  if (de < 0 || de >= out.length || vers < 0 || vers >= out.length || de === vers) return out;
  const [x] = out.splice(de, 1);
  out.splice(vers, 0, x);
  return out;
}

export function ChoixPanneau({ panneau, badges, donnees, onChange }: { panneau: Panneau; badges: BadgeChoix[]; donnees: DonneesPanneau; onChange: (p: Panneau) => void }) {
  const [vise, setVise] = useState<number | null>(null);
  const choisis = panneau.badges.slice(0, BADGES_MAX);
  const nomDe = (id: string) => badges.find((b) => b.id === id)?.nom ?? donnees.badges[id]?.nom ?? id;
  const poser = (id: string) => onChange({ ...panneau, badges: choisis.includes(id) ? choisis.filter((x) => x !== id) : choisis.length < BADGES_MAX ? [...choisis, id] : choisis });
  const ranger = (de: number, vers: number) => onChange({ ...panneau, badges: deplacerDans(choisis, de, vers) });
  const stats = statsCompletees(panneau.stats);
  const changerStat = (i: number, cle: CleStat) => {
    const suite = [...stats];
    suite[i] = cle;
    onChange({ ...panneau, stats: suite });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h3 className="t-eyebrow m-0">{BANNIERE_ED.badges}</h3>
        <p className="t-micro m-0">{BANNIERE_ED.badgesAide}</p>
        <ol className={c.emplacements} aria-label={BANNIERE_ED.badges}>
          {Array.from({ length: BADGES_MAX }, (_, i) => {
            const id = choisis[i] ?? null;
            return (
              <li
                key={i}
                className={c.emplacement}
                data-vide={id ? "false" : "true"}
                data-vise={vise === i ? "true" : "false"}
                data-emplacement={i + 1}
                draggable={!!id}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", String(i));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (!choisis.length) return;
                  e.preventDefault();
                  setVise(i);
                }}
                onDragLeave={() => setVise((v) => (v === i ? null : v))}
                onDrop={(e) => {
                  e.preventDefault();
                  setVise(null);
                  const de = Number(e.dataTransfer.getData("text/plain"));
                  if (Number.isInteger(de) && de >= 0 && de < choisis.length && i < choisis.length) ranger(de, i);
                }}
                onDragEnd={() => setVise(null)}
              >
                <span aria-hidden className={c.numero}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate">{id ? nomDe(id) : BANNIERE_ED.badgeVide}</span>
                {id && (
                  <>
                    <button type="button" className="btn btn-ghost btn-sm !min-h-[36px] !px-2" onClick={() => ranger(i, i - 1)} disabled={i === 0} aria-label={`${BANNIERE_ED.monter} : ${nomDe(id)}`}>
                      <ArrowUp size={14} aria-hidden />
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm !min-h-[36px] !px-2" onClick={() => ranger(i, i + 1)} disabled={i >= choisis.length - 1} aria-label={`${BANNIERE_ED.descendre} : ${nomDe(id)}`}>
                      <ArrowDown size={14} aria-hidden />
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm !min-h-[36px] !px-2" onClick={() => poser(id)} aria-label={`${BANNIERE_ED.ranger} : ${nomDe(id)}`}>
                      <X size={14} aria-hidden />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ol>
        {choisis.length === 0 && <p className="t-micro m-0">{BANNIERE_ED.badgesRepli}</p>}
        {badges.length === 0 ? (
          <p className="t-small m-0">{BANNIERE_ED.badgesAucun}</p>
        ) : (
          GENRES.map(({ genre, titre }) => {
            const liste = badges.filter((b) => b.genre === genre);
            if (!liste.length) return null;
            return (
              <div key={genre} className="flex flex-col gap-1.5" role="group" aria-label={titre}>
                <p className="t-micro m-0 font-semibold">{titre}</p>
                <div className={c.puces}>
                  {liste.map((b) => {
                    const on = choisis.includes(b.id);
                    return (
                      <button key={b.id} type="button" className={c.puce} aria-pressed={on} disabled={!on && choisis.length >= BADGES_MAX} onClick={() => poser(b.id)} title={b.detail ?? undefined} data-badge={b.id}>
                        <span className="min-w-0 truncate">{b.nom}</span>
                        {b.detail && genre === "trophee" && <span className="font-mono text-[11px] opacity-70">{b.detail}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="t-eyebrow m-0">{BANNIERE_ED.stats}</h3>
        <p className="t-micro m-0">{BANNIERE_ED.statsAide}</p>
        {Array.from({ length: STATS_MAX }, (_, i) => (
          <label key={i} className="flex flex-col gap-1 text-[12.5px] font-semibold">
            <span>{BANNIERE_ED.statN(i + 1)}</span>
            <select className={c.select} value={stats[i]} onChange={(e) => changerStat(i, e.target.value as CleStat)} data-stat-slot={i + 1}>
              {STATS_PANNEAU.map((s) => (
                <option key={s.cle} value={s.cle} disabled={s.cle !== stats[i] && stats.includes(s.cle)}>
                  {s.nom} · {formaterStat(s.cle, donnees.valeurs[s.cle])}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
