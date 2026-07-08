"use client";

import { Box, SimpleGrid, Text, Flex } from "@chakra-ui/react";
import {
  BinocularsIcon,
  ChartBarIcon,
  PlantIcon,
  type Icon,
} from "@phosphor-icons/react";

type ExampleCard = {
  icon: Icon;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
};

const cards: ExampleCard[] = [
  {
    icon: BinocularsIcon,
    iconBg: "primary.50",
    iconColor: "primary.500",
    title: "Park manager",
    description:
      "A park manager could receive an alert that mammal diversity has sharply declined in part of a protected area and investigate potential causes.",
  },
  {
    icon: PlantIcon,
    iconBg: "secondary.200",
    iconColor: "secondary.700",
    title: "Indigenous community",
    description:
      "An Indigenous community restoring previously degraded forests could demonstrate that bird diversity is recovering over time.",
  },
  {
    icon: ChartBarIcon,
    iconBg: "primary.50",
    iconColor: "primary.500",
    title: "National environmental agency",
    description:
      "A national environmental agency could track whether biodiversity indicators are improving across protected areas and use that information to guide policy and investment.",
  },
];

export default function ExampleCards() {
  return (
    <SimpleGrid minChildWidth="240px" gap={4} maxW="940px" mx="auto">
      {cards.map(
        ({ icon: CardIcon, iconBg, iconColor, title, description }) => (
          <Box
            key={title}
            bg="primary.25"
            borderWidth="1px"
            borderColor="neutral.300"
            rounded="14px"
            px="20px"
            py="22px"
          >
            <Flex alignItems="center" gap="10px" mb="12px">
              <Flex
                w="34px"
                h="34px"
                rounded="9px"
                bg={iconBg}
                color={iconColor}
                alignItems="center"
                justifyContent="center"
              >
                <CardIcon size={18} weight="regular" />
              </Flex>
              <Text fontSize="13px" fontWeight="600" color="primary.900">
                {title}
              </Text>
            </Flex>
            <Text fontSize="15px" lineHeight="1.6" color="neutral.600">
              {description}
            </Text>
          </Box>
        )
      )}
    </SimpleGrid>
  );
}
