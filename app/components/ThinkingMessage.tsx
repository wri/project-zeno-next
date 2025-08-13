import { Box, Flex, Skeleton, SkeletonText, Spinner } from "@chakra-ui/react";

export default function ThinkingMessage() {

  return (
    <Box width="100%">
       <Flex alignItems="center" gap={2} mb={2}>
        <Spinner size="sm" opacity={0.25} />Thinking
       </Flex>      
       <SkeletonText variant="shine" noOfLines={5} rounded="xl" />
     </Box>
  );
}