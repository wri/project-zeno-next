import { QueryCache, QueryClient } from "@tanstack/react-query";
import { showApiError } from "@/app/hooks/useErrorHandler";
import {
  USER_AOIS_QUERY_KEY,
  showUserAoisLoadError,
} from "@/src/entities/user-aoi";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // Here, not in the hooks, so a failed load shows one toast however many
    // components read it.
    onError: (error, query) => {
      if (query.queryKey[0] === "threads") {
        showApiError(error as Error, { title: "Failed to load data." });
      } else if (query.queryKey[0] === USER_AOIS_QUERY_KEY[0]) {
        showUserAoisLoadError(error as Error);
      }
    },
  }),
});
