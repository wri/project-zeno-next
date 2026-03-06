"use client";

import { Editable } from "@chakra-ui/react";
import { Report } from "@/app/types/report";
import useReportStore from "@/app/store/reportStore";

interface Props {
  report: Report;
}

export default function ReportTitleBlock({ report }: Props) {
  const { renameReport } = useReportStore();

  return (
    <Editable.Root
      defaultValue={report.title}
      onValueCommit={(e) => renameReport(report.id, e.value)}
      fontSize="2xl"
      fontWeight="bold"
    >
      <Editable.Preview />
      <Editable.Input />
    </Editable.Root>
  );
}
