import { Box } from "@chakra-ui/react";
import { useState } from "react";
import { SAMPLE_PROMPTS } from "../constants/sample-prompts";
import useChatStore from "../store/chatStore";
import { useRouter, usePathname } from "@/src/shared/lib/router";
import { useLocale } from "@/src/shared/lib/i18n";
import { firstMessageRedirectPath } from "../utils/threadNavigation";

const SAMPLE_COUNT = 3;

/** `count` distinct random indices below `length`. */
function randomIndices(length: number, count: number): number[] {
  const pool = Array.from({ length }, (_, i) => i);
  return Array.from(
    { length: Math.min(count, length) },
    () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
  );
}

/**
 * Three sample prompts in the UI language. The picks are drawn once, by
 * index, so switching language translates the same three prompts.
 */
export default function SamplePrompts() {
  const { sendMessage } = useChatStore();
  const locale = useLocale();
  const [picks] = useState(() =>
    randomIndices(SAMPLE_PROMPTS.en.length, SAMPLE_COUNT)
  );
  const router = useRouter();
  const pathname = usePathname();
  const prompts = picks.map((i) => SAMPLE_PROMPTS[locale][i]);

  const submitPrompt = async (prompt: string) => {
    const result = await sendMessage(prompt);
    if (result.isNew) {
      const redirect = firstMessageRedirectPath(
        pathname,
        result.id,
        window.location.search
      );
      if (redirect) router.replace(redirect);
    }
  };

  return (
    <Box display="flex" flexDir="column" gap={2} mt={4} mb={2}>
      {prompts.map((prompt) => (
        <Box
          key={prompt}
          p={2}
          rounded="md"
          border="1px solid"
          borderColor="border.emphasized"
          fontSize="xs"
          bg="bg"
          transition="all 0.24s ease"
          _hover={{
            cursor: "pointer",
            bg: "bg.subtle",
            borderColor: "primary.solid",
          }}
          onClick={() => submitPrompt(prompt)}
        >
          {prompt}
        </Box>
      ))}
    </Box>
  );
}
