"use client";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import {
  ArrowClockwiseIcon,
  MicrophoneIcon,
  MicrophoneSlashIcon,
  PlugsIcon,
  WaveformIcon,
} from "@phosphor-icons/react";
import type { VoiceErrorType } from "@/app/hooks/useSpeechInput";

interface ErrorSpec {
  title: string;
  body: string;
  Icon: typeof MicrophoneSlashIcon;
  RetryIcon: typeof ArrowClockwiseIcon;
  retryLabel: string;
  tintBg: string;
  tintFg: string;
}

const ERROR_SPECS: Record<VoiceErrorType, ErrorSpec> = {
  denied: {
    title: "Microphone access blocked",
    body: "Zeno can't hear you. Allow microphone access in your browser's site settings to use voice input.",
    Icon: MicrophoneSlashIcon,
    RetryIcon: ArrowClockwiseIcon,
    retryLabel: "Try again",
    tintBg: "#FDECEA",
    tintFg: "red.500",
  },
  "no-speech": {
    title: "No speech detected",
    body: "I didn't catch anything. Check that your microphone is working and try again.",
    Icon: WaveformIcon,
    RetryIcon: MicrophoneIcon,
    retryLabel: "Try again",
    tintBg: "#FFF4E5",
    tintFg: "#C2410C",
  },
  "no-mic": {
    title: "No microphone found",
    body: "Connect a microphone to use voice input, or type your question instead.",
    Icon: PlugsIcon,
    RetryIcon: ArrowClockwiseIcon,
    retryLabel: "Try again",
    tintBg: "#FDECEA",
    tintFg: "red.500",
  },
  other: {
    title: "Voice input unavailable",
    body: "Something went wrong with voice input. Try again, or type your question instead.",
    Icon: MicrophoneSlashIcon,
    RetryIcon: ArrowClockwiseIcon,
    retryLabel: "Try again",
    tintBg: "#FDECEA",
    tintFg: "red.500",
  },
};

/**
 * Error state of the voice prompt box, wired to real SpeechRecognition error
 * types. Offers a retry and a "Type instead" escape back to the text box.
 */
export default function VoiceErrorPanel({
  errorType,
  onRetry,
  onDismiss,
  reducedMotion,
}: {
  errorType: VoiceErrorType;
  onRetry: () => void;
  onDismiss: () => void;
  reducedMotion: boolean;
}) {
  const spec = ERROR_SPECS[errorType];
  const { Icon, RetryIcon } = spec;

  return (
    <Flex
      gap="3"
      animation={reducedMotion ? undefined : "vpFadeUp 0.22s ease both"}
    >
      <Box
        as="span"
        flex="none"
        w="34px"
        h="34px"
        borderRadius="full"
        bg={spec.tintBg}
        color={spec.tintFg}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
      >
        <Icon size={18} />
      </Box>
      <Box flex="1">
        <Text fontSize="sm" fontWeight="semibold" color="fg">
          {spec.title}
        </Text>
        <Text fontSize="xs" lineHeight="1.5" color="fg.muted" mt="1">
          {spec.body}
        </Text>
        <Flex gap="2" mt="3">
          <Button
            type="button"
            onClick={onRetry}
            size="xs"
            colorPalette="primary"
            gap="1.5"
          >
            <RetryIcon size={14} />
            {spec.retryLabel}
          </Button>
          <Button
            type="button"
            onClick={onDismiss}
            size="xs"
            variant="outline"
            borderColor="#E0E2E5"
            color="fg.muted"
          >
            Type instead
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
}
