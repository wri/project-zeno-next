"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { MapPinIcon, StackSimpleIcon } from "@phosphor-icons/react";
import { DATASET_CARDS } from "../constants/datasets";
import { useCustomAreasList } from "../hooks/useCustomAreasList";
import { useSelectCustomArea } from "../hooks/useSelectCustomArea";
import type { CustomArea } from "../schemas/api/custom_areas/get";
import useContextStore from "../store/contextStore";

export type SlashState =
  | { phase: "command"; query: string }
  | { phase: "area"; query: string }
  | { phase: "dataset"; query: string };

export function parseSlashCommand(value: string): SlashState | null {
  if (!value.startsWith("/")) return null;
  const rest = value.slice(1);
  const spaceIdx = rest.indexOf(" ");
  if (spaceIdx === -1) {
    return { phase: "command", query: rest.toLowerCase() };
  }
  const cmd = rest.slice(0, spaceIdx).toLowerCase();
  const query = rest.slice(spaceIdx + 1);
  if (cmd === "area") return { phase: "area", query };
  if (cmd === "dataset") return { phase: "dataset", query };
  return null;
}

export interface SlashCommandMenuHandle {
  selectActive: () => void;
}

const COMMANDS = [
  { id: "area", label: "/area", sublabel: "Select a saved area", Icon: MapPinIcon },
  {
    id: "dataset",
    label: "/dataset",
    sublabel: "Select a dataset layer",
    Icon: StackSimpleIcon,
  },
];

function EmptyState({ text }: { text: string }) {
  return (
    <Box px={3} py={2}>
      <Text fontSize="sm" color="fg.muted">
        {text}
      </Text>
    </Box>
  );
}

function Item({
  label,
  sublabel,
  Icon,
  color,
  active,
  onClick,
}: {
  label: string;
  sublabel?: string;
  Icon?: React.ComponentType<{ size?: number }>;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Flex
      px={3}
      py={1.5}
      gap={2}
      alignItems="center"
      cursor="pointer"
      bg={active ? "gray.100" : undefined}
      _hover={{ bg: "gray.50" }}
      onClick={onClick}
      data-active={String(active)}
    >
      {color && (
        <Box
          flexShrink={0}
          w="10px"
          h="10px"
          borderRadius="full"
          bg={color}
        />
      )}
      {!color && Icon && (
        <Box color="gray.400" flexShrink={0}>
          <Icon size={14} />
        </Box>
      )}
      <Box minW={0}>
        <Text fontSize="sm" lineClamp={1}>
          {label}
        </Text>
        {sublabel && (
          <Text fontSize="xs" color="fg.muted" lineClamp={1}>
            {sublabel}
          </Text>
        )}
      </Box>
    </Flex>
  );
}

function CommandList({
  query,
  activeIndex,
  onSelect,
}: {
  query: string;
  activeIndex: number;
  onSelect: (cmd: string) => void;
}) {
  const items = query
    ? COMMANDS.filter((c) => c.id.startsWith(query))
    : COMMANDS;

  if (items.length === 0) return null;

  return (
    <>
      {items.map((cmd, i) => (
        <Item
          key={cmd.id}
          label={cmd.label}
          sublabel={cmd.sublabel}
          Icon={cmd.Icon}
          active={i === ((activeIndex % items.length) + items.length) % items.length}
          onClick={() => onSelect(cmd.id)}
        />
      ))}
    </>
  );
}

function AreaResults({
  query,
  activeIndex,
  onClose,
}: {
  query: string;
  activeIndex: number;
  onClose: () => void;
}) {
  const { customAreas, isLoading } = useCustomAreasList();
  const selectArea = useSelectCustomArea();

  const filtered = useMemo(() => {
    const areas: CustomArea[] = (customAreas as CustomArea[] | undefined) ?? [];
    if (!query) return areas;
    const q = query.toLowerCase();
    return areas.filter((a) => a.name.toLowerCase().includes(q));
  }, [customAreas, query]);

  if (isLoading) return <EmptyState text="Loading areas…" />;
  if (filtered.length === 0) return <EmptyState text="No custom areas found" />;

  return (
    <>
      {filtered.map((area, i) => (
        <Item
          key={area.id}
          label={area.name}
          active={i === ((activeIndex % filtered.length) + filtered.length) % filtered.length}
          onClick={() => {
            selectArea(area);
            onClose();
          }}
        />
      ))}
    </>
  );
}

function DatasetResults({
  query,
  activeIndex,
  onClose,
}: {
  query: string;
  activeIndex: number;
  onClose: () => void;
}) {
  const { addContext } = useContextStore();

  const filtered = useMemo(() => {
    if (!query) return DATASET_CARDS;
    const q = query.toLowerCase();
    return DATASET_CARDS.filter((d) =>
      d.dataset_name.toLowerCase().includes(q)
    );
  }, [query]);

  if (filtered.length === 0) return <EmptyState text="No datasets found" />;

  return (
    <>
      {filtered.map((card, i) => (
        <Item
          key={card.dataset_id}
          label={card.dataset_name}
          color={card.legend?.color ?? "#cccccc"}
          active={i === ((activeIndex % filtered.length) + filtered.length) % filtered.length}
          onClick={() => {
            addContext({
              contextType: "layer",
              content: card.dataset_name,
              datasetId: card.dataset_id,
              tileUrl: card.tile_url ?? "",
              layerName: card.dataset_name,
            });
            onClose();
          }}
        />
      ))}
    </>
  );
}

const SlashCommandMenu = forwardRef<
  SlashCommandMenuHandle,
  {
    slashState: SlashState;
    activeIndex: number;
    onClose: () => void;
    onCommandSelect: (cmd: string) => void;
  }
>(function SlashCommandMenu(
  { slashState, activeIndex, onClose, onCommandSelect },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current
      ?.querySelector<HTMLElement>("[data-active='true']")
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, slashState]);

  useImperativeHandle(
    ref,
    () => ({
      selectActive: () => {
        containerRef.current
          ?.querySelector<HTMLElement>("[data-active='true']")
          ?.click();
      },
    }),
    []
  );

  return (
    <Box
      ref={containerRef}
      position="absolute"
      bottom="calc(100% + 4px)"
      left={0}
      right={0}
      bg="bg"
      borderWidth="1px"
      borderColor="border"
      borderRadius="md"
      boxShadow="md"
      zIndex={100}
      maxH="16rem"
      overflowY="auto"
      py={1}
    >
      {slashState.phase === "command" && (
        <CommandList
          query={slashState.query}
          activeIndex={activeIndex}
          onSelect={onCommandSelect}
        />
      )}
      {slashState.phase === "area" && (
        <AreaResults
          query={slashState.query}
          activeIndex={activeIndex}
          onClose={onClose}
        />
      )}
      {slashState.phase === "dataset" && (
        <DatasetResults
          query={slashState.query}
          activeIndex={activeIndex}
          onClose={onClose}
        />
      )}
    </Box>
  );
});

export default SlashCommandMenu;
