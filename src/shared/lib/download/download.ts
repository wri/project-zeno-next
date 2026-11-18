/**
 * Saves the file at `url` through the browser, as `filename` when given.
 * Without one, the response's `Content-Disposition` names the file.
 */
export function saveUrl(url: string, filename?: string): void {
  const a = document.createElement("a");
  a.href = url;
  if (filename !== undefined) a.download = filename;
  // In the document for the click, as some browsers ignore a detached anchor.
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
  }
}
