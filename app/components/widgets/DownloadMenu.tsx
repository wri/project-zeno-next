import { useId } from "react";
import { Button, Flex, Menu, Portal, Text } from "@chakra-ui/react";
import {
  CaretDownIcon,
  ClockIcon,
  DownloadSimpleIcon,
  FileCsvIcon,
  ImageIcon,
} from "@phosphor-icons/react";

/**
 * The widget action bar's "Download ▾" menu: the data as CSV and, for a
 * chart, its image. Shared by the chart card and the dashboard alerts list,
 * so every widget's download reads and behaves the same.
 *
 * A widget with files that the server prepares on request passes them as
 * `requestItems`. The menu then lists them under "Prepared on request",
 * after the files it saves at once under "Instant" (design A1).
 */
export default function DownloadMenu({
  onCsv,
  csvLabel = "Data (CSV)",
  csvDescription,
  onImage,
  loading,
  disabled,
  requestItems,
}: {
  onCsv: () => void;
  /** The CSV item's name, for a menu that offers more than one data file. */
  csvLabel?: string;
  /** A line under the CSV item's name: what the file holds. */
  csvDescription?: string;
  /** Offered only when given (a chart on show, not its table). */
  onImage?: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Files the server prepares on request. Their values must not be "csv" or "png". */
  requestItems?: DownloadItem[];
}) {
  const instant = (
    <>
      <DownloadMenuItem
        value="csv"
        icon={<FileCsvIcon size={14} />}
        label={csvLabel}
        description={csvDescription}
        onSelect={onCsv}
      />
      {onImage && (
        <DownloadMenuItem
          value="png"
          icon={<ImageIcon size={14} />}
          label="Chart image (PNG)"
          onSelect={onImage}
        />
      )}
    </>
  );

  return (
    <Menu.Root positioning={{ placement: "bottom-start" }}>
      <Menu.Trigger asChild>
        <Button
          size="xs"
          variant="outline"
          h={6}
          rounded="sm"
          color="neutral.500"
          loading={loading}
          disabled={disabled}
        >
          <DownloadSimpleIcon size={14} />
          Download
          <CaretDownIcon size={12} />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="180px" maxW="320px" zIndex={1400}>
            {requestItems ? (
              <>
                <Menu.ItemGroup>
                  <GroupLabel>Instant</GroupLabel>
                  {instant}
                </Menu.ItemGroup>
                <Menu.Separator />
                <Menu.ItemGroup>
                  <GroupLabel color="primary.500">
                    <ClockIcon size={12} />
                    Prepared on request
                  </GroupLabel>
                  {requestItems.map((item) => (
                    <DownloadMenuItem key={item.value} {...item} />
                  ))}
                </Menu.ItemGroup>
              </>
            ) : (
              instant
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

/** A group's heading, in the design's mono caps. */
function GroupLabel({
  color = "neutral.500",
  children,
}: {
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <Menu.ItemGroupLabel
      display="flex"
      alignItems="center"
      gap="6px"
      fontFamily="mono"
      fontSize="10px"
      fontWeight="normal"
      letterSpacing="0.5px"
      textTransform="uppercase"
      color={color}
    >
      {children}
    </Menu.ItemGroupLabel>
  );
}

/**
 * One file in the menu: an icon, its name and, optionally, a line on what it
 * holds or why it is not available. The name alone names the item; the line
 * describes it.
 */
interface DownloadItem {
  /** Unique in the menu: it selects by value. */
  value: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  disabled?: boolean;
  onSelect: () => void;
}

function DownloadMenuItem({
  value,
  icon,
  label,
  description,
  disabled,
  onSelect,
}: DownloadItem) {
  const id = useId();
  return (
    <Menu.Item
      value={value}
      disabled={disabled}
      onSelect={onSelect}
      alignItems={description ? "flex-start" : undefined}
      aria-labelledby={`${id}-label`}
      aria-describedby={description ? `${id}-description` : undefined}
    >
      {/* The name's line height, so the icon stays level with the name
          when a description runs under it. */}
      <Flex as="span" h="20px" align="center" flexShrink={0}>
        {icon}
      </Flex>
      <Flex direction="column" gap="2px" minW={0}>
        <span id={`${id}-label`}>{label}</span>
        {description && (
          <Text
            id={`${id}-description`}
            fontSize="xs"
            lineHeight="16px"
            color="neutral.500"
            whiteSpace="normal"
          >
            {description}
          </Text>
        )}
      </Flex>
    </Menu.Item>
  );
}
