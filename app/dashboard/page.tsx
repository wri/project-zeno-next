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
  Text,
  createListCollection,
  Container,
} from "@chakra-ui/react";
import {
  ArrowSquareOutIcon,
  FloppyDiskIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { PatchProfileRequestSchema } from "@/app/schemas/api/auth/profile/patch";
import { toaster } from "@/app/components/ui/toaster";
import { apiFetch } from "@/app/lib/api-client";
import { orttoTopicLabels, submitOrttoProfile } from "@/app/lib/ortto";
import { parseAuthMe } from "@/app/lib/auth-me";
import type { ProfileConfig } from "@/app/schemas/api/profile/config";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import useAuthStore from "@/app/store/authStore";
import SettingsShell from "@/app/components/SettingsShell";
import { isProfileFieldRequired } from "@/app/config/profile-fields";
import { getSettingsFormSchema } from "@/app/dashboard/schema";
import RequirementHint from "@/app/components/RequirementHint";
import { TopicPills, toggleTopic } from "@/app/components/TopicPills";
import { ACCOUNT_DELETION_URL } from "@/app/dashboard/account-deletion";
import { adoptPreferredLocale, useTranslation } from "@/src/shared/lib/i18n";

/**
 * Every sector's "Other:" role. Choosing it relabels Job title as "Your role",
 * so the free text lands in job_title (the profile has no field of its own).
 */
const OTHER_ROLE = "other";

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

export default function UserProfilePage() {
  const { t } = useTranslation();
  const isReady = useAuthGuard();
  const fieldRequired = isProfileFieldRequired;
  const schema = useMemo(() => getSettingsFormSchema(), []);
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
  const isValid = useMemo(() => schema.safeParse(form).success, [schema, form]);

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
    if (!isValid || isSaving) return;
    setIsSaving(true);
    try {
      // Validated against REQUIRED_PROFILE_FIELDS
      const validated = schema.parse(form);
      const payload = PatchProfileRequestSchema.parse({
        first_name: validated.firstName,
        last_name: validated.lastName,
        profile_description: undefined,
        sector_code: validated.sector || null,
        role_code: validated.role || null,
        job_title: validated.jobTitle || null,
        company_organization: validated.company || null,
        country_code: validated.country || null,
        preferred_language_code: validated.preferredLanguage || null,
        gis_expertise_level: validated.expertise || null,
        // Only send when there are selections; omit the key to avoid clearing inadvertently
        topics: validated.topics?.length ? validated.topics : undefined,
        receive_news_emails: form.receiveNewsEmails,
        help_test_features: form.helpTestFeatures,
        has_profile: true,
      });

      const previousLanguage = useAuthStore.getState().preferredLanguageCode;
      const res = await apiFetch(`/api/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Failed to save profile (${res.status})`);
      }
      // This page is where "Complete your profile" leads, so the reminder
      // (menu item, in-chat asks) must stop without a reload.
      const { status } = parseAuthMe(await res.json());
      if (status) useAuthStore.getState().setAuthStatus(status);
      // A new preferred language also resets this device's display language,
      // or nothing would visibly change after saving (PZB-1722).
      if ((payload.preferred_language_code ?? null) !== previousLanguage)
        adoptPreferredLocale(payload.preferred_language_code);

      // Submit to Ortto directly from client (no secrets needed)
      await submitOrttoProfile({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        sector: form.sector,
        jobTitle: form.jobTitle,
        companyOrganization: form.company,
        countryCode: form.country,
        Topics: orttoTopicLabels(form.topics, config?.topics),
        receiveNewsEmails: form.receiveNewsEmails,
      });

      toaster.create({
        title: t("profile.saved.title"),
        description: t("profile.saved.description"),
        type: "success",
        duration: 3000,
      });
    } catch (err) {
      console.error(err);
      toaster.create({
        title: t("profile.saveFailed.title"),
        description: t("profile.saveFailed.description"),
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
            <UserCircleIcon size={24} />
            <Heading as="h1" size="2xl" fontWeight="normal">
              {t("account.profile")}
            </Heading>
          </Flex>
          <Button
            colorPalette="primary"
            mt={{ base: 4, md: 0 }}
            size="sm"
            onClick={handleSave}
            loading={isSaving}
            disabled={!isValid || isSaving}
          >
            <FloppyDiskIcon />
            {t("profile.save")}
          </Button>
        </Flex>

        <Text color="fg.muted" fontSize="xs" mb={6}>
          <Text as="span" color="red.500">
            *
          </Text>{" "}
          {t("profile.required")}
        </Text>

        {/* Form Grid Layout */}
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
          {/* First Name */}
          <GridItem>
            <Field.Root id="first-name" required={fieldRequired("firstName")}>
              <Field.Label>
                {t("profile.firstName")}
                <RequirementHint field="firstName" />
              </Field.Label>
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
            <Field.Root id="last-name" required={fieldRequired("lastName")}>
              <Field.Label>
                {t("profile.lastName")}
                <RequirementHint field="lastName" />
              </Field.Label>
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
            <Field.Root id="email" required={fieldRequired("email")}>
              <Field.Label>
                {t("profile.email")}
                <RequirementHint field="email" />
              </Field.Label>
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
          {t("profile.additional")}
        </Heading>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
          {/* Sector */}
          <GridItem>
            <Field.Root id="sector" required={fieldRequired("sector")}>
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
                <Select.Label>
                  {t("profile.sector")}
                  <RequirementHint field="sector" />
                </Select.Label>
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText
                      placeholder={t("profile.sector.placeholder")}
                    />
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
            <Field.Root id="role" required={fieldRequired("role")}>
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
                <Select.Label>
                  {t("profile.role")}
                  <RequirementHint field="role" />
                </Select.Label>
                <Select.Control
                  _disabled={{
                    bg: "bg.subtle",
                  }}
                >
                  <Select.Trigger>
                    <Select.ValueText
                      placeholder={t("profile.role.placeholder")}
                    />
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

          {/* Job Title: asked as "Your role" when the role is Other */}
          <GridItem>
            <Field.Root id="job-title" required={fieldRequired("jobTitle")}>
              <Field.Label>
                {form.role === OTHER_ROLE
                  ? t("profile.yourRole")
                  : t("profile.jobTitle")}
                <RequirementHint field="jobTitle" />
              </Field.Label>
              <Input
                type="text"
                width="320px"
                placeholder={
                  form.role === OTHER_ROLE
                    ? t("profile.yourRole.placeholder")
                    : undefined
                }
                value={form.jobTitle}
                onChange={(e) =>
                  setForm((p) => ({ ...p, jobTitle: e.target.value }))
                }
              />
            </Field.Root>
          </GridItem>

          {/* Company / Organization */}
          <GridItem>
            <Field.Root id="company" required={fieldRequired("company")}>
              <Field.Label>
                {t("profile.company")}
                <RequirementHint field="company" />
              </Field.Label>
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
            <Field.Root id="country" required={fieldRequired("country")}>
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
                <Select.Label>
                  {t("profile.country")}
                  <RequirementHint field="country" />
                </Select.Label>
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText
                      placeholder={t("profile.country.placeholder")}
                    />
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
            <Field.Root id="expertise" required={fieldRequired("expertise")}>
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
                <Select.Label>
                  {t("profile.expertise")}
                  <RequirementHint field="expertise" />
                </Select.Label>
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText
                      placeholder={t("profile.expertise.placeholder")}
                    />
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
            <Field.Root
              id="preferred-language"
              required={fieldRequired("preferredLanguage")}
            >
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
                <Select.Label>
                  {t("profile.language")}
                  <RequirementHint field="preferredLanguage" />
                </Select.Label>
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText
                      placeholder={t("profile.language.placeholder")}
                    />
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
                {t("profile.language.note")}
              </Field.HelperText>
            </Field.Root>
          </GridItem>

          {/* Topics (from profile) */}
          <GridItem colSpan={{ base: 1, md: 2 }}>
            <Field.Root id="topics" required={fieldRequired("topics")}>
              <Field.Label>
                {t("profile.topics")}
                <RequirementHint field="topics" />
              </Field.Label>
              <TopicPills
                pt={2}
                topics={config?.topics}
                selected={form.topics}
                onToggle={(code) =>
                  setForm((p) => ({
                    ...p,
                    topics: toggleTopic(p.topics, code),
                  }))
                }
              />
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
                <Checkbox.Label>{t("profile.news")}</Checkbox.Label>
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
                <Checkbox.Label>{t("profile.testing")}</Checkbox.Label>
              </Checkbox.Root>
            </Flex>
          </GridItem>
        </Grid>

        <Separator borderColor="border" my={8} />

        {/* Account deletion: a help-centre request, handled by the team */}
        <Flex direction="column" gap={3} alignItems="flex-start">
          <Heading as="h2" size="md">
            {t("profile.delete.title")}
          </Heading>
          <Text color="fg.muted" fontSize="sm" maxW="60ch">
            {t("profile.delete.body")}
          </Text>
          <Button asChild size="sm" variant="outline" colorPalette="red">
            <a
              href={ACCOUNT_DELETION_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ArrowSquareOutIcon />
              {t("profile.delete.action")}
            </a>
          </Button>
        </Flex>
      </Container>
    </SettingsShell>
  );
}
