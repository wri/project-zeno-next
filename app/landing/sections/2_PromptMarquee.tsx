import { useRef, useEffect, useState } from "react";
import { Box, Flex } from "@chakra-ui/react";

const MARQUEE_SPEED = 40;

type PromptMarqueeProps = {
  prompts: string[];
  promptIndex: number;
  setPromptIndex: React.Dispatch<React.SetStateAction<number>>;
};

function renderPromptBoxes(
  prompts: string[],
  setPromptIndex: React.Dispatch<React.SetStateAction<number>>
) {
  return Array(2)
    .fill(prompts)
    .flat()
    .map((prompt, i) => (
      <Box
        key={i}
        data-marquee-item
        bg="secondary.200"
        p="3"
        rounded="md"
        maxW="18rem"
        flexShrink="0"
        cursor="pointer"
        transition="opacity"
        shadow="xs"
        _hover={{
          "&&": { opacity: 1 },
        }}
        onClick={() => {
          setPromptIndex(() => i);
        }}
      >
        {prompt}
      </Box>
    ));
}

function renderMarqueeRow({
  prompts,
  animationName,
  animationDuration,
  sliderWidth,
  direction,
  sliderRef,
  setPromptIndex,
}: {
  prompts: string[];
  animationName: string;
  animationDuration: string;
  sliderWidth: number;
  direction: "left" | "right";
  sliderRef?: React.Ref<HTMLDivElement>;
  setPromptIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  const style =
    direction === "left"
      ? ({
          "--start-x": "0px",
          "--end-x": `-${sliderWidth}px`,
        } as React.CSSProperties)
      : ({
          "--start-x": `-${sliderWidth}px`,
          "--end-x": "0px",
        } as React.CSSProperties);

  return (
    <Flex
      gap="4"
      animationName={animationName}
      animationDuration={animationDuration}
      animationTimingFunction="linear"
      animationIterationCount="infinite"
      style={style}
      _hover={{
        animationPlayState: "paused",
        "& > *": {
          opacity: 0.6,
        },
      }}
      ref={sliderRef}
    >
      {renderPromptBoxes(prompts, setPromptIndex)}
    </Flex>
  );
}

function PromptMarquee({ prompts, setPromptIndex }: PromptMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [animationDuration, setAnimationDuration] = useState("30s");

  useEffect(() => {
    if (sliderRef.current && containerRef.current) {
      const slider = sliderRef.current;
      const promptBoxes = slider.querySelectorAll("[data-marquee-item]");
      let width = 0;
      for (let i = 0; i < promptBoxes.length / 2; i++) {
        width += (promptBoxes[i] as HTMLElement).offsetWidth + 16; // 16px = gap="4"
      }
      setSliderWidth(width); // Slider width is the cumulative size of the number of prompt boxes plus their padding
      setAnimationDuration(`${width / MARQUEE_SPEED}s`); // Animation duration is adjusted by screen size and number of prompts for infinite scroll effect
    }
  }, [prompts.length]);

  return (
    <Box
      py="8"
      borderBlockEnd="1px solid"
      borderColor="neutral.200"
      gap="4"
      overflow="hidden"
      display="flex"
      flexDirection="column"
      ref={containerRef}
    >
      {renderMarqueeRow({
        prompts,
        animationName: "dynamicSlideLeft",
        animationDuration,
        sliderWidth,
        setPromptIndex,
        direction: "left",
        sliderRef,
      })}
      {renderMarqueeRow({
        prompts,
        animationName: "dynamicSlideRight",
        animationDuration,
        setPromptIndex,
        sliderWidth,
        direction: "right",
      })}
    </Box>
  );
}

export default PromptMarquee;
