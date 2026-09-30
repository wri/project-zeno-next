"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  Portal,
  Select,
  Stack,
  Text,
  createListCollection,
} from "@chakra-ui/react";
import {
  EMPTY_PROFILE_DRAFT,
  draftFromSuggestion,
  isProfileDraftComplete,
  profileCardMode,
  toProfilePatch,
  withSector,
  type ProfileCardMode,
  type ProfileCardOptions,
  type ProfileCardPatch,
  type ProfileDraft,
  type ProfileSuggestion,
} from "../model/profile-card";

export interface ProfilePromptCardProps {
  options: ProfileCardOptions;
  /** A profile found elsewhere (MyGFW), already mapped to GNW codes. */
  suggestion?: ProfileSuggestion;
  /** Pre-selects country when nothing better is known, e.g. from the browser locale. */
  defaultCountry?: string;
  isSaving?: boolean;
  onSave: (patch: ProfileCardPatch) => void;
  onDismiss: () => void;
}

interface OptionSelectProps {
  id: string;
  label: string;
  optional?: boolean;
  placeholder: string;
  options: Record<string, string>;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function OptionSelect({
  id,
  label,
  optional = false,
  placeholder,
  options,
  value,
  disabled = false,
  onChange,
}: OptionSelectProps) {
  const collection = useMemo(
    () =>
      createListCollection({
        items: Object.entries(options)
          .map(([code, text]) => ({ value: code, label: text }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      }),
    [options]
  );

  return (
    <Field.Root id={id} required={!optional}>
      <Select.Root
        collection={collection}
        size="sm"
        disabled={disabled}
        value={value ? [value] : []}
        onValueChange={(d: { value: string[] }) => onChange(d.value[0] ?? "")}
      >
        <Select.HiddenSelect />
        <Select.Label>
          {label}
          {optional && (
            <Text
              as="span"
              color="fg.muted"
              fontSize="xs"
              fontStyle="italic"
              ml={1}
            >
              (Optional)
            </Text>
          )}
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
            <Select.Content>
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

function initialDraft(
  suggestion: ProfileSuggestion | undefined,
  options: ProfileCardOptions,
  defaultCountry: string | undefined
): ProfileDraft {
  const draft = suggestion
    ? draftFromSuggestion(suggestion, options)
    : EMPTY_PROFILE_DRAFT;
  if (
    draft.country === "" &&
    defaultCountry &&
    defaultCountry in options.countries
  ) {
    return { ...draft, country: defaultCountry };
  }
  return draft;
}

function headingFor(
  mode: ProfileCardMode,
  suggestion: ProfileSuggestion | undefined,
  edited: boolean
): { title: string; body: string } {
  if (mode === "confirm") {
    return {
      title: "We found your Global Forest Watch profile",
      body: "Use these details in Global Nature Watch? Nothing is saved until you confirm.",
    };
  }
  if (edited) {
    return {
      title: "Check your details",
      body: "We filled these in from your Global Forest Watch profile.",
    };
  }
  if (suggestion) {
    return {
      title: "We found part of your Global Forest Watch profile",
      body: "Fill in the rest to finish. It takes about 30 seconds.",
    };
  }
  return {
    title: "Help us tailor Global Nature Watch",
    body: "About 30 seconds. We use this to improve answers for people in your field.",
  };
}

/**
 * Asks for the profile after an answer instead of before it. Shows a one-click
 * confirmation when a GFW profile covers the required fields, otherwise two
 * required fields (sector, country) and an optional role.
 */
export function ProfilePromptCard({
  options,
  suggestion,
  defaultCountry,
  isSaving = false,
  onSave,
  onDismiss,
}: ProfilePromptCardProps) {
  const [mode, setMode] = useState<ProfileCardMode>(() =>
    profileCardMode(suggestion, options)
  );
  const [edited, setEdited] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    initialDraft(suggestion, options, defaultCountry)
  );
  const { title, body } = headingFor(mode, suggestion, edited);
  const canSave = isProfileDraftComplete(draft) && !isSaving;
  const save = () => onSave(toProfilePatch(draft, options, suggestion));

  const confirmRows: Array<[string, string | undefined]> = [
    ["Organisation", suggestion?.organisation],
    ["Sector", options.sectors[draft.sector]],
    ["Role", options.sector_roles[draft.sector]?.[draft.role]],
    ["Country", options.countries[draft.country]],
    [
      "Language",
      suggestion?.language ? options.languages[suggestion.language] : undefined,
    ],
  ];

  return (
    <Box
      as="section"
      aria-label={title}
      bg="primary.25"
      borderWidth="1px"
      borderColor="primary.200"
      rounded="lg"
      p={4}
    >
      <Stack gap={4}>
        <Stack gap={1}>
          <Text fontWeight="semibold">{title}</Text>
          <Text fontSize="sm" color="fg.muted">
            {body}
          </Text>
        </Stack>

        {mode === "confirm" ? (
          <Grid
            as="dl"
            templateColumns="max-content 1fr"
            columnGap={6}
            rowGap={1.5}
            fontSize="sm"
          >
            {confirmRows
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <Box key={label} display="contents">
                  <Text as="dt" color="fg.muted">
                    {label}
                  </Text>
                  <Text as="dd" fontWeight="medium">
                    {value}
                  </Text>
                </Box>
              ))}
          </Grid>
        ) : (
          // Sized by the card's own width, not the viewport: in the chat
          // panel (~300px) the fields stack, so each select and its option
          // list is wide enough to read; wider hosts fit them side by side.
          <Grid templateColumns="repeat(auto-fit, minmax(14rem, 1fr))" gap={3}>
            <OptionSelect
              id="profile-card-sector"
              label="Sector"
              placeholder="Select sector"
              options={options.sectors}
              value={draft.sector}
              onChange={(sector) =>
                setDraft((d) => withSector(d, sector, options))
              }
            />
            <OptionSelect
              id="profile-card-country"
              label="Country"
              placeholder="Select country"
              options={options.countries}
              value={draft.country}
              onChange={(country) => setDraft((d) => ({ ...d, country }))}
            />
            <OptionSelect
              id="profile-card-role"
              label="Role"
              optional
              placeholder="Select role"
              options={options.sector_roles[draft.sector] ?? {}}
              value={draft.role}
              disabled={draft.sector === ""}
              onChange={(role) => setDraft((d) => ({ ...d, role }))}
            />
          </Grid>
        )}

        <Flex gap={2} wrap="wrap">
          <Button
            colorPalette="primary"
            size="sm"
            disabled={!canSave}
            loading={isSaving}
            onClick={save}
          >
            {mode === "confirm" ? "Looks right" : "Save"}
          </Button>
          {mode === "confirm" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMode("fields");
                setEdited(true);
              }}
            >
              Edit
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Not now
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
}
