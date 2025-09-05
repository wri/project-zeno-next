"use client";

import { Box, Button, Container, Heading, Text } from "@chakra-ui/react";

const WAITLIST_URL = process.env.NEXT_PUBLIC_WAITLIST_URL || "/";

export default function UnauthorizedPage() {
  return (
    <Box minH="100vh" bg="bg" display="flex" alignItems="center">
      <Container maxW="lg">
        <Heading as="h1" size="2xl" mb={4} fontWeight="normal">
          Access not available yet
        </Heading>
        <Text color="fg.muted" mb={8}>
          Your account isn&apos;t authorized for Global Nature Watch yet. Join
          the waitlist and we’ll notify you as soon as access is available.
        </Text>
        <Button asChild colorPalette="primary">
          <a href={WAITLIST_URL} target="_blank" rel="noopener noreferrer">
            Join the waitlist
          </a>
        </Button>
      </Container>
    </Box>
  );
}
