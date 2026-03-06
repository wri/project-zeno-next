"use client";

import { Textarea } from "@chakra-ui/react";
import { ReportBlock } from "@/app/types/report";
import useReportStore from "@/app/store/reportStore";
import { useRef } from "react";

interface Props {
  block: ReportBlock;
  reportId: string;
}

export default function ReportTextBlock({ block, reportId }: Props) {
  const { updateBlockContent } = useReportStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = (value: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateBlockContent(reportId, block.id, value);
    }, 400);
  };

  return (
    <Textarea
      defaultValue={block.content ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Write something…"
      variant="flushed"
      resize="vertical"
      minH="80px"
      fontSize="sm"
    />
  );
}
