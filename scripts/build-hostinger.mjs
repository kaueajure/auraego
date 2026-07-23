import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await build({
  entryPoints: [path.join(root, "apps/server/src/index.ts")],
  outfile: path.join(root, "server.bundle.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  sourcemap: false,
  packages: "external",
  logLevel: "info",
  plugins: [{
    name: "bundle-shared-workspace",
    setup(builder) {
      builder.onResolve({ filter: /^@aura-ego\/shared$/ }, () => ({
        path: path.join(root, "packages/shared/src/index.ts")
      }));
    }
  }]
});
