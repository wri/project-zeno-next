import { queryOptions } from "@tanstack/react-query";

import { fetchProfileCardOptions } from "./profile";
import { fetchProfilePrefill } from "./profile-prefill";

export const frontDoorKeys = {
  all: ["front-door"] as const,
  profileOptions: () => [...frontDoorKeys.all, "profile-options"] as const,
  prefill: (userKey: string) =>
    [...frontDoorKeys.all, "profile-prefill", userKey] as const,
};

// Both are fetched at most once per page load: the options are static, and
// the GFW profile doesn't change while someone is using GNW. Shared by
// useQuery on /welcome and queryClient.fetchQuery before the in-chat card.

export const profileOptionsQuery = queryOptions({
  queryKey: frontDoorKeys.profileOptions(),
  queryFn: fetchProfileCardOptions,
  staleTime: Infinity,
  retry: false,
});

export function profilePrefillQuery(userKey: string) {
  return queryOptions({
    queryKey: frontDoorKeys.prefill(userKey),
    queryFn: fetchProfilePrefill,
    staleTime: Infinity,
    retry: false,
  });
}
