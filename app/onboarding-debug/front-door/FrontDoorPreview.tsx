"use client";

import { useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Code,
  Container,
  Flex,
  Grid,
  Heading,
  Menu,
  Portal,
  Stack,
  Text,
} from "@chakra-ui/react";
import { GearSixIcon, SignOutIcon, UserIcon } from "@phosphor-icons/react";
import {
  CompleteProfileMenuItem,
  NUDGE_CONVERSATIONS,
  ProfileIncompleteDot,
  ProfileNudgeBanner,
  ProfilePromptCard,
  WelcomeConsent,
  personNames,
  type ProfileCardPatch,
} from "@/src/features/front-door";
import { MOCK_PROFILE_CONFIG } from "../mock-profile-config";
import { AskRulesSimulator } from "./AskRulesSimulator";
import { PERSONAS, QUESTION, type PersonaId } from "./personas";

/** Two to four pill buttons that pick one value. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <Flex gap={1.5} wrap="wrap">
      {options.map(([id, label]) => (
        <Button
          key={id}
          size="xs"
          rounded="full"
          variant={id === value ? "solid" : "outline"}
          colorPalette={id === value ? "primary" : undefined}
          aria-pressed={id === value}
          onClick={() => onChange(id)}
        >
          {label}
        </Button>
      ))}
    </Flex>
  );
}

/** One component: when it shows on the left, the live component on the right. */
function ComponentSection({
  title,
  rules,
  controls,
  children,
}: {
  title: string;
  rules: string[];
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box as="section" borderTopWidth="1px" borderColor="border" pt={6}>
      <Grid
        templateColumns={{ base: "1fr", lg: "minmax(0, 320px) minmax(0, 1fr)" }}
        gap={{ base: 4, lg: 10 }}
      >
        <Stack gap={3}>
          <Heading as="h2" size="lg">
            {title}
          </Heading>
          <Text
            fontSize="xs"
            fontWeight="semibold"
            textTransform="uppercase"
            letterSpacing="wider"
            color="fg.muted"
          >
            Triggers when
          </Text>
          <Box
            as="ul"
            pl={4}
            fontSize="sm"
            color="fg.muted"
            listStyleType="disc"
          >
            {rules.map((rule) => (
              <Box as="li" key={rule} mb={1}>
                {rule}
              </Box>
            ))}
          </Box>
          {controls}
        </Stack>
        <Box minW={0}>{children}</Box>
      </Grid>
    </Box>
  );
}

function TermsSection() {
  const [withQuestion, setWithQuestion] = useState<"yes" | "no">("yes");
  return (
    <ComponentSection
      title="Accept the terms"
      rules={[
        "After the Resource Watch sign-in, when the account hasn't accepted the current terms (replaces the /onboarding form).",
        "With ?prompt= in the URL, the question shows and Continue runs it.",
        "Never for someone who already has a GNW profile.",
      ]}
      controls={
        <Segmented
          value={withQuestion}
          options={[
            ["yes", "Arrived with a question"],
            ["no", "No question"],
          ]}
          onChange={setWithQuestion}
        />
      }
    >
      <WelcomeConsent
        key={withQuestion}
        name="Maria Silva"
        pendingPrompt={withQuestion === "yes" ? QUESTION : null}
        onContinue={() => undefined}
      />
    </ComponentSection>
  );
}

function ProfileCardSection() {
  const [personaId, setPersonaId] = useState<PersonaId>("new");
  const [saved, setSaved] = useState<ProfileCardPatch | null>(null);
  const [version, setVersion] = useState(0);
  const persona = PERSONAS[personaId];
  const reset = () => {
    setSaved(null);
    setVersion((v) => v + 1);
  };

  return (
    <ComponentSection
      title="Profile card"
      rules={[
        "After the person's first answer ever (live answers only; replaying a thread never counts).",
        "From “Add details” on the banner.",
        "One-click confirmation when GFW covers country, sector and organisation; the fields otherwise.",
        "Save ends every ask. “Not now” removes the card.",
      ]}
      controls={
        <Stack gap={2}>
          <Segmented
            value={personaId}
            options={Object.values(PERSONAS).map((p) => [p.id, p.label])}
            onChange={(id) => {
              setPersonaId(id);
              reset();
            }}
          />
          <Text fontSize="xs" color="fg.muted">
            {persona.summary}
          </Text>
        </Stack>
      }
    >
      <Stack gap={3} maxW="420px">
        {saved ? (
          <Stack gap={2}>
            <Text fontSize="sm" fontWeight="medium">
              Saved. The PATCH /api/auth/profile body:
            </Text>
            <Code display="block" whiteSpace="pre" p={3} fontSize="xs">
              {JSON.stringify(saved, null, 2)}
            </Code>
            <Button
              size="xs"
              variant="outline"
              alignSelf="flex-start"
              onClick={reset}
            >
              Show the card again
            </Button>
          </Stack>
        ) : (
          <ProfilePromptCard
            key={`${personaId}-${version}`}
            options={MOCK_PROFILE_CONFIG}
            suggestion={persona.suggestion}
            names={personNames({}, persona.name)}
            defaultCountry={persona.defaultCountry}
            onSave={setSaved}
            onDismiss={reset}
          />
        )}
      </Stack>
    </ComponentSection>
  );
}

function BannerSection() {
  return (
    <ComponentSection
      title="Soft nudge banner"
      rules={[
        "The card was shown and the profile still isn't saved.",
        `After the first answer of a new conversation, in the next ${NUDGE_CONVERSATIONS} new conversations only.`,
        "Closes when the conversation is left; × closes it.",
        "“Add details” opens the profile card. No banner for the email list.",
      ]}
    >
      <Stack gap={6} maxW="420px">
        <ProfileNudgeBanner
          onOpen={() => undefined}
          onDismiss={() => undefined}
        />
        <Stack gap={2}>
          <Text fontSize="sm" fontWeight="semibold">
            Try the rules
          </Text>
          <AskRulesSimulator />
        </Stack>
      </Stack>
    </ComponentSection>
  );
}

function AccountMenuSection() {
  return (
    <ComponentSection
      title="Account menu reminder"
      rules={[
        "Whenever the profile is incomplete, including after the banners stop.",
        "“Complete your profile” goes to User Profile (/dashboard).",
      ]}
    >
      <Menu.Root positioning={{ placement: "bottom-start" }}>
        <Menu.Trigger asChild>
          <Button variant="outline" size="sm" gap={2} color="fg.muted">
            <UserIcon size={16} />
            maria@example.org
            <ProfileIncompleteDot />
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              <CompleteProfileMenuItem onSelect={() => undefined} />
              <Menu.Item value="profile" disabled>
                <GearSixIcon />
                User Profile
              </Menu.Item>
              <Menu.Separator />
              <Menu.Item value="logout" disabled color="fg.error">
                <SignOutIcon />
                Logout
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </ComponentSection>
  );
}

/**
 * The front door's interactive pieces, each with the rules for when it
 * appears. Offline: mock options and people, nothing is saved.
 */
export default function FrontDoorPreview() {
  return (
    <Box minH="100vh" bg="bg.subtle" py={10}>
      <Container maxW="6xl">
        <Stack gap={8}>
          <Stack gap={2}>
            <Heading as="h1" size="2xl">
              Front door components
            </Heading>
            <Text color="fg.muted" maxW="70ch">
              Each piece of the lower-friction sign-up, live, with when it
              appears. Built from the front-door slice with mock options; no API
              calls, nothing is saved.
            </Text>
          </Stack>
          <TermsSection />
          <ProfileCardSection />
          <BannerSection />
          <AccountMenuSection />
        </Stack>
      </Container>
    </Box>
  );
}
