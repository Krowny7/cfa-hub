import "./globals.css";
import { Providers } from "@/components/Providers";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { getLocale } from "@/lib/i18n/server";

export const metadata = {
  title: "Locked In",
  description: "Your shared CFA study workspace"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-950 text-white antialiased">
        <Providers initialLocale={locale}>
          {/* Ambient background */}
          <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(59,130,246,0.18),transparent_45%),radial-gradient(700px_circle_at_85%_0%,rgba(16,185,129,0.12),transparent_40%)]" />
            <div className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:56px_56px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-950 to-neutral-900" />
          </div>

          {/* Top bar */}
          <TopBar />

          {/* Page shell */}
          <div className="flex min-h-[calc(100vh-3rem)]">
            {/* Sidebar (desktop only) */}
            <Sidebar />

            {/* Main content */}
            <main className="flex-1 min-w-0 px-4 py-6 pb-24 md:pb-8 md:px-8">
              <div className="mx-auto max-w-4xl">
                {children}
              </div>
            </main>
          </div>

          {/* Mobile bottom nav */}
          <MobileBottomNav />
        </Providers>
      </body>
    </html>
  );
}
