// Hook Stop : avant que Claude rende la main, vérifier que le code compile.
// Ne lance tsc que si des .ts/.tsx ont changé depuis la dernière vérification réussie (empreinte dans
// node_modules/.cache). Code 2 = les erreurs sont renvoyées à Claude, qui corrige avant de finir.
// Si tsc plante sans erreur de type (mémoire…), on laisse passer plutôt que de bloquer.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

let entree = {};
try {
  entree = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {}
const cwd = entree.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
const git = (...a) => execFileSync("git", a, { cwd, encoding: "utf8", maxBuffer: 64 << 20 });

let racine;
try {
  racine = git("rev-parse", "--show-toplevel").trim();
} catch {
  process.exit(0);
}
const tsc = path.join(racine, "node_modules", "typescript", "bin", "tsc");
if (!existsSync(path.join(racine, "tsconfig.json")) || !existsSync(tsc)) process.exit(0);

const etat = git("status", "--porcelain", "-uall", "--", "*.ts", "*.tsx");
if (!etat.trim()) process.exit(0);
const h = createHash("sha1").update(etat).update(git("diff", "HEAD", "--", "*.ts", "*.tsx"));
for (const l of etat.split("\n")) {
  if (!l.startsWith("??")) continue;
  try {
    h.update(readFileSync(path.join(racine, l.slice(3).trim())));
  } catch {}
}
const empreinte = h.digest("hex");
const cache = path.join(racine, "node_modules", ".cache");
const tampon = path.join(cache, "stop-typecheck.txt");
try {
  if (readFileSync(tampon, "utf8") === empreinte) process.exit(0);
} catch {}
mkdirSync(cache, { recursive: true });

try {
  execFileSync(process.execPath, [tsc, "--noEmit", "--incremental", "--tsBuildInfoFile", path.join(cache, "stop-typecheck.tsbuildinfo")], {
    cwd: racine,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 64 << 20,
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=3072" },
  });
} catch (e) {
  const sortie = String(e.stdout || "") + String(e.stderr || "");
  // app/preview-da : vieilles pages d'essai, hors du dépôt (.git/info/exclude) ; le serveur de dev
  // régénère leurs types dans .next/types : leurs erreurs ne concernent pas le code livré
  // (accord de Théo, 2026-11-12).
  const erreurs = sortie.split("\n").filter((l) => /error TS\d+/.test(l) && !/preview-da|^\.next[\\/]types[\\/]validator/.test(l));
  if (erreurs.length === 0) {
    writeFileSync(tampon, empreinte);
    process.exit(0);
  }
  process.stderr.write(`tsc : ${erreurs.length} erreur(s) de type. Corrige-les avant de rendre la main :\n${erreurs.slice(0, 40).join("\n")}\n`);
  process.exit(2);
}
writeFileSync(tampon, empreinte);
