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
import { useEffect, useState, useRef } from "react";
import { usePromptStore } from "@/app/store/promptStore";
import useChatStore from "@/app/store/chatStore";
import { ArrowBendRightUpIcon, SparkleIcon } from "@phosphor-icons/react";

const WelcomeModal = () => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const { prompts, fetchPrompts } = usePromptStore();
  const { sendMessage, isLoading } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [bypassWelcomeModal, setBypassWelcomeModal] = useState(false);

  useEffect(() => {
    const storedValue = localStorage.getItem("bypassWelcomeModal");
    setBypassWelcomeModal(storedValue === "true");
    setIsOpen(storedValue !== "true");
  }, []);

  useEffect(() => {
    if (!bypassWelcomeModal) {
      fetchPrompts();
    }
  }, [fetchPrompts, bypassWelcomeModal]);

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

  if (!isOpen || bypassWelcomeModal) return null;

  return (
    <Dialog.Root
      lazyMount
      open={isOpen}
      onOpenChange={() => setIsOpen(isOpen)}
      placement="center"
      size="lg"
      initialFocusEl={() => ref.current}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.muted" padding="2">
            <Dialog.Header justifyContent="center" alignItems="center">
              <Dialog.Title fontWeight="normal" fontSize="2xl" m={0}>
                Welcome to <strong>Global Nature Watch</strong>
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" gap="12">
              <Flex display="flex" flexDirection="column" gap="8">
                <Dialog.Description fontSize="xs" lineHeight="moderate">
                  Our AI-powered nature monitoring tool understands plain
                  language, so no technical jargon required! Ask about land
                  cover change, forest loss, or biodiversity risks in the areas
                  you care about and quickly generate powerful insights. Whether
                  you&apos;re a policymaker, scientist, or community advocate,
                  we&apos;ll help you find the right data and make sense of it,
                  too.
                </Dialog.Description>
                <Flex
                  flexDir="column"
                  position="relative"
                  m={0}
                  p={4}
                  bg="bg"
                  rounded="xl"
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
                    size="sm"
                    autoresize
                    maxH="10lh"
                    border="none"
                    p={0}
                    value={inputValue}
                    ref={ref}
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
                    p="0.25rem"
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
                    h="auto"
                    w="auto"
                    minW="0"
                  >
                    <ArrowBendRightUpIcon weight="bold" size="10" />
                  </Button>
                </Flex>
              </Flex>
              <Flex display="flex" flexDir="column" gap="6">
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
                  colorPalette="blue"
                  overflow="auto"
                  maxHeight="272px"
                  size="xs"
                  gap={4}
                >
                  {prompts.map((prompt, index) => (
                    <Button
                      key={index}
                      color="blue.800"
                      fontWeight="normal"
                      bg="white"
                      rounded="lg"
                      _hover={{ bg: "blue.800/10" }}
                      onClick={() => handlePromptClick(prompt)}
                    >
                      <SparkleIcon />
                      {prompt}
                    </Button>
                  ))}
                </ButtonGroup>
              </Flex>
              <Flex
                justifyContent="flex-start"
                pt={2}
                alignItems="center"
                gap={2}
              >
                <input
                  type="checkbox"
                  id="dontShowAgain"
                  checked={bypassWelcomeModal}
                  onChange={() => {
                    if (bypassWelcomeModal) {
                      localStorage.setItem("bypassWelcomeModal", "false");
                      setBypassWelcomeModal(false);
                    } else {
                      localStorage.setItem("bypassWelcomeModal", "true");
                      setBypassWelcomeModal(true);
                    }
                  }}
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: "#1e40af",
                  }}
                />
                <label
                  htmlFor="dontShowAgain"
                  style={{
                    fontSize: "12px",
                    color: "var(--chakra-colors-fg-muted)",
                    cursor: "pointer",
                  }}
                >
                  Don&apos;t show this again
                </label>
              </Flex>
            </Dialog.Body>
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
