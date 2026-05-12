"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Box, Flex, HStack, Text, Badge } from "@chakra-ui/react";
import {
  ChatCircleIcon,
  TrayIcon,
  FileTextIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import LclLogo from "@/app/components/LclLogo";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "fill" }>;
  matchPrefix: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Chat", icon: ChatCircleIcon, matchPrefix: "/app" },
  { href: "/inbox", label: "Inbox", icon: TrayIcon, matchPrefix: "/inbox" },
  {
    href: "/reports",
    label: "Reports",
    icon: FileTextIcon,
    matchPrefix: "/reports",
  },
  {
    href: "/dashboards",
    label: "Dashboards",
    icon: SquaresFourIcon,
    matchPrefix: "/dashboards",
  },
];

export default function PrototypeNav() {
  const pathname = usePathname();

  return (
    <Box
      as="nav"
      position="sticky"
      top={0}
      zIndex={50}
      bg="bg"
      borderBottom="1px solid"
      borderColor="border"
      px={6}
      py={2}
    >
      <Flex align="center" gap={6}>
        <Link
          href="/app"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <LclLogo width={14} avatarOnly />
          <Text fontSize="sm" fontWeight="semibold" color="fg">
            Global Nature Watch
          </Text>
        </Link>
        <HStack gap={1}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.matchPrefix === "/app"
                ? pathname === "/app" || pathname.startsWith("/app/")
                : pathname === item.matchPrefix ||
                  pathname.startsWith(`${item.matchPrefix}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ textDecoration: "none" }}
              >
                <HStack
                  gap={2}
                  px={3}
                  py={1.5}
                  rounded="md"
                  bg={active ? "bg.muted" : "transparent"}
                  color={active ? "primary.fg" : "fg.muted"}
                  fontSize="sm"
                  fontWeight="medium"
                  _hover={{ bg: "bg.muted", color: "fg" }}
                  transition="background 0.12s, color 0.12s"
                >
                  <Icon size={16} weight={active ? "fill" : "regular"} />
                  <Text>{item.label}</Text>
                </HStack>
              </Link>
            );
          })}
        </HStack>
        <Badge
          ml="auto"
          variant="subtle"
          colorPalette="purple"
          fontSize="2xs"
          textTransform="uppercase"
          letterSpacing="wider"
        >
          Prototype
        </Badge>
      </Flex>
    </Box>
  );
}
