"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ArrowRightIcon, CheckCircleIcon } from "@phosphor-icons/react";
import {
  GNW_AI_PRIVACY_POLICY,
  GNW_AI_TERMS_OF_USE,
  WRI_PRIVACY_POLICY,
  WRI_TERMS_OF_USE,
  type TermsLink,
} from "../model/terms";

export interface WelcomeConsentProps {
  /** Display name from the Resource Watch account; only the first word is shown. */
  name?: string | null;
  /** The question that runs after Continue, if the person arrived with one. */
  pendingPrompt?: string | null;
  /** Reassures GFW users that this is the account they already have. */
  signedInWithGfw?: boolean;
  isSubmitting?: boolean;
  onContinue: () => void;
}

function TermsAnchor({ link }: { link: TermsLink }) {
  return (
    <Link
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      textDecoration="underline"
    >
      {link.label}
    </Link>
  );
}

/**
 * The one screen between sign-in and the first answer. Consent is the only
 * input; everything else about the person is asked for later, in the chat.
 */
export function WelcomeConsent({
  name,
  pendingPrompt,
  signedInWithGfw = false,
  isSubmitting = false,
  onContinue,
}: WelcomeConsentProps) {
  const [accepted, setAccepted] = useState(false);
  const firstName = name?.trim().split(/\s+/)[0];

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
        {signedInWithGfw && (
          <Flex
            gap={2}
            align="center"
            fontSize="sm"
            color="primary.700"
            bg="primary.25"
            borderWidth="1px"
            borderColor="primary.100"
            rounded="md"
            px={3}
            py={2}
          >
            <CheckCircleIcon size={18} weight="fill" aria-hidden />
            Signed in with your Global Forest Watch account
          </Flex>
        )}

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
          <Box
            borderLeftWidth="3px"
            borderColor="primary.500"
            bg="bg.muted"
            roundedRight="md"
            px={4}
            py={3}
            fontStyle="italic"
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
            I accept the <TermsAnchor link={WRI_TERMS_OF_USE} /> and{" "}
            <TermsAnchor link={GNW_AI_TERMS_OF_USE} />, and I acknowledge the
            privacy practices described in the{" "}
            <TermsAnchor link={WRI_PRIVACY_POLICY} /> and the{" "}
            <TermsAnchor link={GNW_AI_PRIVACY_POLICY} />.
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
            {pendingPrompt ? "Continue to your answer" : "Continue"}
            <ArrowRightIcon />
          </Button>
          <Text fontSize="xs" color="fg.muted" textAlign="center">
            You can tell us about yourself later. It takes about 30 seconds.
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}
