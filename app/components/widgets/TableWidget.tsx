import { toSentenceCase } from "@/app/utils/formatText";
import { Badge, Box, Table } from "@chakra-ui/react";

interface TableWidgetProps {
  data: Record<string, string | number | boolean>[];
  caption?: string;
}

export default function TableWidget({ data, caption }: TableWidgetProps) {
  // Helper function to format numeric values
  const formatValue = (
    value: string | number | boolean
  ): string | number | boolean => {
    return typeof value === "number"
      ? new Intl.NumberFormat("en-US").format(value)
      : value;
  };
  const headers = Object.keys(data[0]);
  return (
    <Box>
      <Table.Root variant="line" striped bg="transparent" size="sm" aria-label={caption || "Data table"}>
        {caption && (
          <Table.Caption placement="top" textAlign="left" mt={0} mb={2} fontSize="xs" color="fg.muted">
            {caption}
          </Table.Caption>
        )}
        <Table.Header>
          <Table.Row>
            {data &&
              data[0] &&
              Object.keys(data[0]).map((key: string) => (
                <Table.ColumnHeader
                  key={key}
                  color="neutral.500"
                  fontWeight="normal"
                  whiteSpace="pre"
                  scope="col"
                >
                  {toSentenceCase(key)}
                </Table.ColumnHeader>
              ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data.map(
            (
              row: Record<string, string | number | boolean>,
              rowIndex: number
            ) => (
              <Table.Row key={rowIndex} bg="transparent">
                {headers.map((key: string, cellIndex: number) => {
                  const value = row[key];

                  const isRankKey = key.toLowerCase() === "rank";
                  const isFirstNumericColumn =
                    cellIndex === 0 && typeof value === "number";

                  if (isRankKey || isFirstNumericColumn) {
                    return (
                      <Table.Cell key={key} textAlign="center">
                        <Badge
                          colorPalette="primary"
                          px={2}
                          py={1}
                          borderRadius="full"
                          variant="solid"
                        >
                          {formatValue(value)}
                        </Badge>
                      </Table.Cell>
                    );
                  }
                  return (
                    <Table.Cell
                      key={key}
                      css={{ "&:nth-child(2)": { fontWeight: "medium" } }}
                    >
                      {formatValue(value)}
                    </Table.Cell>
                  );
                })}
              </Table.Row>
            )
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
