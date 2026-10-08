"use client";

import { useState } from "react";
import { Box, Button, Checkbox, Heading, Stack, Text } from "@chakra-ui/react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { personNames } from "../lib/person-names";
import { TermsConsentLabel } from "./TermsConsentLabel";

export interface WelcomeConsentProps {
  /** Display name from the Resource Watch account; only the first word is shown. */
  name?: string | null;
  /** The question that runs after Continue, if the person arrived with one. */
  pendingPrompt?: string | null;
  isSubmitting?: boolean;
  onContinue: () => void;
}

/**
 * The one screen between sign-in and the first answer. Consent is the only
 * input; everything else about the person is asked for later, in the chat.
 */
export function WelcomeConsent({
  name,
  pendingPrompt,
  isSubmitting = false,
  onContinue,
}: WelcomeConsentProps) {
  const [accepted, setAccepted] = useState(false);
  const { firstName } = personNames({}, name);

  return (
    <Box
      bg="bg"
      borderWidth="1px"
      borderColor="border"
      rounded="lg"
      p={{ base: 6, md: 8 }}
      maxW="lg"
      w="full"
      mx="auto"
    >
      <Stack gap={5}>
        <Stack gap={2}>
          <Heading as="h1" size="2xl" fontWeight="normal">
            {firstName ? (
              <>
                Welcome,{" "}
                <Text as="span" fontWeight="bold">
                  {firstName}
                </Text>
              </>
            ) : (
              "Welcome to Global Nature Watch"
            )}
          </Heading>
          {pendingPrompt ? (
            <Text color="fg.muted">Your question is ready to run:</Text>
          ) : (
            <Text color="fg.muted">One step before you start exploring.</Text>
          )}
        </Stack>

        {pendingPrompt && (
          // Styled like the chat's floating recap of an earlier prompt
          // (PinnedPrompt), so the question looks like it does once it runs.
          <Box
            bg="primary.100"
            color="fg"
            px={3}
            py={3}
            rounded="lg"
            boxShadow="lg"
            fontSize="sm"
            lineHeight="1.5"
          >
            {pendingPrompt}
          </Box>
        )}

        <Checkbox.Root
          alignItems="flex-start"
          checked={accepted}
          onCheckedChange={(e) => setAccepted(Boolean(e.checked))}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control mt="0.5" />
          <Checkbox.Label fontWeight="normal" fontSize="sm">
            <TermsConsentLabel />
          </Checkbox.Label>
        </Checkbox.Root>

        <Stack gap={3}>
          <Button
            colorPalette="primary"
            size="lg"
            disabled={!accepted || isSubmitting}
            loading={isSubmitting}
            onClick={onContinue}
          >
            {pendingPrompt ? "Continue to your answer" : "Continue to Horizon"}
            <ArrowRightIcon />
          </Button>
          <Text fontSize="xs" color="fg.muted" textAlign="center">
            You can tell us about yourself later. It takes about 30 seconds.
          </Text>
          <Text
            fontSize="xs"
            color="fg.muted"
            textAlign="center"
            bg="yellow.50"
            rounded="sm"
            px={2}
            py={1.5}
          >
            By creating an account, you agree to receive periodic account and
            system-related email updates related to Global Nature Watch.
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}
