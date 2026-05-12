"use client";

import { Box, Flex, IconButton, Textarea, Text } from "@chakra-ui/react";
import { DotsSixVerticalIcon, XIcon } from "@phosphor-icons/react";

type Props = {
  text: string;
  onChange: (text: string) => void;
  onRemove?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  source?: "user" | "chat";
};

export default function AnnotationBlock({
  text,
  onChange,
  onRemove,
  dragHandleProps,
  source = "user",
}: Props) {
  return (
    <Box
      position="relative"
      bg="orange.subtle"
      border="1.5px dashed"
      borderColor="orange.muted"
      rounded="md"
      p={3}
      h="160px"
      display="flex"
      flexDir="column"
    >
      <Flex justify="space-between" align="center" mb={1}>
        <Text
          fontSize="2xs"
          color="orange.fg"
          fontWeight="semibold"
          textTransform="uppercase"
          letterSpacing="wider"
        >
          {source === "chat" ? "From chat ✏️" : "Note"}
        </Text>
        <Flex gap={1} align="center">
          {onRemove && (
            <IconButton
              aria-label="Remove annotation"
              size="2xs"
              variant="ghost"
              onClick={onRemove}
            >
              <XIcon size={12} />
            </IconButton>
          )}
          {dragHandleProps && (
            <Box
              {...dragHandleProps}
              cursor="grab"
              color="fg.muted"
              opacity={0.5}
              _hover={{ opacity: 1 }}
              touchAction="none"
            >
              <DotsSixVerticalIcon size={14} />
            </Box>
          )}
        </Flex>
      </Flex>
      <Textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your annotation…"
        flex="1"
        resize="none"
        size="xs"
        bg="transparent"
        border="none"
        color="fg"
        fontSize="xs"
        _focus={{ outline: "none", boxShadow: "none" }}
        px={0}
      />
    </Box>
  );
}
