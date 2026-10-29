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
 * so every widget's download reads and behaves the same.
 */
export default function DownloadMenu({
  onCsv,
  onImage,
  loading,
  disabled,
}: {
  onCsv: () => void;
  /** Offered only when given (a chart on show, not its table). */
  onImage?: () => void;
  loading?: boolean;
  disabled?: boolean;
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
              Data (CSV)
            </Menu.Item>
            {onImage && (
              <Menu.Item value="png" onSelect={onImage}>
                <ImageIcon size={14} />
                Chart image (PNG)
              </Menu.Item>
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
