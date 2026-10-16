import { Input, InputGroup, useBreakpointValue } from "@chakra-ui/react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

export interface CatalogSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Escape on an empty box: the caller closes the panel. */
  onEscapeEmpty: () => void;
}

/**
 * Search box for the Data Catalog. Escape clears the query first and only
 * asks to close the panel once it's already empty. Focuses on open on desktop
 * only — on mobile it would pop the keyboard over the bottom sheet.
 */
export function CatalogSearchInput({
  value,
  onChange,
  onEscapeEmpty,
}: CatalogSearchInputProps) {
  const autoFocus = useBreakpointValue({ base: false, md: true }) ?? false;

  return (
    <InputGroup
      flexShrink={0}
      startElement={<MagnifyingGlassIcon size={14} color="#656E7B" />}
    >
      <Input
        size="sm"
        type="text"
        aria-label="Search datasets"
        placeholder="Search datasets, e.g. alerts or land cover"
        autoFocus={autoFocus}
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
