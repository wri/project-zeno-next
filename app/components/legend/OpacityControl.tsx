import { useEffect, useState } from "react";
import { Popover, Slider } from "@chakra-ui/react";

/**
 * Control for adjusting layer opacity via a popover slider.
 *
 * @param value - Current opacity value (0-100).
 * @param onValueChange - Callback when opacity is changed.
 */
export function OpacityControl(props: {
  value: number;
  onValueChange: (value: number) => void;
  children: React.ReactNode;
}) {
  const { value, onValueChange, children } = props;
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  return (
    <Popover.Root positioning={{ placement: "top", strategy: "fixed", hideWhenDetached: true }} size="xs">
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content maxW="15rem">
          <Popover.Arrow>
            <Popover.ArrowTip />
          </Popover.Arrow>
          <Popover.Body>
            <Slider.Root
              value={[draftValue]}
              onValueChange={(v) => setDraftValue(v.value[0])}
              onValueChangeEnd={() => onValueChange(draftValue)}
              size="sm"
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb index={0}>
                  <Slider.DraggingIndicator
                    layerStyle="fill.solid"
                    top="6"
                    rounded="sm"
                    px="1.5"
                  >
                    <Slider.ValueText />
                  </Slider.DraggingIndicator>
                </Slider.Thumb>
                <Slider.Marks
                  marks={[
                    { value: 0, label: "0%" },
                    { value: 50, label: "50%" },
                    { value: 100, label: "100%" },
                  ]}
                />
              </Slider.Control>
            </Slider.Root>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}
