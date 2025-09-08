"use client";
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Heading,
  Select,
  Progress,
  Checkbox,
  Grid,
  GridItem,
  Portal,
  Input,
  Textarea,
  Field,
  Separator,
  createListCollection,
  Text,
  Container,
} from "@chakra-ui/react";
import {
  ChatsIcon,
  FloppyDiskIcon,
  GearIcon,
  LifebuoyIcon,
  ShapesIcon,
  SignOutIcon,
  UserIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import LclLogo from "../components/LclLogo";

const sectors = createListCollection({
  items: [
    { label: "Tech", value: "tech" },
    { label: "Healthcare", value: "healthcare" },
    { label: "Finance", value: "finance" },
  ],
});
const roles = createListCollection({
  items: [
    { label: "Developer", value: "Developer" },
    { label: "Designer", value: "Designer" },
    { label: "Manager", value: "Manager" },
  ],
});
const expertises = createListCollection({
  items: [
    { label: "Beginner", value: "Beginner" },
    { label: "Intermediate", value: "Intermediate" },
    { label: "Expert", value: "Expert" },
  ],
});
const countries = createListCollection({
  items: [
    { label: "USA", value: "USA" },
    { label: "UK", value: "UK" },
    { label: "Spain", value: "Spain" },
    { label: "India", value: "India" },
    { label: "Portugal", value: "Portugal" },
    { label: "Brazil", value: "Brazil" },
    { label: "Canada", value: "Canada" },
    { label: "Switzerland", value: "Switzerland" },
    { label: "France", value: "France" },
    { label: "Lebanon", value: "Lebanon" },
  ],
});
export default function UserSettingsPage() {
  return (
    <Box
      display="grid"
      gridTemplateColumns="20rem 1fr"
      height="100vh"
      maxH="100vh"
    >
      <Flex flexDir="column" bg="bg.subtle" px={6} py={8} maxH="100%" gap={6}>
        <Heading display="flex" alignItems="center" gap="2">
          <LclLogo width={16} avatarOnly />
          Global Nature Watch
        </Heading>
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
          <Button asChild>
            <Link href="#">
              <ChatsIcon />
              Conversations
            </Link>
          </Button>
          <Button asChild>
            <Link href="#">
              <ShapesIcon />
              Templates
            </Link>
          </Button>
          <Button asChild bg="white">
            <Link href="#">
              {" "}
              <GearIcon />
              User Settings
            </Link>
          </Button>
          <Button asChild>
            <Link href="#">
              <LifebuoyIcon />
              Help
            </Link>
          </Button>
        </ButtonGroup>
        <Box p={4} mt="auto" bg="bg" rounded="lg">
          <Heading size="xs" as="p" color="fg.muted">
            Available Prompts
          </Heading>
          <Progress.Root
            size="xs"
            min={0}
            max={100}
            value={40}
            minW="6rem"
            rounded="full"
            colorPalette="primary"
          >
            <Progress.Label
              mb={2}
              fontSize="xs"
              fontWeight="normal"
              color="fg.subtle"
            >
              40/100
            </Progress.Label>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </Box>
        <Button
          size="sm"
          w="full"
          gap={2}
          variant="outline"
          justifyContent="flex-start"
        >
          <UserIcon />
          <Text mr="auto">Username</Text>
          <SignOutIcon />
        </Button>
      </Flex>
      <Box maxH="100%" overflowY="auto">
        <Container maxW="4xl" display="flex" flexDirection="column" py={10}>
          {/* Header Section */}
          <Flex
            justifyContent="space-between"
            alignItems="center"
            mb={8}
            flexWrap="wrap"
          >
            <Flex alignItems="center" gap={2} color="fg.muted">
              <GearIcon size={24} />
              <Heading as="h1" size="2xl" fontWeight="normal">
                User Settings
              </Heading>
            </Flex>
            <Button colorPalette="primary" mt={{ base: 4, md: 0 }} size="sm">
              <FloppyDiskIcon />
              Save changes
            </Button>
          </Flex>

          {/* Form Grid Layout */}
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
            {/* First Name */}
            <GridItem>
              <Field.Root id="first-name">
                <Field.Label>First name</Field.Label>
                <Input type="text" defaultValue="Alyssa" />
              </Field.Root>
            </GridItem>

            {/* Last Name */}
            <GridItem>
              <Field.Root id="last-name">
                <Field.Label>Last name</Field.Label>
                <Input type="text" defaultValue="Barrett" />
              </Field.Root>
            </GridItem>

            {/* Email Address */}
            <GridItem>
              <Field.Root id="email">
                <Field.Label>Email address</Field.Label>
                <Input type="email" defaultValue="alyssa.barrett@wri.org" />
              </Field.Root>
            </GridItem>

            {/* Newsletter Subscription */}
            <GridItem>
              <Checkbox.Root>
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>Subscribe to our newsletter</Checkbox.Label>
              </Checkbox.Root>
            </GridItem>
          </Grid>

          <Separator borderColor="border" my={8} />

          {/* Second Section of the Form */}
          <Heading size="xs" color="fg.subtle" fontWeight="normal">
            Additional Details (Optional)
          </Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
            {/* Sector */}
            <GridItem>
              <Field.Root id="sector">
                <Select.Root collection={sectors} size="sm" width="320px">
                  <Select.HiddenSelect />
                  <Select.Label>Sector</Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Select Sector" />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {sectors.items.map((sector) => (
                          <Select.Item item={sector} key={sector.value}>
                            {sector.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </Field.Root>
            </GridItem>

            {/* Role */}
            <GridItem>
              <Field.Root id="role">
                <Select.Root collection={roles} size="sm" width="320px">
                  <Select.HiddenSelect />
                  <Select.Label>Role</Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Select Role" />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {roles.items.map((role) => (
                          <Select.Item item={role} key={role.value}>
                            {role.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </Field.Root>
            </GridItem>

            {/* Job Title */}
            <GridItem>
              <Field.Root id="job-title">
                <Field.Label>Job title</Field.Label>
                <Input type="text" />
              </Field.Root>
            </GridItem>

            {/* Company / Organization */}
            <GridItem>
              <Field.Root id="company">
                <Field.Label>Company / Organization</Field.Label>
                <Input type="text" />
              </Field.Root>
            </GridItem>

            {/* Country */}
            <GridItem>
              <Field.Root id="country">
                <Select.Root collection={countries} size="sm" width="320px">
                  <Select.HiddenSelect />
                  <Select.Label>Country</Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Select Country" />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {countries.items.map((country) => (
                          <Select.Item item={country} key={country.value}>
                            {country.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </Field.Root>
            </GridItem>

            {/* Level of technical expertise */}
            <GridItem>
              <Field.Root id="expertise">
                <Select.Root collection={expertises} size="sm" width="320px">
                  <Select.HiddenSelect />
                  <Select.Label>Level of technical expertise</Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Select Level of technical expertise" />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {expertises.items.map((expertise) => (
                          <Select.Item item={expertise} key={expertise.value}>
                            {expertise.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </Field.Root>
            </GridItem>

            {/* Areas of Interest */}
            <GridItem colSpan={{ base: 1, md: 2 }}>
              <Field.Root id="interests">
                <Field.Label>
                  What area(s) are you most interested in?
                </Field.Label>
                <Textarea placeholder="Enter your interests here..." rows={4} />
              </Field.Root>
            </GridItem>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
