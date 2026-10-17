import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { CASE_VIDE } from "@/lib/voice-profil";

// L'invitation de la page par défaut : sur son propre profil, la place
// libre de la page jamais composée mène à Personnaliser pour y poser une
// image, un GIF ou une vidéo (les autres ne la voient pas). La grille de
// la page est GrilleProfil, ses blocs BlocsProfil. Sans état.

/** La case vide de son propre profil : un pointillé qui mène à l'éditeur. */
export function CaseImage({ href }: { href: string }) {
  return (
    <Link href={href} className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[18px] border border-dashed border-line-2 p-6 text-center text-muted transition-colors hover:border-white hover:text-white">
      <ImagePlus size={22} aria-hidden />
      <span className="text-[14px] font-semibold">{CASE_VIDE.titre}</span>
      <span className="t-micro max-w-[240px]">{CASE_VIDE.texte}</span>
    </Link>
  );
}
