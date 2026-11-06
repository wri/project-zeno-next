import type { ReactNode } from "react";
import {
  Box,
  Toaster as ChakraToaster,
  Circle,
  Portal,
  Spinner,
  Toast,
  createToaster,
} from "@chakra-ui/react";

import {
  InfoIcon,
  WarningIcon,
  WarningCircleIcon,
  CheckCircleIcon,
  type Icon,
} from "@phosphor-icons/react";

type ToastType = "loading" | "info" | "error" | "warning" | "success";
type TypeIcon = { palette: string; icon: ReactNode };

/** A filled icon in its palette's colour. */
const fillIcon = (Glyph: Icon, palette: string): TypeIcon => ({
  palette,
  icon: (
    <Glyph
      weight="fill"
      width="16px"
      fill={`var(--chakra-colors-${palette}-600)`}
    />
  ),
});

/**
 * Each type's icon and palette; the circle behind the icon takes the
 * palette's tint. The spinner sits in the same circle as the icon that
 * replaces it, so an updated toast does not move. A type with no entry
 * shows no icon.
 */
const TYPE_ICONS: Partial<Record<string, TypeIcon>> = {
  loading: {
    palette: "primary",
    icon: <Spinner size="sm" color="primary.solid" />,
  },
  info: fillIcon(InfoIcon, "secondary"),
  error: fillIcon(WarningIcon, "red"),
  warning: fillIcon(WarningCircleIcon, "orange"),
  success: fillIcon(CheckCircleIcon, "green"),
} satisfies Record<ToastType, TypeIcon>;

export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
});

export const Toaster = () => {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
        {(toast) => {
          const typeIcon = toast.type ? TYPE_ICONS[toast.type] : undefined;
          return (
            // One row: icon, text, then the action or the close button.
            // Chakra's recipe paints error, success and warning toasts solid,
            // with white text and triggers; every toast here is a white card,
            // so the root resets those colours once for all its parts.
            <Toast.Root
              width={{ md: "sm" }}
              p="3"
              borderRadius="lg"
              border="1px solid"
              borderColor="border"
              bg="bg"
              color="fg"
              css={{
                "--toast-border-color": "colors.border.emphasized",
                "--toast-trigger-bg": "colors.bg.muted",
              }}
            >
              {typeIcon && (
                <Circle size="8" bg={`${typeIcon.palette}.subtle`}>
                  {typeIcon.icon}
                </Circle>
              )}
              {/* The top padding centres the title's line on the icon. */}
              <Box flex="1" minWidth="0" pt="1.5">
                {toast.title && (
                  <Toast.Title fontSize="sm" fontWeight="500">
                    {toast.title}
                  </Toast.Title>
                )}
                {toast.description && (
                  <Toast.Description
                    color="fg.muted"
                    fontSize="xs"
                    display="block"
                    lineHeight="1rem"
                    mt="0.5"
                  >
                    {toast.description}
                  </Toast.Description>
                )}
              </Box>
              {/* Level with the bottom of the text: it acts on the job. */}
              {toast.action && (
                <Toast.ActionTrigger alignSelf="flex-end">
                  {toast.action.label}
                </Toast.ActionTrigger>
              )}
              {/* In the row, top right, rather than over the text. */}
              {toast.closable && (
                <Toast.CloseTrigger
                  position="static"
                  boxSize="8"
                  flexShrink={0}
                  color="fg.muted"
                />
              )}
            </Toast.Root>
          );
        }}
      </ChakraToaster>
    </Portal>
  );
};
