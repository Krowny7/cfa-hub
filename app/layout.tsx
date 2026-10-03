import "./globals.css";
import { Caveat, Dela_Gothic_One, Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { TopBar } from "@/components/TopBar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Splash } from "@/components/Splash";
import { InkDefs } from "@/components/ui/InkDefs";

// DA V2 : Geist pour l'interface et les titres, Geist Mono pour les chiffres
// alignés, Dela Gothic One réservée au logo et aux grands chiffres (.font-brand).
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const dela = Dela_Gothic_One({ subsets: ["latin"], weight: "400", variable: "--font-brand", display: "swap" });
// La main du correcteur (stylo rouge) : note entourée, appréciation de la
// copie corrigée. Réservée aux moments ; repli sur Geist sinon.
const plume = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-plume", display: "swap" });

export const metadata = {
  title: "Ranked Lobby",
  description: "Le savoir se conquiert — l'espace de révision partagé",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} ${geistMono.variable} ${dela.variable} ${plume.variable}`} suppressHydrationWarning>
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
        {/* Cache le premier affichage le temps de savoir si l'intro joue, et
            commence à télécharger le film de l'intro sans attendre React
            (adopté ensuite par components/Splash.tsx via window.__rlIntro). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var seen=false,q=location.search;" +
              "try{seen=sessionStorage.getItem('rl-splash-seen')==='1';}catch(e){}" +
              "if(seen&&!/[?&]splash=/.test(q))return;" +
              "if(/[?&]splash=(off|0)(&|$)/.test(q))return;" +
              "var d=document.documentElement;d.classList.add('rl-booting');" +
              "setTimeout(function(){d.classList.remove('rl-booting');},6000);" +
              "try{if(/[?&]splash=svg/.test(q)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;" +
              "var v=document.createElement('video');v.muted=true;v.defaultMuted=true;v.playsInline=true;" +
              "v.setAttribute('playsinline','');v.setAttribute('muted','');v.preload='auto';" +
              "v.src='/intro/encre-'+(innerWidth>=innerHeight?'land':'port')+'.mp4';v.load();window.__rlIntro=v;}catch(e){}})();",
          }}
        />
        <InkDefs />
        <Providers>
          <TopBar />

          {/* Conteneur par défaut : colonne de lecture (max-w-4xl). Les pages
              V2 (accueil, espaces) s'élargissent à 1240 px avec .rl-wide. */}
          <main className="min-w-0 overflow-x-clip px-4 pb-28 pt-7 md:px-7 md:pb-14">
            <div className="mx-auto max-w-4xl">{children}</div>
          </main>

          <MobileBottomNav />

          <Splash />
        </Providers>
      </body>
    </html>
  );
}
