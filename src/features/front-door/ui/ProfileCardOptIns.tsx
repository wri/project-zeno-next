"use client";

import { Checkbox, Field, Grid, Input, Stack, Text } from "@chakra-ui/react";
import { TopicPills, toggleTopic } from "@/app/components/TopicPills";
import type { ProfileCardOptions, ProfileDraft } from "../model/profile-card";

/** Changes the draft from its latest value, like a setState updater. */
export type DraftUpdate = (
  update: (draft: ProfileDraft) => ProfileDraft
) => void;

interface OptInsProps {
  options: ProfileCardOptions;
  draft: ProfileDraft;
  onChange: DraftUpdate;
}

function OptInCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: string;
}) {
  return (
    <Checkbox.Root
      size="sm"
      alignItems="flex-start"
      checked={checked}
      onCheckedChange={(e) => onChange(Boolean(e.checked))}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control mt="0.5" bg={checked ? undefined : "bg"} />
      <Checkbox.Label fontWeight="normal">{children}</Checkbox.Label>
    </Checkbox.Root>
  );
}

function NameField({
  id,
  label,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field.Root id={id} required>
      <Field.Label>{label}</Field.Label>
      <Input
        size="sm"
        bg="bg"
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field.Root>
  );
}

function TopicPicker({ options, draft, onChange }: OptInsProps) {
  if (Object.keys(options.topics ?? {}).length === 0) return null;
  return (
    <Stack gap={1.5} role="group" aria-labelledby="profile-card-topics-label">
      <Text id="profile-card-topics-label" fontSize="sm" fontWeight="medium">
        Topics you are interested in
      </Text>
      <TopicPills
        gap={1.5}
        topics={options.topics}
        selected={draft.topics}
        onToggle={(code) =>
          onChange((d) => ({ ...d, topics: toggleTopic(d.topics, code) }))
        }
      />
    </Stack>
  );
}

/**
 * The card's two opt-ins. Ticking the email list reveals what it needs:
 * names (prefilled from GFW or the account) and topics. Never pre-ticked.
 */
export function ProfileCardOptIns({ options, draft, onChange }: OptInsProps) {
  return (
    <Stack gap={3}>
      <OptInCheckbox
        checked={draft.helpTestFeatures}
        onChange={(helpTestFeatures) =>
          onChange((d) => ({ ...d, helpTestFeatures }))
        }
      >
        I would like to help test new features.
      </OptInCheckbox>
      <OptInCheckbox
        checked={draft.receiveNewsEmails}
        onChange={(receiveNewsEmails) =>
          onChange((d) => ({ ...d, receiveNewsEmails }))
        }
      >
        Send me emails with news, resources and opportunities from Global Nature
        Watch.
      </OptInCheckbox>
      {draft.receiveNewsEmails && (
        <Stack gap={3}>
          <Grid templateColumns="repeat(auto-fit, minmax(9rem, 1fr))" gap={3}>
            <NameField
              id="profile-card-first"
              label="First name"
              autoComplete="given-name"
              value={draft.firstName}
              onChange={(firstName) => onChange((d) => ({ ...d, firstName }))}
            />
            <NameField
              id="profile-card-last"
              label="Last name"
              autoComplete="family-name"
              value={draft.lastName}
              onChange={(lastName) => onChange((d) => ({ ...d, lastName }))}
            />
          </Grid>
          <TopicPicker options={options} draft={draft} onChange={onChange} />
        </Stack>
      )}
    </Stack>
  );
}
