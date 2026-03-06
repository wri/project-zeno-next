const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ||
  "https://api.staging.globalnaturewatch.org";

/** Local Python sidecar — serves report generation, monitoring, and area endpoints. */
const SIDECAR_HOST = process.env.NEXT_PUBLIC_SIDECAR_HOST || API_HOST;

export const DEVELOPER_MODE = process.env.NEXT_PUBLIC_DEVELOPER_MODE === "true";

export const API_CONFIG = {
  API_HOST,
  SIDECAR_HOST,
  API_BASE_URL: `${API_HOST}/api`,
  SIDECAR_BASE_URL: `${SIDECAR_HOST}/api`,
  ENDPOINTS: {
    CHAT: `${API_HOST}/api/chat`,
    METADATA: `${API_HOST}/api/metadata`,
    THREADS: `${API_HOST}/api/threads`,
  },
  REPORT_ENDPOINTS: {
    GENERATE_TEXT: `${SIDECAR_HOST}/api/report/generate-text`,
  },
} as const;
