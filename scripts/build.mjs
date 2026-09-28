import { build } from "esbuild";
import { rm, mkdir, cp, copyFile, readFile, writeFile } from "node:fs/promises";
import { createIdentity, reportIdentity } from "./build-identity.mjs";
const manifest = await createIdentity();
console.log(`BUILD START ${manifest.id}`);
try {
await rm("dist", { recursive: true, force: true });
await mkdir("dist/assets", { recursive: true });
await cp("public", "dist", { recursive: true });
const html = await readFile("dist/index.html", "utf8");
await writeFile("dist/index.html", html.replace("__BUILD_ID__", manifest.id).replace("__RELEASE_VERSION__", manifest.version));
await writeFile("dist/build-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
await copyFile(
  "node_modules/@fontsource/comic-neue/files/comic-neue-latin-400-normal.woff2",
  "dist/assets/comic-neue-regular.woff2",
);
await copyFile(
  "node_modules/@fontsource/comic-neue/files/comic-neue-latin-700-normal.woff2",
  "dist/assets/comic-neue-bold.woff2",
);
await build({
  entryPoints: { app: "src/app.js" },
  bundle: true,
  format: "esm",
  target: ["chrome100", "firefox100", "safari16"],
  outdir: "dist/assets",
  minify: true,
  legalComments: "eof",
});
const output = `artifacts/builds/${manifest.id}`;
await mkdir("artifacts/builds", { recursive: true });
await mkdir(output);
await cp("dist", output, { recursive: true });
await reportIdentity(manifest, output);
await copyFile(`${output}/BUILD_REPORT.md`, "dist/BUILD_REPORT.md");
await writeFile("artifacts/current-build.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`BUILD SUCCESS ${manifest.id}\nArtifact: ${output}\nStable Preview: dist/`);
} catch (error) {
  console.error(`BUILD FAILED ${manifest.id}`);
  throw error;
}
