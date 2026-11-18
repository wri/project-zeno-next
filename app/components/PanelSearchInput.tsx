import { Input, InputGroup, useBreakpointValue } from "@chakra-ui/react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

export interface PanelSearchInputProps {
  /** Accessible name ("Search areas"). */
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  /** Escape on an empty box: the caller closes the panel. */
  onEscapeEmpty: () => void;
  /**
   * Focus on open, desktop only — on mobile it would pop the keyboard over
   * the bottom sheet.
   */
  autoFocusOnDesktop?: boolean;
}

/**
 * Search box at the top of an exploration panel. Escape clears the query
 * first and only asks to close the panel once it's already empty.
 */
export function PanelSearchInput({
  label,
  placeholder,
  value,
  onChange,
  onEscapeEmpty,
  autoFocusOnDesktop = false,
}: PanelSearchInputProps) {
  const isDesktop = useBreakpointValue({ base: false, md: true }) ?? false;

  return (
    <InputGroup
      flexShrink={0}
      startElement={<MagnifyingGlassIcon size={14} color="#656E7B" />}
    >
      <Input
        size="sm"
        type="text"
        aria-label={label}
        placeholder={placeholder}
        autoFocus={autoFocusOnDesktop && isDesktop}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          if (value) onChange("");
          else onEscapeEmpty();
        }}
        fontSize="12px"
        bg="#FFFFFF"
        borderColor="rgba(19, 22, 25, 0.3)"
        borderRadius="4px"
      />
    </InputGroup>
  );
}
