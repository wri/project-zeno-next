import { formatDistanceToNowStrict } from "date-fns";

export function updatedLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Updated recently";
  return `Updated ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
}
