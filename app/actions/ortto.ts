"use server";

import { headers } from "next/headers";

type OrttoPayload = {
  email: string;
  firstName: string;
  lastName: string;
  sector: string;
  jobTitle: string;
  companyOrganization: string;
  countryCode: string;
  Topics: string[];
  receiveNewsEmails: boolean;
  ipAddr?: string;
};

export async function submitToOrtto(data: Omit<OrttoPayload, "ipAddr">) {
  try {
    const headersList = await headers();
    const ipAddr =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown";

    const payload: OrttoPayload = {
      ...data,
      ipAddr,
    };

    console.log("Submitting to Ortto:", JSON.stringify(payload, null, 2));

    const response = await fetch("https://ortto.wri.org/custom-forms/gnw/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `Ortto submission failed: ${response.status} ${response.statusText}`,
        text
      );
      // We don't throw here to avoid blocking the main flow if Ortto is down,
      // but we log it.
      return { success: false, error: response.statusText };
    }

    return { success: true };
  } catch (error) {
    console.error("Error submitting to Ortto:", error);
    return { success: false, error: "Internal Server Error" };
  }
}

