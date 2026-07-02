import type { Visibility } from "@/lib/types";

export function normalizeVisibility(v?: string | null): Visibility {
  if (v === "public") return "public";
  if (v === "group" || v === "groups") return "groups";
  return "private";
}

export function canEditContent(opts: {
  visibility?: string | null;
  ownerId?: string | null;
  userId?: string | null;
  isMemberOfLegacyGroup?: boolean;
  isMemberOfAnyShareGroup?: boolean;
}): boolean {
  const vis = normalizeVisibility(opts.visibility);
  const isOwner = !!opts.userId && !!opts.ownerId && opts.userId === opts.ownerId;

  if (vis === "private" || vis === "public") return isOwner;
  return isOwner || !!opts.isMemberOfLegacyGroup || !!opts.isMemberOfAnyShareGroup;
}
