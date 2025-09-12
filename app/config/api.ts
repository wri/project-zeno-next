const API_HOST =
  process.env.NEXT_PUBLIC_API_HOST ||
  "https://api.staging.globalnaturewatch.org";

export const API_CONFIG = {
  API_HOST,
  API_BASE_URL: `${API_HOST}/api`,
  ENDPOINTS: {
    CHAT: `${API_HOST}/api/chat`,
    METADATA: `${API_HOST}/api/metadata`,
    THREADS: `${API_HOST}/api/threads`,
  },
} as const;
