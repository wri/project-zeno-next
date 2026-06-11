"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Flex,
  Heading,
  Select,
  Checkbox,
  Grid,
  GridItem,
  Portal,
  Input,
  Field,
  Separator,
  createListCollection,
  Container,
} from "@chakra-ui/react";
import { FloppyDiskIcon, GearIcon } from "@phosphor-icons/react";
import { PatchProfileRequestSchema } from "@/app/schemas/api/auth/profile/patch";
import { toaster } from "@/app/components/ui/toaster";
import { apiFetch } from "@/app/lib/api-client";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import SettingsShell from "@/app/components/SettingsShell";

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
  preferredLanguage: string;
  topics: string[];
  receiveNewsEmails: boolean;
  helpTestFeatures: boolean;
};

type ValueChangeDetails = { value: string[] };

export default function UserSettingsPage() {
  const isReady = useAuthGuard();
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
    preferredLanguage: "",
    topics: [],
    receiveNewsEmails: false,
    helpTestFeatures: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, cfgRes] = await Promise.all([
          apiFetch("/api/auth/me", { cache: "no-store" }),
          apiFetch("/api/profile/config", { cache: "no-store" }),
        ]);
        if (cfgRes.ok) {
          const cfg: ProfileConfig = await cfgRes.json();
          setConfig(cfg);
        }
        if (meRes.ok) {
          const user = await meRes.json();
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
            preferredLanguage:
              user?.preferredLanguageCode ?? p.preferredLanguage,
            topics: Array.isArray(user?.topics) ? user.topics : p.topics,
            receiveNewsEmails: Boolean(
              user?.receiveNewsEmails ?? p.receiveNewsEmails
            ),
            helpTestFeatures: Boolean(
              user?.helpTestFeatures ?? p.helpTestFeatures
            ),
          }));
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

  const languages = useMemo(() => {
    const items = [
      { label: "English", value: "en" },
      { label: "Français", value: "fr" },
      { label: "Español", value: "es" },
      { label: "Português", value: "pt" },
      { label: "Bahasa Indonesia", value: "id" },
    ];
    return createListCollection({ items });
  }, []);

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
        preferred_language_code: form.preferredLanguage || null,
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

      const res = await apiFetch(`/api/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to save profile");
      }

      // Submit to Ortto directly from client (no secrets needed)
      const topicLabels = form.topics.map(
        (code) => config?.topics?.[code] || code
      );
      try {
        const orttoRes = await fetch(
          "https://ortto.wri.org/custom-forms/gnw/",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: form.email,
              firstName: form.firstName,
              lastName: form.lastName,
              sector: form.sector,
              jobTitle: form.jobTitle,
              companyOrganization: form.company,
              countryCode: form.country,
              Topics: topicLabels,
              receiveNewsEmails: form.receiveNewsEmails,
            }),
          }
        );
        console.log(
          "[Client] Ortto submission status:",
          orttoRes.status,
          orttoRes.ok ? "OK" : "FAILED"
        );
      } catch (e) {
        console.error("[Client] Ortto submission error:", e);
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

  if (!isReady) return null;

  return (
    <SettingsShell activePath="/dashboard">
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
                width="320px"
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
                width="320px"
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
                width="320px"
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
                width="320px"
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
                width="320px"
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

          {/* Preferred Language */}
          <GridItem>
            <Field.Root id="preferred-language">
              <Select.Root
                collection={languages}
                size="sm"
                width="320px"
                value={form.preferredLanguage ? [form.preferredLanguage] : []}
                onValueChange={(d: ValueChangeDetails) =>
                  setForm((p) => ({
                    ...p,
                    preferredLanguage: d.value[0] ?? "",
                  }))
                }
              >
                <Select.HiddenSelect />
                <Select.Label>Preferred language</Select.Label>
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="Select Language" />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content>
                      {languages.items.map((lang) => (
                        <Select.Item item={lang} key={lang.value}>
                          {lang.label}
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
              <Field.HelperText color="fg.muted" fontSize="xs" mt={1}>
                Please note most of our communications are in English.
              </Field.HelperText>
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
                  Send me news, resources, and opportunities from Land & Carbon
                  Lab.
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
    </SettingsShell>
  );
}
