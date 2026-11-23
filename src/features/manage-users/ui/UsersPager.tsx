import { Button, Flex, NativeSelect, Text, chakra } from "@chakra-ui/react";
import { formatCount } from "../lib/format";
import { PAGE_SIZES, type PageSize } from "../lib/paging";

export function UsersPager({
  first,
  last,
  total,
  page,
  lastPage,
  pageSize,
  onPage,
  onPageSize,
}: {
  first: number;
  last: number;
  total: number;
  page: number;
  lastPage: number;
  pageSize: PageSize;
  onPage: (page: number) => void;
  onPageSize: (size: PageSize) => void;
}) {
  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      gap={4}
      wrap="wrap"
      fontSize="sm"
      color="fg.muted"
    >
      <Text fontVariantNumeric="tabular-nums">
        {formatCount(first)}–{formatCount(last)} of {formatCount(total)}
      </Text>
      <Flex alignItems="center" gap={2}>
        <chakra.label htmlFor="rows-per-page">Rows per page</chakra.label>
        <NativeSelect.Root size="xs" width="auto">
          <NativeSelect.Field
            id="rows-per-page"
            value={pageSize}
            onChange={(e) => {
              const size = PAGE_SIZES.find((n) => `${n}` === e.target.value);
              if (size) onPageSize(size);
            }}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Button
          size="xs"
          variant="outline"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          size="xs"
          variant="outline"
          disabled={page === lastPage}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </Flex>
    </Flex>
  );
}
