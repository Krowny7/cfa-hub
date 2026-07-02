export type Visibility = "private" | "group" | "groups" | "public";
export type ScopeFilter = "all" | "private" | "shared" | "public";
export type VisibilitySection = "private" | "shared" | "public";

export function normalizeScope(value: string | null | undefined): ScopeFilter {
  if (value === "private" || value === "public" || value === "all" || value === "shared") return value;
  if (value === "group" || value === "groups") return "shared";
  return "all";
}

export function normalizeVisibility(value: string | null | undefined): Visibility {
  if (value === "private" || value === "group" || value === "groups" || value === "public") return value;
  return "private";
}

export function isSharedVisibility(v: Visibility): boolean {
  return v === "group" || v === "groups";
}

export function sectionForVisibility(value: string | null | undefined): VisibilitySection {
  const v = normalizeVisibility(value);
  if (v === "private") return "private";
  if (v === "public") return "public";
  return "shared";
}

export function matchesScope(visibilityValue: string | null | undefined, scope: ScopeFilter): boolean {
  const v = normalizeVisibility(visibilityValue);
  if (scope === "all") return true;
  if (scope === "private") return v === "private";
  if (scope === "public") return v === "public";
  return isSharedVisibility(v);
}
