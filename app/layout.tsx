import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { getLocale } from "@/lib/i18n/server";

export const metadata = {
  title: "CFA Hub",
  description: "Your shared CFA study workspace"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-black dark:bg-neutral-950 dark:text-white">
        <Providers initialLocale={locale}>
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}