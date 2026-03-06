"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Box, Text, Button, Flex } from "@chakra-ui/react";
import {
  ArrowLeftIcon,
  ChatCircleIcon,
  ListIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import useReportStore from "@/app/store/reportStore";
import ReportCanvas from "@/app/components/report/ReportCanvas";

export default function ReportPage() {
  const { id } = useParams();
  const router = useRouter();
  const { setActiveReport, getActiveReport } = useReportStore();

  useEffect(() => {
    setActiveReport(id as string);
    return () => setActiveReport(null);
  }, [id, setActiveReport]);

  const report = getActiveReport();

  if (!report) {
    return (
      <Box maxW="4xl" mx="auto">
        <Text color="fg.muted">Report not found.</Text>
        <Button
          variant="ghost"
          size="sm"
          mt={2}
          onClick={() => router.push("/app/report-builder")}
        >
          <ArrowLeftIcon /> Back to reports
        </Button>
      </Box>
    );
  }

  return (
    <Box maxW="4xl" mx="auto">
      <Flex align="center" gap={2} mb={4}>
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link href="/app/report-builder">
            <ListIcon /> All Reports
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link href="/app">
            <ChatCircleIcon /> Back to Chat
          </Link>
        </Button>
      </Flex>
      <ReportCanvas report={report} />
    </Box>
  );
}
