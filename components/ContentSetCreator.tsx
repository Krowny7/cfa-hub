"use client";

import { useMemo, useState } from "react";
import { LineChart, BookOpen } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { GroupMultiPicker } from "@/components/GroupMultiPicker";
import { FolderPicker } from "@/components/FolderPicker";
import { ShareModeSeg, type ShareMode } from "@/components/ContentItemSettings";
import { Field } from "@/components/ContentDetailHeader";

type Subject = "cfa" | "personal";

// Formulaire de création d'un set (flashcards ou QCM) — les deux composants
// étaient ~100% identiques à l'exception de la table cible et de 4 clés i18n ;
// factorisés ici pour éviter qu'un correctif appliqué à l'un soit oublié
// sur l'autre (déjà arrivé une fois cette session avec un mismatch de props).
export function ContentSetCreator({
  activeGroupId,
  table,
  shareTable,
  folderKind,
  i18nPrefix,
}: {
  activeGroupId: string | null;
  table: "flashcard_sets" | "quiz_sets" | "exercise_sets";
  shareTable: "flashcard_set_shares" | "quiz_set_shares" | "exercise_set_shares";
  folderKind: "flashcards" | "quizzes" | "exercises";
  i18nPrefix: "flashcards" | "qcm" | "exercises";
}) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [subject, setSubject] = useState<Subject>("cfa");
  const [title, setTitle] = useState("");
  const [shareMode, setShareMode] = useState<ShareMode>("private");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const subjectIx = subject === "cfa" ? 0 : 1;

  // Formulaire posé dans une carte par la page (pas de carte ici).
  return (
    <div className="grid gap-6">
      <h2 className="t-h3 m-0">{t(`${i18nPrefix}.createTitle`)}</h2>

      <div className="grid gap-6">
        {/* Sujet : CFA ou révision personnelle */}
        <div className="grid gap-2">
          <div role="radiogroup" aria-label="Sujet" className="seg w-full sm:w-auto sm:justify-self-start" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <span aria-hidden className="seg-thumb" style={{ left: `calc(4px + ${subjectIx} * (100% - 8px) / 2)`, width: "calc((100% - 8px) / 2)" }} />
            <button type="button" role="radio" aria-checked={subject === "cfa"} aria-selected={subject === "cfa"} onClick={() => setSubject("cfa")} className="seg-item px-4 text-[13.5px]">
              <LineChart size={15} aria-hidden /> {t("subject.cfa")}
            </button>
            <button type="button" role="radio" aria-checked={subject === "personal"} aria-selected={subject === "personal"} onClick={() => setSubject("personal")} className="seg-item px-4 text-[13.5px]">
              <BookOpen size={15} aria-hidden /> {t("subject.personal")}
            </button>
          </div>
          {subject === "personal" && <p className="t-micro">{t("subject.personalHint")}</p>}
        </div>

        <Field label={t("common.title")} htmlFor={`create-${i18nPrefix}-title`}>
          <input
            id={`create-${i18nPrefix}-title`}
            className="input"
            placeholder={t(`${i18nPrefix}.setTitlePlaceholder`)}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <FolderPicker kind={folderKind} value={folderId} onChange={setFolderId} />

        <Field label={t("sharing.title")}>
          <ShareModeSeg value={shareMode} onChange={setShareMode} />
          {shareMode === "groups" && (
            <GroupMultiPicker value={groupIds} onChange={setGroupIds} defaultSelectGroupId={activeGroupId} />
          )}
        </Field>

        <button
          className="btn btn-primary justify-self-start"
          disabled={busy || !title.trim() || (shareMode === "groups" && groupIds.length === 0)}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              const { data: auth } = await supabase.auth.getUser();
              if (!auth.user) throw new Error("Not logged in");

              const visibility = shareMode === "groups" ? "groups" : shareMode;

              const res = await supabase
                .from(table)
                .insert({
                  title: title.trim(),
                  visibility,
                  subject,
                  group_id: null,
                  folder_id: folderId,
                  owner_id: auth.user.id,
                })
                .select("id")
                .maybeSingle();

              if (res.error) throw res.error;
              const setId = (res.data as { id: string } | null)?.id;

              if (shareMode === "groups" && setId) {
                const rows = groupIds.map((gid) => ({ set_id: setId, group_id: gid }));
                const share = await supabase.from(shareTable).insert(rows);
                if (share.error) throw share.error;
              }

              setTitle("");
              setSubject("cfa");
              setShareMode("private");
              setGroupIds([]);
              setFolderId(null);
              setMsg(t("common.saved"));
              window.location.reload();
            } catch (e: unknown) {
              setMsg(`${friendlyError(e, t("common.error"))}`);
            } finally {
              setBusy(false);
            }
          }}
          type="button"
        >
          {busy ? t("common.saving") : t(`${i18nPrefix}.create`)}
        </button>

        {msg && (
          <p role="status" className="t-small">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
