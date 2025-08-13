import { Box, Flex, SkeletonText, Spinner } from "@chakra-ui/react";

interface ThinkingMessageProps {
  label?: string;
}

export default function ThinkingMessage({ label = "Thinking" }: ThinkingMessageProps) {

  return (
    <Box width="100%">
       <Flex alignItems="center" gap={2} mb={2}>
       <Spinner size="sm" opacity={0.25} />{label}
       </Flex>      
       <SkeletonText variant="shine" noOfLines={5} rounded="xl" />
     </Box>
  );
}