"use client";
import { Box, Flex } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";

// 45deg linear gradient shimmer using ~60% opacity colors
const shimmer = keyframes`
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
`;

export default function ThreadSkeleton() {
  // Full-cover overlay shimmer
  return (
    <Box
      position="absolute"
      top={0}
      right={0}
      bottom={0}
      left={0}
      zIndex={1}
      pointerEvents="none"
      borderRadius="inherit"
      opacity={0.7}
      css={{
        backgroundImage: "linear-gradient(45deg, #E3F37F99, #8DE0FA99)",
        backgroundSize: "200% 200%",
        animation: `${shimmer} 1.2s linear infinite`,
        // Deeper edge fade using stronger inset glow
        boxShadow: "inset 0 0 80px 40px rgba(255,255,255,0.95)",
        // Extra fade using CSS mask (and webkit prefix) to taper edges
        WebkitMaskImage:
          "radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)",
        maskImage:
          "radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)",
        // Slight backdrop blur for subtlety
        backdropFilter: "blur(2px)",
      }}
    >
      <Flex
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        align="center"
        justify="center"
        gap={0}
        color="fg.muted"
        fontWeight="medium"
        fontSize="sm"
        textShadow="0 1px 2px rgba(255,255,255,0.9)"
      >
        <span>Fetching conversation</span>
        <span className="thinking-ellipsis">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </Flex>
      <style jsx>{`
        .thinking-ellipsis { margin-left: 2px; }
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
