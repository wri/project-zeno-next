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
} from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PatchProfileRequestSchema } from "@/app/schemas/api/auth/profile/patch";
import { isOnboardingFieldRequired } from "@/app/config/onboarding";
import { getOnboardingFormSchema } from "@/app/onboarding/schema";
import { showApiError } from "@/app/hooks/useErrorHandler";

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
  topics: string[]; // holds selected topic codes
  receiveNewsEmails: boolean;
  helpTestFeatures: boolean;
  termsAccepted: boolean;
};

export default function OnboardingForm() {
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
      ? Object.entries(config.countries)
          .map(([value, label]) => ({
            label,
            value,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      : [];
    return createListCollection({ items });
  }, [config]);

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
        preferred_language_code: null,
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

      // Poll for hasProfile to avoid middleware redirect race
      const waitForProfileCompletion = async (
        maxAttempts = 20,
        delayMs = 500
      ) => {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const check = await fetch("/api/auth/me", { cache: "no-store" });
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
    <Box minH="100vh" bg="bg" py={10}>
      <Container maxW="4xl">
        <Heading as="h1" size="2xl" mb={2} fontWeight="normal">
          Complete your Global Nature Watch profile
        </Heading>
        <Text color="fg.muted" fontSize="sm" mb={10}>
          We use this information to make Global Nature Watch more useful for
          you. Your privacy is important to us and we’ll never share your
          information without your consent.
        </Text>
        <form onSubmit={handleSubmit}>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
            <GridItem>
              <Field.Root id="first-name" required={fieldRequired("firstName")}>
                <Field.Label>
                  First name
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
                  Last name
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
                  Email address
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
                />
              </Field.Root>
            </GridItem>
            <GridItem colSpan={{ base: 1, md: 2 }}>
              <Separator />
            </GridItem>
            <GridItem>
              <Field.Root id="sector" required={fieldRequired("sector")}>
                <Select.Root collection={sectors} size="sm" width="320px">
                  <Select.HiddenSelect />
                  <Select.Label>
                    Sector
                    {fieldRequired("sector") && (
                      <Text as="span" color="red.500" ml={1}>
                        *
                      </Text>
                    )}
                  </Select.Label>
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
                          <Select.Item
                            key={sector.value}
                            item={sector}
                            onClick={() =>
                              setForm((p) => ({ ...p, sector: sector.value }))
                            }
                          >
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
                  width="320px"
                  disabled={!form.sector}
                >
                  <Select.HiddenSelect />
                  <Select.Label>
                    Role
                    {fieldRequired("role") && (
                      <Text as="span" color="red.500" ml={1}>
                        *
                      </Text>
                    )}
                  </Select.Label>
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
                          <Select.Item
                            key={role.value}
                            item={role}
                            onClick={() =>
                              setForm((p) => ({ ...p, role: role.value }))
                            }
                          >
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
                <Field.Label>
                  Job title
                  {fieldRequired("jobTitle") && (
                    <Text as="span" color="red.500" ml={1}>
                      *
                    </Text>
                  )}
                </Field.Label>
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
                  Company / Organization
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
                <Select.Root collection={countries} size="sm" width="320px">
                  <Select.HiddenSelect />
                  <Select.Label>
                    Country
                    {fieldRequired("country") && (
                      <Text as="span" color="red.500" ml={1}>
                        *
                      </Text>
                    )}
                  </Select.Label>
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
                          <Select.Item
                            key={country.value}
                            item={country}
                            onClick={() =>
                              setForm((p) => ({ ...p, country: country.value }))
                            }
                          >
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
                <Select.Root collection={expertises} size="sm" width="320px">
                  <Select.HiddenSelect />
                  <Select.Label>
                    Level of technical expertise
                    {fieldRequired("expertise") && (
                      <Text as="span" color="red.500" ml={1}>
                        *
                      </Text>
                    )}
                  </Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Select Level" />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {expertises.items.map((exp) => (
                          <Select.Item
                            key={exp.value}
                            item={exp}
                            onClick={() =>
                              setForm((p) => ({ ...p, expertise: exp.value }))
                            }
                          >
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
            <GridItem colSpan={{ base: 1, md: 2 }}>
              <Field.Root id="topics" required={fieldRequired("topics")}>
                <Field.Label>
                  What area(s) are you most interested in?
                  {fieldRequired("topics") && (
                    <Text as="span" color="red.500" ml={1}>
                      *
                    </Text>
                  )}
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
              By creating an account, you agree to receive essential emails
              about your Global Nature Watch account and system updates. You can
              unsubscribe from non-essential emails at any time.
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
            <Separator mt={4} />
          </Box>

          <Flex alignItems="center" gap={3} mt={8}>
            <Checkbox.Root
              checked={form.termsAccepted}
              onCheckedChange={(e) =>
                setForm((p) => ({ ...p, termsAccepted: Boolean(e.checked) }))
              }
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                I accept the{" "}
                <Link
                  href="https://www.wri.org/about/legal/general-terms-use"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link
                  href="https://www.wri.org/about/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </Link>
                .
                {fieldRequired("termsAccepted") && (
                  <Text as="span" color="red.500" ml={1}>
                    *
                  </Text>
                )}
              </Checkbox.Label>
            </Checkbox.Root>
          </Flex>

          <Flex mt={8} gap={4}>
            <Button
              type="submit"
              colorPalette="primary"
              disabled={!isValid || isSubmitting}
              loading={isSubmitting}
              loadingText="Finalizing profile..."
            >
              Continue
            </Button>
            <Text color="fg.muted" fontSize="xs" alignSelf="center">
              You can edit these details later in Settings.
            </Text>
          </Flex>
        </form>
      </Container>
    </Box>
  );
}
