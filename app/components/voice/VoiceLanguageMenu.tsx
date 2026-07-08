"use client";
import { Box, Button, Menu, Portal, Text } from "@chakra-ui/react";
import { CaretDownIcon, CheckIcon, TranslateIcon } from "@phosphor-icons/react";
import { VOICE_LANGUAGES, labelForLang } from "@/app/utils/speechLang";

/**
 * Compact language override shown in the listening footer. Built on the app's
 * Chakra Menu so outside-click, Escape, focus management, keyboard navigation,
 * and ARIA roles come for free. Opens upward since the prompt box sits low.
 */
export default function VoiceLanguageMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <Menu.Root
      positioning={{ placement: "top-start" }}
      onSelect={({ value: code }) => onChange(code)}
    >
      <Menu.Trigger asChild>
        <Button
          type="button"
          aria-label="Change dictation language"
          variant="plain"
          p="1"
          h="auto"
          minW="0"
          gap="1.5"
          fontFamily="mono"
          fontSize="10px"
          letterSpacing="0.5px"
          textTransform="uppercase"
          color="gray.500"
        >
          <TranslateIcon size={13} />
          {labelForLang(value)}
          <CaretDownIcon size={11} />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="184px" zIndex={1500}>
            {VOICE_LANGUAGES.map((l) => (
              <Menu.Item
                key={l.code}
                value={l.code}
                justifyContent="space-between"
                gap="2"
              >
                <Text as="span" whiteSpace="nowrap" fontSize="12.5px">
                  {l.label}
                </Text>
                {l.code === value && (
                  <Box as="span" color="primary.solid" display="inline-flex">
                    <CheckIcon size={13} weight="bold" />
                  </Box>
                )}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
