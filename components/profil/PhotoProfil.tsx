"use client";

import { useMemo, useState } from "react";
import { Crop } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { SceauPerso } from "@/components/adn/SceauPerso";
import { RecadragePhoto } from "@/components/ui/RecadragePhoto";
import { enregistrerPhotoProfil } from "@/lib/profil/photo";
import type { PhotoRecadree } from "@/lib/profil/recadrage";

// La photo de profil, de quoi la voir et la changer : l'aperçu de la photo
// actuelle (sans photo, le sceau d'initiales en tient lieu), « Changer de
// photo » / « Ajouter une photo », « Recadrer », la fenêtre de recadrage
// (components/ui/RecadragePhoto), puis l'envoi dans le bucket « avatars » et
// profiles.avatar_url (lib/profil/photo). Sert dans Moi › Réglages
// (ProfileSettings) et dans la feuille « Photo et cadre » de Personnaliser.
// L'enregistrement est immédiat : `onEnregistre` reçoit la nouvelle adresse.

export function PhotoProfil({
  avatarUrl,
  nom,
  onEnregistre,
  disabled = false,
  libelle = true,
  confirmation,
}: {
  /** l'adresse de la photo actuelle, null s'il n'y en a pas */
  avatarUrl: string | null;
  /** le nom du joueur : les initiales du sceau, faute de photo */
  nom: string | null;
  /** la photo vient d'être enregistrée (sa nouvelle adresse) */
  onEnregistre: (url: string) => void;
  /** les boutons sont grisés (chargement, autre envoi en cours) */
  disabled?: boolean;
  /** affiche le titre et l'aide sous l'aperçu (faux quand la section les porte déjà) */
  libelle?: boolean;
  /** un court message, sous les boutons, une fois la photo enregistrée */
  confirmation?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();
  // ce qu'on recadre : le fichier qui vient d'être choisi, ou l'adresse de la photo actuelle
  const [aRecadrer, setARecadrer] = useState<File | string | null>(null);
  const [fait, setFait] = useState(false);

  // La photo recadrée (RecadragePhoto) part à la place de l'original ; en cas
  // d'échec, l'erreur remonte à la fenêtre, qui reste ouverte.
  async function envoyerPhoto(photo: PhotoRecadree) {
    setFait(false);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) throw new Error("Not logged in");
    const url = await enregistrerPhotoProfil(supabase, user.id, photo);
    setFait(true);
    onEnregistre(url);
  }

  return (
    <div className="flex items-center gap-4">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="Ta photo de profil" className="h-16 w-16 shrink-0 rounded-full object-cover shadow-[var(--shadow-1)]" />
      ) : (
        // Sans photo, ton sceau d'initiales en tient lieu (la photo est facultative).
        <SceauPerso nom={nom || null} taille={64} className="shrink-0" title="Ton sceau" />
      )}
      <div className="min-w-0">
        {libelle && (
          <>
            <div className="text-[14px] font-semibold">{t("settings.avatarLabel")}</div>
            <div className="mt-0.5 text-[12.5px] text-muted">{t("settings.avatarHint")}</div>
          </>
        )}
        <div className={"flex flex-wrap items-center gap-2 " + (libelle ? "mt-2" : "")}>
          <label className={"btn btn-secondary min-h-[36px] cursor-pointer text-[13px] " + (disabled ? "pointer-events-none opacity-45" : "")}>
            {avatarUrl ? "Changer de photo" : "Ajouter une photo (facultatif)"}
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={disabled}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setARecadrer(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
          {avatarUrl && (
            <button type="button" className="btn btn-ghost min-h-[36px] text-[13px]" disabled={disabled} onClick={() => setARecadrer(avatarUrl)}>
              <Crop size={14} aria-hidden /> Recadrer
            </button>
          )}
        </div>
        {fait && confirmation && (
          <p role="status" className="t-micro m-0 mt-2 font-semibold">
            {confirmation}
          </p>
        )}
      </div>

      <RecadragePhoto source={aRecadrer} onValider={envoyerPhoto} onFermer={() => setARecadrer(null)} />
    </div>
  );
}
