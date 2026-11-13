import {
  Box,
  Button,
  Flex,
  Link as ChakraLink,
  Popover,
  Switch,
  Text,
} from "@chakra-ui/react";
import { BellIcon, CaretDownIcon, InfoIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { toaster } from "@/app/components/ui/toaster";
import { Link } from "@/src/shared/lib/router";
import { httpDetail } from "../api/http";
import BetaTag from "./BetaTag";
import { useSetEmailSubscription } from "./dashboardQueries";

/**
 * The header's "Alerts" button and its popover with the email switch for
 * the dashboard's integrated alerts, and a link to all subscriptions.
 */
export default function DashboardAlertsMenu({
  dashboardId,
  areaName,
  emailEnabled,
}: {
  dashboardId: string;
  areaName: string;
  emailEnabled: boolean;
}) {
  const setEmail = useSetEmailSubscription(dashboardId, {
    onError: (error) =>
      toaster.create({
        title: "Couldn't update alerts",
        description: httpDetail(error) ?? "Please try again.",
        type: "error",
        duration: 4000,
      }),
  });

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
              {emailEnabled ? "Email" : "Off"}
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
                label="Email"
                beta
                checked={emailEnabled}
                disabled={setEmail.isPending}
                onChange={(on) => setEmail.mutate(on)}
              >
                One weekly email after each data update, only when there are new
                alerts.
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
              <ChakraLink
                asChild
                fontSize="12px"
                textDecoration="underline"
                color="primary.600"
              >
                <Link href="/subscriptions?ff=email-subscriptions">
                  Manage all subscriptions
                </Link>
              </ChakraLink>
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
          {beta && <BetaTag />}
        </Flex>
        <Text fontSize="12px" lineHeight="17px" color="neutral.500">
          {children}
        </Text>
      </Flex>
    </Flex>
  );
}
