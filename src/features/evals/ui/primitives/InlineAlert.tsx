"use client";

import { Alert } from "@chakra-ui/react";

interface InlineAlertProps {
  readonly status: "info" | "warning" | "error" | "success";
  readonly title?: string;
  readonly message: string;
}

/** Thin wrapper over Chakra's Alert (copied from trace-analytics; promote
 * to src/shared/ui once a third consumer appears). */
export function InlineAlert({ status, title, message }: InlineAlertProps) {
  return (
    <Alert.Root status={status} borderRadius="md">
      <Alert.Indicator />
      <Alert.Content>
        {title ? <Alert.Title>{title}</Alert.Title> : null}
        <Alert.Description whiteSpace="pre-wrap">{message}</Alert.Description>
      </Alert.Content>
    </Alert.Root>
  );
}
