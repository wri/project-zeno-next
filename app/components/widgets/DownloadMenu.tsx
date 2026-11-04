import { Button, Menu, Portal } from "@chakra-ui/react";
import {
  CaretDownIcon,
  DownloadSimpleIcon,
  FileCsvIcon,
  ImageIcon,
} from "@phosphor-icons/react";

/**
 * The widget action bar's "Download ▾" menu: the data as CSV and, for a
 * chart, its image. Shared by the chart card and the dashboard alerts list,
 * so every widget's download reads and behaves the same. A widget with more
 * files to offer passes their items as `children`.
 */
export default function DownloadMenu({
  onCsv,
  csvLabel = "Data (CSV)",
  onImage,
  loading,
  disabled,
  children,
}: {
  onCsv: () => void;
  /** The CSV item's name, for a menu that offers more than one data file. */
  csvLabel?: string;
  /** Offered only when given (a chart on show, not its table). */
  onImage?: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** More `Menu.Item`s, after the built-in ones. */
  children?: React.ReactNode;
}) {
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
          // Without a text the spinner replaces the label, and the button
          // loses its name.
          loadingText="Preparing…"
          disabled={disabled}
        >
          <DownloadSimpleIcon size={14} />
          Download
          <CaretDownIcon size={12} />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="180px" zIndex={1400}>
            <Menu.Item value="csv" onSelect={onCsv}>
              <FileCsvIcon size={14} />
              {csvLabel}
            </Menu.Item>
            {onImage && (
              <Menu.Item value="png" onSelect={onImage}>
                <ImageIcon size={14} />
                Chart image (PNG)
              </Menu.Item>
            )}
            {children}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
