// Renders the public pages to static HTML after `vite build` and the SSR
// build of src/app/entry-server.tsx (see the `build` script). Every other
// route keeps the empty shell, saved as dist/_spa.html for vercel.json's
// fallback rewrite.
import { readFile, rm, writeFile } from "node:fs/promises";
import { render } from "../dist-ssr/entry-server.mjs";

const pages = [
  { path: "/", file: "dist/index.html" },
  {
    path: "/amazonia",
    file: "dist/amazonia.html",
    title: "Amazon.ia | Global Nature Watch Horizon",
    description:
      "Amazon.ia is a Pan-Amazonian biodiversity observatory and intelligence system, fusing satellite and ground sensor data to deliver actionable biodiversity intelligence across the Amazon.",
  },
];

const template = await readFile("dist/index.html", "utf8");
await writeFile("dist/_spa.html", template);

// Function replacements, so `$` in rendered HTML isn't read as a pattern.
function replaceOnce(html, search, replacement) {
  if (!html.match(search)) throw new Error(`prerender: ${search} not found`);
  return html.replace(search, () => replacement);
}

for (const { path, file, title, description } of pages) {
  const body = await render(`http://localhost${path}`);
  let html = replaceOnce(
    template,
    '<div id="root"></div>',
    `<div id="root" data-prerendered="${path}">${body}</div>`
  );
  if (title)
    html = replaceOnce(html, /<title>.*?<\/title>/, `<title>${title}</title>`);
  if (description) {
    html = replaceOnce(
      html,
      /<meta name="description" content=".*?"\s*\/?>/,
      `<meta name="description" content="${description}" />`
    );
  }
  await writeFile(file, html);
  console.log(`prerendered ${path} -> ${file}`);
}

await rm("dist-ssr", { recursive: true, force: true });
