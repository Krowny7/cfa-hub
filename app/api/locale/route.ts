import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const nextLocale = isLocale(body?.locale) ? body.locale : DEFAULT_LOCALE;

    // Next 15: cookies() can be async depending on config
    const cookieStore = await cookies();

    cookieStore.set("cfa_locale", nextLocale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365
    });

    return NextResponse.json({ ok: true, locale: nextLocale });
  } catch (err) {
    console.error("POST /api/locale failed:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
