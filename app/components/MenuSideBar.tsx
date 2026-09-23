"use client";

import {
  Badge,
  Box,
  Drawer,
  Flex,
  IconButton,
  Portal,
  Stack,
  Text,
  chakra,
} from "@chakra-ui/react";
import {
  ChartLineIcon,
  GearSixIcon,
  LifebuoyIcon,
  ListIcon,
  MapTrifoldIcon,
  PolygonIcon,
  ShootingStarIcon,
  SignOutIcon,
  UserIcon,
  type Icon,
} from "@phosphor-icons/react";

import { Tooltip } from "./ui/tooltip";
import AvailablePromptsCard from "./AvailablePromptsCard";
import { WHATS_NEW_FEATURES } from "./whatsNewFeatures";
import { Link, usePathname, useRouter } from "@/src/shared/lib/router";
import { PREVIEW_HELP_CENTER_URL } from "@/app/constants/preview-content";
import { useLogout } from "@/app/hooks/useLogout";
import { openWhatsNew, useWhatsNewUnread } from "@/app/hooks/useWhatsNew";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import useSidebarStore from "@/app/store/sidebarStore";
import { isAppRoute, mapTabHref } from "@/app/utils/threadNavigation";

const ACTIVE_COLOR = "#0049AA";

type MenuItemProps = {
  label: string;
  icon: Icon;
  active?: boolean;
  badge?: string;
} & (
  | { href: string; external?: boolean; onClick?: () => void }
  | { onClick: () => void; href?: never; external?: never }
);

function MenuItem({
  label,
  icon: ItemIcon,
  active,
  badge,
  href,
  external,
  onClick,
}: MenuItemProps) {
  const content = (
    <>
      <ItemIcon size={16} />
      <Box as="span" flex="1">
        {label}
      </Box>
      {badge && (
        <Badge
          size="xs"
          variant="subtle"
          colorPalette="blue"
          fontFamily="mono"
          fontWeight="normal"
        >
          {badge}
        </Badge>
      )}
    </>
  );

  const styles = {
    display: "flex",
    alignItems: "center",
    gap: "3",
    w: "full",
    h: "40px",
    px: "3",
    borderLeft: "2px solid",
    borderColor: active ? ACTIVE_COLOR : "transparent",
    bg: active ? "#F0F4FF" : "transparent",
    color: active ? ACTIVE_COLOR : "#3A4048",
    fontSize: "sm",
    fontWeight: "medium",
    textAlign: "left" as const,
    textDecoration: "none",
    cursor: "pointer",
    _hover: {
      bg: active ? "#F0F4FF" : "#F4F5F6",
      textDecoration: "none",
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "neutral.600",
      outlineOffset: "-2px",
    },
  };

  if (href) {
    return (
      <chakra.a asChild {...styles} aria-current={active ? "page" : undefined}>
        <Link
          href={href}
          onClick={() => {
            useSidebarStore.getState().setMenuOpen(false);
            onClick?.();
          }}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          {content}
        </Link>
      </chakra.a>
    );
  }

  return (
    <chakra.button
      type="button"
      {...styles}
      aria-current={active ? "page" : undefined}
      onClick={() => {
        useSidebarStore.getState().setMenuOpen(false);
        onClick?.();
      }}
    >
      {content}
    </chakra.button>
  );
}

/**
 * The menu side bar the header's menu button opens: every destination and
 * account tool that isn't a main tab. Map, Dashboards and My areas at the
 * top; Help, What's new and User settings at the bottom; then the prompt
 * allowance and the signed-in email with sign out. Picking an item closes it,
 * as do a click outside and Esc.
 */
export default function MenuSideBar() {
  const menuOpen = useSidebarStore((s) => s.menuOpen);
  const setMenuOpen = useSidebarStore((s) => s.setMenuOpen);
  const areasPanelOpen = useSidebarStore((s) => s.areasPanelOpen);
  const areasPanelFilter = useSidebarStore((s) => s.areasPanelFilter);
  const { currentThreadId } = useChatStore();
  const { userEmail } = useAuthStore();
  const { logout, isLoggingOut } = useLogout();
  const whatsNewUnread = useWhatsNewUnread();
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const onMap = isAppRoute(pathname);
  const myAreasActive = onMap && areasPanelOpen && areasPanelFilter === "mine";
  const updateCount = WHATS_NEW_FEATURES.length;

  // "My areas" is a tab of the map's Areas panel, not a page: open the panel
  // on it, moving to the map first when the menu is used elsewhere.
  const openMyAreas = () => {
    useSidebarStore.getState().openAreasPanel("mine");
    if (!onMap) router.push(mapTabHref(currentThreadId));
  };

  return (
    <Drawer.Root
      placement="start"
      open={menuOpen}
      onOpenChange={(e) => setMenuOpen(e.open)}
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content
            maxW="330px"
            w="330px"
            borderTop="4px solid #E3F37F"
            aria-label="Menu"
          >
            <Flex align="center" gap="3" h="40px" px="4" flexShrink={0}>
              <Tooltip content="Close menu" showArrow>
                <IconButton
                  w="32px"
                  h="32px"
                  minW="32px"
                  borderRadius="4px"
                  bg="#F4F5F6"
                  color="#565E7B"
                  _hover={{ bg: "#E0E2E5" }}
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                >
                  <ListIcon size={16} />
                </IconButton>
              </Tooltip>
              <Text fontSize="sm" fontWeight="bold" color="#131E47">
                Global Nature Watch{" "}
                <Text as="span" fontWeight="normal" color="neutral.600">
                  Horizon
                </Text>
              </Text>
            </Flex>
            <Flex
              as="nav"
              aria-label="Destinations"
              direction="column"
              flex="1"
              minH={0}
              overflowY="auto"
              px="4"
              py="4"
              gap="6"
            >
              <Stack gap="1">
                <MenuItem
                  label="Map"
                  icon={MapTrifoldIcon}
                  href={mapTabHref(currentThreadId)}
                  // On My areas the link points at the current page, so leave
                  // the tab by closing the Areas panel.
                  onClick={
                    myAreasActive
                      ? () =>
                          useSidebarStore.getState().setAreasPanelOpen(false)
                      : undefined
                  }
                  active={onMap && !myAreasActive}
                />
                <MenuItem
                  label="Dashboards"
                  icon={ChartLineIcon}
                  href="/dashboards"
                  active={pathname.startsWith("/dashboards")}
                />
                <MenuItem
                  label="My areas"
                  icon={PolygonIcon}
                  onClick={openMyAreas}
                  active={myAreasActive}
                />
              </Stack>
              <Stack gap="1" mt="auto">
                <MenuItem
                  label="Help"
                  icon={LifebuoyIcon}
                  href={PREVIEW_HELP_CENTER_URL}
                  external
                />
                <MenuItem
                  label="What's new"
                  icon={ShootingStarIcon}
                  onClick={openWhatsNew}
                  badge={
                    whatsNewUnread
                      ? `${updateCount} ${updateCount === 1 ? "item" : "items"}`
                      : undefined
                  }
                />
                <MenuItem
                  label="User settings"
                  icon={GearSixIcon}
                  href="/dashboard"
                  active={/^\/dashboard(\/|$)/.test(pathname)}
                />
              </Stack>
            </Flex>
            <Stack gap="2" px="4" pb="4" flexShrink={0}>
              <AvailablePromptsCard />
              <Flex align="center" gap="2" h="40px" px="3" color="#3A4048">
                <UserIcon size={16} />
                <Text flex="1" fontSize="sm" truncate title={userEmail ?? ""}>
                  {userEmail}
                </Text>
                <Tooltip content="Sign out" showArrow>
                  <IconButton
                    size="xs"
                    variant="ghost"
                    color="#565E7B"
                    aria-label="Sign out"
                    loading={isLoggingOut}
                    onClick={logout}
                  >
                    <SignOutIcon size={16} />
                  </IconButton>
                </Tooltip>
              </Flex>
            </Stack>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
