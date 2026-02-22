import { Box, Button, Container, Heading, Text } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { CaretRightIcon } from "@phosphor-icons/react";

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;

export default function CTASection() {
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  return (
    <Box
      py={{ base: 10, md: 24 }}
      pb={{ base: 10, md: 28 }}
      borderBlockEnd="1px solid"
      borderColor="border"
    >
      {LANDING_PAGE_VERSION !== "closed" && (
        <Container>
          <Container
            maxW="4xl"
            py="4"
            px="5"
            rounded="md"
            bg={{ base: "bg.muted", md: "secondary.200" }}
            display="flex"
            flexDirection={{ base: "column", md: "row" }}
            alignItems={{ base: "flex-start", md: "center" }}
            gap={3}
            justifyContent="space-between"
          >
            <Box display="flex" flexDir="column" gap="2">
              <Heading size="md" as="p">
                {t("cta.heading")}
              </Heading>
              <Text fontSize="sm" color="fg.muted">
                {t("cta.description")}
              </Text>
            </Box>
            <Button asChild variant="solid" colorPalette="primary" rounded="lg">
              <Link href="/app">
                {LANDING_PAGE_VERSION === "public" ? tc("nav.explorePreview") : t("cta.tryPreview")}
                <CaretRightIcon weight="bold" />
              </Link>
            </Button>
          </Container>
        </Container>
      )}
    </Box>
  );
}
