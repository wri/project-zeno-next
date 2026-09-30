"use client";

import { Box, Menu } from "@chakra-ui/react";
import { UserCircleIcon } from "@phosphor-icons/react";

export interface CompleteProfileMenuItemProps {
  onSelect: () => void;
}

/**
 * The quiet, permanent reminder: an account-menu item that stays until the
 * profile is complete, after the in-chat asks have stopped.
 */
export function CompleteProfileMenuItem({
  onSelect,
}: CompleteProfileMenuItemProps) {
  return (
    <Menu.Item value="complete-profile" cursor="pointer" onClick={onSelect}>
      <UserCircleIcon />
      <Box flex="1">Complete your profile</Box>
      <Box
        w="2"
        h="2"
        rounded="full"
        bg="primary.500"
        aria-label="Not complete yet"
      />
    </Menu.Item>
  );
}
