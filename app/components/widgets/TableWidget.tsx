import { Box, Table } from "@chakra-ui/react";

interface TableWidgetProps {
  data: Record<string, string | number | boolean>[];
}

export default function TableWidget({ data }: TableWidgetProps) {
  // Helper function to format numeric values
  const formatValue = (value: string | number | boolean): string | number | boolean => {
    return typeof value === "number"
      ? new Intl.NumberFormat("en-US").format(value)
      : value;
  };
  return (
    <Box>
      <Table.Root variant="line" bg="transparent">
        <Table.Header>
          <Table.Row>
            {data &&
              data[0] &&
              Object.keys(data[0]).map((key: string) => (
                <Table.ColumnHeader key={key}>
                  <b>{key}</b>
                </Table.ColumnHeader>
              ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data.map((row: Record<string, string | number | boolean>, rowIndex: number) => (
            <Table.Row key={rowIndex} bg="transparent">
              {Object.keys(row).map((key: string) => (
                <Table.Cell key={key}>{formatValue(row[key])}</Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
