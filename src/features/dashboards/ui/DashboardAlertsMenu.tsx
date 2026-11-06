import { Box, Button, Flex, Popover, Switch, Text } from "@chakra-ui/react";
import { BellIcon, CaretDownIcon, InfoIcon } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";

import { toaster } from "@/app/components/ui/toaster";
import type { AlertsLevel } from "../api/schemas";
import { httpDetail } from "../api/http";
import { useSetAlertModes } from "./dashboardQueries";

const STATUS: Record<AlertsLevel, string> = {
  off: "Off",
  "in-app": "In-app",
  email: "In-app + email",
};

/**
 * The header's "Alerts" button and its settings popover, per the Figma
 * "Email toggle in dashboard header" frame: an in-app ("In Horizon") and an
 * email switch over one level, so email on means in-app on, and in-app off
 * means email off (the backend's coupling rule). "Manage all subscriptions"
 * stays hidden until that page ships (Figma annotation).
 */
export default function DashboardAlertsMenu({
  dashboardId,
  areaName,
  alerts,
}: {
  dashboardId: string;
  areaName: string;
  alerts: AlertsLevel;
}) {
  // Figma State 2: email just turned in-app on, so the email row says so.
  // Cleared by the next change and when the popover closes.
  const [emailTurnedOnInApp, setEmailTurnedOnInApp] = useState(false);
  const setModes = useSetAlertModes(dashboardId, {
    onError: (error) =>
      toaster.create({
        title: "Couldn't update alerts",
        description: httpDetail(error) ?? "Please try again.",
        type: "error",
        duration: 4000,
      }),
  });

  const change = (next: AlertsLevel) => {
    const turnsInAppOn = next === "email" && alerts === "off";
    setEmailTurnedOnInApp(false);
    setModes.mutate(next, {
      onSuccess: () => setEmailTurnedOnInApp(turnsInAppOn),
    });
  };

  return (
    <Popover.Root
      positioning={{ placement: "bottom-end" }}
      lazyMount
      onOpenChange={(e) => !e.open && setEmailTurnedOnInApp(false)}
    >
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
              {STATUS[alerts]}
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
              <AlertRow
                label="In Horizon"
                checked={alerts !== "off"}
                disabled={setModes.isPending}
                onChange={(on) => change(on ? "in-app" : "off")}
              >
                Show a weekly count of new integrated alerts on this dashboard.
              </AlertRow>
              <AlertRow
                label="Email"
                beta
                checked={alerts === "email"}
                disabled={setModes.isPending}
                onChange={(on) => change(on ? "email" : "in-app")}
              >
                {emailTurnedOnInApp
                  ? "On. We also turned on alerts in Horizon, since email uses the same weekly count."
                  : "One weekly email after each data update, only when there are new alerts. Turning this on also turns on alerts in Horizon."}
              </AlertRow>
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

function AlertRow({
  label,
  beta = false,
  checked,
  disabled,
  onChange,
  children,
}: {
  label: string;
  beta?: boolean;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Flex gap="12px" align="flex-start">
      <Switch.Root
        size="sm"
        checked={checked}
        onCheckedChange={(e) => onChange(e.checked)}
        disabled={disabled}
        colorPalette="primary"
        aria-label={`${label} alerts`}
      >
        <Switch.HiddenInput />
        <Switch.Control>
          <Switch.Thumb bg="white" />
        </Switch.Control>
      </Switch.Root>
      <Flex direction="column" gap="2px" flex="1" minW={0}>
        <Flex align="center" gap="6px">
          <Text fontSize="14px" fontWeight="medium" color="neutral.900">
            {label}
          </Text>
          {beta && (
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
          )}
        </Flex>
        <Text fontSize="12px" lineHeight="17px" color="neutral.500">
          {children}
        </Text>
      </Flex>
    </Flex>
  );
}
