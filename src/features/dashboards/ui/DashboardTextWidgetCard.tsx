"use client";

import { useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Icon,
  IconButton,
  Portal,
  Text,
  Textarea,
} from "@chakra-ui/react";
import {
  ArrowsOutLineHorizontalIcon,
  ChatTeardropDotsIcon,
  CheckIcon,
  DotsSixVerticalIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  PencilSimpleIcon,
  TextBIcon,
  TextHOneIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextItalicIcon,
  XIcon,
} from "@phosphor-icons/react";

import InsightCaption from "@/app/components/InsightCaption";
import { toaster } from "@/app/components/ui/toaster";
import {
  bulletApply,
  headingApply,
  numberApply,
  prefixLines,
  wrapSelection,
  type EditResult,
} from "../lib/markdown-toolbar";
import DashboardTextWidget from "./DashboardTextWidget";

// Notes are the only dashboard content with unbounded height (tables
// paginate, maps and charts are fixed) — cap the body at the tall-map
// height and scroll internally so one long note can't dominate the page.
const NOTE_BODY_MAX_H = "520px";
// Floor so a one-line note still reads as a card, not a sliver.
const NOTE_BODY_MIN_H = "80px";

/**
 * A `widget_type: "text"` dashboard card — a white note per the Figma
 * "text widget" frames. Unlike the analysis/map card it has no title: the
 * header carries an AI-assisted caption and (for owners) the actions. The
 * pencil enters a raw-markdown edit mode (grey header, blue focus border, a
 * syntax toolbar, and a Done button) rather than a title rename; Done persists
 * `config.text` via `onSaveText`. Mutations are owned by the grid and passed as
 * callbacks, matching `DashboardWidgetCard`.
 */
export default function DashboardTextWidgetCard({
  text,
  placeholder,
  isOwner,
  isDouble,
  onArmDrag,
  onDisarmDrag,
  onToggleSize,
  onSaveText,
  onRemove,
}: {
  /** The note's markdown body, or null when empty (shows `placeholder`). */
  text: string | null;
  /** Copy shown in the body when the note is empty. */
  placeholder: string | null;
  isOwner: boolean;
  isDouble: boolean;
  /** Pointer down on the drag handle — arms the grid item's HTML5 drag. */
  onArmDrag: () => void;
  onDisarmDrag: () => void;
  onToggleSize: () => void;
  /** Persist the edited markdown (blank clears the note). */
  onSaveText: (text: string) => void;
  onRemove: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  // null = not editing; a string is the in-progress markdown draft.
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Body height captured as editing begins, so swapping the rendered note for
  // the textarea keeps the card exactly the same size (no jump, and the grid
  // neighbour doesn't reflow). Released on exit.
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  const startEditing = () => {
    setLockedHeight(bodyRef.current?.offsetHeight ?? null);
    setDraft(text ?? "");
  };

  const exitEditing = () => {
    setLockedHeight(null);
    setDraft(null);
  };

  const commitEdit = () => {
    const next = draft ?? "";
    exitEditing();
    if (next !== (text ?? "")) onSaveText(next);
  };

  const addToConversation = () => {
    // False door — measure interest before building the real flow.
    toaster.create({
      title: "Coming soon",
      description:
        "Adding a widget to the AI conversation isn't available yet.",
      type: "info",
      duration: 3000,
    });
  };

  // Run a pure transform against the textarea's live selection (only ever
  // invoked from a toolbar click), then re-apply the returned selection once
  // React has painted the new value.
  const applyEdit = (
    fn: (value: string, start: number, end: number) => EditResult
  ) => {
    const el = textareaRef.current;
    const value = draft ?? "";
    const start = el ? el.selectionStart : value.length;
    const end = el ? el.selectionEnd : value.length;
    const result = fn(value, start, end);
    setDraft(result.value);
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const TOOLBAR_GROUPS: {
    key: string;
    label: string;
    Glyph: React.ComponentType<{ size?: number }>;
    run: () => void;
  }[][] = [
    [
      {
        key: "h1",
        label: "Heading 1",
        Glyph: TextHOneIcon,
        run: () =>
          applyEdit((v, s, e) => prefixLines(v, s, e, headingApply(1))),
      },
      {
        key: "h2",
        label: "Heading 2",
        Glyph: TextHTwoIcon,
        run: () =>
          applyEdit((v, s, e) => prefixLines(v, s, e, headingApply(2))),
      },
      {
        key: "h3",
        label: "Heading 3",
        Glyph: TextHThreeIcon,
        run: () =>
          applyEdit((v, s, e) => prefixLines(v, s, e, headingApply(3))),
      },
    ],
    [
      {
        key: "bold",
        label: "Bold",
        Glyph: TextBIcon,
        run: () =>
          applyEdit((v, s, e) =>
            wrapSelection(v, s, e, "**", "**", "bold text")
          ),
      },
      {
        key: "italic",
        label: "Italic",
        Glyph: TextItalicIcon,
        run: () =>
          applyEdit((v, s, e) =>
            wrapSelection(v, s, e, "*", "*", "italic text")
          ),
      },
    ],
    [
      {
        key: "link",
        label: "Link",
        Glyph: LinkIcon,
        run: () =>
          applyEdit((v, s, e) =>
            wrapSelection(v, s, e, "[", "](url)", "link text")
          ),
      },
      {
        key: "ol",
        label: "Numbered list",
        Glyph: ListNumbersIcon,
        run: () => applyEdit((v, s, e) => prefixLines(v, s, e, numberApply())),
      },
      {
        key: "ul",
        label: "Bulleted list",
        Glyph: ListBulletsIcon,
        run: () => applyEdit((v, s, e) => prefixLines(v, s, e, bulletApply())),
      },
    ],
  ];

  return (
    <Flex
      flexDir="column"
      // Content height on purpose: the packed grid stacks cards tightly, so
      // a card must never stretch to a taller neighbour's height.
      bg="white"
      borderWidth="1px"
      borderColor={editing ? "#0049AA" : "#DDE2F5"}
      borderRadius="sm"
      overflow="hidden"
    >
      {/* Header — grey toolbar row while editing, else the AI caption + actions */}
      <Flex
        align="center"
        justify="space-between"
        gap="8px"
        pl={editing || !isOwner ? "12px" : "4px"}
        pr="12px"
        py="8px"
        minH="36px"
        bg={editing ? "#F4F5F6" : "white"}
        borderBottomWidth={editing ? "1px" : undefined}
        borderColor="#E0E2E5"
      >
        {editing ? (
          <>
            <Flex align="center" gap="8px" minW={0} flexWrap="wrap">
              {TOOLBAR_GROUPS.map((group, groupIndex) => (
                <Flex align="center" gap="2px" key={group[0].key}>
                  {groupIndex > 0 && (
                    <Box
                      w="1px"
                      h="16px"
                      bg="#D9D9D9"
                      mr="6px"
                      flexShrink={0}
                    />
                  )}
                  {group.map(({ key, label, Glyph, run }) => (
                    <IconButton
                      key={key}
                      aria-label={label}
                      title={label}
                      size="2xs"
                      variant="ghost"
                      color="fg.muted"
                      // Keep focus (and the selection) in the textarea so the
                      // transform reads the caret the user left there.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={run}
                    >
                      <Glyph size={16} />
                    </IconButton>
                  ))}
                </Flex>
              ))}
            </Flex>
            <Button
              size="xs"
              variant="outline"
              borderColor="rgba(19,22,25,0.2)"
              color="rgba(19,22,25,0.7)"
              gap="4px"
              flexShrink={0}
              onClick={commitEdit}
            >
              <CheckIcon size={16} />
              Done
            </Button>
          </>
        ) : (
          <>
            <Flex align="center" gap="4px" minW={0}>
              {isOwner && (
                <Icon
                  as={DotsSixVerticalIcon}
                  boxSize="16px"
                  color="fg.muted"
                  cursor="grab"
                  flexShrink={0}
                  aria-label="Drag to reposition"
                  onPointerDown={onArmDrag}
                  onPointerUp={onDisarmDrag}
                />
              )}
              <InsightCaption />
            </Flex>
            {isOwner && (
              <Flex align="center" gap="4px" flexShrink={0}>
                <IconButton
                  aria-label="Edit note"
                  title="Edit note"
                  size="2xs"
                  variant="ghost"
                  color="fg.muted"
                  onClick={startEditing}
                >
                  <PencilSimpleIcon size={16} />
                </IconButton>
                <IconButton
                  aria-label="Add to AI conversation"
                  title="Add to AI conversation"
                  size="2xs"
                  variant="ghost"
                  color="fg.muted"
                  onClick={addToConversation}
                >
                  <ChatTeardropDotsIcon size={16} />
                </IconButton>
                <IconButton
                  aria-label={
                    isDouble ? "Shrink to one column" : "Expand to full width"
                  }
                  title={
                    isDouble ? "Shrink to one column" : "Expand to full width"
                  }
                  size="2xs"
                  variant="ghost"
                  color="fg.muted"
                  onClick={onToggleSize}
                >
                  <ArrowsOutLineHorizontalIcon size={16} />
                </IconButton>
                <IconButton
                  aria-label="Remove from dashboard"
                  title="Remove from dashboard"
                  size="2xs"
                  variant="ghost"
                  color="fg.muted"
                  onClick={() => setConfirmOpen(true)}
                >
                  <XIcon size={16} />
                </IconButton>
              </Flex>
            )}
          </>
        )}
      </Flex>

      {/* Divider inset from the card edges, matching the analysis card. In
          edit mode the filled grey header carries its own full-width border. */}
      {!editing && (
        <Box mx="8px" borderBottomWidth="1px" borderColor="#E0E2E5" />
      )}

      {/* Body — the raw-markdown editor, the rendered note, or the empty state.
          Height is pinned to `lockedHeight` while editing so the card keeps its
          size (the textarea scrolls internally instead of growing the card). */}
      <Box
        ref={bodyRef}
        minW={0}
        bg="white"
        flex={editing ? "0 0 auto" : "1"}
        h={editing && lockedHeight !== null ? `${lockedHeight}px` : undefined}
        minH={NOTE_BODY_MIN_H}
        maxH={editing ? undefined : NOTE_BODY_MAX_H}
        overflow={editing ? "hidden" : "auto"}
      >
        {editing ? (
          <Textarea
            ref={textareaRef}
            value={draft ?? ""}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") exitEditing();
            }}
            autoFocus
            placeholder="Write a note in markdown…"
            resize="none"
            h="100%"
            // No min-height while locked: the textarea fills the pinned body so
            // the card can't grow. The fallback only applies if the pre-edit
            // height couldn't be measured.
            minH={lockedHeight !== null ? undefined : "160px"}
            p="20px"
            border="none"
            borderRadius={0}
            fontSize="14px"
            lineHeight="1.5"
            fontFamily="body"
            color="#131619"
            _focusVisible={{ outline: "none", boxShadow: "none" }}
          />
        ) : text ? (
          <DashboardTextWidget text={text} />
        ) : (
          <Flex
            minH="160px"
            h="100%"
            align="center"
            justify="center"
            direction="column"
            gap={1}
            color="fg.muted"
            px={6}
            textAlign="center"
          >
            <Text fontSize="sm">{placeholder ?? "This note is empty."}</Text>
            {isOwner && (
              <Text fontSize="xs">Use the pencil to add a note.</Text>
            )}
          </Flex>
        )}
      </Box>

      <Dialog.Root
        open={confirmOpen}
        onOpenChange={(e) => setConfirmOpen(e.open)}
        size="sm"
        role="alertdialog"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Remove note?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>This note will be removed from the dashboard.</Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" size="sm">
                    Cancel
                  </Button>
                </Dialog.ActionTrigger>
                <Button
                  colorPalette="red"
                  size="sm"
                  onClick={() => {
                    setConfirmOpen(false);
                    onRemove();
                  }}
                >
                  Remove
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Flex>
  );
}
