import { toaster } from "@/app/components/ui/toaster";

export interface ErrorHandlerOptions {
  title?: string;
  description?: string;
  duration?: number;
  closable?: boolean;
}

export function useErrorHandler() {
  const showServiceUnavailableError = (serviceName?: string) => {
    toaster.create({
      title: "Service Unavailable",
      description: serviceName
        ? `The ${serviceName} service is currently unavailable. Please try again later.`
        : "The requested service is currently unavailable. Please try again later.",
      type: "error",
      closable: true,
      duration: 6000,
    });
  };

  const showApiError = (
    error: Error | string,
    options?: ErrorHandlerOptions
  ) => {
    const errorMessage = typeof error === "string" ? error : error.message;

    toaster.create({
      title: options?.title || "API Error",
      description:
        options?.description ||
        errorMessage ||
        "An API error occurred. Please try again later.",
      type: "error",
      closable: options?.closable ?? true,
      duration: options?.duration ?? 6000,
    });
  };

  const showError = (error: Error | string, options?: ErrorHandlerOptions) => {
    const errorMessage = typeof error === "string" ? error : error.message;

    toaster.create({
      title: options?.title || "Error",
      description:
        options?.description || errorMessage || "An unexpected error occurred.",
      type: "error",
      closable: options?.closable ?? true,
      duration: options?.duration ?? 6000,
    });
  };

  return {
    showServiceUnavailableError,
    showApiError,
    showError,
  };
}
