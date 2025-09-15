import { Box } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { usePromptStore } from "../store/promptStore";
import useChatStore from "../store/chatStore";

export default function SamplePrompts() {
  const { prompts, fetchPrompts } = usePromptStore();
  const { sendMessage } = useChatStore();
  const [samplePrompts, setSamplePrompts] = useState<string[]>([]);
  useEffect(() => {
    fetchPrompts();
  }, []);
  useEffect(() => {
    if (prompts.length > 0 && samplePrompts.length === 0) {
      setSamplePrompts(getRandomFromArray(prompts, 3));
    }
  }, [prompts]);

  function getRandomFromArray<T>(arr: T[], count: number): T[] {
    if (count > arr.length) {
      throw new Error("Cannot select more items than available in the array.");
    }
    const shuffled = [...arr];
    const randomItems = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * shuffled.length);
      const selectedItem = shuffled.splice(randomIndex, 1)[0]; // Remove and get the item
      randomItems.push(selectedItem);
    }
    return randomItems;
  }
  return (
    <Box display="flex" gap={2} flexWrap="nowrap" mt={6} mb={4}>
      {samplePrompts.map((text, i) => (
        <Box
          key={i}
          p={2}
          flex={1}
          rounded="lg"
          border="1px solid"
          borderColor="border.emphasized"
          fontSize="xs"
          transition="all 0.24s ease"
          _hover={{
            cursor: "pointer",
            bg: "bg.subtle",
            borderColor: "primary.solid",
          }}
          onClick={() => sendMessage(text)}
        >
          {text}
        </Box>
      ))}
    </Box>
  );
}
