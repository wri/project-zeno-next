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
  Portal,
  Select,
  Text,
  Textarea,
  Checkbox,
  createListCollection,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";

type ProfileConfig = {
  sectors: Record<string, string>;
  sectorRoles: Record<string, Record<string, string>>;
  countries: Record<string, string>;
  languages: Record<string, string>;
  gisExpertiseLevels: Record<string, string>;
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
  interests: string;
  termsAccepted: boolean;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    interests: "",
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
    const roleMap = config?.sectorRoles?.[form.sector] || {};
    const items = Object.entries(roleMap).map(([value, label]) => ({
      label,
      value,
    }));
    return createListCollection({ items });
  }, [config, form.sector]);

  const expertises = useMemo(() => {
    const items = config
      ? Object.entries(config.gisExpertiseLevels).map(([value, label]) => ({
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

  const isValid = useMemo(() => {
    return (
      !!form.firstName.trim() &&
      !!form.lastName.trim() &&
      !!form.email.trim() &&
      form.termsAccepted
    );
  }, [form.firstName, form.lastName, form.email, form.termsAccepted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/proxy/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          sectorCode: form.sector || undefined,
          roleCode: form.role || undefined,
          jobTitle: form.jobTitle || undefined,
          companyOrganization: form.company || undefined,
          countryCode: form.country || undefined,
          preferredLanguageCode: undefined,
          gisExpertiseLevel: form.expertise || undefined,
          areasOfInterest: form.interests || undefined,
          hasProfile: true,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save profile");
      }

      router.push("/app");
    } catch (err) {
      // Basic error handling; could be replaced with toast
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box minH="100vh" bg="bg" py={10}>
      <Container maxW="4xl">
        <Heading as="h1" size="2xl" mb={8} fontWeight="normal">
          Welcome — let’s set up your profile
        </Heading>
        <form onSubmit={handleSubmit}>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
            <GridItem>
              <Field.Root id="first-name" required>
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
            <GridItem>
              <Field.Root id="last-name" required>
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
            <GridItem>
              <Field.Root id="email" required>
                <Field.Label>Email address</Field.Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </Field.Root>
            </GridItem>
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
              <Field.Root id="expertise">
                <Select.Root collection={expertises} size="sm" width="320px">
                  <Select.HiddenSelect />
                  <Select.Label>Level of technical expertise</Select.Label>
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
              <Field.Root id="interests">
                <Field.Label>
                  What area(s) are you most interested in?
                </Field.Label>
                <Textarea
                  placeholder="Enter your interests here..."
                  rows={4}
                  value={form.interests}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, interests: e.target.value }))
                  }
                />
              </Field.Root>
            </GridItem>
          </Grid>

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
                I agree to the Terms and Conditions
              </Checkbox.Label>
            </Checkbox.Root>
          </Flex>

          <Flex mt={8} gap={4}>
            <Button
              type="submit"
              colorPalette="primary"
              disabled={!isValid || isSubmitting}
              loading={isSubmitting}
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
