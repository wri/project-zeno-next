"use client";

import { Box, Menu } from "@chakra-ui/react";
import { UserCircleIcon } from "@phosphor-icons/react";
import { Link } from "@/app/lib/router";

export type CompleteProfileMenuItemProps =
  /** Where the profile is completed (the app: the /dashboard settings page). */
  | { href: string; onSelect?: never }
  /** What selecting it does (the offline preview: open the card). */
  | { onSelect: () => void; href?: never };

function Content() {
  return (
    <>
      <UserCircleIcon />
      <Box flex="1">Complete your profile</Box>
      <Box
        w="2"
        h="2"
        rounded="full"
        bg="primary.500"
        aria-label="Not complete yet"
      />
    </>
  );
}

/**
 * The quiet, permanent reminder: an account-menu item that stays until the
 * profile is complete, after the in-chat asks have stopped.
 */
export function CompleteProfileMenuItem(props: CompleteProfileMenuItemProps) {
  if (props.href !== undefined) {
    return (
      <Menu.Item value="complete-profile" asChild>
        <Link href={props.href}>
          <Content />
        </Link>
      </Menu.Item>
    );
  }
  return (
    <Menu.Item
      value="complete-profile"
      cursor="pointer"
      onClick={props.onSelect}
    >
      <Content />
    </Menu.Item>
  );
}
