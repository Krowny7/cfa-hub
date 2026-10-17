import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { TuileCalme } from "@/components/ui/Tuiles";
import { shortDay } from "@/components/accueil/format";
import { jourParis } from "@/lib/objectif";
import { decaleJour } from "@/lib/objectif-calc";
import { CODEX } from "@/lib/voice-codex";
import type { CodexMoi, JourCodex } from "@/lib/profil/codex-moi";
import { OuvrirSurAncre } from "@/components/moi/OuvrirSurAncre";

// Le Codex dans Moi (Codex simplifié, ajustement C) : le Codex a quitté la
// barre des espaces, on y entre par cette tuile, en haut de Moi. Elle dit
// où en est le joueur (ce qui attend « Récupérer », les quêtes faites, l'XP
// gagnée) et mène au Codex. Le bloc « Codex », plus bas, garde l'historique
// replié : les quêtes faites, jour par jour. Pas de bouton « Récupérer » ici :
// il vit dans le Codex et dans le panneau du sceau. Composants de
// présentation : tout vient de lib/profil/codex-moi.ts.

const lienTuile = "ink-link inline-flex min-h-[44px] w-fit items-center gap-1 text-[14px] font-semibold";

/** L'ancre de l'historique : le lien « Historique » de la tuile y mène, et le repli s'ouvre à l'arrivée. */
export const ANCRE_HISTORIQUE = "codex-historique";

/** « 37 quêtes faites · 2 140 XP gagnés dans le Codex » ; rien de fait (ou Codex fermé) : la phrase d'accueil. */
export const resumeCodex = (c: CodexMoi): string => (c.faites > 0 ? `${CODEX.quetesFaites(c.faites)} · ${CODEX.xpGagnee(c.xp)}` : CODEX.moi.vide);

/** La tuile d'entrée du Codex (la cible de Léonard : data-leonard="moi-codex"). */
export function TuileCodex({ c, className }: { c: CodexMoi; className?: string }) {
  return (
    <TuileCalme
      className={className}
      dataLeonard="moi-codex"
      icone={<Icone nom="codex" size={18} />}
      titre={CODEX.nom}
      // le chiffre nu (« 37 ») : la ligne dit déjà « 37 quêtes faites », il est caché aux lecteurs d'écran
      droite={c.faites > 0 ? <span className="t-micro font-mono font-semibold" aria-hidden>{c.faites}</span> : undefined}
      fort={c.aRecuperer > 0 ? CODEX.moi.aRecuperer(c.aRecuperer) : undefined}
      ligne={resumeCodex(c)}
      actions={
        <>
          <Link href="/codex" className={lienTuile}>
            {CODEX.moi.ouvrir} <ArrowRight size={14} aria-hidden />
          </Link>
          {c.historique.length > 0 && (
            <a href={`#${ANCRE_HISTORIQUE}`} className={lienTuile}>
              {CODEX.historique}
            </a>
          )}
        </>
      }
    />
  );
}

/** « Aujourd'hui », « Hier », « Mar. 14 oct. » ; null : les quêtes comptées à l'arrivée. */
function libelleJour(jour: string | null, aujourdhui: string): string {
  if (jour === null) return CODEX.moi.arrivee;
  if (jour === aujourdhui) return CODEX.moi.aujourdhui;
  if (jour === decaleJour(aujourdhui, -1)) return CODEX.moi.hier;
  const t = shortDay(new Date(`${jour}T12:00:00Z`));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function Jour({ j, aujourdhui }: { j: JourCodex; aujourdhui: string }) {
  return (
    <li className="flex flex-col gap-1.5">
      <p className="t-eyebrow m-0">{libelleJour(j.jour, aujourdhui)}</p>
      <ul className="m-0 flex list-none flex-col p-0">
        {j.quetes.map((q) => (
          <li key={q.cle} className="flex items-baseline justify-between gap-3 border-t border-line py-2 first:border-t-0">
            <span className="min-w-0 text-[14px] font-medium">{q.titre}</span>
            {q.xp > 0 && <span className="t-micro t-num shrink-0">+{q.xp.toLocaleString("fr-FR")} XP</span>}
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Le bloc « Codex » de Moi : le résumé, puis l'historique replié. Rien de fait : pas de bloc (la tuile suffit). */
export function BlocCodex({ c, now }: { c: CodexMoi; now?: number }) {
  if (!c.disponible || c.historique.length === 0) return null;
  const aujourdhui = jourParis(now ?? Date.now());
  return (
    <section className="rl-section scroll-mt-24" aria-labelledby="moi-codex" id="codex">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="moi-codex" className="t-h2 m-0">
          {CODEX.nom}
        </h2>
        <Link href="/codex" className={lienTuile}>
          {CODEX.moi.ouvrir} <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      {/* une phrase, en police courante (t-num est réservé à un seul grand chiffre par carte) */}
      <p className="m-0 text-[15px] font-semibold leading-snug">{resumeCodex(c)}</p>
      <details id={ANCRE_HISTORIQUE} className="card-quiet group/h scroll-mt-24 p-5 md:p-6">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-[16px] font-bold tracking-[-0.01em]">{CODEX.historique}</span>
            <span className="t-micro mt-0.5 block">{CODEX.moi.historiqueSous}</span>
          </span>
          <ChevronRight size={16} aria-hidden className="shrink-0 transition-transform group-open/h:rotate-90" />
        </summary>
        <ol className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
          {c.historique.map((j) => (
            <Jour key={j.jour ?? "arrivee"} j={j} aujourdhui={aujourdhui} />
          ))}
        </ol>
        {c.plusAnciennes > 0 && <p className="t-micro m-0 mt-3">{CODEX.moi.plusAnciennes(c.plusAnciennes)}</p>}
      </details>
      <OuvrirSurAncre id={ANCRE_HISTORIQUE} />
    </section>
  );
}
