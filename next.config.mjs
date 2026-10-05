import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Aperçus locaux en parallèle : chaque chantier compile dans son propre
// dossier (RL_DIST_DIR=.next-xxx), sans vérification de types, car un autre
// chantier peut être en cours d'écriture. Sans la variable : build normal.
const previewDist = process.env.RL_DIST_DIR;

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(previewDist ? { distDir: previewDist, typescript: { ignoreBuildErrors: true } } : {}),
  // Avoid failing production builds on local ESLint setup issues.
  // (You can still run ESLint separately via npm scripts.)
  eslint: {
    ignoreDuringBuilds: true
  },
  // If you have multiple lockfiles on your machine, Next can infer the wrong
  // workspace root. Force tracing to this project directory.
  outputFileTracingRoot: __dirname,
  // the splash films' data files carry their version in the name
  // (plan.v9.bin…), so a browser may keep them for good
  // La Bibliothèque n'existe plus : ses trois fonds sont en tête de Réviser.
  // Les liens PDF des joueurs restent en base (table documents), sans page.
  async redirects() {
    return [
      { source: "/library", destination: "/reviser", permanent: false },
      { source: "/library/:path*", destination: "/reviser", permanent: false }
    ];
  },
  async headers() {
    return [
      {
        source: "/splash/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      }
    ];
  },
  experimental: {
    // keep defaults; we avoid bleeding-edge flags for stability
  }
};

export default nextConfig;
