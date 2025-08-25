import { Box, Text, Heading, Flex, Separator, Button } from "@chakra-ui/react";
import { InsightWidget, DatasetInfo } from "@/app/types/chat";
import TableWidget from "./widgets/TableWidget";
import ChakraLineChart from "./widgets/ChakraLineChart";
import ChakraBarChart from "./widgets/ChakraBarChart";
import DatasetCardWidget from "./widgets/DatasetCardWidget";
import {
  CaretDownIcon,
  DownloadSimpleIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import { WidgetIcons } from "../ChatPanelHeader";
import ChakraPieChart from "./widgets/ChakraPieChart";

interface WidgetMessageProps {
  widget: InsightWidget;
}

export default function WidgetMessage({ widget }: WidgetMessageProps) {
  if (widget.type === "dataset-card") {
    return <DatasetCardWidget dataset={widget.data as DatasetInfo} />;
  }

  return (
    <Box
      rounded="md"
      border="1.5px solid"
      borderColor="blue.fg"
      overflow="hidden"
    >
      <Flex
        px={4}
        py={3}
        gap={2}
        bgGradient="to-br"
        gradientFrom="primary.500/15"
        gradientTo="secondary.500/25"
      >
        {WidgetIcons[widget.type]}
        <Heading size="xs" fontWeight="medium" color="primary.fg" m={0}>
          {widget.title}
        </Heading>
      </Flex>
      <Flex gap={5} px={4} py={5} flexDir="column">
        <Text fontSize="xs" color="gray.600">
          {widget.description}
        </Text>
        <Separator />
        {/* Download and Info buttons */}
        {/* {hasDownload || hasMetaData && <Flex>Buttons here</Flex> }  <== use to conditionally render these action buttons */}
        <Flex justifyContent="space-between">
          <Button variant="outline" size="xs">
            <DownloadSimpleIcon size="14" />
            Download data
            <CaretDownIcon size="12" />
          </Button>
          <Button variant="outline" size="xs">
            <InfoIcon size="14" />
            Learn more about the data
          </Button>
        </Flex>

        {widget.type === "bar" && (
          <ChakraBarChart
            data={widget.data as Array<{ [key: string]: unknown }>}
            xAxis={widget.xAxis}
            yAxis={widget.yAxis}
          />
        )}

        {widget.type === "table" && (
          <Box overflowX="auto" maxW="100%">
            <TableWidget
              data={widget.data as Record<string, string | number | boolean>[]}
            />
          </Box>
        )}

        {widget.type === "pie" && (
          <ChakraPieChart
            data={widget.data as Array<{ [key: string]: unknown }>}
            xAxis={widget.xAxis}
            yAxis={widget.yAxis}
          />
        )}

        {widget.type === "line" && (
          <ChakraLineChart
            data={widget.data as Array<{ [key: string]: unknown }>}
            xAxis={widget.xAxis}
            yAxis={widget.yAxis}
          />
        )}
        {/* Cautions section: conditionally rendered if there are cautions, stubbed for now */}
        <Flex
          gap={2}
          border="1px solid"
          borderColor="secondary.500"
          p={2}
          pb={3}
          rounded="sm"
          fontSize="xs"
          css={{ "& > *": { flexShrink: 0 } }}
        >
          <InfoIcon
            fill="var(--chakra-colors-secondary-500)"
            weight="fill"
            size="16"
          />
          CO2 is absorbed in grassland areas due to soil carbon sequestration
          and grazing management. Grasslands can also be a source of emissions
          due to land degradation, overgrazing, fires and droughts.
        </Flex>
      </Flex>
    </Box>
  );
}
