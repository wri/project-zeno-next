import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Tabs,
  Image,
} from "@chakra-ui/react";
import { CaretRightIcon } from "@phosphor-icons/react";
import Link from "next/link";

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;

const FEATURE_TABS = [
  {
    value: "feature-tab-1",
    label: "Explore trusted data with an AI assistant",
    description:
      "Deforestation due to wildfires across Californian Protected Areas.",
    caption:
      "Quickly find the most relevant data for your work.",
    image: "/feature-tab-1.webp",
  },
  {
    value: "feature-tab-2",
    label: "Tailored answers to your context",
    description:
      "Explore how Global Nature Watch's assistant can shape responses to your needs, from comparing regions to highlighting local patterns that may be most relevant to your work.",
    caption:
      "Shape responses to your needs.",
    image: "/feature-tab-2.webp",
  },
  {
    value: "feature-tab-3",
    label: "Insights you can act on",
    description:
      "Global Nature Watch's assistant helps translate analyses into clear takeaways. It offers a starting point for reports, policies or field decisions while opening the door to dive deeper.",
    caption:
      "Generate clear takeaways from complex data.",
    image: "/feature-tab-3.webp",
  },
];

export default function FeaturesTabsSection() {
  return (
    <Box
      py={{ base: 14, md: 24 }}
      pb={{ base: 14, md: 28 }}
      borderBlockEnd="1px solid"
      borderColor="border"
    >
      <Container id="use-cases">
        <Container textAlign="center" maxW="3xl" px={0}>
          <Heading size={{ base: "3xl", md: "4xl" }}>
          Get answers to your toughest questions about landscapes, backed by data
          </Heading>
          <Text fontSize="lg">
          Global Nature Watch is testing new ways to make geospatial information easier to use.
          Try asking in plain language and explore the insights it can provide.
          </Text>
          {LANDING_PAGE_VERSION !== "closed" && (
            <Button
              asChild
              variant="solid"
              colorPalette="primary"
              mt="4"
              rounded="lg"
            >
              <Link href="/app">
                Explore the beta
                <CaretRightIcon weight="bold" />
              </Link>
            </Button>
          )}
        </Container>
        <Container mt="12" maxW="5xl" px={0}>
          <Tabs.Root
            orientation="vertical"
            colorPalette="primary"
            flexDirection={{ base: "column", md: "row" }}
            defaultValue="feature-tab-1"
          >
            <Tabs.List borderEndWidth={0} gap={6}>
              {FEATURE_TABS.map((tab) => (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  display="flex"
                  flexDir="column"
                  maxW="sm"
                  alignItems="flex-start"
                  textAlign="left"
                  height="auto"
                  css={{
                    "& > *:not(:first-child)": {
                      display: "none",
                    },
                  }}
                  _before={{
                    content: "' '",
                    position: "absolute",
                    insetBlock: "var(--indicator-offset-y, 0)",
                    insetInlineStart: "var(--indicator-offset-x, 0)",
                    width: "var(--indicator-thickness, 2px)",
                    background: "bg.subtle",
                  }}
                  _selected={{
                    "&[data-orientation=vertical]::before": {
                      insetInlineStart: "var(--indicator-offset-x, 0)",
                      insetInlineEnd: 0,
                      background:
                        "var(--indicator-color, var(--indicator-color-fallback))",
                    },
                    "& > *": {
                      display: "initial",
                    },
                  }}
                >
                  <Heading size="lg" mb={0}>
                    {tab.label}
                  </Heading>
                  <Text fontWeight="normal">{tab.description}</Text>
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {FEATURE_TABS.map((tab) => (
              <Tabs.Content
                key={tab.value}
                value={tab.value}
                display="flex"
                flexDirection="column"
                alignItems="center"
                gap="4"
                maxW="2xl"
              >
                <Image src={tab.image} alt={tab.label} />
                <Text
                  fontSize="xs"
                  textAlign="center"
                  as="figcaption"
                  color="fg.muted"
                >
                  {tab.caption}
                </Text>
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </Container>
      </Container>
    </Box>
  );
}
