import { formatDistanceToNowStrict } from "date-fns";

export function updatedLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) {
    return "Updated recently";
  }
  return `Updated ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
}
