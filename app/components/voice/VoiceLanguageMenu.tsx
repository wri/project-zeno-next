"use client";
import { useState } from "react";
import { Box, Button, Text } from "@chakra-ui/react";
import { CaretDownIcon, CheckIcon, TranslateIcon } from "@phosphor-icons/react";
import { VOICE_LANGUAGES, labelForLang } from "@/app/utils/speechLang";

/**
 * Compact language override shown in the listening footer. Opens upward (the
 * prompt box sits at the bottom of the panel). A full-screen click-catcher
 * closes it on outside click.
 */
export default function VoiceLanguageMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Box position="relative" display="inline-flex">
      <Button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change dictation language"
        aria-expanded={open}
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

      {open && (
        <>
          <Box
            position="fixed"
            inset="0"
            zIndex={29}
            onClick={() => setOpen(false)}
          />
          <Box
            position="absolute"
            bottom="calc(100% + 8px)"
            left="0"
            zIndex={30}
            minW="184px"
            bg="white"
            borderWidth="1px"
            borderColor="#E1E2E6"
            borderRadius="md"
            boxShadow="0 4px 16px rgba(19,22,25,.16)"
            p="1"
            animation="vpFadeUp 0.22s ease both"
          >
            {VOICE_LANGUAGES.map((l) => (
              <Button
                key={l.code}
                type="button"
                onClick={() => {
                  onChange(l.code);
                  setOpen(false);
                }}
                variant="plain"
                w="full"
                justifyContent="space-between"
                gap="2"
                px="2"
                py="1.5"
                h="auto"
                borderRadius="sm"
                fontSize="12.5px"
                fontWeight="normal"
                color="fg"
                _hover={{ bg: "gray.100" }}
              >
                <Text as="span" whiteSpace="nowrap">
                  {l.label}
                </Text>
                {l.code === value && (
                  <Box as="span" color="primary.solid" display="inline-flex">
                    <CheckIcon size={13} weight="bold" />
                  </Box>
                )}
              </Button>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
