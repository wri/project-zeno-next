import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/api-client";
import useAuthStore from "@/app/store/authStore";

const PAGE_SIZE = 100;

export interface ThreadEntry {
  agent_id: "UniGuana";
  created_at: string;
  id: string;
  name: string;
  updated_at: string;
  user_id: string;
  is_public: boolean;
}

export interface ThreadGroups {
  today: ThreadEntry[];
  previousWeek: ThreadEntry[];
  older: ThreadEntry[];
}

interface ThreadsPage {
  threads: ThreadEntry[];
  nextCursor: string | null;
}

export function computeThreadGroups(data: ThreadEntry[]): ThreadGroups {
  const threads = [...data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  return {
    today: threads.filter((thread) => new Date(thread.created_at) >= today),
    previousWeek: threads.filter((thread) => {
      const date = new Date(thread.created_at);
      return date >= weekAgo && date < today;
    }),
    older: threads.filter((thread) => new Date(thread.created_at) < weekAgo),
  };
}

async function fetchThreadsPage(cursor?: string): Promise<ThreadsPage> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);

  const response = await apiFetch(`/api/threads?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to load threads (${response.status})`);
  }

  const raw: ThreadEntry[] = await response.json();
  const threads = raw.map((t) => ({ ...t, is_public: t.is_public ?? false }));

  const nextCursor = response.headers.get("X-Next-Cursor") || null;

  return { threads, nextCursor };
}

export function useThreadsInfinite() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useInfiniteQuery<ThreadsPage>({
    queryKey: ["threads"],
    queryFn: ({ pageParam }) => fetchThreadsPage(pageParam as string),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isAuthenticated,
  });

  const threads = useMemo(
    () => query.data?.pages.flatMap((p) => p.threads) ?? [],
    [query.data]
  );

  const threadGroups = useMemo(() => computeThreadGroups(threads), [threads]);

  return {
    threads,
    threadGroups,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
