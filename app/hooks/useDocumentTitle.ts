import { useEffect } from "react";

/**
 * Sets the document title while the caller is mounted and restores the
 * previous one on unmount. `undefined` leaves the title alone, for a page
 * whose title is still loading.
 */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (title === undefined) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
