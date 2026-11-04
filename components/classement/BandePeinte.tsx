import { Illustration } from "@/components/ui/Illustration";
import { CL } from "@/lib/voice-classement";
import s from "./Affronter.module.css";

// À droite du titre de S'affronter : un fin bandeau découpé dans la peinture du Colisée, les
// deux combattants sur le sable, et une phrase. Purement décoratif : il équilibre l'en-tête.
export function BandePeinte() {
  return (
    <div id="cl-bande" className={s.bandePeinte}>
      <Illustration nom="duel-lice" position="50% 83%" decorative eager />
      <p className={"font-brand " + s.bandePhrase}>{CL.bande}</p>
    </div>
  );
}
