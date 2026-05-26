import { Tooltip as ChakraTooltip, Portal } from "@chakra-ui/react";
import * as React from "react";

const darkContentProps: ChakraTooltip.ContentProps = {
  bg: "#131619", // TODO: use theme value
  borderRadius: "8px",
  px: "8px",
  py: "8px",
  fontFamily: "'IBM Plex Sans', sans-serif",
  fontSize: "12px",
  fontWeight: "400",
  lineHeight: "150%",
  color: "#B2B6BD", // TODO: use theme value
  filter: "drop-shadow(0px 4px 16px rgba(0, 0, 0, 0.15))",
};

export interface TooltipProps extends ChakraTooltip.RootProps {
  showArrow?: boolean;
  portalled?: boolean;
  portalRef?: React.RefObject<HTMLElement>;
  content: React.ReactNode;
  contentProps?: ChakraTooltip.ContentProps;
  disabled?: boolean;
  variant?: "dark";
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  function Tooltip(props, ref) {
    const {
      showArrow,
      children,
      disabled,
      portalled = true,
      content,
      contentProps,
      portalRef,
      variant,
      ...rest
    } = props;

    const resolvedContentProps =
      variant === "dark"
        ? { ...darkContentProps, ...contentProps }
        : contentProps;

    if (disabled) return children;

    return (
      <ChakraTooltip.Root {...rest}>
        <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
        <Portal disabled={!portalled} container={portalRef}>
          <ChakraTooltip.Positioner>
            <ChakraTooltip.Content ref={ref} {...resolvedContentProps}>
              {showArrow && (
                <ChakraTooltip.Arrow>
                  <ChakraTooltip.ArrowTip />
                </ChakraTooltip.Arrow>
              )}
              {content}
            </ChakraTooltip.Content>
          </ChakraTooltip.Positioner>
        </Portal>
      </ChakraTooltip.Root>
    );
  }
);
