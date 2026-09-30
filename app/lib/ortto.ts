/** WRI's Ortto custom form for GNW sign-ups; public, no secrets needed. */
export const ORTTO_GNW_FORM_URL = "https://ortto.wri.org/custom-forms/gnw/";

/**
 * What GNW tells Ortto about a person. Keys left `undefined` are omitted from
 * the request body, so a partial submission (the in-chat profile card) only
 * sends what it knows.
 */
export interface OrttoProfileSubmission {
  email: string;
  firstName?: string;
  lastName?: string;
  sector?: string;
  jobTitle?: string;
  companyOrganization?: string;
  countryCode?: string;
  /** Topic labels (not codes); the key is capitalised on the Ortto side. */
  Topics?: string[];
  receiveNewsEmails?: boolean;
}

/**
 * Posts the profile to Ortto straight from the browser. Never throws: a
 * failed submission is logged and must not block saving the profile.
 */
export async function submitOrttoProfile(
  submission: OrttoProfileSubmission
): Promise<void> {
  // Fixed key order so every caller sends the same body shape.
  const body = {
    email: submission.email,
    firstName: submission.firstName,
    lastName: submission.lastName,
    sector: submission.sector,
    jobTitle: submission.jobTitle,
    companyOrganization: submission.companyOrganization,
    countryCode: submission.countryCode,
    Topics: submission.Topics,
    receiveNewsEmails: submission.receiveNewsEmails,
  };
  try {
    const orttoRes = await fetch(ORTTO_GNW_FORM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    console.log(
      "[Client] Ortto submission status:",
      orttoRes.status,
      orttoRes.ok ? "OK" : "FAILED"
    );
  } catch (e) {
    console.error("[Client] Ortto submission error:", e);
  }
}
