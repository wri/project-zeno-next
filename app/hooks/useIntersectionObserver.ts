import { useEffect, type RefObject } from "react";

export function useIntersectionObserver(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
  options?: { enabled?: boolean; rootMargin?: string }
) {
  useEffect(() => {
    if (!options?.enabled || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) callback();
      },
      { rootMargin: options.rootMargin ?? "200px" }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, callback, options?.enabled, options?.rootMargin]);
}
