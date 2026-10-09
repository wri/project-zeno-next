"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  Input,
  Link as ChakraLink,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { Link } from "@/src/shared/lib/router";
import type { PersonNames } from "../lib/person-names";
import {
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
import { OptionCombobox, OptionSelect } from "./ProfileCardOptionFields";
import { ProfileCardOptIns, type DraftUpdate } from "./ProfileCardOptIns";
import { usePrivacyTip } from "./PrivacyTip";

export interface ProfilePromptCardProps {
  options: ProfileCardOptions;
  /** A profile found elsewhere (MyGFW), already mapped to GNW codes. */
  suggestion?: ProfileSuggestion;
  /** Prefill for the email list's name fields (GFW, else the account). */
  names?: PersonNames;
  /** Pre-selects country when nothing better is known, e.g. from the browser locale. */
  defaultCountry?: string;
  isSaving?: boolean;
  onSave: (patch: ProfileCardPatch) => void;
  onDismiss: () => void;
}

/** Where the full profile form lives (User Profile). */
const FULL_PROFILE_HREF = "/dashboard";

/** The role options before a sector is chosen; one object, so memos hold. */
const NO_ROLES: Record<string, string> = {};

function initialDraft(
  suggestion: ProfileSuggestion | undefined,
  options: ProfileCardOptions,
  names: PersonNames | undefined,
  defaultCountry: string | undefined
): ProfileDraft {
  const draft = draftFromSuggestion(suggestion, options, names);
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
  editing: boolean
): { title: string; body: string } {
  if (mode === "confirm") {
    return {
      title: "We found your Global Forest Watch profile",
      body: "Use these details in Global Nature Watch? Nothing is saved until you confirm.",
    };
  }
  if (editing) {
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

function ConfirmRows({
  draft,
  options,
}: {
  draft: ProfileDraft;
  options: ProfileCardOptions;
}) {
  const rows: Array<[string, string | undefined]> = [
    ["Country", options.countries[draft.country]],
    ["Language", options.languages[draft.language]],
    ["Sector", options.sectors[draft.sector]],
    ["Role", options.sector_roles[draft.sector]?.[draft.role]],
    ["Organisation", draft.organisation],
  ];
  return (
    <Grid
      as="dl"
      // minmax(0, …): a long unbroken value (an organisation name, say)
      // wraps instead of widening the grid past the card.
      templateColumns="max-content minmax(0, 1fr)"
      columnGap={6}
      rowGap={1.5}
      fontSize="sm"
    >
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <Box key={label} display="contents">
            <Text as="dt" color="fg.muted">
              {label}
            </Text>
            <Text as="dd" fontWeight="medium" overflowWrap="anywhere">
              {value}
            </Text>
          </Box>
        ))}
    </Grid>
  );
}

function ProfileFields({
  draft,
  options,
  onChange,
}: {
  draft: ProfileDraft;
  options: ProfileCardOptions;
  onChange: DraftUpdate;
}) {
  return (
    // Sized by the card's own width, not the viewport: in the chat panels
    // (grid ~330–370px) the fields stack, so each field and its option list
    // is wide enough to read; where the card has room (the offline preview)
    // they form a 2-column grid. Each column is at least half the width, so
    // there are never three.
    <Grid
      templateColumns="repeat(auto-fit, minmax(max(13rem, calc(50% - 0.375rem)), 1fr))"
      gap={3}
    >
      <OptionCombobox
        id="profile-card-country"
        label="Country"
        placeholder="Select country"
        options={options.countries}
        value={draft.country}
        onChange={(country) => onChange((d) => ({ ...d, country }))}
      />
      <OptionCombobox
        id="profile-card-language"
        label="Preferred language"
        optional
        placeholder="Select language"
        options={options.languages}
        value={draft.language}
        onChange={(language) => onChange((d) => ({ ...d, language }))}
      />
      <OptionSelect
        id="profile-card-sector"
        label="Sector"
        placeholder="Select sector"
        options={options.sectors}
        value={draft.sector}
        onChange={(sector) => onChange((d) => withSector(d, sector, options))}
      />
      <OptionSelect
        id="profile-card-role"
        label="Role"
        optional
        placeholder="Select role"
        options={options.sector_roles[draft.sector] ?? NO_ROLES}
        value={draft.role}
        disabled={draft.sector === ""}
        onChange={(role) => onChange((d) => ({ ...d, role }))}
      />
      <Field.Root id="profile-card-organisation" required gridColumn="1 / -1">
        <Field.Label>Organisation</Field.Label>
        <Input
          size="sm"
          bg="bg"
          placeholder="e.g. Kenya Forest Service"
          autoComplete="organization"
          value={draft.organisation}
          onChange={(e) => {
            const organisation = e.target.value;
            onChange((d) => ({ ...d, organisation }));
          }}
        />
        <Field.HelperText>
          Please write the full name. Avoid acronyms.
        </Field.HelperText>
      </Field.Root>
    </Grid>
  );
}

/**
 * Asks for the profile after an answer instead of before it. Shows a one-click
 * confirmation when a GFW profile covers the required fields, otherwise the
 * fields: country, preferred language (optional), sector, role (optional),
 * organisation. Both modes end with the testing and email-list opt-ins.
 */
export function ProfilePromptCard({
  options,
  suggestion,
  names,
  defaultCountry,
  isSaving = false,
  onSave,
  onDismiss,
}: ProfilePromptCardProps) {
  // "Edit details" on the one-click confirmation switches to the fields for
  // good. The suggestion only seeds the card, so its mode is settled once.
  const [editing, setEditing] = useState(false);
  const [suggestedMode] = useState(() => profileCardMode(suggestion, options));
  const mode: ProfileCardMode = editing ? "fields" : suggestedMode;
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    initialDraft(suggestion, options, names, defaultCountry)
  );
  const privacy = usePrivacyTip();
  const { title, body } = headingFor(mode, suggestion, editing);
  const canSave = isProfileDraftComplete(draft, options) && !isSaving;
  const save = () => onSave(toProfilePatch(draft, options));

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
          <Flex align="center" gap={1}>
            <Text fontWeight="semibold">{title}</Text>
            {privacy.button}
          </Flex>
          {privacy.tip}
          <Text fontSize="sm" color="fg.muted">
            {body}
          </Text>
        </Stack>

        {mode === "confirm" ? (
          <ConfirmRows draft={draft} options={options} />
        ) : (
          <ProfileFields draft={draft} options={options} onChange={setDraft} />
        )}

        <ProfileCardOptIns
          options={options}
          draft={draft}
          onChange={setDraft}
        />

        <Flex gap={2} wrap="wrap" align="center">
          <Button
            colorPalette="primary"
            size="sm"
            disabled={!canSave}
            loading={isSaving}
            onClick={save}
          >
            {mode === "confirm" ? "Looks right" : "Save"}
          </Button>
          {mode === "confirm" ? (
            <Button
              variant="outline"
              size="sm"
              bg="bg"
              onClick={() => setEditing(true)}
            >
              Edit details
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Not now
            </Button>
          )}
          {/* For people who want to give more than the card asks for. */}
          <ChakraLink
            asChild
            ml="auto"
            fontSize="sm"
            fontWeight="medium"
            color="primary.fg"
            minH={9}
          >
            <Link href={FULL_PROFILE_HREF}>
              Full profile
              <ArrowUpRightIcon aria-hidden />
            </Link>
          </ChakraLink>
        </Flex>
      </Stack>
    </Box>
  );
}
