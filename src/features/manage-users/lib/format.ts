import { format, isSameDay, parseISO } from "date-fns";

export const formatCount = (n: number) => n.toLocaleString("en-US");

export const usersLabel = (n: number) =>
  `${formatCount(n)} ${n === 1 ? "user" : "users"}`;

/** A `yyyy-MM-dd` day as "Nov 5, 2026". */
export const formatDay = (day: string) => format(parseISO(day), "MMM d, yyyy");

/** When the list loaded, in local time, with the day when it isn't today. */
export const formatLoadedAt = (loadedAt: number, now: number = Date.now()) =>
  format(loadedAt, isSameDay(loadedAt, now) ? "h:mm a" : "MMM d, h:mm a");
