import Link from "next/link";
import { INK } from "@/components/ui/InkDefs";
import { INTROUVABLE } from "@/lib/voice";
import { INTROUVABLE_Z1 } from "@/lib/voice-z1";

// 404 : « Cette page n'a jamais été tracée. » L'anneau du logo reste au
// crayon, sans une goutte d'encre (la piste seule), avec le chiffre au
// centre ; puis une phrase et une action. Ils arrivent en cascade.
export default function NotFound() {
  return (
    <div className="grid min-h-[62vh] place-items-center text-center">
      <div className="rl-stagger grid justify-items-center">
        <div className="relative grid h-[220px] w-[220px] place-items-center sm:h-[260px] sm:w-[260px]">
          <svg viewBox="0 0 240 240" aria-hidden className="absolute inset-0 h-full w-full overflow-visible">
            <use href={INK.logoTrack} fill="none" stroke="var(--pencil)" strokeWidth={1.2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="t-num relative text-[38px] text-[color:var(--ink-3)] sm:text-[44px]">404</span>
        </div>
        <h1 className="t-h2 mt-8 max-w-[22ch]">{INTROUVABLE.titre}</h1>
        <p className="t-small mt-2 max-w-[40ch]">{INTROUVABLE_Z1.sous}</p>
        <Link href="/dashboard" className="btn btn-primary mt-7">
          {INTROUVABLE.action}
        </Link>
      </div>
    </div>
  );
}
