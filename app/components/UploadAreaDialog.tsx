import {
  Box,
  Stack,
  Flex,
  Dialog,
  Portal,
  Button,
  Field,
} from "@chakra-ui/react";
import useUploadAreaStore from "../store/uploadAreaStore";

function UploadAreaDialog() {
  const { dialogVisible, toggleUploadAreaDialog } = useUploadAreaStore();

  return (
    <Dialog.Root
      placement="center"
      size="lg"
      open={dialogVisible}
      onOpenChange={toggleUploadAreaDialog}
    >
      <Portal>
        <Dialog.Positioner>
          <Dialog.Content h="30rem" maxH="75vh" overflow="hidden">
            <Flex flex="1" maxH="100%" overflow="hidden">
              {/* Modal Body */}
              <Stack
                bg="bg.subtle"
                py={3}
                w="full"
                maxW="100%"
                maxH="100%"
                overflow="scroll"
                p={4}
              >
                <Box>
                  <Field.Root>
                    <Field.Label>Upload Area</Field.Label>
                  </Field.Root>
                </Box>
              </Stack>
            </Flex>
            <Dialog.Footer
              justifyContent="space-between"
              borderTop="1px solid"
              borderColor="border"
              py={2}
              px={3}
            >
              <Button
                size="xs"
                variant="ghost"
                borderRadius="full"
                onClick={toggleUploadAreaDialog}
              >
                Cancel
              </Button>
              <Button
                size="xs"
                variant="solid"
                colorPalette="blue"
                borderRadius="full"
                ml="auto"
              >
                Upload
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export default UploadAreaDialog;
