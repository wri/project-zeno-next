import {
  Flex,
  Heading,
  Button,
  Progress,
  Badge,
  Menu,
  Portal,
} from "@chakra-ui/react";
import LclLogo from "./LclLogo";
import { LifebuoyIcon, SignOutIcon, UserIcon } from "@phosphor-icons/react";
import useAuthStore from "../store/authStore";
import { useRouter } from 'next/navigation'

function PageHeader() {
  const { userEmail, usedPrompts, totalPrompts, isAuthenticated } =
    useAuthStore();
    const router = useRouter()

  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      px="5"
      py="2"
      h="12"
      bg="primary.solid"
      color="fg.inverted"
    >
      <Flex gap="2" alignItems="center">
        <LclLogo width={16} avatarOnly />
        <Heading as="h1" size="sm" color="fg.inverted">
          Global Nature Watch
        </Heading>
        <Badge
          colorPalette="primary"
          bg="primary.800"
          letterSpacing="wider"
          variant="solid"
          size="xs"
        >
          BETA
        </Badge>
      </Flex>
      <Flex gap="6" alignItems="center">
        <Button
          variant="solid"
          colorPalette="primary"
          _hover={{ bg: "primary.fg" }}
          size="sm"
        >
          <LifebuoyIcon />
          Help
        </Button>

        <Progress.Root
          size="xs"
          min={0}
          max={100}
          value={(usedPrompts / totalPrompts) * 100}
          minW="6rem"
          textAlign="center"
          rounded="full"
          colorPalette="primary"
        >
          <Progress.Label
            mb="0.5"
            fontSize="xs"
            fontWeight="normal"
            color="primary.100"
          >
            {usedPrompts}/{totalPrompts} Prompts
          </Progress.Label>
          <Progress.Track bg="primary.950" maxH="4px">
            <Progress.Range bg="white" />
          </Progress.Track>
        </Progress.Root>
        {isAuthenticated ? (
          <Menu.Root navigate={({ value, node }) => router.push(`/${value}`)}>
            <Menu.Trigger asChild>
              <Button
                variant="solid"
                colorPalette="primary"
                _hover={{ bg: "primary.fg" }}
                size="sm"
              >
                <UserIcon />
                {userEmail || "User name"}
              </Button>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item value="">Homepage</Menu.Item>
                  <Menu.Item value="dashboard">Settings</Menu.Item>
                  <Menu.Item value="about">About</Menu.Item>
                  <Menu.Separator />
                  <Menu.Item
                    value="logout"
                  >
                    <SignOutIcon />
                    Logout
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        ) : (
          <Button
            asChild
            variant="solid"
            colorPalette="primary"
            _hover={{ bg: "primary.fg" }}
            size="sm"
          >
            <Flex>
              <UserIcon />
              <a href="/signup">Log in / Sign Up</a>
            </Flex>
          </Button>
        )}
      </Flex>
    </Flex>
  );
}

export default PageHeader;
