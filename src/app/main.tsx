import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { createBrowserRouter, matchRoutes, RouterProvider } from "react-router";
import { routes } from "./routes";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/700.css";

const container = document.getElementById("root")!;
// Set by scripts/prerender.mjs on the pages it renders at build time.
const prerenderedPath = container.dataset.prerendered;
const path = window.location.pathname.replace(/(.)\/$/, "$1");

const app = () => (
  <StrictMode>
    <RouterProvider router={createBrowserRouter(routes)} />
  </StrictMode>
);

async function hydrate() {
  // Load the page's code first: with a lazy route still pending, the router
  // starts on its blank HydrateFallback and discards the prerendered HTML.
  await Promise.all(
    (matchRoutes(routes, window.location) ?? []).map(async ({ route }) => {
      if (typeof route.lazy === "function") {
        Object.assign(route, await route.lazy(), { lazy: undefined });
      }
    })
  );
  hydrateRoot(container, app());
}

if (prerenderedPath === path) {
  hydrate();
} else {
  // Any other route, including a host fallback that served a prerendered
  // page's HTML for a different URL: render from scratch.
  createRoot(container).render(app());
}
