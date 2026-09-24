"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

export function OnboardingForm({
  initialUsername,
  initialAvatarUrl,
  next
}: {
  initialUsername: string | null;
  initialAvatarUrl: string | null;
  next: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { t } = useI18n();

  const [username, setUsername] = useState(initialUsername ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [usernameSaved, setUsernameSaved] = useState(Boolean(initialUsername));

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const ready = usernameSaved && Boolean(avatarUrl);

  async function saveUsername() {
    setMsg(null);
    setBusy(true);
    try {
      const trimmed = username.trim();
      if (!USERNAME_RE.test(trimmed)) {
        throw new Error(t("settings.usernameHint"));
      }

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Not logged in");

      const { error } = await supabase.from("profiles").update({ username: trimmed }).eq("id", user.id);
      if (error) throw error;

      setUsername(trimmed);
      setUsernameSaved(true);
    } catch (e: unknown) {
      setMsg(friendlyError(e, t("common.error")));
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(file: File) {
    setMsg(null);
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Not logged in");

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const up = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type
      });
      if (up.error) throw up.error;

      const pub = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub.data.publicUrl;

      const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (error) throw error;

      setAvatarUrl(publicUrl);
    } catch (e: unknown) {
      setMsg(friendlyError(e, t("common.error")));
    } finally {
      setBusy(false);
    }
  }

  function handleContinue() {
    if (!ready) {
      setMsg(
        !avatarUrl && !usernameSaved
          ? t("onboarding.missingBoth")
          : !avatarUrl
            ? t("onboarding.missingAvatar")
            : t("onboarding.missingUsername")
      );
      return;
    }
    router.push(next);
  }

  return (
    <div className="card mx-auto mt-8 max-w-md p-6">
      <h1 className="font-display text-xl font-medium tracking-tight">{t("onboarding.title")}</h1>
      <p className="mt-1 text-sm text-white/60">{t("onboarding.subtitle")}</p>

      {/* Avatar */}
      <div className="mt-6 flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="avatar" className="h-16 w-16 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs opacity-70">
            —
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-medium">{t("settings.avatarLabel")}</div>
          <div className="mt-0.5 text-xs text-white/50">{t("settings.avatarHint")}</div>
          <label className="btn btn-secondary mt-2 cursor-pointer text-xs">
            {t("settings.upload")}
            <input
              className="hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAvatar(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <div className="mt-5 border-t border-white/[0.07]" />

      {/* Username */}
      <div className="mt-5">
        <div className="text-sm font-medium">{t("settings.usernameLabel")}</div>
        <div className="mt-0.5 text-xs text-white/50">{t("settings.usernameHint")}</div>
        <div className="mt-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder={t("settings.usernamePlaceholder")}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameSaved(false);
            }}
            disabled={busy}
          />
          <button className="btn btn-secondary shrink-0" onClick={saveUsername} disabled={busy} type="button">
            {busy ? "…" : t("settings.update")}
          </button>
        </div>
      </div>

      {msg && <div className="mt-4 text-sm text-white/70">{msg}</div>}

      <button
        className="btn btn-primary mt-6 w-full"
        onClick={handleContinue}
        disabled={busy}
        type="button"
      >
        {t("onboarding.continue")}
      </button>
    </div>
  );
}
