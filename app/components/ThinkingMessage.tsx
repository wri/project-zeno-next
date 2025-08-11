import { Box, Flex } from "@chakra-ui/react";

export default function ThinkingMessage() {
  return (
    <Box
      display="flex"
      alignItems="center"
      bg="whiteAlpha.200"
      color="fg"
      px={4}
      py={3}
      borderRadius="lg"
      maxW="80%"
      mb={4}
    >
      <Flex alignItems="center" gap={1}>
        <span>Thinking</span>
        <span className="thinking-ellipsis">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </Flex>
      <style jsx>{`
        .thinking-ellipsis span {
          opacity: 0.2;
          animation: blink 1.4s infinite both;
          font-weight: bold;
        }
        .thinking-ellipsis span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .thinking-ellipsis span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }
      `}</style>
    </Box>
  );
}