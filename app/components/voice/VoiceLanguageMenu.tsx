"use client";
import { useState } from "react";
import { Button, Popover, Portal } from "@chakra-ui/react";
import { CaretDownIcon, TranslateIcon } from "@phosphor-icons/react";
import { labelForLang } from "@/app/utils/speechLang";
import ShortlistLanguagePicker from "./ShortlistLanguagePicker";

/**
 * Language override shown in the listening footer. The trigger opens a
 * searchable shortlist picker (Chakra Popover) anchored upward, since the
 * prompt box sits low on screen.
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
    <Popover.Root
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
      positioning={{ placement: "top-start", strategy: "fixed" }}
    >
      <Popover.Trigger asChild>
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
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content w="262px" p="0" borderRadius="md" overflow="hidden">
            <ShortlistLanguagePicker
              value={value}
              onChange={(code) => {
                onChange(code);
                setOpen(false);
              }}
            />
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
