import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const { data: isAdminData } = await supabase.rpc("is_app_admin");
  if (!isAdminData) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "missing_service_role" }, { status: 500 });

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  // Basic validation: must be JSON and contain a top-level questions array.
  const text = await file.text();
  try {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.questions)) {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const bucket = "official";
  const path = "daily_questions.json";

  // Ensure bucket exists (service role can list/create). If it doesn't exist, we try to create it.
  try {
    const list = await (admin as any).storage.listBuckets();
    const has = Array.isArray(list.data) && list.data.some((b: any) => b.name === bucket);
    if (!has) {
      await (admin as any).storage.createBucket(bucket, { public: false });
    }
  } catch {
    // ignore (Supabase may block createBucket on some setups); upload will fail if missing.
  }

  const up = await (admin as any).storage.from(bucket).upload(path, new Blob([text], { type: "application/json" }), {
    upsert: true,
    contentType: "application/json"
  });

  if (up.error) {
    return NextResponse.json({ error: up.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
