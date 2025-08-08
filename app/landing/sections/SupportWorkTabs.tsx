import {
  Box,
  Button,
  Container,
  Heading,
  Image,
  Tabs,
  Text,
} from "@chakra-ui/react";
import Link from "next/link";

export default function SupportWorkTabsSection() {
  return (
    <Box
      py="24"
      pb="28"
      borderBlockEnd="1px solid"
      borderColor="bg.emphasized"
      bg="linear-gradient(0deg, rgba(0, 0, 0, 0.10) 0%, rgba(0, 0, 0, 0.64) 85%), url(/landing-bg-image2.png) lightgray 50% / cover no-repeat"
    >
      <Container textAlign="center" maxW="2xl" rounded="md" color="fg.inverted">
        <Heading size={{ base: "3xl", md: "4xl" }}>
          See how monitoring intelligence can support your work
        </Heading>
        <Text fontSize="md" mb="4">
          From field work to policy writing, NatureWATCH empowers smarter
          decisions, and meaningful action in the places you care about.
        </Text>
      </Container>
      {/* Ideas Section */}
      <Container maxW="4xl" mt="8" p="0">
        <Tabs.Root variant="enclosed">
          <Tabs.List alignContent="center">
            <Tabs.Trigger value="restoration">Restoration</Tabs.Trigger>
            <Tabs.Trigger value="conservation">Conservation</Tabs.Trigger>
            <Tabs.Trigger value="Policy">Policy</Tabs.Trigger>
            <Tabs.Trigger value="Research">Research</Tabs.Trigger>
            <Tabs.Trigger value="Journalism">Journalism</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content
            value="restoration"
            bg="bg"
            display="flex"
            rounded="lg"
            gap="4"
            padding="8"
          >
            <Box
              display="flex"
              flexDirection="column"
              alignItems="flex-start"
              gap="4"
              bg="lime.100"
              rounded="md"
              p="4"
              maxW="18rem"
            >
              <Image src="https://placehold.co/200x80" alt="Restoration" />
              <Heading size="sm" as="p">
                Highlight priority areas for intervation
              </Heading>
              <Text fontSize="xs" color="fg.muted">
                Identify regions most in need of restoration by exploring global
                and local ecological activity from forest loss to land
                conversion.
              </Text>
            </Box>
            <Box
              display="flex"
              flexDirection="column"
              alignItems="flex-start"
              gap="4"
              bg="lime.100"
              rounded="md"
              p="4"
              maxW="18rem"
            >
              <Image src="https://placehold.co/200x80" alt="Restoration" />
              <Heading size="sm" as="p">
                Highlight priority areas for intervation
              </Heading>
              <Text fontSize="xs" color="fg.muted">
                Identify regions most in need of restoration by exploring global
                and local ecological activity from forest loss to land
                conversion.
              </Text>
            </Box>
            <Box
              display="flex"
              flexDirection="column"
              alignItems="flex-start"
              gap="4"
              bg="lime.100"
              rounded="md"
              p="4"
              maxW="18rem"
            >
              <Image src="https://placehold.co/200x80" alt="Restoration" />
              <Heading size="sm" as="p">
                Highlight priority areas for intervation
              </Heading>
              <Text fontSize="xs" color="fg.muted">
                Identify regions most in need of restoration by exploring global
                and local ecological activity from forest loss to land
                conversion.
              </Text>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Container>
      <Container
        maxW="4xl"
        mt="8"
        p="4"
        rounded="md"
        bg="bg"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        <Heading size="md" as="p">
          How will you use monitoring intelligence?
        </Heading>
        <Button asChild variant="solid" colorPalette="blue">
          <Link href="/">Start Exploring</Link>
        </Button>
      </Container>
    </Box>
  );
}
