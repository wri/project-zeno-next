"use client";
import {
  Popover,
  Image,
  VStack,
  IconButton,
  Flex,
  Heading,
} from "@chakra-ui/react";
import { CheckIcon, MapTrifoldIcon } from "@phosphor-icons/react";
import { useColorMode } from "@/app/components/ui/color-mode";
import { useEffect, useState, useRef } from "react";

export interface BasemapOption {
  id: string;
  name: string;
  tileUrl: string;
  thumbnailUrl: string;
}

const basemapOptions: BasemapOption[] = [
  {
    id: "light",
    name: "Light",
    tileUrl: "devseed/cmazl5ws500bz01scaa27dqi4",
    thumbnailUrl:
      "https://api.mapbox.com/styles/v1/devseed/cmazl5ws500bz01scaa27dqi4/static/0,0,0,0,0/200x200@2x?access_token=" +
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
  },
  {
    id: "satellite",
    name: "Satellite",
    tileUrl: "mapbox/satellite-v9",
    thumbnailUrl:
      "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/0,0,0,0,0/200x200@2x?access_token=" +
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
  },
  {
    id: "dark",
    name: "Dark",
    tileUrl: "devseed/cm7nk8rlu01bm01qvb6pues5y",
    thumbnailUrl:
      "https://api.mapbox.com/styles/v1/devseed/cm7nk8rlu01bm01qvb6pues5y/static/0,0,0,0,0/200x200@2x?access_token=" +
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
  },
];

interface BasemapSelectorProps {
  display: Record<string, string> | string;
  currentBasemap: string;
  onBasemapChange: (tileUrl: string) => void;
}

export function BasemapSelector({
  display,
  currentBasemap,
  onBasemapChange,
}: BasemapSelectorProps) {
  const { colorMode, mounted } = useColorMode();
  const [selectedBasemap, setSelectedBasemap] = useState(false);
  const lastColorModeRef = useRef<string | undefined>(undefined);

  const currentOption =
    basemapOptions.find((option) => option.tileUrl === currentBasemap) ||
    basemapOptions[0];

  // Reset user override when color mode changes
  useEffect(() => {
    if (!mounted || !colorMode) return;

    // If color mode has changed, reset override and allow automatic switching
    if (lastColorModeRef.current !== undefined && lastColorModeRef.current !== colorMode) {
      setSelectedBasemap(false);
    }
    lastColorModeRef.current = colorMode;
  }, [colorMode, mounted]);

  // Automatically switch basemap when resolved color mode changes (unless user has overridden)
  useEffect(() => {
    if (!mounted || !colorMode || selectedBasemap) return;

    const targetBasemap = colorMode === "dark" ? "dark" : "light";
    const targetOption = basemapOptions.find((option) => option.id === targetBasemap);

    if (targetOption && currentBasemap !== targetOption.tileUrl) {
      onBasemapChange(targetOption.tileUrl);
    }
  }, [colorMode, mounted, currentBasemap, onBasemapChange, selectedBasemap]);

  // Handle manual basemap selection
  const handleBasemapChange = (tileUrl: string) => {
    setSelectedBasemap(true);
    onBasemapChange(tileUrl);
  };

  return (
    <Popover.Root positioning={{ placement: "top-start", strategy: "fixed" }}>
      <Popover.Trigger asChild>
        <IconButton
          display={display}
          variant="subtle"
          size="lg"
          bg={currentOption ? `url(${currentOption.thumbnailUrl})` : "bg"}
          bgSize="cover"
          position="absolute"
          pointerEvents="all"
          bottom={{ base: "4.25rem", md: "calc(7rem - 2px)" }}
          left={{ base: 3.5, md: "calc(0.5rem - 2px)" }}
          zIndex={510}
          boxShadow="md"
          border="1px solid"
          borderColor={
            currentOption.id === "light" ? "border" : "border.inverted"
          }
          animation={{
            base: "0.16s ease-out 1 forwards slide-from-bottom-full, 0.24s ease-out 1 forwards fade-in",
            md: "none",
          }}
        >
          <MapTrifoldIcon
            fill={
              currentOption.id === "light"
                ? "var(--chakra-colors-fg-muted)"
                : "var(--chakra-colors-fg-inverted)"
            }
          />
        </IconButton>
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content maxW="12rem">
          <Popover.Body p={3}>
            <VStack gap={2} align="stretch">
              <Heading
                size="xs"
                fontWeight="medium"
                textTransform="uppercase"
                letterSpacing="wide"
                as="p"
                color="fg.muted"
              >
                Basemap Style
              </Heading>
              {basemapOptions.map((option) => (
                <Flex
                  key={option.id}
                  gap={2}
                  cursor="pointer"
                  alignItems="center"
                  onClick={() => handleBasemapChange(option.tileUrl)}
                  overflow="hidden"
                  _hover={{ color: "primary.solid" }}
                  transition="border-color 0.2s"
                >
                  <Image
                    src={option.thumbnailUrl}
                    alt={option.name}
                    width="40px"
                    height="40px"
                    objectFit="cover"
                    overflow="hidden"
                    borderRadius="md"
                    border="2px solid"
                    borderColor={
                      option.tileUrl === currentBasemap
                        ? "primary.solid"
                        : "border"
                    }
                  />
                  <Heading
                    size="sm"
                    mr="auto"
                    as="p"
                    my={0}
                    color={
                      option.tileUrl === currentBasemap ? "primary.solid" : "fg"
                    }
                  >
                    {option.name}
                  </Heading>
                  {option.tileUrl === currentBasemap && (
                    <CheckIcon
                      fill="var(--chakra-colors-primary-solid)"
                      weight="bold"
                    />
                  )}
                </Flex>
              ))}
            </VStack>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}
