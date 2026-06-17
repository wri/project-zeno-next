"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Drawer,
  Flex,
  Link,
  Portal,
  Separator,
  Switch,
  Text,
} from "@chakra-ui/react";
import { XIcon } from "@phosphor-icons/react";
import useCookieStore from "@/app/store/cookieStore";
import type { CookiePreferences } from "@/app/store/cookieStore";
import { URLS } from "@/app/constants/urls";

// ─── per-category config ─────────────────────────────────────────────────────
const COOKIE_CATEGORIES: {
  key: keyof CookiePreferences | null;
  label: string;
  description: string;
  locked?: boolean;
  disclosureHref: string;
}[] = [
  {
    key: null,
    label: "Essential",
    description:
      "Required to enable basic website functionality. You may not disable essential cookies.",
    locked: true,
    disclosureHref: URLS.privacyPolicy,
  },
  {
    key: "targetedAdvertising",
    label: "Targeted Advertising",
    description:
      "Used to deliver advertising that is more relevant to you and your interests. May also be used to limit the number of times you see an advertisement and measure the effectiveness of advertising campaigns. Advertising networks usually place them with the website operator's permission.",
    disclosureHref: URLS.privacyPolicy,
  },
  {
    key: "personalization",
    label: "Personalization",
    description:
      "Allow the website to remember choices you make (such as your username, language, or the region you are in) and provide enhanced, more personal features. For example, a website may provide you with local weather reports or traffic news by storing data about your general location.",
    disclosureHref: URLS.privacyPolicy,
  },
  {
    key: "analytics",
    label: "Analytics",
    description:
      "Help the website operator understand how its website performs, how visitors interact with the site, and whether there may be technical issues.",
    disclosureHref: URLS.privacyPolicy,
  },
];

export default function CookiePreferencesDrawer() {
  const {
    preferencesOpen,
    analytics,
    targetedAdvertising,
    personalization,
    closePreferences,
    savePreferences,
  } = useCookieStore();

  const [local, setLocal] = useState<CookiePreferences>({
    analytics,
    targetedAdvertising,
    personalization,
  });

  // Sync local state whenever drawer opens or stored preferences change.
  useEffect(() => {
    setLocal({ analytics, targetedAdvertising, personalization });
  }, [analytics, targetedAdvertising, personalization, preferencesOpen]);

  function toggle(key: keyof CookiePreferences, checked: boolean) {
    setLocal((prev) => ({ ...prev, [key]: checked }));
  }

  return (
    <Drawer.Root
      open={preferencesOpen}
      onOpenChange={(e) => !e.open && closePreferences()}
      size="sm"
      placement="end"
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content w="284px" maxW="284px">
            {/* ── Header ──────────────────────────────────────────────── */}
            <Drawer.Header
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              px={6}
              pt={6}
              pb={4}
            >
              <Text fontWeight="semibold" fontSize="md" m={0}>
                Storage Preferences
              </Text>
              <Box
                as="button"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="transparent"
                border="none"
                cursor="pointer"
                color="fg.muted"
                p={1}
                borderRadius="sm"
                _hover={{ color: "fg" }}
                onClick={closePreferences}
              >
                <XIcon size={18} />
              </Box>
            </Drawer.Header>

            {/* ── Body ────────────────────────────────────────────────── */}
            <Drawer.Body px={6} py={0}>
              {/* Intro paragraph */}
              <Text
                fontSize="xs"
                color="#3A4048"
                mb={2}
                lineHeight="1.5"
                fontWeight="400"
                letterSpacing="0"
              >
                When you visit websites, they may store or retrieve data about
                you using cookies and similar technologies
                (&ldquo;cookies&rdquo;). Cookies may be necessary for the basic
                functionality of the website as well as other purposes. You have
                the option of disabling certain types of cookies, though doing
                so may impact your experience on the website.
              </Text>

              {/* Standalone Privacy Policy link */}
              <Link
                href={URLS.privacyPolicy}
                target="_blank"
                rel="noopener noreferrer"
                fontSize="12px"
                lineHeight="16px"
                fontWeight="400"
                letterSpacing="0"
                textDecoration="underline"
                color="#21509A"
                display="block"
                mb={4}
              >
                Privacy Policy
              </Link>

              <Separator mb={4} />

              {/* Cookie category rows */}
              <Flex direction="column" gap={5}>
                {COOKIE_CATEGORIES.map(
                  ({ key, label, description, locked, disclosureHref }) => (
                    <Box key={label}>
                      <Flex
                        justify="space-between"
                        align="flex-start"
                        gap={4}
                        mb={1}
                      >
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          lineHeight="1.4"
                          letterSpacing="0"
                          color="#131619"
                        >
                          {label}
                        </Text>

                        {locked ? (
                          /* Essential — always on, visually disabled */
                          <Switch.Root
                            checked={true}
                            disabled
                            flexShrink={0}
                            size="sm"
                          >
                            <Switch.HiddenInput />
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch.Root>
                        ) : (
                          /* Toggleable switch */
                          <Switch.Root
                            checked={key ? local[key] : false}
                            onCheckedChange={(e: { checked: boolean }) =>
                              key && toggle(key, e.checked)
                            }
                            flexShrink={0}
                            size="sm"
                            colorPalette="primary"
                          >
                            <Switch.HiddenInput />
                            <Switch.Control>
                              <Switch.Thumb bg="white" />
                            </Switch.Control>
                          </Switch.Root>
                        )}
                      </Flex>

                      <Text
                        fontSize="xs"
                        color="#3A4048"
                        lineHeight="1.5"
                        fontWeight="400"
                        letterSpacing="0"
                        mb={1}
                      >
                        {description}
                      </Text>

                      <Link
                        href={disclosureHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        fontSize="xs"
                        fontWeight="600"
                        lineHeight="1.5"
                        letterSpacing="0"
                        color="#21509A"
                        display="block"
                        mt={2}
                      >
                        View Disclosures
                      </Link>
                    </Box>
                  )
                )}
              </Flex>
            </Drawer.Body>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <Drawer.Footer px={6} pt={6} pb={6}>
              <Button
                width="full"
                bg="#0049A8"
                color="white"
                borderRadius="4px"
                fontWeight="normal"
                onClick={() => savePreferences(local)}
              >
                Save
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
