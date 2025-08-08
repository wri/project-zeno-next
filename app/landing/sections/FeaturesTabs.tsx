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
import Link from "next/Link";

const FEATURE_TABS = [
  {
    value: "feature-tab-1",
    label: "Find new areas of interest",
    description:
      "Using our data and technology to enrich research and support governments in policy writing.",
    image: "https://placehold.co/800x500",
  },
  {
    value: "feature-tab-2",
    label: "Monitor your existing portfolio",
    description:
      "Track changes and disturbances in your areas of interest with real-time updates.",
    image: "https://placehold.co/800x500",
  },
  {
    value: "feature-tab-3",
    label: "Compare national or regional impact",
    description:
      "Analyze the effects of policies and interventions across different regions.",
    image: "https://placehold.co/800x500",
  },
];

export default function FeaturesTabsSection() {
  return (
    <Box py="24" pb="28" borderBlockEnd="1px solid" borderColor="bg.emphasized">
      <Container>
        <Container textAlign="center" maxW="3xl">
          <Heading size={{ base: "3xl", md: "4xl" }}>
            Get answers to your toughest questions about natural landscapes
          </Heading>
          <Text fontSize="lg">
            Global Nature Watch&rsquo;s AI understands your questions in plian language
            and delivers the most relevant data, satellite imagery and insights,
            formatted to fit your wofrkflow.
          </Text>
          <Button asChild variant="solid" colorPalette="blue" mt="4">
            <Link href="/">
              Launch the Preview
              <CaretRightIcon weight="bold" />
            </Link>
          </Button>
        </Container>
        <Container mt="12">
          <Tabs.Root orientation="vertical" colorPalette="blue">
            <Tabs.List borderEndWidth={0}>
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
                >
                  <Text fontWeight="bold">{tab.label}</Text>
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
              >
                <Image src={tab.image} alt={tab.label} />
                <Text
                  fontSize="xs"
                  textAlign="center"
                  as="figcaption"
                  color="fg.muted"
                >
                  {tab.description}
                </Text>
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </Container>
      </Container>
    </Box>
  );
}
