import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Hostinger: npm install → postinstall → build de public/ + server.bundle.cjs.
 * Local: pule com SKIP_POSTINSTALL_BUILD=1 (ou npm install --ignore-scripts).
 * Force: FORCE_POSTINSTALL_BUILD=1.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.env.AURA_EGO_BUILDING === "1") {
  process.exit(0);
}

if (process.env.SKIP_POSTINSTALL_BUILD === "1") {
  console.log("[aura-ego] postinstall build skipped (SKIP_POSTINSTALL_BUILD=1)");
  process.exit(0);
}

const shouldBuild =
  process.env.FORCE_POSTINSTALL_BUILD === "1"
  || process.env.HOSTINGER === "1"
  || process.env.CI === "true"
  || process.env.NODE_ENV === "production"
  || process.env.npm_config_production === "true";

if (!shouldBuild) {
  console.log(
    "[aura-ego] postinstall build skipped (dev). "
    + "Na Hostinger defina HOSTINGER=1 ou NODE_ENV=production, "
    + "ou use Build command: npm run build"
  );
  process.exit(0);
}

console.log("[aura-ego] postinstall → npm run build");
const result = spawnSync("npm", ["run", "build"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    AURA_EGO_BUILDING: "1",
    NODE_ENV: "production",
    VITE_API_URL: "",
    VITE_SOCKET_URL: ""
  },
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);
