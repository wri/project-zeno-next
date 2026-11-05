import {
  Box,
  Toaster as ChakraToaster,
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
  Icon,
} from "@phosphor-icons/react";

const typeColorMap = {
  info: "secondary",
  error: "red",
  warning: "orange",
  success: "green",
};

type ToastType = keyof typeof typeColorMap;

const TypeIcon: Record<ToastType, Icon> = {
  info: InfoIcon,
  error: WarningIcon,
  warning: WarningCircleIcon,
  success: CheckCircleIcon,
};

export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
});

export const Toaster = () => {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
        {(toast) => {
          let color: string;
          let IconComponent: Icon;

          const isValidType = toast.type && toast.type in typeColorMap;

          if (isValidType) {
            color = typeColorMap[toast.type as keyof typeof typeColorMap];
            IconComponent = TypeIcon[toast.type as keyof typeof TypeIcon];
          } else {
            color = "secondary";
            IconComponent = InfoIcon;
          }
          return (
            // One row: icon, text, then the action or the close button. The
            // spinner sits in the same circle as the icon that replaces it,
            // so an updated toast does not move.
            <Toast.Root
              width={{ md: "sm" }}
              ps="3"
              pe="3"
              py="3"
              gap="3"
              borderRadius="lg"
              border="1px solid"
              borderColor="border"
              bg="bg"
            >
              {toast.type === "loading" ? (
                <Box
                  bg="primary.subtle"
                  rounded="full"
                  width="32px"
                  height="32px"
                  flexShrink={0}
                  display="flex"
                  placeContent="center"
                  alignItems="center"
                >
                  <Spinner size="sm" color="primary.solid" />
                </Box>
              ) : toast.type === "error" ||
                toast.type === "info" ||
                toast.type === "warning" ||
                toast.type === "success" ? (
                <Box
                  bg={`${color}.subtle`}
                  rounded="full"
                  width="32px"
                  height="32px"
                  flexShrink={0}
                  display="flex"
                  placeContent="center"
                  alignItems="center"
                >
                  <IconComponent
                    weight="fill"
                    width="16px"
                    fill={`var(--chakra-colors-${color}-600)`}
                  />
                </Box>
              ) : (
                <Toast.Indicator />
              )}
              {/* The top padding centres the title's line on the icon. */}
              <Box flex="1" minWidth="0" pt="1.5">
                {toast.title && (
                  <Toast.Title color="fg" fontSize="sm" fontWeight="500">
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
                <Toast.ActionTrigger
                  alignSelf="flex-end"
                  borderColor="border.emphasized"
                >
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
