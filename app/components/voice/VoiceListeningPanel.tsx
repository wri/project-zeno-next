"use client";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { StopIcon } from "@phosphor-icons/react";
import VoiceLanguageMenu from "./VoiceLanguageMenu";

function formatTimer(seconds: number): string {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${mm}:${ss < 10 ? "0" : ""}${ss}`;
}

/**
 * The "listening" state of the voice prompt box: a red pulsing dot + timer,
 * the live transcript (finalised text plus greyed interim words), a language
 * override, and a "Stop & use" action that commits the transcript.
 */
export default function VoiceListeningPanel({
  seconds,
  committed,
  interim,
  lang,
  onLangChange,
  onStop,
  reducedMotion,
}: {
  seconds: number;
  committed: string;
  interim: string;
  lang: string;
  onLangChange: (code: string) => void;
  onStop: () => void;
  reducedMotion: boolean;
}) {
  const hasTranscript = committed.length > 0 || interim.length > 0;

  return (
    <Flex
      flexDir="column"
      animation={reducedMotion ? undefined : "vpFadeUp 0.22s ease both"}
    >
      {/* Visual: red dot + "Listening" + timer */}
      <Flex align="center" gap="2" minH="34px" mb="2.5">
        <Flex flex="1" align="center" gap="2">
          <Box
            w="9px"
            h="9px"
            borderRadius="full"
            bg="red.500"
            animation={reducedMotion ? undefined : "vpDotBlink 1s infinite"}
          />
          <Text fontSize="xs" color="fg.muted">
            Listening
          </Text>
        </Flex>
        <Text
          fontFamily="mono"
          fontSize="xs"
          color="gray.500"
          css={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatTimer(seconds)}
        </Text>
      </Flex>

      {/* Transcript */}
      <Box minH="42px" fontSize="sm" lineHeight="1.5" color="fg">
        {hasTranscript ? (
          <>
            <Text as="span">{committed}</Text>
            <Text as="span" color="gray.400">
              {interim ? `${committed ? " " : ""}${interim}` : ""}
            </Text>
          </>
        ) : (
          <Text as="span" color="gray.400">
            Listening…
          </Text>
        )}
      </Box>

      {/* Footer: language override + stop */}
      <Flex justify="space-between" align="center" mt="3">
        <VoiceLanguageMenu value={lang} onChange={onLangChange} />
        <Button
          type="button"
          onClick={onStop}
          aria-label="Stop and use transcript"
          borderRadius="full"
          bg="red.500"
          color="white"
          _hover={{ bg: "red.600" }}
          pl="2"
          pr="3"
          py="1.5"
          h="auto"
          gap="2"
          fontSize="xs"
          fontWeight="semibold"
        >
          <Box
            as="span"
            w="22px"
            h="22px"
            borderRadius="full"
            bg="whiteAlpha.300"
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
          >
            <StopIcon size={11} weight="fill" />
          </Box>
          Stop &amp; use
        </Button>
      </Flex>
    </Flex>
  );
}
