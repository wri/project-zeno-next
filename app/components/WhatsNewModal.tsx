import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Image,
  Link,
  Portal,
  Text,
} from "@chakra-ui/react";
import { Tooltip } from "@/app/components/ui/tooltip";
import {
  ArrowSquareOutIcon,
  CaretDownIcon,
  CaretUpIcon,
  ShootingStarIcon,
  TreeIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { WHATS_NEW_OPEN_EVENT } from "@/app/hooks/useWhatsNew";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import { isAppRoute, mapTabHref } from "@/app/utils/threadNavigation";
import { usePathname, useRouter } from "@/src/shared/lib/router";
import { TREE_COVER_LOSS_DATASET_ID } from "@/app/constants/datasets";
import {
  WHATS_NEW_FEATURES as FEATURES,
  type BoundaryAction,
  type WhatsNewAction,
} from "./whatsNewFeatures";

// Older keys cleaned up on mount. The active key lives in useWhatsNew; bump both
// in lockstep to re-surface "What's new" for everyone (see WHATS_NEW_STORAGE_KEY).
const LEGACY_STORAGE_KEYS = [
  "whats-new-v1-dismissed",
  "whats-new-v2-dismissed",
  "whats-new-v3-dismissed",
  "whats-new-v4-dismissed",
  "whats-new-v5-dismissed",
];

const ANNOUNCEMENT = {
  title: "Becoming Global Nature Watch Horizon",
  body: "The AI-driven platform preview you are exploring today is becoming Global Nature Watch Horizon. This change is part of a broader evolution underway as Global Forest Watch becomes Global Nature Watch, expanding beyond forests while integrating new technologies. Global Nature Watch Horizon will play an important role in this next chapter.",
  linkText: "Read this blog to learn more.",
  linkUrl:
    "https://www.globalforestwatch.org/blog/data-and-tools/gfw-now-global-nature-watch/?utm_medium=notification&utm_source=homepage&utm_campaign=gnwannoucement",
};

// Tree cover loss, the map's default dataset, fades to this under a boundary
// layer shown from here so the boundaries read over it.
const TREE_COVER_LOSS_OPACITY = 0.3;

/** Shows the action's boundary layer over faded tree cover loss, framed on its area. */
function applyBoundary(action: BoundaryAction) {
  const map = useMapStore.getState();
  map.setSelectAreaLayer(action.layerId);
  // The dataset's own layer, as its legend opacity slider sets it.
  map.layers
    .filter(
      (l) => l.datasetId === TREE_COVER_LOSS_DATASET_ID && !l.parentLayerId
    )
    .forEach((l) => map.setLayerOpacity(l.id, TREE_COVER_LOSS_OPACITY));
  map.flyToBounds(action.bounds);
}

// Stops the boundary action waiting for a map to load, if any, so a newer
// click replaces it rather than both running.
let stopWaitingForMap = () => {};

/** Opens Boundaries and applies the action now on a loaded map, or once one loads. */
function showBoundary(action: BoundaryAction, onMap: boolean) {
  useSidebarStore.getState().openAreasPanel("boundaries");
  stopWaitingForMap();
  const { mapRef } = useMapStore.getState();
  if (onMap && mapRef) {
    applyBoundary(action);
    return;
  }
  // Wait for the next map to load: framing needs it, and a new chat's map
  // resets the store and adds its default dataset first. A map's ref isn't
  // cleared when it unmounts, so only a new ref means a map has loaded.
  stopWaitingForMap = useMapStore.subscribe((state) => {
    if (!state.mapRef || state.mapRef === mapRef) return;
    stopWaitingForMap();
    applyBoundary(action);
  });
}

const WhatsNewModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(true);
  const [expandedStep, setExpandedStep] = useState(1);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener(WHATS_NEW_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(WHATS_NEW_OPEN_EVENT, handleOpen);
  }, []);

  const dismiss = () => setIsOpen(false);

  const runAction = (action: WhatsNewAction) => {
    dismiss();
    if (action.kind === "prompt") {
      // The new-thread page sends ?prompt= as its first message, so the
      // example runs in a chat of its own.
      router.push(`/app?${new URLSearchParams({ prompt: action.prompt })}`);
      return;
    }
    const onMap = isAppRoute(pathname);
    showBoundary(action, onMap);
    if (!onMap) {
      router.push(mapTabHref(useChatStore.getState().currentThreadId));
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <Box
        position="fixed"
        right={0}
        top={0}
        h="100vh"
        w="480px"
        bg="white"
        display="flex"
        flexDirection="column"
        zIndex="modal"
        borderLeft="1px solid #e0e2e5"
        boxShadow="0px 0px 1px 0px rgba(24,24,27,0.3), 0px 24px 40px 0px rgba(24,24,27,0.16)"
      >
        {/* Header */}
        <Flex
          bg="#f4f5f6"
          px={6}
          h="40px"
          align="center"
          justify="space-between"
          flexShrink={0}
          borderBottom="1px solid #e0e2e5"
        >
          <HStack gap={2}>
            <ShootingStarIcon size={20} color="#172b7a" />
            <Text
              fontSize="18px"
              color="#172b7a"
              fontFamily="'IBM Plex Sans', sans-serif"
              fontWeight="normal"
              lineHeight="1"
            >
              {"What's "}
              <Box as="span" fontWeight="medium">
                new
              </Box>
            </Text>
          </HStack>
          <Box
            as="button"
            onClick={dismiss}
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="#131619"
            cursor="pointer"
            _hover={{ opacity: 0.7 }}
            border="none"
            bg="transparent"
            p={0}
            aria-label="Close what's new"
          >
            <XIcon size={20} />
          </Box>
        </Flex>

        {/* Scrollable content */}
        <Box flex={1} overflowY="auto">
          {/* Announcement — the rebrand, highlighted above the feature list */}
          <Box bg="#f7fbd9" borderBottom="1px solid #e0e2e5">
            <Flex
              as="button"
              onClick={() => setAnnouncementOpen((v) => !v)}
              aria-expanded={announcementOpen}
              aria-label={
                announcementOpen
                  ? `Collapse announcement: ${ANNOUNCEMENT.title}`
                  : `Expand announcement: ${ANNOUNCEMENT.title}`
              }
              align="center"
              justify="space-between"
              px={6}
              py={4}
              w="full"
              textAlign="left"
              bg="transparent"
              border="none"
              cursor="pointer"
            >
              <Flex
                direction="column"
                gap={2}
                align="flex-start"
                flex={1}
                minW={0}
              >
                <Box
                  bg="#f0f9b9"
                  border="0.5px solid #8e9954"
                  borderRadius="4px"
                  px="6px"
                  py="2px"
                >
                  <Text
                    fontFamily="'IBM Plex Mono', monospace"
                    fontSize="9px"
                    letterSpacing="0.06em"
                    color="#23271a"
                    lineHeight="normal"
                  >
                    ANNOUNCEMENT
                  </Text>
                </Box>
                <HStack gap={2}>
                  <TreeIcon size={16} weight="fill" color="#8e9954" />
                  <Text
                    fontSize="14px"
                    fontWeight="semibold"
                    color="#131619"
                    fontFamily="'IBM Plex Sans', sans-serif"
                    lineHeight="20px"
                  >
                    {ANNOUNCEMENT.title}
                  </Text>
                </HStack>
              </Flex>
              {announcementOpen ? (
                <CaretUpIcon size={16} color="#131619" />
              ) : (
                <CaretDownIcon size={16} color="#131619" />
              )}
            </Flex>
            {announcementOpen && (
              <Box px={6} pb={2}>
                <Text
                  fontSize="14px"
                  color="#3a4048"
                  fontFamily="'IBM Plex Sans', sans-serif"
                  lineHeight={1.5}
                  mb={2}
                >
                  {ANNOUNCEMENT.body}
                </Text>
                <Link
                  href={ANNOUNCEMENT.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="fg.link"
                  fontSize="14px"
                  textDecoration="underline"
                  display="inline-flex"
                  alignItems="center"
                  gap={1}
                  whiteSpace="nowrap"
                >
                  {ANNOUNCEMENT.linkText}
                  <Icon asChild boxSize="14px">
                    <ArrowSquareOutIcon />
                  </Icon>
                </Link>
              </Box>
            )}
          </Box>

          {/* Feature accordion */}
          {FEATURES.map((feature) => {
            const isExpanded = expandedStep === feature.step;
            const { image, action } = feature;

            return (
              <Box key={feature.step} borderBottom="1px solid #e0e2e5">
                {/* Row */}
                <Flex
                  as="button"
                  onClick={() => setExpandedStep(isExpanded ? 0 : feature.step)}
                  align="center"
                  justify="space-between"
                  px={6}
                  py={5}
                  w="full"
                  textAlign="left"
                  bg="transparent"
                  border="none"
                  cursor="pointer"
                  _hover={{ bg: "#f9fafb" }}
                >
                  <HStack gap={3}>
                    <Flex
                      w="24px"
                      h="24px"
                      borderRadius="full"
                      bg="#e3f37f"
                      align="center"
                      justify="center"
                      flexShrink={0}
                    >
                      <Text
                        fontSize="12px"
                        fontWeight="medium"
                        color="#393e29"
                        fontFamily="'IBM Plex Sans', sans-serif"
                        lineHeight={1}
                      >
                        {feature.step}
                      </Text>
                    </Flex>
                    <Text
                      fontSize="14px"
                      fontWeight="medium"
                      color="#131619"
                      fontFamily="'IBM Plex Sans', sans-serif"
                      lineHeight={1.5}
                    >
                      {feature.title}
                    </Text>
                  </HStack>
                  {isExpanded ? (
                    <CaretUpIcon size={16} color="#131619" />
                  ) : (
                    <CaretDownIcon size={16} color="#131619" />
                  )}
                </Flex>

                {/* Expanded content */}
                {isExpanded && (
                  <Box px={6} pb={5}>
                    {image && (
                      <Box
                        mb={4}
                        h="180px"
                        w="full"
                        borderRadius="4px"
                        overflow="hidden"
                        bg="#f4f5f6"
                        position="relative"
                      >
                        <Image
                          src={image}
                          alt={feature.title}
                          position="absolute"
                          inset="0"
                          w="full"
                          h="full"
                          objectFit="cover"
                        />
                      </Box>
                    )}
                    <Text
                      fontSize="14px"
                      color="#656e7b"
                      fontFamily="'IBM Plex Sans', sans-serif"
                      lineHeight={1.5}
                    >
                      {feature.description}
                    </Text>
                    {action && (
                      <Button
                        mt={4}
                        size="sm"
                        variant="outline"
                        colorPalette="primary"
                        fontFamily="'IBM Plex Sans', sans-serif"
                        onClick={() => runAction(action)}
                      >
                        {action.label}
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Footer */}
        <Box borderTop="1px solid #e0e2e5" p={5} flexShrink={0}>
          <Tooltip
            content="We ship updates regularly — thanks for being part of the preview!"
            showArrow
          >
            <Button
              w="full"
              h="44px"
              bg="#0049aa"
              color="white"
              borderRadius="8px"
              fontSize="16px"
              fontWeight="medium"
              fontFamily="'IBM Plex Sans', sans-serif"
              onClick={dismiss}
              _hover={{ bg: "#003a88" }}
            >
              {"Got it! Let's explore!"}
            </Button>
          </Tooltip>
        </Box>
      </Box>
    </Portal>
  );
};

export default WhatsNewModal;
