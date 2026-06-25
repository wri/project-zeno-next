"use client";

import { useEffect, useState } from "react";
import { Box, Flex, IconButton } from "@chakra-ui/react";
import {
  ArrowsOutCardinalIcon,
  ArrowsOutIcon,
  ArrowsInIcon,
  PencilSimpleIcon,
  CheckIcon,
  TrashIcon,
  TextBIcon,
  TextItalicIcon,
  TextHTwoIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  LinkIcon,
} from "@phosphor-icons/react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import { Tooltip } from "@/app/components/ui/tooltip";

// Text/narrative widget with a small WYSIWYG markdown editor. The format tools
// (bold/italic/H2/lists) sit inline in the block toolbar while editing; the
// editor renders the formatted content read-only otherwise.
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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Markdown.configure({ html: false, linkify: true, breaks: true }),
    ],
    content: text,
    editable: false,
    immediatelyRender: false,
  });

  // Toggle editability with the Edit/Save control; focus when entering edit.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editing);
    if (editing) editor.commands.focus("end");
  }, [editing, editor]);

  const startEdit = () => setEditing(true);
  const save = () => {
    if (editor) onChange(editor.storage.markdown.getMarkdown().trim());
    setEditing(false);
  };
  // Add/edit/remove a link on the selection (markdown [text](url)).
  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return; // cancelled
    const chain = editor.chain().focus().extendMarkRange("link");
    if (url === "") chain.unsetLink().run();
    else chain.setLink({ href: url }).run();
  };

  const fmt = (
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    label: string
  ) => (
    <Tooltip content={label} showArrow>
      <IconButton
        aria-label={label}
        size="2xs"
        variant={active ? "solid" : "ghost"}
        colorPalette={active ? "primary" : undefined}
        color={active ? undefined : "neutral.500"}
        onClick={onClick}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );

  return (
    <Box
      rounded="md"
      borderWidth="1px"
      borderColor="border"
      bg="bg"
      overflow="hidden"
      h="100%"
    >
      {/* Toolbar — format tools inline (while editing) + block controls */}
      <Flex px={2} py={1.5} align="center" gap={2} color="neutral.500">
        {editing && editor && (
          <Flex gap={0.5} align="center">
            {fmt(
              editor.isActive("bold"),
              () => editor.chain().focus().toggleBold().run(),
              <TextBIcon size={14} />,
              "Bold"
            )}
            {fmt(
              editor.isActive("italic"),
              () => editor.chain().focus().toggleItalic().run(),
              <TextItalicIcon size={14} />,
              "Italic"
            )}
            {fmt(
              editor.isActive("heading", { level: 2 }),
              () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
              <TextHTwoIcon size={14} />,
              "Heading"
            )}
            {fmt(
              editor.isActive("bulletList"),
              () => editor.chain().focus().toggleBulletList().run(),
              <ListBulletsIcon size={14} />,
              "Bullet list"
            )}
            {fmt(
              editor.isActive("orderedList"),
              () => editor.chain().focus().toggleOrderedList().run(),
              <ListNumbersIcon size={14} />,
              "Numbered list"
            )}
            {fmt(
              editor.isActive("link"),
              setLink,
              <LinkIcon size={14} />,
              "Link"
            )}
          </Flex>
        )}

        <Flex gap={0.5} align="center" ml="auto">
          <Tooltip content="Drag to reorder" showArrow>
            <IconButton
              aria-label="Drag to reorder"
              size="2xs"
              variant="ghost"
              cursor="grab"
              onMouseDown={arrange?.onMouseDown}
              onMouseUp={arrange?.onMouseUp}
            >
              <ArrowsOutCardinalIcon size={14} />
            </IconButton>
          </Tooltip>
          {onToggleExpand && (
            <Tooltip
              content={
                expanded ? "Collapse to one column" : "Expand to full width"
              }
              showArrow
            >
              <IconButton
                aria-label="Toggle width"
                size="2xs"
                variant="ghost"
                onClick={onToggleExpand}
              >
                {expanded ? (
                  <ArrowsInIcon size={14} />
                ) : (
                  <ArrowsOutIcon size={14} />
                )}
              </IconButton>
            </Tooltip>
          )}
          <Tooltip content={editing ? "Save" : "Edit"} showArrow>
            <IconButton
              aria-label={editing ? "Save note" : "Edit note"}
              size="2xs"
              variant="ghost"
              onClick={editing ? save : startEdit}
            >
              {editing ? (
                <CheckIcon size={14} />
              ) : (
                <PencilSimpleIcon size={14} />
              )}
            </IconButton>
          </Tooltip>
          <IconButton
            aria-label="Remove note"
            size="2xs"
            variant="ghost"
            onClick={onDelete}
          >
            <TrashIcon size={14} />
          </IconButton>
        </Flex>
      </Flex>

      {/* Body — TipTap surface (editable while editing, formatted otherwise) */}
      <Box px={4} pb={4} pt={1}>
        <Box
          rounded="md"
          borderWidth={editing ? "1px" : 0}
          borderColor="border.emphasized"
          fontSize="sm"
          color="fg.muted"
          css={{
            "& .ProseMirror": {
              outline: "none",
              padding: editing ? "12px" : 0,
              minHeight: editing ? "100px" : undefined,
            },
            "& .ProseMirror > * + *": { marginTop: "8px" },
            "& .ProseMirror h1, & .ProseMirror h2, & .ProseMirror h3": {
              fontWeight: 600,
              color: "var(--chakra-colors-fg)",
            },
            "& .ProseMirror h2": { fontSize: "18px" },
            "& .ProseMirror ul": { paddingLeft: "20px", listStyle: "disc" },
            "& .ProseMirror ol": { paddingLeft: "20px", listStyle: "decimal" },
            "& .ProseMirror strong": { fontWeight: 600 },
            "& .ProseMirror a": {
              color: "var(--chakra-colors-fg-link)",
              textDecoration: "underline",
            },
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Box>
    </Box>
  );
}
