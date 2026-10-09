import type { ComponentProps, ReactNode } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import {
  ClockCounterClockwiseIcon,
  NotePencilIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import Markdown from "react-markdown";
import type { WelcomeCopy } from "./catalog";

const markdownComponents = {
  p: (props: ComponentProps<"p">) => (
    <Text as="p" mb="3" lineHeight="1.5" _last={{ mb: 0 }}>
      {props.children}
    </Text>
  ),
  strong: (props: ComponentProps<"strong">) => (
    <Text as="strong" fontWeight="700" display="block" mb="3">
      {props.children}
    </Text>
  ),
  a: (props: ComponentProps<"a">) => (
    <a href={props.href} style={{ textDecoration: "underline" }}>
      {props.children}
    </a>
  ),
};

/**
 * Presentational chat-welcome facsimile. Both engines fill `copy` from the
 * same catalog keys, so the screen can be compared like for like.
 */
export function WelcomeView({
  copy,
  engine,
}: {
  copy: WelcomeCopy;
  engine: string;
}) {
  return (
    <Box
      data-testid="i18n-poc-welcome"
      data-engine={engine}
      bg="white"
      borderWidth="1px"
      borderColor="border.emphasized"
      rounded="lg"
      overflow="hidden"
      w="full"
      maxW="420px"
      shadow="sm"
    >
      <Flex
        h="40px"
        px="3"
        bg="neutral.200"
        alignItems="center"
        gap="2"
        flexShrink={0}
      >
        <SparkleIcon size={16} color="var(--chakra-colors-neutral-500)" />
        <Text
          fontSize="10px"
          lineHeight="16px"
          letterSpacing="0.3px"
          textTransform="uppercase"
          color="neutral.500"
        >
          {copy.label}
        </Text>
        <Flex ml="auto" gap="1">
          <HeaderIcon label={copy.newConversation}>
            <NotePencilIcon size={16} />
          </HeaderIcon>
          <HeaderIcon label={copy.history}>
            <ClockCounterClockwiseIcon size={16} />
          </HeaderIcon>
        </Flex>
      </Flex>

      <Box px="4" py="4" fontSize="sm">
        <Markdown components={markdownComponents}>{copy.welcome}</Markdown>
        <Flex direction="column" gap="2" mt="4">
          {copy.prompts.map((prompt) => (
            <Box
              key={prompt}
              p="2"
              rounded="md"
              borderWidth="1px"
              borderColor="border.emphasized"
              fontSize="xs"
              bg="bg"
            >
              {prompt}
            </Box>
          ))}
        </Flex>
        <Text mt="3" fontSize="xs" color="neutral.600">
          {copy.promptCount}
        </Text>
        <Text mt="1" fontSize="xs" color="neutral.600">
          {copy.sampleStat}
        </Text>
        <Box
          mt="4"
          borderWidth="1px"
          borderColor="border.emphasized"
          rounded="md"
          px="3"
          py="2"
        >
          <input
            readOnly
            aria-label={copy.placeholder}
            placeholder={copy.placeholder}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              font: "inherit",
              color: "inherit",
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

function HeaderIcon({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        color: "inherit",
        background: "transparent",
        border: "none",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}
