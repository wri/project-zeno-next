/** The error for a failed user AOI request, with the server's reason and status. */
export async function responseError(
  res: Response
): Promise<Error & { status: number }> {
  // Only a string is a message: FastAPI's validation 422 carries a list.
  let detail: string | undefined;
  try {
    const body = await res.json();
    const candidate = body?.detail ?? body?.error;
    if (typeof candidate === "string") detail = candidate;
  } catch {}
  return Object.assign(
    new Error(detail || `Request failed: ${res.statusText}`),
    { status: res.status }
  );
}
