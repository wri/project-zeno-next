import { useId } from "react";
import { Box, Button, Flex, Menu, Portal, Text } from "@chakra-ui/react";
import { CaretDownIcon, CheckIcon, GlobeIcon } from "@phosphor-icons/react";
import { Tooltip } from "@/app/components/ui/tooltip";
import useAuthStore from "@/app/store/authStore";
import {
  htmlLang,
  isLocale,
  LOCALES,
  matchLocale,
  useLocale,
  useTranslation,
  type Locale,
} from "@/src/shared/lib/i18n";
import { changeLocale } from "./change-locale";

/**
 * Each language in its own name, so a reader finds theirs in any locale,
 * with the English name beneath it (omitted where it would repeat).
 */
const LANGUAGES: Record<Locale, { native: string; english: string }> = {
  id: { native: "Bahasa Indonesia", english: "Indonesian" },
  en: { native: "English", english: "English" },
  es: { native: "Español", english: "Spanish" },
  fr: { native: "Français", english: "French" },
  pt: { native: "Português", english: "Portuguese" },
  zh: { native: "中文（简体）", english: "Chinese (Simplified)" },
};

/** Alphabetical by native name, as in the design. */
const MENU_ORDER = [...LOCALES].sort((a, b) =>
  LANGUAGES[a].native.localeCompare(LANGUAGES[b].native, "en")
);

// Values from the design's menu component. Its secondary text and selected-row
// tints are not in the app theme's palette, so they are named here.
const SECONDARY_TEXT = "#565E7B";
const SELECTED_ROW = "#F0F4FF";
const MENU_BORDER = "#E0E2E5";

/**
 * The global header's display-language selector: a globe button showing the
 * active language code, opening a menu of the supported languages. A choice
 * applies at once and is remembered on this device only (see `changeLocale`);
 * the signed-in user's preferred language is marked with a badge.
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const preferred = useAuthStore((s) => matchLocale(s.preferredLanguageCode));
  const { t } = useTranslation();
  const triggerId = useId();
  const current = t("header.language.current", {
    language: LANGUAGES[locale].native,
  });

  return (
    <Menu.Root
      ids={{ trigger: triggerId }}
      positioning={{ placement: "bottom-end" }}
    >
      <Tooltip ids={{ trigger: triggerId }} content={current} showArrow>
        <Menu.Trigger asChild>
          {/* Sized and tinted like the header's other icon buttons. */}
          <Button
            h="32px"
            minW="32px"
            px="8px"
            gap="4px"
            borderRadius="4px"
            bg="#F4F5F6"
            color={SECONDARY_TEXT}
            _hover={{ bg: MENU_BORDER }}
            fontWeight="medium"
            aria-label={current}
          >
            <GlobeIcon size={16} />
            <Text as="span" fontSize="xs" lineHeight="16px">
              {locale.toUpperCase()}
            </Text>
            <CaretDownIcon size={12} weight="fill" />
          </Button>
        </Menu.Trigger>
      </Tooltip>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            w="260px"
            p="0"
            pt="6px"
            rounded="lg"
            borderWidth="1px"
            borderColor={MENU_BORDER}
            bg="white"
            boxShadow="0 8px 24px 0 rgba(18, 23, 26, 0.12)"
            overflow="hidden"
            // Above the map and the chat panel.
            zIndex="popover"
          >
            <Menu.RadioItemGroup
              value={locale}
              onValueChange={({ value }) => {
                if (isLocale(value) && value !== locale) changeLocale(value);
              }}
              aria-label={t("header.language.menu")}
            >
              {MENU_ORDER.map((code) => {
                const { native, english } = LANGUAGES[code];
                const selected = code === locale;
                return (
                  <Menu.RadioItem
                    key={code}
                    value={code}
                    lang={htmlLang(code)}
                    h="50px"
                    px="14px"
                    py="2"
                    gap="10px"
                    rounded="none"
                    cursor="pointer"
                    bg={selected ? SELECTED_ROW : undefined}
                    _highlighted={{
                      bg: selected ? "primary.50" : "neutral.200",
                    }}
                  >
                    <Box flex="1" minW={0}>
                      <Flex align="center" gap="2">
                        <Text
                          fontSize="sm"
                          lineHeight="18px"
                          color={selected ? "fg.link" : "neutral.900"}
                          fontWeight={selected ? "medium" : "normal"}
                        >
                          {native}
                        </Text>
                        {code === preferred && (
                          <Text
                            as="span"
                            px="6px"
                            py="1px"
                            rounded="sm"
                            borderWidth="1px"
                            borderColor={MENU_BORDER}
                            bg="white"
                            color={SECONDARY_TEXT}
                            fontSize="10px"
                            lineHeight="13px"
                            fontWeight="medium"
                          >
                            {t("header.language.preferred")}
                          </Text>
                        )}
                      </Flex>
                      {english !== native && (
                        <Text
                          fontSize="xs"
                          lineHeight="16px"
                          color={SECONDARY_TEXT}
                          lang="en"
                        >
                          {english}
                        </Text>
                      )}
                    </Box>
                    {/* On the right, as designed (the recipe puts it left). */}
                    <Menu.ItemIndicator
                      color="fg.link"
                      position="static"
                      transform="none"
                      flexShrink={0}
                    >
                      <CheckIcon size={16} />
                    </Menu.ItemIndicator>
                  </Menu.RadioItem>
                );
              })}
            </Menu.RadioItemGroup>
            <Box
              px="14px"
              py="11px"
              bg="neutral.200"
              borderTopWidth="1px"
              borderColor={MENU_BORDER}
            >
              <Text fontSize="xs" lineHeight="16px" color={SECONDARY_TEXT}>
                {t("header.language.scopeNote")}
              </Text>
            </Box>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
