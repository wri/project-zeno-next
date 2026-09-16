"use client";
import type { ReactNode } from "react";
import { Box } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";

import { Tooltip } from "@/app/components/ui/tooltip";

export function ChartInfoTooltip({ children }: { children: ReactNode }) {
  return (
    <Tooltip
      content={children}
      variant="dark"
      showArrow
      openDelay={200}
      positioning={{ placement: "bottom" }}
    >
      <Box as="span" display="inline-flex" cursor="pointer" flexShrink={0}>
        <InfoIcon size={16} color="#737C94" />
      </Box>
    </Tooltip>
  );
}
