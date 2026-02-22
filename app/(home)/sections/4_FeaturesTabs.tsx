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
import { useTranslations } from "next-intl";
import Link from "next/link";

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;

const TAB_IMAGES = [
  "/feature-tab-1.webp",
  "/feature-tab-2.webp",
  "/feature-tab-3.webp",
];

export default function FeaturesTabsSection() {
  const t = useTranslations("landing");
  const tc = useTranslations("common");

  const tabs = TAB_IMAGES.map((image, i) => ({
    value: `feature-tab-${i + 1}`,
    label: t(`features.tabs.${i}.label`),
    description: t(`features.tabs.${i}.description`),
    caption: t(`features.tabs.${i}.caption`),
    image,
  }));

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
            {t("features.heading")}
          </Heading>
          <Text fontSize="lg">
            {t("features.description")}
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
                {tc("nav.explorePreview")}
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
              {tabs.map((tab) => (
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
            {tabs.map((tab) => (
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
