import { Box } from "@chakra-ui/react";
import { SpinnerGapIcon } from "@phosphor-icons/react";

/** The stepped spinner a dashboard card shows while its request runs. */
export default function RunningIcon({ size }: { size: number }) {
  return (
    <Box
      display="flex"
      alignItems="center"
      animation="spin 1s infinite"
      animationTimingFunction="steps(8, end)"
      aria-hidden
    >
      <SpinnerGapIcon size={size} />
    </Box>
  );
}
