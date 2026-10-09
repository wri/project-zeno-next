import { useState } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { CJK_FONT_FAMILY, fontStack, useCjkFont } from "./fonts";
import { I18nextWelcomeScreen } from "./i18next/WelcomeScreen";
import { LinguiWelcomeScreen } from "./lingui/WelcomeScreen";
import { initLocaleFromBrowser, LOCALES, type Locale } from "./locale";
import { setLocale, useLocale } from "./useLocale";

type Engine = "i18next" | "lingui";

const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
  "zh-Hans": "中文（简体）",
};

/**
 * Throwaway comparison surface. Locale lives in cookie/state; the URL is
 * always `/i18n-poc` with no locale prefix.
 */
export function I18nPocPage() {
  const [booted] = useState(() => {
    if (typeof document !== "undefined") initLocaleFromBrowser();
    return true;
  });
  const locale = useLocale();
  const [engine, setEngine] = useState<Engine>("i18next");
  const [cjkEnabled, setCjkEnabled] = useState(true);
  const cjkLoaded = useCjkFont(locale, cjkEnabled);
  const useCjkStack = locale === "zh-Hans" && cjkEnabled;

  if (!booted) return null;

  return (
    <Box minH="100vh" bg="neutral.100" color="neutral.900">
      <Flex
        gap="3"
        p="4"
        wrap="wrap"
        alignItems="center"
        borderBottomWidth="1px"
        borderColor="border.emphasized"
        bg="white"
      >
        <Text fontSize="xs" fontWeight="600" letterSpacing="0.04em">
          PZB-229
        </Text>
        <Flex gap="1">
          {LOCALES.map((code) => (
            <Button
              key={code}
              size="xs"
              variant={code === locale ? "solid" : "outline"}
              onClick={() => setLocale(code)}
            >
              {LOCALE_LABEL[code]}
            </Button>
          ))}
        </Flex>
        <Flex gap="1">
          <Button
            size="xs"
            variant={engine === "i18next" ? "solid" : "outline"}
            onClick={() => setEngine("i18next")}
          >
            react-i18next
          </Button>
          <Button
            size="xs"
            variant={engine === "lingui" ? "solid" : "outline"}
            onClick={() => setEngine("lingui")}
          >
            Lingui
          </Button>
        </Flex>
        <Button
          size="xs"
          variant={cjkEnabled ? "solid" : "outline"}
          disabled={locale !== "zh-Hans"}
          onClick={() => setCjkEnabled((on) => !on)}
        >
          {useCjkStack ? CJK_FONT_FAMILY : "Latin font only"}
        </Button>
      </Flex>

      <Flex justify="center" px="4" py="8">
        <Box lang={locale} style={{ fontFamily: fontStack(useCjkStack) }}>
          {engine === "i18next" ? (
            <I18nextWelcomeScreen locale={locale} />
          ) : (
            <LinguiWelcomeScreen locale={locale} />
          )}
          <Text
            mt="3"
            fontSize="xs"
            color="neutral.600"
            data-testid="i18n-poc-font"
            data-cjk-loaded={cjkLoaded ? "yes" : "no"}
          >
            {useCjkStack
              ? `Font stack: IBM Plex Sans, ${CJK_FONT_FAMILY}${cjkLoaded ? " (loaded)" : " (loading)"}`
              : "Font stack: IBM Plex Sans only (no CJK face)"}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
}
