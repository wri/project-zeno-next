import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Flex,
  Separator,
  HStack,
  Text,
  Textarea,
  ButtonGroup,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { usePromptStore } from "@/app/store/promptStore";
import useChatStore from "@/app/store/chatStore";
import { ArrowBendRightUpIcon, SparkleIcon } from "@phosphor-icons/react";

const WelcomeModal = () => {
  const { prompts, fetchPrompts } = usePromptStore();
  const { sendMessage, isLoading } = useChatStore();
  const [isOpen, setIsOpen] = useState(true);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const submitPrompt = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue("");

    await sendMessage(message);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && inputValue?.trim().length > 0 && !isLoading) {
      e.preventDefault();
      setIsOpen(false);
      submitPrompt();
    }
  };

  const getInputState = () => {
    return {
      disabled: isLoading,
    };
  };

  const { disabled } = getInputState();
  const isButtonDisabled = disabled || !inputValue?.trim();

  const handlePromptClick = async (prompt: string) => {
    setIsOpen(false);
    await sendMessage(prompt);
  };

  if (!isOpen) return null;

  return (
    <Dialog.Root
      lazyMount
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
              <Flex
                flexDir="column"
                position="relative"
                m={0}
                p={4}
                bg="bg.subtle"
                borderRadius="md"
                borderWidth="1px"
                className="group"
                transition="all 0.32s ease-in-out"
                _active={{
                  bg: "white",
                  borderColor: "blue.900",
                }}
                _focusWithin={{
                  bg: "white",
                  borderColor: "blue.900",
                }}
              >
                <Textarea
                  aria-label="Ask a question..."
                  placeholder="Ask a question..."
                  fontSize="sm"
                  autoresize
                  maxH="10lh"
                  border="none"
                  p={0}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyUp={handleKeyUp}
                  disabled={disabled}
                  _disabled={{
                    opacity: 1,
                  }}
                  _focus={{
                    outline: "none",
                  }}
                />
                <Button
                  p="0"
                  ml="auto"
                  borderRadius="full"
                  colorPalette="blue"
                  bg="blue.900"
                  _disabled={{
                    opacity: 0.75,
                  }}
                  type="button"
                  size="xs"
                  onClick={submitPrompt}
                  disabled={isButtonDisabled}
                  loading={isLoading}
                >
                  <ArrowBendRightUpIcon />
                </Button>
              </Flex>
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
              <CloseButton onClick={() => setIsOpen(false)} size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default WelcomeModal;
