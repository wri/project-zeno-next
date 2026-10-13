// PZB-229 spike: gzip size of each i18n engine plus the three catalogs.
// Run from the repo root: node docs/spikes/pzb-229-bundle-size.mjs
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "vite";

const root = process.cwd();
const out = mkdtempSync(join(tmpdir(), "pzb-229-"));
const entries = {
  "react-i18next + i18next-icu": "src/i18n-poc/i18next/instance.ts",
  "Lingui 6 (runtime compiler)": "src/i18n-poc/lingui/instance.ts",
};

for (const [name, entry] of Object.entries(entries)) {
  const outDir = join(out, name.replace(/\W+/g, "-"));
  await build({
    root,
    configFile: false,
    publicDir: false,
    logLevel: "silent",
    resolve: { alias: { "@": root } },
    build: {
      outDir,
      minify: true,
      lib: {
        entry: resolve(root, entry),
        formats: ["es"],
        fileName: () => "out.js",
      },
      rollupOptions: {
        external: (id) => /^(react|react-dom|react\/jsx-runtime)$/.test(id),
      },
    },
  });
  const size = gzipSync(readFileSync(join(outDir, "out.js"))).length;
  console.log(`${name}: ${(size / 1024).toFixed(1)} KB gzip`);
}
