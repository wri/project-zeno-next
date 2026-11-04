import { Box, Button, Flex, Popover, Switch, Text } from "@chakra-ui/react";
import { BellIcon, CaretDownIcon, InfoIcon } from "@phosphor-icons/react";

import { toaster } from "@/app/components/ui/toaster";
import type { DashboardAlertsSettings } from "../api/schemas";
import { httpDetail } from "../api/http";
import { useSetAlertModes } from "./dashboardQueries";

/**
 * The header's "Alerts" button and its settings popover, per the Figma
 * "Email toggle in dashboard header" frame. It holds only the email option
 * for now: the "In Horizon" row belongs to PZB-1452, and in-app has no
 * opt-out yet. "Manage all subscriptions" stays hidden until that page
 * ships (Figma annotation).
 */
export default function DashboardAlertsMenu({
  dashboardId,
  areaName,
  alerts,
}: {
  dashboardId: string;
  areaName: string;
  alerts: DashboardAlertsSettings;
}) {
  const setEmail = useSetAlertModes(dashboardId, {
    onError: (error) =>
      toaster.create({
        title: "Couldn't update email alerts",
        description: httpDetail(error) ?? "Please try again.",
        type: "error",
        duration: 4000,
      }),
  });

  // Email is never on without in-app (the backend's coupling rule).
  const status = alerts.emailEnabled
    ? "In-app + email"
    : alerts.inAppEnabled
      ? "In-app"
      : "Off";

  return (
    <Popover.Root positioning={{ placement: "bottom-end" }} lazyMount>
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          h="24px"
          px="8px"
          gap="6px"
          rounded="sm"
          borderColor="rgba(19,22,25,0.2)"
          fontSize="13px"
          fontWeight="medium"
          color="rgba(19,22,25,0.7)"
          _expanded={{
            bg: "primary.25",
            borderColor: "primary.500",
            color: "primary.500",
          }}
        >
          <BellIcon size={16} />
          Alerts
          <Box as="span" bg="white" rounded="lg" px="6px">
            <Text
              as="span"
              fontSize="11px"
              fontWeight="normal"
              color="neutral.600"
            >
              {status}
            </Text>
          </Box>
          <CaretDownIcon size={12} />
        </Button>
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content
          width="360px"
          rounded="lg"
          borderWidth="1px"
          borderColor="neutral.300"
          boxShadow="0px 8px 24px 0px rgba(18,23,26,0.12)"
        >
          <Popover.Body p="16px">
            <Flex direction="column" gap="14px">
              <Text fontSize="14px" fontWeight="semibold" color="neutral.900">
                Alerts for {areaName}
              </Text>
              <Flex gap="12px" align="flex-start">
                <Switch.Root
                  size="sm"
                  checked={alerts.emailEnabled}
                  // Email on turns in-app on; email off leaves it alone.
                  onCheckedChange={(e) =>
                    setEmail.mutate({
                      inAppEnabled: alerts.inAppEnabled || e.checked,
                      emailEnabled: e.checked,
                    })
                  }
                  disabled={setEmail.isPending}
                  colorPalette="primary"
                  aria-label="Email alerts"
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb bg="white" />
                  </Switch.Control>
                </Switch.Root>
                <Flex direction="column" gap="2px" flex="1" minW={0}>
                  <Flex align="center" gap="6px">
                    <Text
                      fontSize="14px"
                      fontWeight="medium"
                      color="neutral.900"
                    >
                      Email
                    </Text>
                    <Box bg="lime.400" rounded="sm" px="6px" py="1px">
                      <Text
                        fontFamily="mono"
                        fontSize="10px"
                        fontWeight="medium"
                        letterSpacing="0.4px"
                        textTransform="uppercase"
                        color="neutral.900"
                      >
                        Beta
                      </Text>
                    </Box>
                  </Flex>
                  <Text fontSize="12px" lineHeight="17px" color="neutral.500">
                    One weekly email after each data update, only when there are
                    new alerts. Turning this on also turns on alerts in Horizon.
                  </Text>
                </Flex>
              </Flex>
              <Box h="1px" bg="neutral.300" />
              <Flex gap="8px" align="flex-start" color="neutral.500">
                <Box flexShrink={0}>
                  <InfoIcon size={16} />
                </Box>
                <Text fontSize="12px" lineHeight="17px">
                  Also following this area on myGFW? You may get two emails
                  about the same alerts.
                </Text>
              </Flex>
            </Flex>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}
