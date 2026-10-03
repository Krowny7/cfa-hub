import Link from "next/link";
import { Enso } from "@/components/ui/InkRings";
import { BrushUnderline } from "@/components/ui/Titles";

export default function NotFound() {
  return (
    <div className="relative grid min-h-[60vh] place-items-center text-center">
      <Enso size={420} opacity={0.06} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="relative grid justify-items-center gap-3">
        <div className="font-brand text-[96px] leading-none">404</div>
        <BrushUnderline width={150} height={14} className="text-white" />
        <h1 className="mt-2 text-[24px] font-extrabold tracking-[-0.02em]">Cette page n&apos;existe pas (encore)</h1>
        <p className="max-w-[44ch] text-muted">Le lien est peut-être ancien, ou la page arrive bientôt.</p>
        <Link href="/dashboard" className="btn btn-primary rl-press mt-3">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
