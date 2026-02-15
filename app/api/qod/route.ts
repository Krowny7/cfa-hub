import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type LocalizedQ = {
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation?: string | null;
};

type QodRow = {
  id: string;
  fr: LocalizedQ;
  en: LocalizedQ;
};

type QodFile = {
  version?: number;
  questions: QodRow[];
};

function todayKeyUTC() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Deterministic, tiny hash (FNV-1a 32-bit) for daily selection.
function hash32(str: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

async function downloadQodJson(): Promise<QodFile | null> {
  // Prefer service role (bypass RLS / private bucket). Fallback to user client.
  const admin = createAdminClient();
  const client = admin ?? (await createClient());

  // Bucket name: keep it simple. If you don't have it yet, create it in Supabase Storage.
  // Recommended: private bucket "official".
  const bucket = "official";
  const path = "daily_questions.json";

  const dl = await (client as any).storage.from(bucket).download(path);
  if (dl.error || !dl.data) return null;

  const text = await dl.data.text();
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.questions)) return null;
  return parsed as QodFile;
}

export async function GET() {
  const date = todayKeyUTC();
  try {
    const file = await downloadQodJson();
    const items = file?.questions ?? [];

    if (!items.length) {
      // Friendly empty response (UI shows "unavailable").
      return NextResponse.json(
        { date, id: "empty", fr: null, en: null },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    const idx = hash32(date) % items.length;
    const q = items[idx];

    return NextResponse.json(
      {
        date,
        id: q.id,
        fr: q.fr,
        en: q.en
      },
      {
        status: 200,
        headers: {
          // Same for everyone per day, so cache is safe. Keep short.
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600"
        }
      }
    );
  } catch {
    return NextResponse.json({ date, id: "error", fr: null, en: null }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
