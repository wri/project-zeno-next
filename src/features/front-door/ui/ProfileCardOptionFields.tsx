"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import {
  Combobox,
  Field,
  Portal,
  Select,
  createListCollection,
  useFilter,
} from "@chakra-ui/react";
import { OptionalMarker } from "@/app/onboarding/RequirementHint";

/**
 * The profile card's pickers: a Select for short lists (sector, role) and a
 * type-to-search Combobox for long ones (country, language). Both portal
 * their lists and keep them inside the chat thread.
 */

interface OptionFieldProps {
  id: string;
  label: string;
  optional?: boolean;
  placeholder: string;
  options: Record<string, string>;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

interface OptionItem {
  value: string;
  label: string;
}

function useSortedItems(options: Record<string, string>): OptionItem[] {
  return useMemo(
    () =>
      Object.entries(options)
        .map(([code, text]) => ({ value: code, label: text }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [options]
  );
}

/** The nearest scrolling ancestor: in the app, the chat thread. */
function scrollParent(el: HTMLElement | null): HTMLElement | undefined {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return undefined;
}

/**
 * Where an open list goes. The lists are portalled, so nothing in the card
 * contains them: they take the field's width, and flip above the field when
 * the chat thread has no room below, instead of hanging out of the card
 * over the chat input.
 */
function useListPositioning(field: RefObject<HTMLElement | null>) {
  return useMemo(
    () => ({
      sameWidth: true,
      boundary: () => scrollParent(field.current) ?? "clippingAncestors",
    }),
    [field]
  );
}

/** ~6 options; never taller than the room the list has. */
const LIST_MAX_H = "min(15rem, var(--available-height))";

/** Contains, ignoring case and accents: "portu" and "Portugues" find "Português". */
const FILTER_OPTIONS = { sensitivity: "base" } as const;

function FieldLabelText({
  label,
  optional,
}: {
  label: string;
  optional: boolean;
}) {
  return (
    <>
      {label}
      {optional && <OptionalMarker />}
    </>
  );
}

/** A short list (sector, role): pick one. */
export function OptionSelect({
  id,
  label,
  optional = false,
  placeholder,
  options,
  value,
  disabled = false,
  onChange,
}: OptionFieldProps) {
  const field = useRef<HTMLDivElement>(null);
  const positioning = useListPositioning(field);
  const items = useSortedItems(options);
  const collection = useMemo(() => createListCollection({ items }), [items]);

  return (
    <Field.Root id={id} ref={field} required={!optional}>
      <Select.Root
        collection={collection}
        size="sm"
        lazyMount
        unmountOnExit
        positioning={positioning}
        disabled={disabled}
        value={value ? [value] : []}
        onValueChange={(d: { value: string[] }) => onChange(d.value[0] ?? "")}
      >
        <Select.HiddenSelect />
        <Select.Label>
          <FieldLabelText label={label} optional={optional} />
        </Select.Label>
        <Select.Control _disabled={{ bg: "bg.subtle" }} bg="bg">
          <Select.Trigger>
            <Select.ValueText placeholder={placeholder} />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content maxH={LIST_MAX_H}>
              {collection.items.map((item) => (
                <Select.Item key={item.value} item={item}>
                  {item.label}
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
    </Field.Root>
  );
}

/**
 * A long list (≈250 countries, the languages): type to narrow it, then pick.
 * The draft only changes when an option is picked (or cleared with the ×);
 * text typed and abandoned goes back to the picked option's label when the
 * field loses focus, so the field never shows something other than what
 * Save would send.
 */
export function OptionCombobox({
  id,
  label,
  optional = false,
  placeholder,
  options,
  value,
  onChange,
}: Omit<OptionFieldProps, "disabled">) {
  const field = useRef<HTMLDivElement>(null);
  const positioning = useListPositioning(field);
  const items = useSortedItems(options);
  const { contains } = useFilter(FILTER_OPTIONS);
  const picked = value ? (options[value] ?? "") : "";
  const [text, setText] = useState(picked);
  const [query, setQuery] = useState("");
  const collection = useMemo(
    () =>
      createListCollection({
        items: query
          ? items.filter((item) => contains(item.label, query))
          : items,
      }),
    [items, query, contains]
  );

  return (
    <Field.Root id={id} ref={field} required={!optional}>
      <Combobox.Root
        collection={collection}
        size="sm"
        // Render the options only while open.
        lazyMount
        unmountOnExit
        openOnClick
        // Enter picks the first match.
        inputBehavior="autohighlight"
        positioning={positioning}
        value={value ? [value] : []}
        onValueChange={(d: { value: string[] }) => onChange(d.value[0] ?? "")}
        inputValue={text}
        onInputValueChange={(d) => {
          setText(d.inputValue);
          // Filter by what the person types only: after a pick or a clear,
          // the input holds a label, not a search.
          setQuery(d.reason === "input-change" ? d.inputValue : "");
        }}
        onOpenChange={(d) => {
          if (!d.open) setQuery("");
        }}
      >
        <Combobox.Label>
          <FieldLabelText label={label} optional={optional} />
        </Combobox.Label>
        <Combobox.Control>
          <Combobox.Input
            placeholder={placeholder}
            bg="bg"
            // Typing replaces the picked label rather than appending to it.
            onFocus={(e) => e.currentTarget.select()}
            onBlur={() => setText(picked)}
          />
          <Combobox.IndicatorGroup>
            {optional && (
              <Combobox.ClearTrigger aria-label={`Clear ${label}`} />
            )}
            <Combobox.Trigger />
          </Combobox.IndicatorGroup>
        </Combobox.Control>
        <Portal>
          <Combobox.Positioner>
            <Combobox.Content maxH={LIST_MAX_H}>
              <Combobox.Empty>No matches</Combobox.Empty>
              {collection.items.map((item) => (
                <Combobox.Item key={item.value} item={item}>
                  {item.label}
                  <Combobox.ItemIndicator />
                </Combobox.Item>
              ))}
            </Combobox.Content>
          </Combobox.Positioner>
        </Portal>
      </Combobox.Root>
    </Field.Root>
  );
}
