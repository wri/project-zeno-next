import { Flex, Heading, Button, Progress } from "@chakra-ui/react";
import LclLogo from "./LclLogo";
import { LifebuoyIcon, UserIcon } from "@phosphor-icons/react";
import useAuthStore from "../store/authStore";

function PageHeader() {
  const { userEmail } = useAuthStore();

  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      px="5"
      py="2"
      h="12"
      bg="blue.900"
      color="fg.inverted"
    >
      <Flex gap="2">
        <LclLogo width={16} avatarOnly />
        <Heading as="h1" size="sm">
          Global Nature Watch
        </Heading>
      </Flex>
      <Flex gap="6" alignItems="center">
        <Button
          variant="solid"
          bg="blue.900"
          _hover={{ bg: "blue.800" }}
          size="sm"
        >
          <LifebuoyIcon />
          Help
        </Button>

        <Progress.Root
          size="xs"
          min={0}
          max={100}
          value={40}
          minW="6rem"
          textAlign="center"
          rounded="full"
          colorPalette="blue"
        >
          <Progress.Label
            mb="0.5"
            fontSize="xs"
            fontWeight="normal"
            color="blue.100"
          >
            40/100 Prompts
          </Progress.Label>
          <Progress.Track bg="blue.950" maxH="4px">
            <Progress.Range bg="white" />
          </Progress.Track>
        </Progress.Root>

        <Button
          asChild
          variant="solid"
          bg="blue.900"
          _hover={{ bg: "blue.800" }}
          size="sm"
        >
          <Flex>
            <UserIcon />
            <a href="#">{userEmail || "User name"}</a>
          </Flex>
        </Button>
      </Flex>
    </Flex>
  );
}

export default PageHeader;
