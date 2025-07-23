"use client";

import {
  Box,
  Toaster as ChakraToaster,
  Icon,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from "@chakra-ui/react";

import { WarningIcon } from "@phosphor-icons/react";

export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
});

export const Toaster = () => {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
        {(toast) => (
          <Toast.Root
            width={{ md: "sm" }}
            minHeight="133px"
            borderRadius="12px"
            border="1px solid"
            borderColor="#E0E2E5"
            bg={toast.type === "error" ? "white" : undefined}
          >
            <Stack gap="12px" maxWidth="100%">
              {toast.type === "error" ? (
                <Box
                  bg="#FEE2E2"
                  rounded="full"
                  width="32px"
                  height="32px"
                  display="flex"
                  placeContent="center"
                  alignItems="center"
                >
                  <WarningIcon weight="fill" width="16px" color="red" />
                </Box>
              ) : toast.type === "loading" ? (
                <Spinner size="sm" color="blue.solid" />
              ) : (
                <Toast.Indicator />
              )}
              <Box gap="4px">
                {toast.title && (
                  <Toast.Title color="fg" fontSize="sm" fontWeight="500" pb="1">
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
        )}
      </ChakraToaster>
    </Portal>
  );
};
