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

const SUPPORT_TABS = [
  {
    value: "Restoration",
    cards: [
      {
        title: "Highlight priority areas for intervention",
        content:
          "Identify regions most in need of restoration by exploring global and local ecological activity from forest loss, to land conversion.",
        image: "https://placehold.co/270x135",
      },
      {
        title: "Respond to near-realtime disturbances",
        content:
          "Stay up to date with fires, deforestation and land conversion in your areas of interest so you can act fast where it counts.",
        image: "https://placehold.co/270x135",
      },
      {
        title: "Report on land cover changes over time",
        content:
          "Compare your areas of interest before and after intervention, and export anything from charts, statistics and satellite imagery for your reports.",
        image: "https://placehold.co/270x135",
      },
    ],
  },
  {
    value: "Conservation",
  },
  {
    value: "Policy",
  },
  {
    value: "Research",
  },
  {
    value: "Journalism",
  },
];

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
          From field work to policy writing, Global Nature Watch empowers
          smarter decisions, and meaningful action in the places you care about.
        </Text>
      </Container>
      {/* Ideas Section */}
      <Container maxW="5xl" mt="8" p="0">
        <Tabs.Root
          variant="enclosed"
          defaultValue="Restoration"
          display="flex"
          flexDir="column"
          alignItems="center"
        >
          <Tabs.List
            borderBottomRadius={0}
            borderTopRadius="2xl"
            p={0}
            overflow="hidden"
          >
            {SUPPORT_TABS.map((tab) => {
              return (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  _selected={{ boxShadow: "none" }}
                  fontWeight="normal"
                  rounded="none"
                >
                  {tab.value}
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>
          {SUPPORT_TABS.map((tab) => {
            return (
              <Tabs.Content
                key={tab.value}
                value={tab.value}
                bg="bg"
                display="flex"
                flexDirection={{base: "column", md: "row"}}
                rounded="lg"
                gap="4"
                padding="8"
              >
                {tab.cards?.map((card) => {
                  return (
                    <Box
                      display="flex"
                      flexDirection="column"
                      alignItems="flex-start"
                      gap="4"
                      bg="lime.100"
                      rounded="md"
                      p="4"
                      flex={1}
                      key={card.title}
                    >
                      <Image src={card.image} alt="Restoration" />
                      <Heading size="lg" as="p">
                        {card.title}
                      </Heading>
                      <Text color="fg.muted">
                        {card.content}
                      </Text>
                    </Box>
                  );
                })}
              </Tabs.Content>
            );
          })}
        </Tabs.Root>
      </Container>
      <Container
        maxW="5xl"
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
