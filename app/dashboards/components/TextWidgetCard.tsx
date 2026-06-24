"use client";

import { useState } from "react";
import { Box, Flex, Text, Button, Textarea } from "@chakra-ui/react";
import {
  ArrowsOutCardinalIcon,
  ArrowsOutIcon,
  ArrowsInIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Tooltip } from "@/app/components/ui/tooltip";

// Text/narrative widget. Toolbar: Arrange (drag handle) / Expand / Edit /
// Delete over a plain body — no titled header.
export default function TextWidgetCard({
  text,
  onChange,
  onDelete,
  expanded,
  onToggleExpand,
  arrange,
}: {
  text: string;
  onChange: (next: string) => void;
  onDelete: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  arrange?: { onMouseDown?: () => void; onMouseUp?: () => void };
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  const startEdit = () => {
    setDraft(text);
    setEditing(true);
  };
  const commit = () => {
    onChange(draft.trim());
    setEditing(false);
  };

  return (
    <Box
      rounded="md"
      borderWidth="1px"
      borderColor="border"
      bg="bg"
      overflow="hidden"
      h="100%"
    >
      {/* Toolbar */}
      <Flex px={2} py={1.5} align="center" justify="space-between">
        <Tooltip content="Drag to reorder" showArrow>
          <Button
            size="xs"
            variant="ghost"
            color="fg.muted"
            gap={1}
            cursor="grab"
            onMouseDown={arrange?.onMouseDown}
            onMouseUp={arrange?.onMouseUp}
          >
            <ArrowsOutCardinalIcon size={14} />
            Arrange
          </Button>
        </Tooltip>
        <Flex gap={1}>
          {onToggleExpand && (
            <Button
              size="xs"
              variant="ghost"
              color="fg.muted"
              gap={1}
              onClick={onToggleExpand}
            >
              {expanded ? (
                <ArrowsInIcon size={14} />
              ) : (
                <ArrowsOutIcon size={14} />
              )}
              {expanded ? "Collapse" : "Expand"}
            </Button>
          )}
          <Button
            size="xs"
            variant="ghost"
            color="fg.muted"
            gap={1}
            onClick={editing ? commit : startEdit}
          >
            <PencilSimpleIcon size={14} />
            {editing ? "Save" : "Edit"}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            color="fg.muted"
            gap={1}
            _hover={{ bg: "bg.error", color: "fg.error" }}
            onClick={onDelete}
          >
            <TrashIcon size={14} />
            Delete
          </Button>
        </Flex>
      </Flex>

      {/* Body */}
      <Box px={4} pb={4} pt={1}>
        {editing ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
            }}
            onBlur={commit}
            autoFocus
            rows={6}
            fontSize="sm"
            resize="vertical"
          />
        ) : (
          <Text fontSize="sm" whiteSpace="pre-wrap" color="fg.muted">
            {text}
          </Text>
        )}
      </Box>
    </Box>
  );
}
