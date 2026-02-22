"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Container,
  Field,
  Flex,
  Grid,
  GridItem,
  Heading,
  Input,
  Separator,
  Portal,
  Select,
  Text,
  Checkbox,
  createListCollection,
  Link,
  Badge,
} from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PatchProfileRequestSchema } from "@/app/schemas/api/auth/profile/patch";
import { isOnboardingFieldRequired } from "@/app/config/onboarding";
import { getOnboardingFormSchema } from "@/app/onboarding/schema";
import { showApiError } from "@/app/hooks/useErrorHandler";
import { useTranslations } from "next-intl";
import LclLogo from "../components/LclLogo";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { sendGAEventAsync } from "@/app/utils/analytics";

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
  topics: string[]; // holds selected topic codes
  receiveNewsEmails: boolean;
  helpTestFeatures: boolean;
  termsAccepted: boolean;
};

type ValueChangeDetails = { value: string[] };

export default function OnboardingForm() {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [config, setConfig] = useState<ProfileConfig | null>(null);
  const fieldRequired = isOnboardingFieldRequired;
  const schema = useMemo(() => getOnboardingFormSchema(), []);
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
    termsAccepted: false,
  });

  // Prefill email if available from auth
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          const email: string | undefined = data?.user?.email;
          if (email) {
            setForm((prev) => ({ ...prev, email }));
          }
        }
      } catch {
        // no-op
      }
    };
    fetchMe();
  }, []);

  // Opt-in fields are optional and not prefilled

  // Fetch dropdown configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/proxy/profile/config");
        if (res.ok) {
          const data: ProfileConfig = await res.json();
          setConfig(data);
        }
      } catch {
        // no-op; will use empty lists
      }
    };
    fetchConfig();
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

  // Clear role if current selection is not valid for the chosen sector
  useEffect(() => {
    const validValues = roles.items.map((i) => i.value);
    setForm((p) => (validValues.includes(p.role) ? p : { ...p, role: "" }));
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
      ? Object.entries(config.countries)
          .map(([value, label]) => ({
            label,
            value,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
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

  const isValid = useMemo(() => schema.safeParse(form).success, [schema, form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Validate form with dynamic schema (env-driven required fields)
      const validated = schema.parse(form);
      // Validate payload with zod before sending
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
        topics:
          Array.isArray(validated.topics) && validated.topics.length
            ? validated.topics
            : [],
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

      // Submit to Ortto directly from client (no secrets needed)
      const topicLabels = form.topics.map(
        (code) => config?.topics?.[code] || code
      );

      try {
        const orttoRes = await fetch("https://ortto.wri.org/custom-forms/gnw/", {
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
        });
        console.log("[Client] Ortto submission status:", orttoRes.status, orttoRes.ok ? "OK" : "FAILED");
      } catch (e) {
        console.error("[Client] Ortto submission error:", e);
      }

      // Poll for hasProfile to avoid middleware redirect race
      const waitForProfileCompletion = async (
        maxAttempts = 20,
        delayMs = 500
      ) => {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            // Cache-busting timestamp prevents stale responses
            const check = await fetch(`/api/auth/me?_t=${Date.now()}`, {
              cache: "no-store",
              headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                Pragma: "no-cache",
              },
            });
            if (check.ok) {
              const data = await check.json();
              if (data?.hasProfile) return true;
            }
          } catch {
            // ignore transient errors
          }
          await new Promise((r) => setTimeout(r, delayMs));
        }
        return false;
      };

      const verified = await waitForProfileCompletion();
      if (verified) {
        await sendGAEventAsync("sign_up", {
          sector: payload.sector_code,
          role: payload.role_code,
          country: payload.country_code,
          expertise_level: payload.gis_expertise_level,
          topics: (payload.topics || []).join(","),
          news_opt_in: payload.receive_news_emails,
          testing_opt_in: payload.help_test_features,
        });
        const queryString = searchParams.toString();
        const destination = queryString ? `/app?${queryString}` : "/app";
        router.push(destination);
      } else {
        showApiError("We saved your profile, but it’s not verified yet.", {
          title: "Almost there",
          description:
            "Please wait a moment and try Continue again. Your profile status is updating.",
        });
      }
    } catch (err) {
      // Basic error handling; could be replaced with toast
      console.error(err);
      showApiError(err as Error, { title: "Failed to save profile" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box minH="100vh" bg="bg" py={24}>
      <Container maxW="3xl">
        <Flex justifyContent="space-between" mb={12}>
          <Flex gap="2" alignItems="center">
            <LclLogo
              width={16}
              avatarOnly
              fill="var(--chakra-colors-primary-fg)"
            />
            <Heading as="h1" size="md" color="primary.fg">
              {tc("appName")}
            </Heading>
            <Badge
              colorPalette="primary"
              bg="primary.800"
              letterSpacing="wider"
              variant="solid"
              size="xs"
            >
              {tc("preview")}
            </Badge>
          </Flex>
          <Button
            colorPalette="primary"
            variant="ghost"
            onClick={() => router.push("/")}
          >
            <ArrowLeftIcon />
            {t("goBack")}
          </Button>
        </Flex>
        <Heading as="h1" size="2xl" mb={2} fontWeight="normal">
          {t("title")}{" "}
          <Text as="span" fontWeight="bold">
            {tc("appName")}
          </Text>{" "}
          {t("titleSuffix")}
        </Heading>
        <Text color="fg.muted" fontSize="sm" mb={10}>
          {t("subtitle")}
        </Text>
        <form onSubmit={handleSubmit}>
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
            gap={12}
          >
            <GridItem>
              <Field.Root id="first-name" required={fieldRequired("firstName")}>
                <Field.Label>
                  {t("fields.firstName")}
                  {fieldRequired("firstName") && (
                    <Text as="span" color="red.500" ml={1}>
                      *
                    </Text>
                  )}
                </Field.Label>
                <Input
                  type="text"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, firstName: e.target.value }))
                  }
                />
              </Field.Root>
            </GridItem>
            <GridItem>
              <Field.Root id="last-name" required={fieldRequired("lastName")}>
                <Field.Label>
                  {t("fields.lastName")}
                  {fieldRequired("lastName") && (
                    <Text as="span" color="red.500" ml={1}>
                      *
                    </Text>
                  )}
                </Field.Label>
                <Input
                  type="text"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lastName: e.target.value }))
                  }
                />
              </Field.Root>
            </GridItem>
            <GridItem>
              <Field.Root id="email" required={fieldRequired("email")}>
                <Field.Label>
                  {t("fields.email")}
                  {fieldRequired("email") && (
                    <Text as="span" color="red.500" ml={1}>
                      *
                    </Text>
                  )}
                </Field.Label>
                <Input
                  type="email"
                  value={form.email}
                  readOnly
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                  _readOnly={{
                    bg: "bg.subtle",
                    color: "fg.muted",
                    cursor: "not-allowed",
                  }}
                />
              </Field.Root>
            </GridItem>
            <GridItem colSpan={{ base: 1, md: 2 }}>
              <Separator />
            </GridItem>
            <GridItem>
              <Field.Root id="sector" required={fieldRequired("sector")}>
                <Select.Root
                  collection={sectors}
                  size="sm"
                  value={form.sector ? [form.sector] : []}
                  onValueChange={(d: ValueChangeDetails) =>
                    setForm((p) => ({ ...p, sector: d.value[0] ?? "" }))
                  }
                >
                  <Select.HiddenSelect />
                  <Select.Label>
                    {t("fields.sector")}
                    {fieldRequired("sector") && (
                      <Text as="span" color="red.500" ml={1}>
                        *
                      </Text>
                    )}
                  </Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder={t("placeholders.sector")} />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {sectors.items.map((sector) => (
                          <Select.Item key={sector.value} item={sector}>
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
            <GridItem>
              <Field.Root id="role" required={fieldRequired("role")}>
                <Select.Root
                  collection={roles}
                  size="sm"
                  disabled={!form.sector}
                  value={form.role ? [form.role] : []}
                  onValueChange={(d: ValueChangeDetails) =>
                    setForm((p) => ({ ...p, role: d.value[0] ?? "" }))
                  }
                >
                  <Select.HiddenSelect />
                  <Select.Label>
                    {t("fields.role")}
                    {fieldRequired("role") && (
                      <Text as="span" color="red.500" ml={1}>
                        *
                      </Text>
                    )}
                  </Select.Label>
                  <Select.Control _disabled={{ bg: "bg.subtle" }}>
                    <Select.Trigger>
                      <Select.ValueText placeholder={t("placeholders.role")} />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {roles.items.map((role) => (
                          <Select.Item key={role.value} item={role}>
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
            <GridItem>
              <Field.Root id="job-title" required={fieldRequired("jobTitle")}>
                <Field.Label>{t("fields.jobTitle")}</Field.Label>
                <Input
                  type="text"
                  value={form.jobTitle}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, jobTitle: e.target.value }))
                  }
                />
              </Field.Root>
            </GridItem>
            <GridItem>
              <Field.Root id="company" required={fieldRequired("company")}>
                <Field.Label>
                  {t("fields.company")}
                  {fieldRequired("company") && (
                    <Text as="span" color="red.500" ml={1}>
                      *
                    </Text>
                  )}
                </Field.Label>
                <Input
                  type="text"
                  value={form.company}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, company: e.target.value }))
                  }
                />
              </Field.Root>
            </GridItem>
            <GridItem>
              <Field.Root id="country" required={fieldRequired("country")}>
                <Select.Root
                  collection={countries}
                  size="sm"
                  value={form.country ? [form.country] : []}
                  onValueChange={(d: ValueChangeDetails) =>
                    setForm((p) => ({ ...p, country: d.value[0] ?? "" }))
                  }
                >
                  <Select.HiddenSelect />
                  <Select.Label>
                    {t("fields.country")}
                    {fieldRequired("country") && (
                      <Text as="span" color="red.500" ml={1}>
                        *
                      </Text>
                    )}
                  </Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder={t("placeholders.country")} />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {countries.items.map((country) => (
                          <Select.Item key={country.value} item={country}>
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
            <GridItem>
              <Field.Root id="expertise" required={fieldRequired("expertise")}>
                <Select.Root
                  collection={expertises}
                  size="sm"
                  value={form.expertise ? [form.expertise] : []}
                  onValueChange={(d: ValueChangeDetails) =>
                    setForm((p) => ({ ...p, expertise: d.value[0] ?? "" }))
                  }
                >
                  <Select.HiddenSelect />
                  <Select.Label>{t("fields.expertise")}</Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder={t("placeholders.expertise")} />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {expertises.items.map((exp) => (
                          <Select.Item key={exp.value} item={exp}>
                            {exp.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </Field.Root>
            </GridItem>
            <GridItem>
              <Field.Root id="preferred-language" required={fieldRequired("preferredLanguage")}>
                <Select.Root
                  collection={languages}
                  size="sm"
                  value={form.preferredLanguage ? [form.preferredLanguage] : []}
                  onValueChange={(d: ValueChangeDetails) =>
                    setForm((p) => ({ ...p, preferredLanguage: d.value[0] ?? "" }))
                  }
                >
                  <Select.HiddenSelect />
                  <Select.Label>{t("fields.preferredLanguage")}</Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder={t("placeholders.language")} />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {languages.items.map((lang) => (
                          <Select.Item key={lang.value} item={lang}>
                            {lang.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
                <Field.HelperText color="fg.muted" fontSize="xs" mt={1}>
                  {t("fields.languageNote")}
                </Field.HelperText>
              </Field.Root>
            </GridItem>
            <GridItem colSpan={{ base: 1, md: 2 }}>
              <Field.Root id="topics" required={fieldRequired("topics")}>
                <Field.Label>
                  {t("fields.topics")}
                  <Text as="span" color="red.500" ml={1}>
                    *
                  </Text>
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
            <GridItem colSpan={{ base: 1, md: 2 }}>
              <Separator />
            </GridItem>
          </Grid>
          <Box mt={6}>
            <Text color="fg.muted" fontSize="sm">
              {t("emailConsent")}
            </Text>
            <Flex direction="column" gap={2} mt={3}>
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
                  {t("checkboxes.receiveNews")}
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
                  {t("checkboxes.helpTest")}
                </Checkbox.Label>
              </Checkbox.Root>
            </Flex>
            <Separator mt={4} />
          </Box>
          <Flex alignItems="center" justifyContent="space-between" mt={4}>
            <Checkbox.Root
              alignItems="flex-start"
              checked={form.termsAccepted}
              onCheckedChange={(e) =>
                setForm((p) => ({ ...p, termsAccepted: Boolean(e.checked) }))
              }
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label fontWeight="normal">
                {t("terms.iAccept")}{" "}
                <Link
                  href="https://www.wri.org/about/legal/general-terms-use"
                  target="_blank"
                  rel="noopener noreferrer"
                  textDecoration="underline"
                >
                  {t("terms.termsOfUse")}
                </Link>{" "}
                {t("terms.and")}{" "}
                <Link
                  href="https://help.globalnaturewatch.org/global-nature-watch-ai-terms-of-use"
                  target="_blank"
                  rel="noopener noreferrer"
                  textDecoration="underline"
                >
                  {t("terms.aiTermsOfUse")}
                </Link>
                {", "}
                {t("terms.acknowledge")}{" "}
                <Link
                  href="https://www.wri.org/about/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  textDecoration="underline"
                >
                  {t("terms.privacyPolicy")}
                </Link>{" "}
                {t("terms.andThe")}{" "}
                <Link
                  href="https://help.globalnaturewatch.org/legal-notices/global-nature-watch-ai-privacy-notice"
                  target="_blank"
                  rel="noopener noreferrer"
                  textDecoration="underline"
                >
                  {t("terms.aiPrivacyPolicy")}
                </Link>
                .
                {fieldRequired("termsAccepted") && (
                  <Text as="span" color="red.500" ml={1}>
                    *
                  </Text>
                )}
              </Checkbox.Label>
            </Checkbox.Root>
            <Flex gap={4}>
              <Button
                type="submit"
                colorPalette="primary"
                disabled={!isValid || isSubmitting}
                loading={isSubmitting}
                loadingText={t("finalizingProfile")}
              >
                {t("completeProfile")}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Container>
    </Box>
  );
}
