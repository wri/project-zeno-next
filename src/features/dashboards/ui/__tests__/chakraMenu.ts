import { act, fireEvent, screen } from "@testing-library/react";

/**
 * Picks `option` from the Chakra menu that `trigger` opens. The menu selects
 * its highlighted item, so the item is hovered before it is clicked.
 */
export async function chooseFromMenu(trigger: HTMLElement, option: string) {
  fireEvent.click(trigger);
  const item = await screen.findByRole("menuitem", { name: option });
  await act(async () => {
    fireEvent.pointerMove(item, { pointerType: "mouse" });
  });
  await act(async () => {
    fireEvent.click(item);
  });
}
