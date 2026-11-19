import { ReactNode } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Heading,
  Text,
  Link as ChakraLink,
} from "@chakra-ui/react";
import {
  ChartBarIcon,
  ExamIcon,
  LifebuoyIcon,
  SignOutIcon,
  UserCircleIcon,
  UserIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { Link } from "@/src/shared/lib/router";
import { useTranslation } from "@/src/shared/lib/i18n";
import useAuthStore from "@/app/store/authStore";
import { useLogout } from "@/app/hooks/useLogout";
import { PREVIEW_HELP_CENTER_URL } from "@/app/constants/preview-content";
import AvailablePromptsCard from "./AvailablePromptsCard";
import BackToMapLink from "./BackToMapLink";

type SettingsPath =
  | "/dashboard"
  | "/manage-users"
  | "/trace-analytics"
  | "/evals";

interface SettingsShellProps {
  activePath: SettingsPath;
  children: ReactNode;
}

export default function SettingsShell({
  activePath,
  children,
}: SettingsShellProps) {
  const { t } = useTranslation();
  const { userEmail, userType } = useAuthStore();
  const { logout } = useLogout();

  return (
    <Box
      display="grid"
      gridTemplateColumns="20rem 1fr"
      height="100vh"
      maxH="100vh"
    >
      <Flex flexDir="column" bg="bg.subtle" px={6} py={8} maxH="100%" gap={6}>
        <BackToMapLink />
        <ChakraLink
          as={Link}
          href="/"
          display="flex"
          alignItems="center"
          gap="2"
          transition="opacity 0.24s ease"
          _hover={{ opacity: 0.8, textDecor: "none" }}
        >
          <Heading m={0}>
            Global Nature Watch{" "}
            <Text as="span" fontWeight="normal">
              Horizon
            </Text>
          </Heading>
        </ChakraLink>
        <ButtonGroup
          size="sm"
          w="full"
          gap={2}
          variant="outline"
          _hover={{ "& > :not(:hover)": { opacity: "0.5" } }}
          css={{ "& > *": { justifyContent: "flex-start", width: "100%" } }}
          colorPalette="gray"
          orientation="vertical"
          alignItems="stretch"
        >
          <Button
            asChild
            bg={activePath === "/dashboard" ? "bg.muted" : undefined}
          >
            <Link href="/dashboard">
              <UserCircleIcon />
              {t("account.profile")}
            </Link>
          </Button>
          {userType === "superuser" && (
            <Button
              asChild
              bg={activePath === "/manage-users" ? "bg.muted" : undefined}
            >
              <Link href="/manage-users">
                <UsersThreeIcon />
                Manage Users
              </Link>
            </Button>
          )}
          {userType === "superuser" && (
            <Button
              asChild
              bg={activePath === "/trace-analytics" ? "bg.muted" : undefined}
            >
              <Link href="/trace-analytics">
                <ChartBarIcon />
                Trace Analytics
              </Link>
            </Button>
          )}
          {userType === "superuser" && (
            <Button
              asChild
              bg={activePath === "/evals" ? "bg.muted" : undefined}
            >
              <Link href="/evals">
                <ExamIcon />
                Evals
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={PREVIEW_HELP_CENTER_URL} target="_blank">
              <LifebuoyIcon />
              {t("nav.help")}
            </Link>
          </Button>
        </ButtonGroup>
        <Box mt="auto" bg="bg" rounded="sm">
          <AvailablePromptsCard />
        </Box>
        <Button
          size="sm"
          w="full"
          gap={2}
          variant="outline"
          justifyContent="flex-start"
          onClick={logout}
          title={t("account.signOut")}
        >
          <UserIcon />
          <Text mr="auto" truncate maxW="180px">
            {userEmail || t("settings.user")}
          </Text>
          <SignOutIcon />
        </Button>
      </Flex>
      <Box maxH="100%" overflowY="auto">
        {children}
      </Box>
    </Box>
  );
}
