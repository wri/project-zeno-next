import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  isRouteErrorResponse,
  Outlet,
  RouterProvider,
  ScrollRestoration,
  useRouteError,
} from "react-router";
import NotFound from "@/app/not-found";
import Providers from "@/app/components/providers";
import HotjarTrigger from "@/app/components/HotjarTrigger";
import CookieBanner from "@/app/components/CookieBanner";
import CookiePreferencesDrawer from "@/app/components/CookiePreferencesDrawer";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/700.css";

// Each page is its own chunk, so the landing page doesn't ship the map stack.
const page = (load: () => Promise<{ default: ComponentType }>) => ({
  lazy: async () => ({ Component: (await load()).default }),
});

function Root() {
  return (
    <Providers>
      <ScrollRestoration />
      <Outlet />
      <HotjarTrigger />
      <CookieBanner />
      <CookiePreferencesDrawer />
    </Providers>
  );
}

function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  return (
    <NotFound
      title="Something went wrong"
      message="This page failed to load. Try reloading it."
      code={null}
    />
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    // Blank while the first page's chunk loads.
    HydrateFallback: () => null,
    children: [
      {
        // Below Root, so the error page still has Providers (Chakra, etc.).
        errorElement: <RouteError />,
        children: [
          { index: true, ...page(() => import("@/app/(home)/page")) },
          { path: "amazonia", ...page(() => import("@/app/amazonia/page")) },
          {
            // The chat layout owns the map; child pages render nothing, so the
            // map stays mounted between /app and /app/threads/:id.
            path: "app",
            lazy: async () => {
              const { default: ChatLayout } =
                await import("@/app/app/(chat)/layout");
              return {
                Component: () => (
                  <ChatLayout>
                    <Outlet />
                  </ChatLayout>
                ),
              };
            },
            children: [
              { index: true, ...page(() => import("@/app/app/(chat)/page")) },
              {
                path: "threads/:id",
                ...page(() => import("@/app/app/(chat)/threads/[id]/page")),
              },
            ],
          },
          {
            path: "app/classic",
            ...page(() => import("@/app/app/classic/layout")),
          },
          {
            path: "auth/callback",
            ...page(() => import("@/app/auth/callback/page")),
          },
          { path: "dashboard", ...page(() => import("@/app/dashboard/page")) },
          {
            path: "dashboards",
            ...page(() => import("@/app/dashboards/page")),
          },
          {
            path: "dashboards/:id",
            ...page(() => import("@/app/dashboards/[id]/page")),
          },
          { path: "evals", ...page(() => import("@/app/evals/page")) },
          {
            path: "maintenance",
            ...page(() => import("@/app/maintenance/page")),
          },
          {
            path: "manage-users",
            ...page(() => import("@/app/manage-users/page")),
          },
          {
            path: "onboarding",
            ...page(() => import("@/app/onboarding/page")),
          },
          {
            path: "trace-analytics",
            ...page(() => import("@/app/trace-analytics/page")),
          },
          {
            path: "unauthorized",
            ...page(() => import("@/app/unauthorized/page")),
          },
          ...(import.meta.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS === "true"
            ? [
                {
                  path: "chart-debug",
                  ...page(() => import("@/app/chart-debug/page")),
                },
                {
                  path: "onboarding-debug",
                  ...page(() => import("@/app/onboarding-debug/page")),
                },
              ]
            : []),
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
