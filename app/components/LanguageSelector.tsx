"use client";

import { Button, Box, Text, Separator } from "@chakra-ui/react";
import { TranslateIcon, InfoIcon } from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import useAuthStore from "@/app/store/authStore";
import { SUPPORTED_LANGUAGES } from "@/app/config/languages";
import { toaster } from "@/app/components/ui/toaster";

/**
 * A small pill button that shows the current language code and opens a
 * popover-style selector on click. Includes an "Other Languages…" option
 * that explains the assistant understands many more languages.
 */
export default function LanguageSelector({
  disabled,
  dropDirection = "down",
}: {
  disabled?: boolean;
  dropDirection?: "up" | "down";
}) {
  const t = useTranslations("common");
  const preferredLanguageCode = useAuthStore((s) => s.preferredLanguageCode);
  const setPreferredLanguage = useAuthStore((s) => s.setPreferredLanguage);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentCode = preferredLanguageCode ?? "en";
  const currentLabel =
    SUPPORTED_LANGUAGES.find((l) => l.value === currentCode)?.label ??
    "English";

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleOtherLanguages = () => {
    setIsOpen(false);
    toaster.create({
      title: t("languageSelector.otherToastTitle"),
      description: t("languageSelector.otherToastDescription"),
      type: "info",
      duration: 8000,
    });
  };

  return (
    <Box ref={containerRef} position="relative" display="inline-block">
      <Button
        variant="solid"
        colorPalette="primary"
        _hover={{ bg: "primary.fg" }}
        size="sm"
        disabled={disabled}
        onClick={() => setIsOpen((o) => !o)}
        title={currentLabel}
      >
        <TranslateIcon size={16} />
        {currentCode.toUpperCase()}
      </Button>

      {isOpen && (
        <Box
          position="absolute"
          {...(dropDirection === "up"
            ? { bottom: "calc(100% + 4px)" }
            : { top: "calc(100% + 4px)" })}
          left="0"
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="md"
          py="1"
          zIndex="popover"
          minW="180px"
        >
          {/* Section label */}
          <Text
            px="3"
            pt="1.5"
            pb="1"
            fontSize="2xs"
            fontWeight="semibold"
            color="gray.500"
            textTransform="uppercase"
            letterSpacing="wider"
            userSelect="none"
          >
            {t("languageSelector.sectionLabel")}
          </Text>

          {/* Selectable languages */}
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = lang.value === currentCode;
            return (
              <Box
                key={lang.value}
                as="button"
                display="flex"
                alignItems="center"
                gap="2"
                w="full"
                px="3"
                py="1.5"
                fontSize="sm"
                cursor="pointer"
                color="gray.800"
                bg={isActive ? "primary.50" : "transparent"}
                _hover={{ bg: "gray.100" }}
                onClick={() => {
                  setPreferredLanguage(lang.value);
                  setIsOpen(false);
                }}
              >
                <Text fontWeight={isActive ? "semibold" : "normal"}>
                  {lang.label}
                </Text>
                <Text color="gray.500" ml="auto" fontSize="xs">
                  {lang.value.toUpperCase()}
                </Text>
              </Box>
            );
          })}

          {/* Divider + Other Languages */}
          <Separator my="1" />
          <Box
            as="button"
            display="flex"
            alignItems="center"
            gap="2"
            w="full"
            px="3"
            py="1.5"
            fontSize="sm"
            cursor="pointer"
            color="gray.500"
            _hover={{ bg: "gray.100", color: "gray.700" }}
            onClick={handleOtherLanguages}
          >
            <InfoIcon size={14} />
            <Text fontStyle="italic">
              {t("languageSelector.otherLanguages")}
            </Text>
          </Box>

          {/* AI translation disclaimer */}
          <Separator my="1" />
          <Text
            px="3"
            py="1.5"
            fontSize="2xs"
            color="gray.400"
            fontStyle="italic"
          >
            {t("languageSelector.aiDisclaimer")}
          </Text>
        </Box>
      )}
    </Box>
  );
}
