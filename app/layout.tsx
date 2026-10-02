import "./globals.css";
import { Caveat, Dela_Gothic_One, Zen_Kaku_Gothic_New } from "next/font/google";
import { Providers } from "@/components/Providers";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Splash } from "@/components/Splash";

// DA « Encre » : lettrage épais (Dela Gothic One) pour les titres, Zen Kaku
// Gothic New pour l'interface, Caveat pour les annotations manuscrites.
const dela = Dela_Gothic_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});
const zen = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-body",
  display: "swap",
});
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-hand",
  display: "swap",
});

export const metadata = {
  title: "Ranked Lobby",
  description: "Le savoir se conquiert — l'espace de révision partagé",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${dela.variable} ${zen.variable} ${caveat.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        {/* Thème (papier / nuit) et mode discret : réappliqués avant le premier
            affichage pour éviter un flash — voir ThemeToggle et DiscreetToggle. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=document.documentElement;" +
              "if(localStorage.getItem('rl_theme')==='nuit')d.dataset.theme='nuit';" +
              "if(localStorage.getItem('cfa_discreet')==='1')d.dataset.discreet='1';}catch(e){}",
          }}
        />
        {/* Cache le premier affichage le temps de savoir si l'intro joue. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var seen=false;" +
              "try{seen=sessionStorage.getItem('rl-splash-seen')==='1';}catch(e){}" +
              "if(seen&&!/[?&]splash=/.test(location.search))return;" +
              "var d=document.documentElement;d.classList.add('rl-booting');" +
              "setTimeout(function(){d.classList.remove('rl-booting');},6000);})();",
          }}
        />
        <Providers>
          <TopBar />

          <div className="flex min-h-[calc(100vh-3.5rem)]">
            <Sidebar />

            <main className="flex-1 min-w-0 px-4 py-7 pb-24 md:pb-10 md:px-8">
              <div className="mx-auto max-w-4xl">{children}</div>
            </main>
          </div>

          <MobileBottomNav />

          <Splash />
        </Providers>
      </body>
    </html>
  );
}
