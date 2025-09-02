import { Flex, Heading, Button, Progress, Badge } from "@chakra-ui/react";
import LclLogo from "./LclLogo";
import { LifebuoyIcon, UserIcon, FlaskIcon } from "@phosphor-icons/react";
import useAuthStore from "../store/authStore";

function PageHeader() {
  const { userEmail, usedPrompts, totalPrompts } = useAuthStore();

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
      <Flex gap="3" alignItems="center">
        <LclLogo width={16} avatarOnly />
        <Heading as="h1" size="sm" color="fg.inverted">
          Global Nature Watch
        </Heading>
        <Badge
          bg="blue.800"
          color="blue.100"
          borderRadius="4px"
          px={1}
          py={0.5}
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={1}
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

        <Button
          asChild
          variant="solid"
          colorPalette="primary"
          _hover={{ bg: "primary.fg" }}
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
