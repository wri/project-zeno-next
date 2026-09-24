import {
  Box,
  Flex,
  Heading,
  IconButton,
  Badge,
  Menu,
  Portal,
  Link as ChakraLink,
  Text,
} from "@chakra-ui/react";
import {
  ChartLineIcon,
  GearSixIcon,
  ListIcon,
  MapTrifoldIcon,
  ShootingStarIcon,
  SignOutIcon,
  UserIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import { Tooltip } from "./ui/tooltip";
import { useState, useEffect, useId, useRef } from "react";
import PreviewInfoPanel from "./PreviewInfoPanel";
import PromptQuotaMeter from "./PromptQuotaMeter";
import WhatsNewModal from "./WhatsNewModal";
import MenuSideBar from "./MenuSideBar";

import useAuthStore from "../store/authStore";
import useChatStore from "../store/chatStore";
import useSidebarStore from "../store/sidebarStore";
import { Link } from "@/src/shared/lib/router";
import { usePathname } from "@/src/shared/lib/router";
import { useLogout } from "@/app/hooks/useLogout";
import { openWhatsNew, useWhatsNewUnread } from "@/app/hooks/useWhatsNew";
import { mapTabHref } from "@/app/utils/threadNavigation";

const isPrototype = import.meta.env.NEXT_PUBLIC_PROTOTYPE_MODE === "true";
const DISCLAIMER_STORAGE_KEY = "gnw_disclaimer_dismissed_v2";

/**
 * The app's slim header (Figma "Header states, Phase 5"): menu button, logo
 * with the PREVIEW badge and the Map / Dashboards tabs on the left; state
 * items (quota meter, What's new) and the avatar on the right.
 */
function PageHeader() {
  const { userEmail, isAuthenticated } = useAuthStore();
  const setMenuOpen = useSidebarStore((s) => s.setMenuOpen);
  const { currentThreadId } = useChatStore();
  const { logout } = useLogout();
  const whatsNewUnread = useWhatsNewUnread();
  const pathname = usePathname() ?? "";
  // Shared by the avatar's tooltip and menu so both attach to one button.
  const accountTriggerId = useId();
  const onMap = pathname.startsWith("/app");
  const onDashboards = pathname.startsWith("/dashboards");

  const focusRing = {
    outline: "2px solid",
    outlineColor: isPrototype ? "#1f2937" : "neutral.600",
    outlineOffset: "2px",
    borderRadius: "sm",
  };

  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISCLAIMER_STORAGE_KEY) === "true";
    setDisclaimerDismissed(dismissed);

    const handleDismiss = () => setDisclaimerDismissed(true);
    window.addEventListener("gnw-disclaimer-dismissed", handleDismiss);
    return () =>
      window.removeEventListener("gnw-disclaimer-dismissed", handleDismiss);
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen]);

  const tabs = [
    {
      // Thread-aware: with a live conversation, land on its thread URL
      // (which preserves state) instead of the resetting /app.
      href: mapTabHref(currentThreadId),
      label: "Map",
      icon: MapTrifoldIcon,
      active: onMap,
    },
    {
      href: "/dashboards",
      label: "Dashboards",
      icon: ChartLineIcon,
      active: onDashboards,
    },
  ];

  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      gap="4"
      px="4"
      h="40px"
      bg={isPrototype ? "#d1d5db" : "white"}
      color={isPrototype ? "#1f2937" : "#131E47"}
      borderTop={isPrototype ? undefined : "4px solid #E3F37F"}
      zIndex={1300}
      // Pinned to the viewport top on scrolling pages (e.g. dashboards);
      // inert on the map layout, whose grid cells don't scroll.
      position="sticky"
      top={0}
    >
      {/* Mounted with the header so What's new and the menu open on every
          surface that shows the header (map and dashboards alike). */}
      <WhatsNewModal />
      <MenuSideBar />
      <Flex gap="10" alignItems="center" alignSelf="stretch" minW={0}>
        <Flex gap="3" alignItems="center">
          <Tooltip content="Menu" showArrow>
            <IconButton
              hideBelow="md"
              w="32px"
              h="32px"
              minW="32px"
              borderRadius="4px"
              bg="#F4F5F6"
              color="#565E7B"
              _hover={{ bg: "#E0E2E5" }}
              _focusVisible={focusRing}
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <ListIcon size={16} />
            </IconButton>
          </Tooltip>
          <Flex gap="2" alignItems="center">
            <ChakraLink
              as={Link}
              href="/"
              transition="opacity 0.24s ease"
              _hover={{ opacity: 0.8 }}
              _focusVisible={focusRing}
            >
              <Heading
                as="h1"
                size="sm"
                color={isPrototype ? "#1f2937" : "#131E47"}
              >
                Global Nature Watch{" "}
                <Text
                  as="span"
                  fontWeight="normal"
                  color={isPrototype ? "#1f2937" : "neutral.600"}
                >
                  Horizon
                </Text>
              </Heading>
            </ChakraLink>
            {isPrototype ? (
              <Badge
                colorPalette="gray"
                bg="#1f2937"
                color="#f3f4f6"
                letterSpacing="wider"
                variant="solid"
                size="xs"
              >
                PROTOTYPE
              </Badge>
            ) : (
              <Box position="relative" ref={badgeRef}>
                <Flex
                  as={disclaimerDismissed ? "button" : "span"}
                  align="center"
                  gap="4px"
                  h="20px"
                  px="4px"
                  py="2px"
                  borderRadius="4px"
                  bg="#E0E2E5"
                  border="none"
                  cursor={disclaimerDismissed ? "pointer" : "default"}
                  onClick={
                    disclaimerDismissed
                      ? () => setPanelOpen(!panelOpen)
                      : undefined
                  }
                  aria-label={
                    disclaimerDismissed ? "Open preview info" : undefined
                  }
                >
                  <Text
                    fontFamily="'IBM Plex Sans', sans-serif"
                    fontStyle="normal"
                    fontWeight="500"
                    fontSize="10px"
                    lineHeight="16px"
                    color="#3A4048"
                    flexShrink={0}
                  >
                    PREVIEW
                  </Text>
                  {disclaimerDismissed && (
                    <InfoIcon size={13} color="#3A4048" weight="fill" />
                  )}
                </Flex>
                {panelOpen && (
                  <PreviewInfoPanel onClose={() => setPanelOpen(false)} />
                )}
              </Box>
            )}
          </Flex>
        </Flex>
        <Flex
          as="nav"
          aria-label="Main"
          gap="1"
          alignSelf="stretch"
          hideBelow="md"
        >
          {tabs.map(({ href, label, icon: TabIcon, active }) => (
            <ChakraLink
              key={label}
              as={Link}
              href={href}
              aria-current={active ? "page" : undefined}
              display="flex"
              alignItems="center"
              gap="2"
              px="3"
              h="full"
              borderBottom="2px solid"
              borderColor={active ? "#0049AA" : "transparent"}
              bg={active ? "#F0F4FF" : "transparent"}
              color={active ? "#0049AA" : "#565E7B"}
              fontSize="sm"
              fontWeight="medium"
              lineHeight="1.4"
              letterSpacing="0.0076em"
              textDecoration="none"
              transition="background 0.16s ease, color 0.16s ease"
              _hover={{
                textDecoration: "none",
                bg: active ? "#F0F4FF" : "#F4F5F6",
                color: active ? "#0049AA" : "#3A4048",
              }}
              _focusVisible={focusRing}
            >
              <TabIcon size={16} />
              {label}
            </ChakraLink>
          ))}
        </Flex>
      </Flex>
      <Flex gap="4" alignItems="center" hideBelow="md">
        {/* State items (quota meter, What's new) sit left of the avatar. */}
        <PromptQuotaMeter />
        {whatsNewUnread && (
          <Tooltip content="What's new" showArrow>
            <IconButton
              position="relative"
              overflow="visible"
              w="32px"
              h="32px"
              minW="32px"
              borderRadius="4px"
              bg="#F4F5F6"
              color="#565E7B"
              _hover={{ bg: "#E0E2E5" }}
              _focusVisible={focusRing}
              onClick={openWhatsNew}
              aria-label="What's new (unread updates)"
            >
              <ShootingStarIcon size={16} />
              <Box
                data-testid="whats-new-header-dot"
                position="absolute"
                top="-4px"
                right="-4px"
                w="12px"
                h="12px"
                borderRadius="full"
                bg="#2495E0"
                border="2px solid white"
              />
            </IconButton>
          </Tooltip>
        )}
        {isAuthenticated ? (
          <Menu.Root
            ids={{ trigger: accountTriggerId }}
            positioning={{ placement: "bottom-end" }}
          >
            <Tooltip
              ids={{ trigger: accountTriggerId }}
              content={userEmail}
              disabled={!userEmail}
              showArrow
            >
              <Menu.Trigger asChild>
                <IconButton
                  w="32px"
                  h="32px"
                  minW="32px"
                  borderRadius="full"
                  bg="#F4F5F6"
                  color="#394048"
                  _hover={{ bg: "#E0E2E5" }}
                  _focusVisible={focusRing}
                  aria-label={`Account menu (${userEmail || "signed in"})`}
                >
                  <UserIcon size={16} />
                </IconButton>
              </Menu.Trigger>
            </Tooltip>
            <Portal>
              <Menu.Positioner>
                <Menu.Content
                  minW="220px"
                  css={{ "& a": { cursor: "pointer" } }}
                >
                  <Menu.Item value="dashboard" asChild>
                    <Link href="/dashboard">
                      <GearSixIcon />
                      Settings
                    </Link>
                  </Menu.Item>
                  <Menu.Separator />
                  <Menu.Item
                    value="logout"
                    cursor="pointer"
                    color="fg.error"
                    _hover={{ bg: "bg.error", color: "fg.error" }}
                    onClick={logout}
                    title="Log Out"
                  >
                    <SignOutIcon />
                    Logout
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        ) : (
          <ChakraLink
            as={Link}
            href="/app"
            display="flex"
            alignItems="center"
            gap="2"
            color={isPrototype ? "#1f2937" : "#656E7B"}
            fontSize="xs"
            fontWeight="medium"
            transition="opacity 0.24s ease"
            _hover={{ opacity: 0.8 }}
            _focusVisible={focusRing}
          >
            <UserIcon size={16} />
            Log in / Sign Up
          </ChakraLink>
        )}
      </Flex>
    </Flex>
  );
}

export default PageHeader;
