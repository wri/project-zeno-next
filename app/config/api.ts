const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ||
  "https://api.staging.globalnaturewatch.org";

const RW_API_HOST =
  process.env.NEXT_PUBLIC_RW_API_URL || "https://api.resourcewatch.org";

export const API_CONFIG = {
  API_HOST,
  API_BASE_URL: `${API_HOST}/api`,
  RW_API_HOST,
  ENDPOINTS: {
    CHAT: `${API_HOST}/api/chat`,
    METADATA: `${API_HOST}/api/metadata`,
    THREADS: `${API_HOST}/api/threads`,
  },
} as const;
