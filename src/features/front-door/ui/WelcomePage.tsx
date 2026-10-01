"use client";

import { Suspense, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Center,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "@/app/lib/router";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import { showApiError } from "@/app/hooks/useErrorHandler";
import { TERMS_VERSION } from "@/app/config/terms";
import { trackEvent } from "@/app/lib/track-event";
import useAuthStore from "@/app/store/authStore";
import { patchProfile } from "../api/profile";
import { profilePrefillQuery } from "../api/queries";
import { pendingPrompt } from "../lib/pending-prompt";
import { WelcomeConsent } from "./WelcomeConsent";
import { selectProfileUserKey } from "./profile-ask-gate";

function Loading() {
  return (
    <Box minH="100vh" bg="bg" py={24}>
      <Center>
        <Spinner size="xl" />
      </Center>
    </Box>
  );
}

function WelcomeContent() {
  const router = useRouter();
  const search = useSearchParams()?.toString() ?? "";
  const name = useAuthStore((s) => s.userName);
  const userKey = useAuthStore(selectProfileUserKey);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only decides the "Signed in with your GFW account" line; Continue never
  // waits for it.
  const { data: prefill } = useQuery({
    ...profilePrefillQuery(userKey),
    enabled: userKey !== "",
  });

  const accept = async () => {
    setIsSubmitting(true);
    try {
      const { status } = await patchProfile({ terms_version: TERMS_VERSION });
      if (!status?.termsAccepted) {
        throw new Error("The server didn't confirm the accepted terms");
      }
      trackEvent({
        event: "welcome_terms_accepted",
        terms_version: TERMS_VERSION,
        has_prompt: pendingPrompt(search) !== null,
        gfw_account: prefill?.found === true,
      });
      // useAuthGuard sees the accepted terms and continues to /app with this
      // page's query string, so the waiting question runs on arrival.
      useAuthStore.getState().setAuthStatus(status);
    } catch (err) {
      console.error(err);
      showApiError(err as Error, {
        title: "Couldn't save your consent",
        description: "Please try Continue again.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Box minH="100vh" bg="bg" py={24}>
      <Container maxW="3xl">
        <Flex justifyContent="space-between" mb={12}>
          <Flex gap="2" alignItems="center">
            <Heading m={0} as="h2" size="md" color="primary.fg">
              Global Nature Watch{" "}
              <Text as="span" fontWeight="normal">
                Horizon
              </Text>
            </Heading>
            <Badge
              colorPalette="primary"
              bg="primary.800"
              letterSpacing="wider"
              variant="solid"
              size="xs"
            >
              PREVIEW
            </Badge>
          </Flex>
          <Button
            colorPalette="primary"
            variant="ghost"
            onClick={() => router.push("/")}
          >
            <ArrowLeftIcon />
            Go back
          </Button>
        </Flex>
        <WelcomeConsent
          name={name}
          pendingPrompt={pendingPrompt(search)}
          signedInWithGfw={prefill?.found === true}
          isSubmitting={isSubmitting}
          onContinue={accept}
        />
      </Container>
    </Box>
  );
}

/**
 * /welcome (front door): the one screen between the Resource Watch sign-in
 * and the first answer. Accepting stores `terms_version`; the profile is
 * asked for later, in the chat.
 */
export function WelcomePage() {
  const isReady = useAuthGuard();
  if (!isReady) return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
      <WelcomeContent />
    </Suspense>
  );
}
