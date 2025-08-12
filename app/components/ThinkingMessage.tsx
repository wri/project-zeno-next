import { Box, Flex, Skeleton } from "@chakra-ui/react";
import { todo } from "node:test";

export default function ThinkingMessage() {
  //@todo("Define 'nice' skeleton structure")
  // Each sub-array is a line, each value is a word width in px. More consistency vs random widths.
  // This allows us to create a more structured skeleton that resembles the actual message layout.
  // We could generate a few examples and randomly select from them. Simpler but feels "random".
  const skeletonWordWidths = [
    [40, 40, 40, 24, 32], // "Lorem ipsum dolor sit amet
    [88, 80, 32],  // consectetur adipiscing elit"
  ];

  return (
    <Box width="100%">
      <Flex alignItems="center" gap={2} mb={2}>
        <span>Thinking</span>
        <span className="thinking-ellipsis">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </Flex>
      {skeletonWordWidths.map((line, lineIdx) => {
        const total = line.reduce((sum, w) => sum + w, 0);
        return (
          <Flex key={lineIdx} gap={2} mb={1} width="90%">
            {line.map((width, wordIdx) => (
              <Skeleton
                key={wordIdx}
                height="18px"
                width={`${(width / total) * 100}%`}
                borderRadius="md"
              />
            ))}
          </Flex>
        );
      })}
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