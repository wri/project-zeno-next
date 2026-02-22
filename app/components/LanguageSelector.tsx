"use client";

import { Button, Box, Text, Separator } from "@chakra-ui/react";
import { GlobeIcon, InfoIcon } from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import useAuthStore from "@/app/store/authStore";
import { SUPPORTED_LANGUAGES } from "@/app/config/languages";
import { toaster } from "@/app/components/ui/toaster";

/**
 * Persist language preference to the user profile API (fire-and-forget).
 * Only called for authenticated users.
 */
async function persistLanguageToProfile(code: string) {
  try {
    await fetch("/api/proxy/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferred_language_code: code }),
    });
  } catch {
    // Silently ignore — the in-memory switch already took effect
  }
}

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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
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
    <Box ref={containerRef} position="relative">
      <Button
        variant="solid"
        colorPalette="primary"
        _hover={{ bg: "primary.fg" }}
        size="sm"
        disabled={disabled}
        onClick={() => setIsOpen((o) => !o)}
        title={currentLabel}
      >
        <GlobeIcon size={16} />
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
            py="1"
            fontSize="2xs"
            fontWeight="medium"
            color="fg.subtle"
            textTransform="uppercase"
            letterSpacing="wider"
            userSelect="none"
          >
            {t("languageSelector.sectionLabel")}
          </Text>

          {/* Selectable languages */}
          {SUPPORTED_LANGUAGES.map((lang) => (
            <Box
              key={lang.value}
              as="button"
              display="flex"
              alignItems="center"
              gap="2"
              w="full"
              px="3"
              py="1.5"
              fontSize="xs"
              cursor="pointer"
              bg={lang.value === currentCode ? "primary.50" : "transparent"}
              _hover={{ bg: "gray.100" }}
              onClick={() => {
                setPreferredLanguage(lang.value);
                if (isAuthenticated) {
                  persistLanguageToProfile(lang.value);
                }
                setIsOpen(false);
              }}
            >
              <Text
                fontWeight={lang.value === currentCode ? "semibold" : "normal"}
              >
                {lang.label}
              </Text>
              <Text color="fg.muted" ml="auto">
                {lang.value.toUpperCase()}
              </Text>
            </Box>
          ))}

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
            fontSize="xs"
            cursor="pointer"
            color="fg.muted"
            _hover={{ bg: "gray.100", color: "fg" }}
            onClick={handleOtherLanguages}
          >
            <InfoIcon size={14} />
            <Text fontStyle="italic">
              {t("languageSelector.otherLanguages")}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
