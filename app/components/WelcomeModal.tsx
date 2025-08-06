import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Separator,
  HStack,
  Text,
  Textarea,
  ButtonGroup,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { usePromptStore } from "@/app/store/promptStore";
import useChatStore from "@/app/store/chatStore";
import { SparkleIcon } from "@phosphor-icons/react";

const WelcomeModal = () => {
  const { prompts, fetchPrompts } = usePromptStore();
  const { sendMessage } = useChatStore();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handlePromptClick = async (prompt: string) => {
    await sendMessage(prompt);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={() => setIsOpen(isOpen)}
      placement="center"
      size="lg"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.muted" padding="2">
            <Dialog.Header justifyContent="center" alignItems="center">
              <Dialog.Title fontWeight="500" fontSize="xl">
                Welcome to <strong>NatureWATCH</strong>
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" gap="32px">
              <Dialog.Description>
                Our AI-powered nature monitoring tool understands plain
                language, so no technical jargon required! Ask about land cover
                change, forest loss, or biodiversity risks in the areas you care
                about and quickly generate powerful insights. Whether
                you&apos;re a policymaker, scientist, or community advocate,
                we&apos;ll help you find the right data and make sense of it,
                too.
              </Dialog.Description>
              <Textarea
                height="92px"
                bg="white"
                placeholder="Ask a question..."
              ></Textarea>
              <HStack>
                <Separator flex="1" />
                <Text
                  textStyle="xs"
                  color="fg.muted"
                  flexShrink="0"
                  fontStyle="italic"
                >
                  ...or try asking about...
                </Text>
                <Separator flex="1" />
              </HStack>
              <ButtonGroup
                flexDirection="column"
                alignItems="start"
                variant="outline"
                colorPalette="blue"
                overflow="auto"
                maxHeight="272px"
                size="sm"
              >
                {prompts.map((prompt, index) => (
                  <Button
                    key={index}
                    bg="white"
                    _hover={{ bg: "blue.100" }}
                    onClick={() => handlePromptClick(prompt)}
                  >
                    <SparkleIcon />
                    {prompt}
                  </Button>
                ))}
              </ButtonGroup>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button>Save</Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default WelcomeModal;
