// Single indirection point for routing APIs. The Vite + React Router
// cutover reimplements this file and leaves consumers untouched, so
// nothing outside it may import next/link or next/navigation directly
// (enforced by no-restricted-imports in eslint.config.mjs).
export { default as Link } from "next/link";
export {
  notFound,
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
