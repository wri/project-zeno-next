import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Link as ChakraLink,
  Switch,
  Text,
} from "@chakra-ui/react";
import { ArrowLeftIcon, InfoIcon } from "@phosphor-icons/react";

import { toaster } from "@/app/components/ui/toaster";
import useAuthStore from "@/app/store/authStore";
import { Link, useRouter } from "@/src/shared/lib/router";
import { httpDetail } from "../api/http";
import {
  hasEmailOn,
  toSubscriptionRows,
  type SubscriptionRow,
} from "../model/subscription-rows";
import BetaTag from "./BetaTag";
import {
  useDashboards,
  useRestoreEmails,
  useSetEmailSubscriptionInList,
  useTurnOffAllEmails,
} from "./dashboardQueries";

const INELIGIBLE_REASON = "Needs an integrated alerts chart or map";

/**
 * Every dashboard the user owns, with its email switch, and one button that
 * turns all emails off. The banner that confirms it keeps the exact set it
 * turned off, so Undo turns on those dashboards and no others.
 */
export default function SubscriptionsPage() {
  const router = useRouter();
  const email = useAuthStore((s) => s.userEmail);
  const { data: dashboards, isLoading, isError } = useDashboards();
  const rows = useMemo(
    () => toSubscriptionRows(dashboards ?? []),
    [dashboards]
  );
  // The dashboards the last "turn off all" changed; set while the banner shows.
  const [undoIds, setUndoIds] = useState<string[] | null>(null);

  const setEmail = useSetEmailSubscriptionInList((error) =>
    toaster.create({
      title: "Couldn't update alert emails",
      description: httpDetail(error) ?? "Please try again.",
      type: "error",
      duration: 4000,
    })
  );
  const turnOffAll = useTurnOffAllEmails({
    onSuccess: (changed) => setUndoIds(changed.length > 0 ? changed : null),
    onError: (error) =>
      toaster.create({
        title: "Couldn't turn off alert emails",
        description: httpDetail(error) ?? "Please try again.",
        type: "error",
        duration: 4000,
      }),
  });
  const restore = useRestoreEmails({
    onSuccess: ({ skipped }) => {
      setUndoIds(null);
      if (skipped.length > 0) {
        toaster.create({
          title: "Some alert emails stayed off",
          description: `${skipped.length} dashboard${skipped.length === 1 ? " no longer has" : "s no longer have"} an integrated alerts chart or map.`,
          type: "info",
          duration: 6000,
        });
      }
    },
    onError: (error) =>
      toaster.create({
        title: "Couldn't turn alert emails back on",
        description: httpDetail(error) ?? "Please try again.",
        type: "error",
        duration: 4000,
      }),
  });
  const busy = setEmail.isPending || turnOffAll.isPending || restore.isPending;

  // Without history (a link from an email opens a fresh tab) back has
  // nowhere to go, so it opens the dashboards instead.
  const goBack = () =>
    window.history.state?.idx > 0 ? router.back() : router.push("/dashboards");

  return (
    <Box bg="#F4F5F6" minH="calc(100vh - 40px)" py="40px">
      <Container maxW="1240px">
        <Flex direction="column" gap="24px">
          <Button
            variant="plain"
            alignSelf="flex-start"
            h="auto"
            p={0}
            gap="4px"
            fontSize="13px"
            fontWeight="normal"
            color="neutral.700"
            onClick={goBack}
          >
            <ArrowLeftIcon size={12} />
            Back
          </Button>

          {undoIds && (
            <Flex
              role="status"
              justify="space-between"
              align="center"
              gap="16px"
              bg="bg.success"
              borderWidth="1px"
              borderColor="border.success"
              rounded="md"
              px="16px"
              py="12px"
              fontSize="14px"
              color="fg.success"
            >
              <Text>
                All alert emails are off. You&apos;ll still see weekly alerts
                inside Horizon.
              </Text>
              <Button
                variant="plain"
                h="auto"
                p={0}
                fontSize="14px"
                textDecoration="underline"
                color="fg.success"
                disabled={restore.isPending}
                onClick={() => restore.mutate(undoIds)}
              >
                Undo
              </Button>
            </Flex>
          )}

          <Box>
            <Heading as="h1" size="2xl" fontWeight="normal">
              Alert subscriptions
            </Heading>
            <Text color="neutral.600" fontSize="14px" mt="4px">
              Choose which dashboards notify you about new integrated alerts.
              Counts update weekly, after each data update.
            </Text>
          </Box>

          <Flex
            bg="white"
            rounded="lg"
            px="20px"
            py="16px"
            justify="space-between"
            align="center"
            gap="16px"
          >
            <Box>
              <Flex align="center" gap="8px">
                <Text fontWeight="medium" fontSize="14px">
                  Weekly alert email
                </Text>
                <BetaTag />
              </Flex>
              <Text color="neutral.600" fontSize="12px" mt="4px">
                One email a week{email ? ` to ${email}` : ""}, only when your
                email-on dashboards have new alerts.
              </Text>
            </Box>
            <Button
              variant="outline"
              size="sm"
              flexShrink={0}
              disabled={!hasEmailOn(rows) || busy}
              onClick={() => turnOffAll.mutate()}
            >
              Turn off all alert emails
            </Button>
          </Flex>

          {isError ? (
            <Text color="fg.error">Could not load your dashboards.</Text>
          ) : !isLoading && rows.length === 0 ? (
            <Box bg="white" rounded="lg" p="24px">
              <Text color="fg.muted">
                You have no dashboards yet.{" "}
                <ChakraLink asChild textDecoration="underline">
                  <Link href="/dashboards">Go to Dashboards</Link>
                </ChakraLink>{" "}
                to create one.
              </Text>
            </Box>
          ) : (
            <Box bg="white" rounded="lg" overflow="hidden">
              <Row header>
                <Text>Dashboard</Text>
                <Text>Area</Text>
                <Flex align="center" gap="8px">
                  Email <BetaTag />
                </Flex>
              </Row>
              {rows.map((row) => (
                <Row key={row.id}>
                  <Box minW={0}>
                    <ChakraLink
                      asChild
                      fontWeight="medium"
                      textDecoration="underline"
                      color="primary.600"
                    >
                      <Link href={`/dashboards/${row.id}`}>{row.name}</Link>
                    </ChakraLink>
                    {!row.eligible && (
                      <Text fontSize="12px" color="neutral.500">
                        {INELIGIBLE_REASON}
                      </Text>
                    )}
                  </Box>
                  <Text color="neutral.600">{row.area}</Text>
                  <EmailSwitch
                    row={row}
                    disabled={!row.eligible || busy}
                    onChange={(enabled) =>
                      setEmail.mutate({ id: row.id, enabled })
                    }
                  />
                </Row>
              ))}
            </Box>
          )}

          <Flex gap="8px" align="flex-start" color="neutral.600">
            <Box flexShrink={0} mt="1px">
              <InfoIcon size={16} />
            </Box>
            <Text fontSize="12px" lineHeight="17px">
              Also following an area on myGFW? You may get two emails about the
              same alerts. Deleted dashboards are removed from this list and
              stop sending emails.
            </Text>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}

function Row({
  header = false,
  children,
}: {
  header?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box
      display="grid"
      gridTemplateColumns="minmax(0, 3fr) minmax(0, 1.4fr) 150px"
      alignItems="center"
      gap="16px"
      px="20px"
      py={header ? "12px" : "10px"}
      fontSize={header ? "12px" : "14px"}
      color={header ? "neutral.600" : undefined}
      borderTopWidth={header ? 0 : "1px"}
      borderColor="neutral.200"
    >
      {children}
    </Box>
  );
}

function EmailSwitch({
  row,
  disabled,
  onChange,
}: {
  row: SubscriptionRow;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <Switch.Root
      size="sm"
      checked={row.emailOn}
      onCheckedChange={(e) => onChange(e.checked)}
      disabled={disabled}
      colorPalette="primary"
    >
      <Switch.HiddenInput aria-label={`Email alerts for ${row.name}`} />
      <Switch.Control>
        <Switch.Thumb bg="white" />
      </Switch.Control>
    </Switch.Root>
  );
}
