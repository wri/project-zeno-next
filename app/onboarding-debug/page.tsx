import {
  Box,
  Container,
  Flex,
  Link as ChakraLink,
  Text,
} from "@chakra-ui/react";
import FrontDoorSections from "./FrontDoorSections";
import { DEBUG_NAV_OFFSET, DEBUG_SECTIONS } from "./sections";

/** Sticky bar of in-page links to each section of this long page. */
function JumpLinks() {
  return (
    <Box
      as="nav"
      aria-label="Page sections"
      position="sticky"
      top={0}
      zIndex="sticky"
      bg="bg"
      borderBottomWidth="1px"
      borderColor="border"
    >
      <Container maxW="6xl" py={3}>
        <Flex gap={4} wrap="wrap" align="center" fontSize="sm">
          <Text fontWeight="semibold" color="fg.muted">
            Jump to
          </Text>
          {Object.values(DEBUG_SECTIONS).map(({ id, label }) => (
            <ChakraLink key={id} href={`#${id}`} color="primary.fg">
              {label}
            </ChakraLink>
          ))}
        </Flex>
      </Container>
    </Box>
  );
}

// Debug-only: every front-door component on one page, with mock data and no
// API/auth — for visual review offline.
export default function OnboardingDebugPage() {
  return (
    <Box minH="100vh" bg="bg.subtle">
      <JumpLinks />
      <Container maxW="6xl" py={10}>
        <FrontDoorSections />
      </Container>
    </Box>
  );
}
