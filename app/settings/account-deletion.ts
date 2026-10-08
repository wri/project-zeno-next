/** Where requests to delete a Horizon account and its data go. */
export const ACCOUNT_DELETION_EMAIL = "landcarbonlab@wri.org";

/**
 * A mailto: link that opens a prefilled request to remove the account and
 * its data from Horizon. The team handles it by hand; nothing is deleted
 * from the app itself.
 */
export function accountDeletionMailto(accountEmail: string): string {
  const account = accountEmail.trim() || "(the email I signed in with)";
  const subject = "Delete my Global Nature Watch Horizon account";
  const body = [
    "Hello,",
    "",
    "Please remove my Global Nature Watch Horizon account and all of its data (profile, conversations and dashboards).",
    "",
    `Account email: ${account}`,
    "",
    "Thank you.",
  ].join("\n");
  const query = new URLSearchParams({ subject, body })
    .toString()
    // mailto clients read "+" literally; spaces must be %20.
    .replace(/\+/g, "%20");
  return `mailto:${ACCOUNT_DELETION_EMAIL}?${query}`;
}
