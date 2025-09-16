"use client";

import {
  Box,
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
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
            <Toast.Root
              width={{ md: "sm" }}
              minHeight="133px"
              borderRadius="lg"
              border="1px solid"
              borderColor="border"
              bg="bg"
            >
              <Stack gap={3} maxWidth="100%">
                {toast.type === "loading" ? (
                  <Spinner size="sm" color="primary.solid" />
                ) : toast.type === "error" ||
                  toast.type === "info" ||
                  toast.type === "warning" ||
                  toast.type === "success" ? (
                  <Box
                    bg={`${color}.subtle`}
                    rounded="full"
                    width="32px"
                    height="32px"
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
                <Box gap="4px">
                  {toast.title && (
                    <Toast.Title
                      color="fg"
                      fontSize="sm"
                      fontWeight="500"
                      pb="1"
                    >
                      {toast.title}
                    </Toast.Title>
                  )}
                  {toast.description && (
                    <Toast.Description
                      color="fg.muted"
                      fontSize="xs"
                      display="inline-block"
                      lineHeight="1rem"
                    >
                      {toast.description}
                    </Toast.Description>
                  )}
                </Box>
              </Stack>
              {toast.action && (
                <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>
              )}
              {toast.closable && <Toast.CloseTrigger color="fg.subtle" />}
            </Toast.Root>
          );
        }}
      </ChakraToaster>
    </Portal>
  );
};
