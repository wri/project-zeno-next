"use server";

export async function fetchExternalData(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Server action fetch error:", error);
    throw new Error("Failed to fetch external data");
  }
}

