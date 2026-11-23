/** The error for a failed admin request, with the server's reason when it gave one. */
export async function responseError(res: Response): Promise<Error> {
  let detail: string | undefined;
  try {
    const body = await res.json();
    detail = body?.detail ?? body?.error;
  } catch {}
  return new Error(detail || `Request failed: ${res.statusText}`);
}
