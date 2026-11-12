"use client";
import { Spinner } from "@chakra-ui/react";
import {
  CheckCircleIcon,
  CircleIcon,
  MinusCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";

import type { ZapStepStatus } from "../model/zap-plan";

/** The status of one plan step as an icon. */
export function ZapStepIcon({ status }: { status: ZapStepStatus }) {
  switch (status) {
    case "running":
      return <Spinner size="xs" color="primary.solid" />;
    case "done":
      return (
        <CheckCircleIcon
          size={16}
          weight="fill"
          color="var(--chakra-colors-primary-solid)"
        />
      );
    case "skipped":
      return (
        <MinusCircleIcon size={16} color="var(--chakra-colors-fg-subtle)" />
      );
    case "failed":
      return <XCircleIcon size={16} color="var(--chakra-colors-fg-error)" />;
    default:
      return <CircleIcon size={16} color="var(--chakra-colors-fg-subtle)" />;
  }
}
