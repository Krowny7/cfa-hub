"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { progressFromAttempts, type AllProgress } from "@/lib/calc/engine";
import { importCalcAttempts } from "@/app/calculs/actions";
import { dropLocal, readLocal } from "./local";

/**
 * La progression à afficher : celle de la base quand la page l'a lue
 * (`server` non nul), sinon celle du navigateur, lue après le montage
 * (`ready` passe alors à true). `bump` force une relecture locale.
 */
export function useCalcProgress(server: AllProgress | null, owner: string, bump = 0): { progress: AllProgress; ready: boolean } {
  const [local, setLocal] = useState<AllProgress | null>(null);
  useEffect(() => {
    if (server === null) setLocal(progressFromAttempts(readLocal(owner)));
  }, [server, owner, bump]);
  if (server !== null) return { progress: server, ready: true };
  return { progress: local ?? {}, ready: local !== null };
}

const enCours = new Set<string>();

/** Une fois migration_calc.sql appliquée : verse l'historique local en base (une fois), puis rafraîchit la page. */
export function useLocalImport(db: boolean, owner: string) {
  const router = useRouter();
  useEffect(() => {
    if (!db || enCours.has(owner)) return;
    const rows = readLocal(owner);
    if (!rows.length) return;
    enCours.add(owner);
    importCalcAttempts({ attempts: rows })
      .then((r) => {
        if (!r) return;
        dropLocal(owner, rows);
        if (r.imported > 0) router.refresh();
      })
      .catch(() => {})
      .finally(() => enCours.delete(owner));
  }, [db, owner, router]);
}
