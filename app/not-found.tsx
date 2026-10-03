import Link from "next/link";
import { Enso } from "@/components/ui/InkRings";
import { BrushUnderline } from "@/components/ui/Titles";

// 404 : un seul chiffre, une phrase, une action. Ils arrivent en cascade, le
// trait de pinceau se dessine sous le chiffre.
export default function NotFound() {
  return (
    <div className="relative grid min-h-[62vh] place-items-center text-center">
      <Enso size={400} opacity={0.045} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="rl-stagger relative grid justify-items-center">
        <div className="t-num text-[clamp(88px,14vw,128px)]">404</div>
        <BrushUnderline width={140} height={13} className="mt-2 text-white" />
        <h1 className="t-h2 mt-7">Cette page n&apos;existe pas (encore)</h1>
        <p className="t-small mt-2 max-w-[40ch]">Le lien est peut-être ancien, ou la page arrive bientôt.</p>
        <Link href="/dashboard" className="btn btn-primary mt-7">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
