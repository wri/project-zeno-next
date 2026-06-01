import { useCallback, useMemo } from "react";
import { Flex, Menu, Button, Portal, Text } from "@chakra-ui/react";
import {
  CaretDownIcon,
  ChartLineIcon,
  ListNumbersIcon,
  ChartBarIcon,
  ChartPieSliceIcon,
  PresentationChartIcon,
  StackIcon,
  ChartScatterIcon,
  ChartPolarIcon,
} from "@phosphor-icons/react";

import { Tooltip } from "./components/ui/tooltip";
import useChatStore from "./store/chatStore";

export const WidgetIcons = {
  line: <ChartLineIcon />,
  table: <ListNumbersIcon />,
  bar: <ChartBarIcon />,
  "stacked-bar": <ChartBarIcon />,
  "grouped-bar": <ChartBarIcon />,
  pie: <ChartPieSliceIcon />,
  insight: <PresentationChartIcon />,
  "dataset-card": <StackIcon />,
  scatter: <ChartScatterIcon />,
  area: <ChartPolarIcon />,
};

function ChatPanelHeader() {
  const { messages } = useChatStore();

  // Build list of widget anchors from chat messages
  const widgetAnchors = useMemo(() => {
    return messages.flatMap((m) =>
      m.type === "widget" && m.widgets
        ? m.widgets
            .filter((w) => w.type !== "dataset-card")
            .map((w, idx) => ({
              id: `widget-${m.id}-${idx}`,
              title: w.title || `Insight ${idx + 1}`,
              type: w.type,
              timestamp: m.timestamp,
            }))
        : []
    );
  }, [messages]);

  const formatWidgetMeta = useCallback((isoTs?: string) => {
    if (!isoTs) return "";
    const d = new Date(isoTs);
    const time = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const day = d.toLocaleDateString([], { day: "2-digit", month: "short" });
    return `${time} on ${day}`;
  }, []);

  const scrollToWidget = useCallback((anchorId: string) => {
    const el = document.getElementById(anchorId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <Flex
      alignItems="center"
      justifyContent="flex-end"
      px="4"
      py="2"
      gap="1"
      h="14"
      bg="bg"
      color="fg"
      boxShadow="sm"
      hideBelow="md"
      zIndex={100}
    >
      {/* Insights dropdown */}
      {widgetAnchors.length === 0 ? (
        <Tooltip content="Ask a question to generate insights" showArrow>
          <span style={{ display: "inline-flex" }}>
            <Button
              variant="ghost"
              color="primary.fg"
              borderColor="primary.subtle"
              rounded="sm"
              h={6}
              bgGradient="LCLGradientLight"
              size="xs"
              disabled
            >
              Go to insight
              <CaretDownIcon />
            </Button>
          </span>
        </Tooltip>
      ) : (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button
              variant="ghost"
              color="primary.fg"
              borderColor="primary.subtle"
              rounded="sm"
              h={6}
              bgGradient="LCLGradientLight"
              fontWeight="semibold"
              _hover={{
                gradientFrom: "primary.400/30",
                gradientTo: "secondary.400/30",
              }}
              size="xs"
            >
              Go to insight
              <CaretDownIcon size="12" weight="bold" />
            </Button>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content maxH="320px" overflowY="auto">
                {widgetAnchors.map((w) => (
                  <Menu.Item
                    key={w.id}
                    value={w.id}
                    onSelect={() => {
                      scrollToWidget(w.id);
                    }}
                    role="group"
                    className="group"
                    cursor="pointer"
                  >
                    <Flex
                      align="center"
                      gap={2}
                      maxW="360px"
                      fontSize="md"
                      fontWeight="medium"
                      color="primary.fg"
                    >
                      {WidgetIcons[w.type]}
                      <Text
                        as="span"
                        flex="1"
                        minW={0}
                        whiteSpace="nowrap"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        fontSize="xs"
                      >
                        {w.title}
                      </Text>
                      <Text
                        as="span"
                        flexShrink={0}
                        ml="2"
                        display="none"
                        fontSize="xs"
                        fontWeight="normal"
                        color="fg.muted"
                        _groupHover={{
                          display: "inline",
                        }}
                      >
                        {formatWidgetMeta(w.timestamp)}
                      </Text>
                    </Flex>
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      )}
    </Flex>
  );
}

export default ChatPanelHeader;
