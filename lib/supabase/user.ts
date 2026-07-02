import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getSessionUserWithProfile = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("username,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: profile as { username: string | null; avatar_url: string | null } | null,
  };
});
