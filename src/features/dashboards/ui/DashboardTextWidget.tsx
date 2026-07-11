"use client";

import { Box } from "@chakra-ui/react";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";

/**
 * The body of a `widget_type: "text"` dashboard card — the markdown note
 * from `config.text`, rendered in the white inner card per the Figma
 * "text widget default" frame (14px/1.5 body, 16px medium headings,
 * spaced bullets). remark-breaks matches the chat's markdown handling,
 * since notes will typically be agent-authored.
 */
export default function DashboardTextWidget({ text }: { text: string }) {
  return (
    <Box
      bg="white"
      rounded="md"
      borderWidth="1px"
      borderColor="#DDE2F5"
      p="20px"
      fontSize="14px"
      lineHeight="1.5"
      color="#131619"
      css={{
        "& h1, & h2, & h3, & h4, & strong": {
          fontSize: "16px",
          fontWeight: "500",
        },
        "& li strong": { fontSize: "14px" },
        "& > *:not(:last-child)": { marginBottom: "12px" },
        "& ul, & ol": { paddingLeft: "20px" },
        "& li:not(:last-child)": { marginBottom: "12px" },
        "& a": { textDecoration: "underline", color: "fg.link" },
      }}
    >
      <Markdown remarkPlugins={[remarkBreaks]}>{text}</Markdown>
    </Box>
  );
}
