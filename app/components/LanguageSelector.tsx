"use client";

import { Button, Box, Text } from "@chakra-ui/react";
import { GlobeIcon } from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";
import useAuthStore from "@/app/store/authStore";
import { SUPPORTED_LANGUAGES } from "@/app/config/languages";

/**
 * A small pill button that shows the current language code and opens a
 * popover-style selector on click. Matches the visual style of the
 * existing ContextButton components.
 */
export default function LanguageSelector({
  disabled,
  dropDirection = "down",
}: {
  disabled?: boolean;
  /** Which direction the dropdown opens relative to the button. */
  dropDirection?: "up" | "down";
}) {
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

  return (
    <Box ref={containerRef} position="relative">
      <Button
        size="xs"
        variant="outline"
        borderRadius="full"
        borderColor="gray.300"
        py="1"
        h="auto"
        disabled={disabled}
        onClick={() => setIsOpen((o) => !o)}
        title={currentLabel}
      >
        <GlobeIcon />
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
          minW="160px"
        >
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
        </Box>
      )}
    </Box>
  );
}
