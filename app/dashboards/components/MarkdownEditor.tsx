"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { Box, Flex, IconButton } from "@chakra-ui/react";
import {
  TextBIcon,
  TextItalicIcon,
  TextHTwoIcon,
  ListBulletsIcon,
  ListNumbersIcon,
} from "@phosphor-icons/react";

// A small WYSIWYG markdown editor (TipTap). Reads/writes markdown so the text
// widget can keep storing a plain markdown string.
export default function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (markdown: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({ html: false, linkify: true, breaks: true }),
    ],
    content: value,
    autofocus: "end",
    // Next.js SSR: defer first render to the client to avoid hydration warnings.
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.storage.markdown.getMarkdown()),
  });

  if (!editor) return null;

  const tool = (
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    label: string
  ) => (
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
  );

  return (
    <Box
      borderWidth="1px"
      borderColor="border.emphasized"
      rounded="md"
      overflow="hidden"
      bg="bg"
    >
      {/* Toolbar */}
      <Flex
        gap={0.5}
        p={1}
        flexWrap="wrap"
        bg="bg.subtle"
        borderBottomWidth="1px"
        borderColor="border"
      >
        {tool(
          editor.isActive("bold"),
          () => editor.chain().focus().toggleBold().run(),
          <TextBIcon size={14} />,
          "Bold"
        )}
        {tool(
          editor.isActive("italic"),
          () => editor.chain().focus().toggleItalic().run(),
          <TextItalicIcon size={14} />,
          "Italic"
        )}
        {tool(
          editor.isActive("heading", { level: 2 }),
          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          <TextHTwoIcon size={14} />,
          "Heading"
        )}
        {tool(
          editor.isActive("bulletList"),
          () => editor.chain().focus().toggleBulletList().run(),
          <ListBulletsIcon size={14} />,
          "Bullet list"
        )}
        {tool(
          editor.isActive("orderedList"),
          () => editor.chain().focus().toggleOrderedList().run(),
          <ListNumbersIcon size={14} />,
          "Numbered list"
        )}
      </Flex>

      {/* Editable surface */}
      <Box
        fontSize="sm"
        color="fg"
        css={{
          "& .ProseMirror": {
            outline: "none",
            minHeight: "120px",
            padding: "12px",
            lineHeight: 1.5,
          },
          "& .ProseMirror > * + *": { marginTop: "8px" },
          "& .ProseMirror h2": { fontSize: "18px", fontWeight: 600 },
          "& .ProseMirror ul": { paddingLeft: "20px", listStyle: "disc" },
          "& .ProseMirror ol": { paddingLeft: "20px", listStyle: "decimal" },
          "& .ProseMirror a": { color: "var(--chakra-colors-fg-link)" },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}
