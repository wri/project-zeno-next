import { Input, InputGroup } from "@chakra-ui/react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

export interface PanelSearchInputProps {
  /** Accessible name ("Search areas"). */
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  /** Escape on an empty box: the caller closes the panel. */
  onEscapeEmpty: () => void;
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
}: PanelSearchInputProps) {
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
