import {
  Box,
  Text,
  Heading,
  Flex,
  Separator,
  Button,
  Link,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { InsightWidget, DatasetInfo } from "@/app/types/chat";
import TableWidget from "./widgets/TableWidget";
import DatasetCardWidget from "./widgets/DatasetCardWidget";
import ChartWidget from "./widgets/ChartWidget";
import { WidgetIcons } from "../ChatPanelHeader";
import useChatStore from "../store/chatStore";
import { DownloadSimpleIcon, InfoIcon } from "@phosphor-icons/react";

interface WidgetMessageProps {
  widget: InsightWidget;
  checkpointId: string;
}

export default function WidgetMessage({
  widget,
  checkpointId,
}: WidgetMessageProps) {
  const { currentThreadId } = useChatStore();
  const [csvData, setCsvData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCsv() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/threads/${currentThreadId}/${checkpointId}/raw_data`,
          {
            headers: {
              "Content-Type": "text/csv",
            },
          }
        );
        if (!res.ok)
          throw new Error(`Failed to fetch raw data: ${res.statusText}`);
        const csv = await res.text();
        setCsvData(csv);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (currentThreadId && checkpointId) fetchCsv();
  }, [currentThreadId, checkpointId]);
  if (widget.type === "dataset-card") {
    return <DatasetCardWidget dataset={widget.data as DatasetInfo} />;
  }

  return (
    <Box
      rounded="md"
      border="1px solid"
      borderColor="blue.fg"
      overflow="hidden"
    >
      <Flex px={4} py={3} gap={2} bgGradient="LCLGradientLight">
        {WidgetIcons[widget.type]}
        <Heading size="xs" fontWeight="medium" color="primary.fg" m={0}>
          {widget.title}
        </Heading>
      </Flex>
      <Flex gap={3} px={4} py={3} flexDir="column">
        <Text fontSize="xs" color="fg.muted">
          {widget.description}
        </Text>
        <Separator />
        {csvData && (
          <Flex justifyContent="space-between">
            <Link
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                csvData
              )}`}
              download={`raw_data_${currentThreadId}_${checkpointId}.csv`}
              _hover={{ textDecor: "none" }}
            >
              <Button variant="outline" size="xs">
                <DownloadSimpleIcon size="14" />
                Download data
              </Button>
            </Link>
            <Button variant="outline" size="xs">
              <InfoIcon size="14" />
              Learn more about the data
            </Button>
          </Flex>
        )}
        {(widget.type === "bar" ||
          widget.type === "stacked-bar" ||
          widget.type === "grouped-bar" ||
          widget.type === "line" ||
          widget.type === "area" ||
          widget.type === "pie" ||
          widget.type === "scatter") && <ChartWidget widget={widget} />}

        {widget.type === "table" && (
          <Box overflowX="auto" maxW="100%">
            <TableWidget
              data={widget.data as Record<string, string | number | boolean>[]}
            />
          </Box>
        )}
      </Flex>
    </Box>
  );
}
