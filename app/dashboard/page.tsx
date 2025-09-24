"use client";
import { useEffect, useMemo, useState } from "react";
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
  Field,
  Separator,
  createListCollection,
  Text,
  Container,
  Link as ChakraLink,
} from "@chakra-ui/react";
import {
  FloppyDiskIcon,
  GearIcon,
  LifebuoyIcon,
  SignOutIcon,
  UserIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import LclLogo from "../components/LclLogo";
import { PatchProfileRequestSchema } from "@/app/schemas/api/auth/profile/patch";
import { toaster } from "@/app/components/ui/toaster";

type ProfileConfig = {
  sectors: Record<string, string>;
  sector_roles: Record<string, Record<string, string>>;
  countries: Record<string, string>;
  languages: Record<string, string>;
  gis_expertise_levels: Record<string, string>;
  topics?: Record<string, string>;
};

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  sector: string;
  role: string;
  jobTitle: string;
  company: string;
  country: string;
  expertise: string;
  topics: string[];
  receiveNewsEmails: boolean;
  helpTestFeatures: boolean;
};

type ValueChangeDetails = { value: string[] };

export default function UserSettingsPage() {
  const [config, setConfig] = useState<ProfileConfig | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
    email: "",
    sector: "",
    role: "",
    jobTitle: "",
    company: "",
    country: "",
    expertise: "",
    topics: [],
    receiveNewsEmails: false,
    helpTestFeatures: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [promptUsage, setPromptUsage] = useState<{
    used: number;
    quota: number;
  }>({ used: 0, quota: 100 });

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, cfgRes] = await Promise.all([
          fetch("/api/proxy/auth/me", { cache: "no-store" }),
          fetch("/api/proxy/profile/config", { cache: "no-store" }),
        ]);
        if (cfgRes.ok) {
          const cfg: ProfileConfig = await cfgRes.json();
          setConfig(cfg);
        }
        if (meRes.ok) {
          const data = await meRes.json();
          const user = data;
          console.log("user", user);
          setForm((p) => ({
            ...p,
            firstName: user?.firstName ?? p.firstName,
            lastName: user?.lastName ?? p.lastName,
            email: user?.email ?? p.email,
            sector: user?.sectorCode ?? p.sector,
            role: user?.roleCode ?? p.role,
            jobTitle: user?.jobTitle ?? p.jobTitle,
            company: user?.companyOrganization ?? p.company,
            country: user?.countryCode ?? p.country,
            expertise: user?.gisExpertiseLevel ?? p.expertise,
            topics: Array.isArray(user?.topics) ? user.topics : p.topics,
            receiveNewsEmails: Boolean(
              user?.receiveNewsEmails ?? p.receiveNewsEmails
            ),
            helpTestFeatures: Boolean(
              user?.helpTestFeatures ?? p.helpTestFeatures
            ),
          }));

          const used =
            typeof user?.promptsUsed === "number" ? user.promptsUsed : 0;
          const quotaRaw =
            typeof user?.promptQuota === "number" ? user.promptQuota : 0;
          const quota = quotaRaw > 0 ? quotaRaw : 100;
          setPromptUsage({ used: Math.max(0, Math.min(used, quota)), quota });
        }
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const sectors = useMemo(() => {
    const items = config
      ? Object.entries(config.sectors).map(([value, label]) => ({
          label,
          value,
        }))
      : [];
    return createListCollection({ items });
  }, [config]);

  const roles = useMemo(() => {
    const roleMap = config?.sector_roles?.[form.sector] || {};
    const items = Object.entries(roleMap).map(([value, label]) => ({
      label,
      value,
    }));
    return createListCollection({ items });
  }, [config, form.sector]);

  // Clear role if not valid for current sector
  useEffect(() => {
    const valid = roles.items.some((i) => i.value === form.role);
    if (!valid && form.role) {
      setForm((p) => ({ ...p, role: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);

  const expertises = useMemo(() => {
    const items = config
      ? Object.entries(config.gis_expertise_levels).map(([value, label]) => ({
          label,
          value,
        }))
      : [];
    return createListCollection({ items });
  }, [config]);

  const countries = useMemo(() => {
    const items = config
      ? Object.entries(config.countries).map(([value, label]) => ({
          label,
          value,
        }))
      : [];
    return createListCollection({ items });
  }, [config]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = PatchProfileRequestSchema.parse({
        first_name: form.firstName,
        last_name: form.lastName,
        profile_description: undefined,
        sector_code: form.sector || null,
        role_code: form.role || null,
        job_title: form.jobTitle || null,
        company_organization: form.company || null,
        country_code: form.country || null,
        preferred_language_code: null,
        gis_expertise_level: form.expertise || null,
        // Only send when there are selections; omit the key to avoid clearing inadvertently
        topics:
          Array.isArray(form.topics) && form.topics.length
            ? form.topics
            : undefined,
        receive_news_emails: form.receiveNewsEmails,
        help_test_features: form.helpTestFeatures,
        has_profile: true,
      });

      const res = await fetch(`/api/proxy/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to save profile");
      }
      toaster.create({
        title: "Profile saved",
        description: "Your changes have been saved successfully.",
        type: "success",
        duration: 3000,
      });
    } catch (err) {
      console.error(err);
      toaster.create({
        title: "Save failed",
        description: (err as Error)?.message || "Unable to save profile.",
        type: "error",
        duration: 4000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    try {
      toaster.create({
        title: "Logging out",
        description: "Signing you out and redirecting…",
        type: "info",
        duration: 8000,
      });
    } catch {}
    (async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {}
      const url = new URL("https://api.resourcewatch.org/auth/logout");
      url.searchParams.set("callbackUrl", `${window.location.origin}/`);
      url.searchParams.set("origin", "gnw");
      window.location.href = url.toString();
    })();
  };

  return (
    <Box
      display="grid"
      gridTemplateColumns="20rem 1fr"
      height="100vh"
      maxH="100vh"
    >
      <Flex flexDir="column" bg="bg.subtle" px={6} py={8} maxH="100%" gap={6}>
        <ChakraLink
          as={Link}
          href="/"
          display="flex"
          alignItems="center"
          gap="2"
          transition="opacity 0.24s ease"
          _hover={{ opacity: 0.8, textDecor: "none" }}
        >
          <LclLogo width={16} avatarOnly />
          <Heading m={0}>Global Nature Watch</Heading>
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
          {/* <Button asChild>
            <Link href="#">
              <ChatsIcon />
              Conversations
            </Link>
          </Button> */}
          {/* <Button asChild>
            <Link href="#">
              <ShapesIcon />
              Templates
            </Link>
          </Button> */}
          <Button asChild bg="white">
            <Link href="#">
              {" "}
              <GearIcon />
              User Settings
            </Link>
          </Button>
          <Button asChild>
            <Link href="https://help.globalnaturewatch.org/" target="_blank">
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
            max={promptUsage.quota}
            value={promptUsage.used}
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
              {promptUsage.used}/{promptUsage.quota}
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
          onClick={handleLogout}
          title="Sign Out"
        >
          <UserIcon />
          <Text mr="auto">{form.email || "User"}</Text>
          <SignOutIcon />
        </Button>
      </Flex>
      <Box maxH="100%" overflowY="auto">
        <Container maxW="4xl" display="flex" flexDirection="column" py={16}>
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
            <Button
              colorPalette="primary"
              mt={{ base: 4, md: 0 }}
              size="sm"
              onClick={handleSave}
              loading={isSaving}
              disabled={isSaving}
            >
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
                <Input
                  type="text"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, firstName: e.target.value }))
                  }
                />
              </Field.Root>
            </GridItem>

            {/* Last Name */}
            <GridItem>
              <Field.Root id="last-name">
                <Field.Label>Last name</Field.Label>
                <Input
                  type="text"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lastName: e.target.value }))
                  }
                />
              </Field.Root>
            </GridItem>

            {/* Email Address */}
            <GridItem>
              <Field.Root id="email">
                <Field.Label>Email address</Field.Label>
                <Input
                  type="email"
                  value={form.email}
                  readOnly
                  _readOnly={{
                    bg: "bg.subtle",
                    color: "fg.muted",
                    cursor: "not-allowed",
                  }}
                />
              </Field.Root>
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
                <Select.Root
                  collection={sectors}
                  size="sm"
                  width="320px"
                  value={form.sector ? [form.sector] : []}
                  onValueChange={(d: ValueChangeDetails) =>
                    setForm((p) => ({ ...p, sector: d.value[0] ?? "" }))
                  }
                >
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
                <Select.Root
                  collection={roles}
                  size="sm"
                  width="320px"
                  disabled={!form.sector}
                  value={form.role ? [form.role] : []}
                  onValueChange={(d: ValueChangeDetails) =>
                    setForm((p) => ({ ...p, role: d.value[0] ?? "" }))
                  }
                >
                  <Select.HiddenSelect />
                  <Select.Label>Role</Select.Label>
                  <Select.Control
                    _disabled={{
                      bg: "bg.subtle",
                    }}
                  >
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
                <Input
                  type="text"
                  value={form.jobTitle}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, jobTitle: e.target.value }))
                  }
                />
              </Field.Root>
            </GridItem>

            {/* Company / Organization */}
            <GridItem>
              <Field.Root id="company">
                <Field.Label>Company / Organization</Field.Label>
                <Input
                  type="text"
                  value={form.company}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, company: e.target.value }))
                  }
                />
              </Field.Root>
            </GridItem>

            {/* Country */}
            <GridItem>
              <Field.Root id="country">
                <Select.Root
                  collection={countries}
                  size="sm"
                  width="320px"
                  value={form.country ? [form.country] : []}
                  onValueChange={(d: ValueChangeDetails) =>
                    setForm((p) => ({ ...p, country: d.value[0] ?? "" }))
                  }
                >
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
                <Select.Root
                  collection={expertises}
                  size="sm"
                  width="320px"
                  value={form.expertise ? [form.expertise] : []}
                  onValueChange={(d: ValueChangeDetails) =>
                    setForm((p) => ({ ...p, expertise: d.value[0] ?? "" }))
                  }
                >
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

            {/* Topics (from profile) */}
            <GridItem colSpan={{ base: 1, md: 2 }}>
              <Field.Root id="topics">
                <Field.Label>
                  What area(s) are you most interested in?
                </Field.Label>
                <Flex gap={2} flexWrap="wrap" pt={2}>
                  {Object.entries(config?.topics || {}).map(([code, label]) => {
                    const selected = form.topics.includes(code);
                    return (
                      <Button
                        key={code}
                        size="xs"
                        h={6}
                        borderRadius="full"
                        colorPalette={selected ? "primary" : undefined}
                        variant={selected ? undefined : "outline"}
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            topics: selected
                              ? p.topics.filter((i) => i !== code)
                              : [...p.topics, code],
                          }))
                        }
                      >
                        {label}
                      </Button>
                    );
                  })}
                </Flex>
              </Field.Root>
            </GridItem>
            {/* Opt-in Checkboxes */}
            <GridItem colSpan={{ base: 1, md: 2 }}>
              <Flex direction="column" gap={2} pt={2}>
                <Checkbox.Root
                  checked={form.receiveNewsEmails}
                  onCheckedChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      receiveNewsEmails: Boolean(e.checked),
                    }))
                  }
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>
                    Send me news, resources, and opportunities from Land &
                    Carbon Lab.
                  </Checkbox.Label>
                </Checkbox.Root>
                <Checkbox.Root
                  checked={form.helpTestFeatures}
                  onCheckedChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      helpTestFeatures: Boolean(e.checked),
                    }))
                  }
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>
                    Contact me about testing new features.
                  </Checkbox.Label>
                </Checkbox.Root>
              </Flex>
            </GridItem>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
