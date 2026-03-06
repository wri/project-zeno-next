"use client";

import { useState, useRef } from "react";
import { Box, Flex, Text, Textarea } from "@chakra-ui/react";
import { SparkleIcon } from "@phosphor-icons/react";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { ReportBlock } from "@/app/types/report";
import useReportStore from "@/app/store/reportStore";

interface Props {
  block: ReportBlock;
  reportId: string;
  /** Override for updateBlockContent (defaults to useReportStore) */
  onUpdateContent?: (
    reportId: string,
    blockId: string,
    content: string,
  ) => void;
}

const markdownCss = {
  fontSize: "sm",
  lineHeight: "1.6",
  "& > p:not(:last-of-type)": { mb: 2 },
  "& > h1, & > h2, & > h3, & > h4, & > h5, & > h6": {
    fontWeight: "semibold",
    mt: 3,
    mb: 1,
  },
  "& > h1": { fontSize: "lg" },
  "& > h2": { fontSize: "md" },
  "& > h3": { fontSize: "sm" },
  "& ul, & ol": { pl: 5, mb: 2 },
  "& li": { mb: 0.5 },
  "& strong": { fontWeight: "semibold" },
  "& a": {
    textDecoration: "underline",
    color: "primary.solid",
  },
  "& blockquote": {
    borderLeft: "3px solid",
    borderColor: "border.muted",
    pl: 3,
    color: "fg.muted",
    fontStyle: "italic",
    my: 2,
  },
  "& code": {
    fontFamily: "mono",
    fontSize: "xs",
    bg: "bg.subtle",
    px: 1,
    py: 0.5,
    rounded: "sm",
  },
};

export default function ReportTextBlock({
  block,
  reportId,
  onUpdateContent,
}: Props) {
  const store = useReportStore();
  const updateBlockContent = onUpdateContent ?? store.updateBlockContent;
  const [isEditing, setIsEditing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const content = block.content ?? "";
  const hasContent = content.length > 0;
  const isAiGenerated = block.generatedByAi === true;

  const handleChange = (value: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateBlockContent(reportId, block.id, value);
    }, 400);
  };

  const handleBlur = () => {
    clearTimeout(debounceRef.current);
    const current = textareaRef.current?.value ?? "";
    updateBlockContent(reportId, block.id, current);
    setIsEditing(false);
  };

  // Show textarea if editing or if block has no content (new empty block)
  if (isEditing || !hasContent) {
    return (
      <Box>
        {isAiGenerated && <AiBadge />}
        <Textarea
          ref={textareaRef}
          defaultValue={content}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="Write something…"
          variant="flushed"
          resize="vertical"
          minH="80px"
          fontSize="sm"
          autoFocus={isEditing}
        />
      </Box>
    );
  }

  // Render markdown — click to edit
  return (
    <Box>
      {isAiGenerated && <AiBadge />}
      <Box
        onClick={() => setIsEditing(true)}
        cursor="text"
        minH="40px"
        py={1}
        rounded="sm"
        _hover={{ bg: "bg.subtle" }}
        transition="background 0.15s"
        css={markdownCss}
      >
        <Markdown remarkPlugins={[remarkBreaks]}>{content}</Markdown>
      </Box>
    </Box>
  );
}

function AiBadge() {
  return (
    <Flex align="center" gap={1} mb={1}>
      <SparkleIcon
        size={12}
        weight="fill"
        color="var(--chakra-colors-purple-500)"
      />
      <Text fontSize="2xs" color="fg.subtle" fontWeight="medium">
        AI generated
      </Text>
    </Flex>
  );
}
