// Single indirection point for routing APIs: nothing outside this file may
// import react-router directly (enforced by no-restricted-imports in
// eslint.config.mjs). It keeps the Next-style API the app was written against.
import { useMemo, type ComponentProps } from "react";
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useSearchParams as useRouterSearchParams,
} from "react-router";

export { useParams } from "react-router";

type NavigateOptions = { scroll?: boolean };

export function Link({
  href,
  ...props
}: Omit<ComponentProps<typeof RouterLink>, "to"> & { href: string }) {
  return <RouterLink to={href} {...props} />;
}

export function useRouter() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push(href: string, options?: NavigateOptions) {
        navigate(href, { preventScrollReset: options?.scroll === false });
      },
      replace(href: string, options?: NavigateOptions) {
        navigate(href, {
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
