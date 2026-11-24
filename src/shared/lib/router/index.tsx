// Single indirection point for routing APIs: nothing outside this file may
// import react-router directly (enforced by no-restricted-imports in
// eslint.config.mjs). It keeps the Next-style API the app was written against.
//
// Every in-app navigation through it carries the hidden-feature `?ff=…` flags
// of the current URL (`carryFlags`), so a flag opted into once stays on across
// the map, dashboards and every other page without each link forwarding it.
import { useMemo, type ComponentProps } from "react";
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useSearchParams as useRouterSearchParams,
} from "react-router";
import { carryFlags } from "@/src/shared/lib/feature-flags";

export { useParams } from "react-router";

type NavigateOptions = { scroll?: boolean };

export function Link({
  href,
  ...props
}: Omit<ComponentProps<typeof RouterLink>, "to"> & { href: string }) {
  const { search } = useLocation();
  return <RouterLink to={carryFlags(href, search)} {...props} />;
}

// Read at call time from the browser URL rather than via useLocation(), which
// would give the router a new identity on every navigation and re-run the
// effects that depend on it.
const withCurrentFlags = (href: string) =>
  carryFlags(href, window.location.search);

export function useRouter() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push(href: string, options?: NavigateOptions) {
        navigate(withCurrentFlags(href), {
          preventScrollReset: options?.scroll === false,
        });
      },
      // With no history to go back to (a link opened in a fresh tab) it
      // replaces the page with `fallback`, so the browser's Back does not
      // return here.
      back(fallback: string) {
        if (window.history.state?.idx > 0) navigate(-1);
        else navigate(withCurrentFlags(fallback), { replace: true });
      },
      replace(href: string, options?: NavigateOptions) {
        navigate(withCurrentFlags(href), {
          replace: true,
          preventScrollReset: options?.scroll === false,
        });
      },
    }),
    [navigate]
  );
}

// Same object until the query string changes; effects depend on that.
export function useSearchParams() {
  return useRouterSearchParams()[0];
}

export function usePathname() {
  return useLocation().pathname;
}
