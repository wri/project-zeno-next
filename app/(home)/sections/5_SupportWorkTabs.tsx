import {
  Accordion,
  Box,
  Button,
  Container,
  Heading,
  Image,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { CaretRightIcon } from "@phosphor-icons/react";
import Link from "next/link";

type SupportTabCard = {
  title: string;
  content: string;
  image: string;
};

type SupportTab = {
  value: string;
  cards?: SupportTabCard[];
};

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;
const SUPPORT_TABS = [
  {
    value: "Restoration",
    cards: [
      {
        title: "Highlight priority areas for intervention",
        content:
          "Identify regions most in need of restoration by exploring global and local ecological activity from forest loss, to land conversion.",
        image: "/support-1-a.png",
      },
      {
        title: "Respond to near-realtime disturbances",
        content:
          "Stay up to date with fires, deforestation and land conversion in your areas of interest so you can act fast where it counts.",
        image: "/support-1-b.png",
      },
      {
        title: "Report on land cover changes over time",
        content:
          "Compare your areas of interest before and after intervention, and export anything from charts, statistics and satellite imagery for your reports.",
        image: "/support-1-c.png",
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

const renderContent = (tab: SupportTab): React.ReactElement | null => {
  if (!tab.cards) return null;
  return (
    <>
      {tab.cards.map((card) => (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="stretch"
          gap="4"
          bg="secondary.100"
          rounded="lg"
          p="4"
          flex={1}
          key={card.title}
        >
          <Image src={card.image} alt="Restoration" />
          <Heading size="lg" as="p" m={0}>
            {card.title}
          </Heading>
          <Text color="fg.muted">{card.content}</Text>
        </Box>
      ))}
    </>
  );
};
export default function SupportWorkTabsSection() {
  return (
    <Container
      py={{ base: 14, md: 24 }}
      pb={{ base: 14, md: 28 }}
      borderBlockEnd="1px solid"
      borderColor="border"
      bg="linear-gradient(0deg, rgba(0, 0, 0, 0.10) 0%, rgba(0, 0, 0, 0.64) 85%), url(/landing-bg-image2.png) lightgray 50% / cover no-repeat"
    >
      <Container
        textAlign="center"
        maxW="2xl"
        rounded="md"
        color="fg.inverted"
        px={0}
      >
        <Heading size={{ base: "3xl", md: "4xl" }} color="fg.inverted">
          See how monitoring intelligence can support your work
        </Heading>
        <Text fontSize="md" mb="4">
          From field work to policy writing, Global Nature Watch empowers
          smarter decisions, and meaningful action in the places you care about.
        </Text>
      </Container>
      <Container maxW="5xl" mt={{ base: "8", md: "10" }} px={0}>
        {/* Tabs on medium breakpoint up, hidden on mobile */}
        <Tabs.Root
          variant="enclosed"
          defaultValue="Restoration"
          display="flex"
          flexDir="column"
          alignItems="center"
          hideBelow="md"
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
                  bg="bg.subtle"
                  _selected={{ boxShadow: "none", bg: "bg" }}
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
                rounded="2xl"
                gap="4"
                padding="8"
              >
                {renderContent(tab)}
              </Tabs.Content>
            );
          })}
        </Tabs.Root>
        {/* Accordion component is used on mobile only */}
        <Accordion.Root
          collapsible
          defaultValue={["Restoration"]}
          hideFrom="md"
          variant="plain"
          display="flex"
          flexDir="column"
          gap={4}
        >
          {SUPPORT_TABS.map((tab, index) => (
            <Accordion.Item
              key={index}
              value={tab.value}
              bg="bg.panel"
              px={5}
              py={4}
              rounded="xl"
              _open={{
                px: 4,
                py: 3,
              }}
            >
              <Accordion.ItemTrigger p={0}>
                <Heading size="lg" as="h5" flex="1">
                  {tab.value}
                </Heading>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent pt={2}>
                <Accordion.ItemBody display="flex" flexDir="column" gap={4}>
                  {renderContent(tab)}
                </Accordion.ItemBody>
              </Accordion.ItemContent>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Container>
      {LANDING_PAGE_VERSION !== "closed" && (
        <Container maxW="5xl" mt={{ base: "8", md: "10" }} px={0}>
          <Box
            py={4}
            px={5}
            rounded="xl"
            bg="bg"
            display="flex"
            flexDir={{ base: "column", md: "row" }}
            alignItems={{ base: "flex-start", md: "center" }}
            justifyContent="space-between"
            gap={3}
          >
            <Heading size="md" as="p">
              How will you use monitoring intelligence?
            </Heading>
            <Button asChild variant="solid" colorPalette="primary" rounded="lg">
              <Link href="/app">
                Try the preview
                <CaretRightIcon weight="bold" />
              </Link>
            </Button>
          </Box>
        </Container>
      )}
    </Container>
  );
}
