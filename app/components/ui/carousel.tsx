import { Carousel as ArkCarousel } from "@ark-ui/react/carousel";
import { chakra } from "@chakra-ui/react";

const CarouselRoot = chakra(ArkCarousel.Root, {
  base: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },

  variants: {},
});

const CarouselItem = chakra(ArkCarousel.Item, {
  base: {
    width: "100%",
    height: "100%",
  },
});

const CarouselIndicatorGroup = chakra(ArkCarousel.IndicatorGroup, {
  base: {
    display: "flex",
    gap: 2,
  },
});

const CarouselIndicator = chakra(ArkCarousel.Indicator, {
  base: {
    borderRadius: "full",
    bg: "bg.subtle",
    _selected: {
      bg: "teal.solid",
    },
  },
  variants: {
    size: {
      sm: {
        width: 3,
        height: 3,
      },
      md: {
        width: 4,
        height: 4,
      },
    },
  },
});

const CarouselItemGroup = chakra(ArkCarousel.ItemGroup, {
  base: {
    display: "flex",
    gap: 8,
  },
});
const CarouselControl = chakra(ArkCarousel.Control, {});

export const Carousel = {
  Root: CarouselRoot,
  IndicatorGroup: CarouselIndicatorGroup,
  Indicator: CarouselIndicator,
  ItemGroup: CarouselItemGroup,
  Item: CarouselItem,
  Control: CarouselControl,
  NextTrigger: ArkCarousel.NextTrigger,
  PrevTrigger: ArkCarousel.PrevTrigger,
};
