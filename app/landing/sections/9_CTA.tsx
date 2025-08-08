import { Box, Button, Container, Heading, Text } from "@chakra-ui/react";
import Link from "next/link";
import { CaretRightIcon } from "@phosphor-icons/react";

export default function CTASection() {
  return (
    <Box py="24" pb="28" borderBlockEnd="1px solid" borderColor="bg.emphasized">
      <Container>
        <Container
          maxW="4xl"
          py="4"
          px="5"
          rounded="md"
          bg={{ base: "bg.emphasized", md: "lime.200" }}
          display="flex"
          flexDirection={{ base: "column", md: "row" }}
          alignItems={{ base: "flex-start", md: "center" }}
          gap={3}
          justifyContent="space-between"
        >
          <Box display="flex" flexDir="column" gap="2">
            <Heading size="md" as="p">
              How will you use monitoring intelligence?{" "}
            </Heading>
            <Text fontSize="sm" color="fg.muted">
              Join the future of ecosystem monitoring and help us shape what
              comes next.
            </Text>
          </Box>
          <Button asChild variant="solid" colorPalette="blue">
            <Link href="/">
              Try the preview
              <CaretRightIcon weight="bold" />
            </Link>
          </Button>
        </Container>
      </Container>
    </Box>
  );
}
