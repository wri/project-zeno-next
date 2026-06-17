import { QueryCache, QueryClient } from "@tanstack/react-query";
import { showApiError } from "@/app/hooks/useErrorHandler";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.queryKey[0] !== "threads") return;
      showApiError(error as Error, { title: "Failed to load data." });
    },
  }),
});
