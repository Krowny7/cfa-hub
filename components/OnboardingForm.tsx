"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { PremierTrait } from "@/components/adn/PremierTrait";
import { INSCRIPTION } from "@/lib/voice-z1";
import { CLE_PRESENTATION, VERSION_PRESENTATION } from "@/lib/presentation";
import { CLE_TUTO } from "@/lib/leonard/reglages";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

type Etape = "trait" | "date" | "sceau" | "fin";

// Première connexion : le premier trait (moment 7), branché sur le profil.
// Le joueur trace l'anneau, choisit son jour J (enregistré dans
// profiles.exam_date), puis son nom de joueur (profiles.username), qui
// devient son sceau d'initiales. La photo est facultative : le sceau en tient
// lieu (le middleware n'exige plus que le pseudo). Un pseudo refusé (déjà
// pris, caractères invalides) ramène à l'étape du nom, avec la raison.
// `replay` : rejoué depuis Moi › Réglages (le nom est déjà là).
// `presentation` : un compte déjà configuré découvre une nouvelle version
// (lib/presentation) ; comme `replay` (nom et photo intouchés, la date
// réécrite seulement si le joueur en choisit une autre), puis l'accueil et
// la visite de Léonard.
// `apercu` : pour app/preview-da seulement, rien n'est écrit (un pseudo
// « pris » simule le refus).
export function OnboardingForm({
  initialUsername,
  initialAvatarUrl,
  initialExamDate = null,
  next,
  replay = false,
  presentation = false,
  apercu = false,
}: {
  initialUsername: string | null;
  initialAvatarUrl: string | null;
  initialExamDate?: string | null;
  next: string;
  replay?: boolean;
  presentation?: boolean;
  apercu?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [username, setUsername] = useState<string | null>(initialUsername);
  const [saved, setSaved] = useState(Boolean(initialUsername));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // un pseudo refusé : on remonte le premier trait à l'étape du nom
  const [essai, setEssai] = useState(0);
  const [etape, setEtape] = useState<Etape | undefined>(undefined);
  const enCours = useRef<Promise<boolean> | null>(null);

  async function userId() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("not authenticated");
    return data.user.id;
  }

  function refuser(nom: string, raison: string) {
    setMsg(raison);
    setSaved(false);
    setUsername(nom);
    setEtape("sceau");
    setEssai((k) => k + 1);
  }

  function saveUsername(nom: string) {
    setMsg(null);
    if (!USERNAME_RE.test(nom)) {
      // laisse le sceau se poser une fraction de seconde, puis revient au nom
      window.setTimeout(() => refuser(nom, INSCRIPTION.pseudoRegle), 250);
      return;
    }
    setUsername(nom);
    const p = (async () => {
      try {
        if (apercu) {
          await new Promise((r) => window.setTimeout(r, 300));
          if (nom.toLowerCase() === "pris") {
            refuser(nom, INSCRIPTION.pseudoPris);
            return false;
          }
          setSaved(true);
          return true;
        }
        const id = await userId();
        const { error } = await supabase.from("profiles").update({ username: nom }).eq("id", id);
        if (error) {
          const raw = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
          refuser(nom, raw.includes("23505") || raw.includes("duplicate") ? INSCRIPTION.pseudoPris : INSCRIPTION.pseudoErreur);
          return false;
        }
        setSaved(true);
        return true;
      } catch {
        refuser(nom, INSCRIPTION.pseudoErreur);
        return false;
      }
    })();
    enCours.current = p;
  }

  async function saveExamDate(iso: string) {
    if (apercu) return;
    try {
      const id = await userId();
      const { error } = await supabase.from("profiles").update({ exam_date: iso }).eq("id", id);
      if (error) setMsg(INSCRIPTION.dateErreur);
    } catch {
      setMsg(INSCRIPTION.dateErreur);
    }
  }

  async function uploadAvatar(file: File) {
    setMsg(null);
    if (apercu) {
      setAvatarUrl(URL.createObjectURL(file));
      return;
    }
    setBusy(true);
    try {
      const id = await userId();
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", id);
      if (error) throw error;
      setAvatarUrl(publicUrl);
    } catch {
      setMsg(INSCRIPTION.photoErreur);
    } finally {
      setBusy(false);
    }
  }

  // La présentation de cette version est vue : le middleware n'y renvoie
  // plus (le compte, et un cookie de secours si son écriture échoue). Après
  // un premier trait (nouveau joueur, ou nouvelle version), la visite de
  // Léonard suit à l'accueil ; pas quand il est rejoué depuis les réglages.
  async function marquerVue() {
    try {
      document.cookie = `${CLE_PRESENTATION}=${VERSION_PRESENTATION}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // cookies bloqués : le compte suffit
    }
    try {
      await supabase.auth.updateUser({ data: { [CLE_PRESENTATION]: VERSION_PRESENTATION } });
    } catch {
      // réseau : le cookie évite le renvoi sur cet appareil
    }
    if (!replay || presentation) {
      try {
        localStorage.removeItem(CLE_TUTO);
      } catch {
        // stockage indisponible : la visite se rejoue depuis Moi › Réglages
      }
    }
  }

  async function entrer() {
    setBusy(true);
    const ok = enCours.current ? await enCours.current : saved;
    if ((!ok && !replay) || apercu) {
      setBusy(false);
      return;
    }
    await marquerVue();
    router.push(next);
  }

  const fin = (
    <div className="grid w-full justify-items-center gap-4">
      <button type="button" className="btn btn-primary btn-lg rl-press w-full" onClick={entrer} disabled={busy || (!saved && !replay)}>
        {replay && !presentation ? INSCRIPTION.retourReglages : INSCRIPTION.entrer} <ArrowRight size={17} aria-hidden />
      </button>
      {!replay && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {avatarUrl ? (
            <span className="t-micro inline-flex items-center gap-1.5">
              <Check size={13} aria-hidden /> {INSCRIPTION.photoOk}
            </span>
          ) : (
            <span className="t-micro">{INSCRIPTION.photo}</span>
          )}
          <label className={"t-micro inline-flex cursor-pointer items-center gap-1.5 font-semibold text-white underline decoration-line-2 underline-offset-4 hover:decoration-current " + (busy ? "pointer-events-none opacity-45" : "")}>
            <ImagePlus size={13} aria-hidden /> {avatarUrl ? INSCRIPTION.photoChanger : INSCRIPTION.photoAction}
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadAvatar(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-2 pt-2 md:pt-8">
      {presentation && (
        <div className="card mb-2 w-full px-5 py-4 text-center">
          <div className="t-eyebrow">{INSCRIPTION.presentationTitre}</div>
          <p className="t-small m-0 mt-1.5 text-muted">{INSCRIPTION.presentationTexte}</p>
        </div>
      )}
      <PremierTrait
        key={essai}
        etape={etape}
        nom={username}
        examDate={initialExamDate}
        onNom={replay ? undefined : saveUsername}
        onExamDate={(iso) => void saveExamDate(iso)}
        fin={fin}
      />
      {msg && (
        <p role="status" className="max-w-[440px] text-center text-[13.5px] font-medium text-pen">
          {msg}
        </p>
      )}
    </div>
  );
}
