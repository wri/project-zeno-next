// CloudFront Function (runtime: cloudfront-js-2.0), event type: viewer-request.
//
// Maps PR preview subdomains onto per-PR prefixes in the previews bucket:
//   https://pr-123.preview.<domain>/app/threads/abc
//     -> s3://<bucket>/pr-123/_spa.html
//
// Mirrors the rewrites in vercel.json: paths with a file extension are served
// as-is, "/" is the prerendered index.html, "/amazonia" is the prerendered
// amazonia.html, and every other route falls back to the SPA shell _spa.html.

// Prerendered pages written by scripts/prerender.mjs (besides "/").
var PRERENDERED = { "/amazonia": "/amazonia.html" };

// CloudFront calls `handler` by name.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : "";
  var match = /^(pr-\d+)\./.exec(host);

  if (!match) {
    return { statusCode: 404, statusDescription: "Not Found" };
  }

  var prefix = "/" + match[1];
  var uri = request.uri;
  var lastSegment = uri.substring(uri.lastIndexOf("/") + 1);

  if (lastSegment.indexOf(".") === -1) {
    var route = uri.length > 1 ? uri.replace(/\/+$/, "") : "/";
    if (route === "/") {
      uri = "/index.html";
    } else if (PRERENDERED[route]) {
      uri = PRERENDERED[route];
    } else {
      uri = "/_spa.html";
    }
  }

  request.uri = prefix + uri;
  return request;
}
