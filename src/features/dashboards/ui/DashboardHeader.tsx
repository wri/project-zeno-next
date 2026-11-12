import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Input,
  Text,
} from "@chakra-ui/react";
import {
  FilePdfIcon,
  PencilSimpleIcon,
  ShareIcon,
} from "@phosphor-icons/react";

import { toaster } from "@/app/components/ui/toaster";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags";
import type { Dashboard } from "../api/schemas";
import { wasJustCreated } from "../lib/dates";
import DashboardAlertsMenu from "./DashboardAlertsMenu";
import { useRenameDashboard } from "./dashboardQueries";

/** The 30px dashboard title, shared with the report page's document header. */
export const DASHBOARD_TITLE_PROPS = {
  fontSize: "30px",
  lineHeight: "36px",
  fontWeight: "normal",
  color: "#131619",
  // The theme's globalCss gives every h2 a 16px margin-bottom, which would
  // stretch the title row in the condensed variant.
  mb: "0",
} as const;

/** The 24px outline action button, shared with the report page's action bar. */
export const DASHBOARD_ACTION_PROPS = {
  variant: "outline",
  h: "24px",
  px: "8px",
  gap: "4px",
  borderColor: "rgba(19,22,25,0.2)",
  rounded: "sm",
  fontSize: "12px",
  fontWeight: "medium",
  color: "rgba(19,22,25,0.7)",
} as const;

/**
 * Dashboard page header per the Figma "Dashboard default" frame: editable
 * 30px title with a pencil affordance (owner only, revealed on hover or
 * focus), and Export / Share actions top-right. Export opens the printable
 * report (`/dashboards/[id]/report`); Share is a false door — measure
 * interest before building the real flow.
 */
export default function DashboardHeader({
  dashboard,
  isOwner,
  condensed = false,
}: {
  dashboard: Dashboard;
  isOwner: boolean;
  /** Pinned-bar variant: the title truncates with an ellipsis instead of wrapping. */
  condensed?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const renameDashboard = useRenameDashboard(dashboard.id);
  const editing = draft !== null;
  // A subscription is the owner's own consent, so superusers, who also
  // receive `subscriptions`, don't get the switch. The switch shows only
  // while the dashboard is eligible for subscription.
  const emailBeta = useFeatureFlag("email-subscriptions");
  const subscriptions = dashboard.subscriptions;
  const showAlerts =
    emailBeta &&
    isOwner &&
    dashboard.eligible_for_subscription &&
    !!subscriptions;
  // The pinned copy of the header is mounted too; only this one tells.
  useEmailTurnedOffNotice(dashboard, emailBeta && isOwner && !condensed);

  const commit = () => {
    const name = draft?.trim();
    setDraft(null);
    if (!name || name === dashboard.name) return;
    renameDashboard.mutate(name, {
      onError: () =>
        toaster.create({
          title: "Rename failed",
          description:
            "The dashboard name couldn't be saved. Please try again.",
          type: "error",
          duration: 4000,
        }),
    });
  };

  const falseDoor = (description: string) => () =>
    toaster.create({
      title: "Coming soon",
      description,
      type: "info",
      duration: 3000,
    });

  // A new tab, so the dashboard stays where the user left it.
  const openReport = () =>
    window.open(`/dashboards/${dashboard.id}/report`, "_blank", "noopener");

  return (
    <Flex justify="space-between" align="flex-start" gap={6}>
      <Box minW={0} flex="1">
        <Flex
          align="center"
          gap="12px"
          minW={0}
          // The pencil shows on hover or keyboard focus; on touch (no hover)
          // it stays visible.
          _hover={{ "& [data-rename]": { opacity: 1 } }}
          _focusWithin={{ "& [data-rename]": { opacity: 1 } }}
        >
          {editing ? (
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setDraft(null);
              }}
              autoFocus
              aria-label="Dashboard name"
              variant="flushed"
              fontSize="30px"
              lineHeight="36px"
              h="40px"
              maxW="2xl"
            />
          ) : (
            <Heading
              // The pinned bar duplicates the page title — keep one h1 per page.
              as={condensed ? "h2" : "h1"}
              {...DASHBOARD_TITLE_PROPS}
              {...(condensed
                ? { truncate: true, minW: 0 }
                : { wordBreak: "break-word" as const })}
            >
              {dashboard.name}
            </Heading>
          )}
          {isOwner && !editing && (
            <IconButton
              data-rename
              aria-label="Rename dashboard"
              title="Rename dashboard"
              size="xs"
              variant="ghost"
              color="fg.muted"
              opacity={0}
              // Hover is the reveal, so a device that has no hover keeps the
              // pencil visible. A viewport breakpoint is the wrong test: a
              // touch-only tablet is wide and would get an invisible control.
              css={{ "@media (hover: none)": { opacity: 1 } }}
              transition="opacity 0.12s"
              onClick={() => setDraft(dashboard.name)}
            >
              <PencilSimpleIcon size={20} />
            </IconButton>
          )}
        </Flex>
        {wasJustCreated(dashboard.created_at) && (
          <Box
            mt="8px"
            display="inline-flex"
            bg="#F0F4B4"
            px="4px"
            rounded="sm"
          >
            <Text
              fontFamily="mono"
              fontSize="10px"
              lineHeight="16px"
              color="#5B5F3A"
            >
              Created just now
            </Text>
          </Box>
        )}
      </Box>

      <Flex gap="12px" align="center" flexShrink={0}>
        {showAlerts && (
          <DashboardAlertsMenu
            dashboardId={dashboard.id}
            areaName={dashboard.aois[0]?.name ?? dashboard.name}
            emailEnabled={subscriptions.emailEnabled}
          />
        )}
        <Button {...DASHBOARD_ACTION_PROPS} onClick={openReport}>
          <FilePdfIcon size={16} />
          Export
        </Button>
        <Button
          {...DASHBOARD_ACTION_PROPS}
          onClick={falseDoor("Sharing dashboards isn't available yet.")}
        >
          <ShareIcon size={16} />
          Share
        </Button>
      </Flex>
    </Flex>
  );
}

/**
 * Tells the owner when the email subscription was deleted because the
 * dashboard lost its last integrated alerts widget: the backend deletes it
 * then, and the switch disappears with it.
 */
function useEmailTurnedOffNotice(dashboard: Dashboard, enabled: boolean) {
  const emailOn =
    dashboard.eligible_for_subscription &&
    !!dashboard.subscriptions?.emailEnabled;
  const previous = useRef<{ id: string; emailOn: boolean } | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = { id: dashboard.id, emailOn };
    if (
      enabled &&
      before?.id === dashboard.id &&
      before.emailOn &&
      !dashboard.eligible_for_subscription
    ) {
      // Placeholder copy until product and design settle the wording and
      // whether to warn before the removal instead.
      toaster.create({
        title: "Email alerts turned off",
        description:
          "This dashboard no longer has an integrated alerts chart or map, so its email alerts are off. Add one back to turn them on again.",
        type: "info",
        duration: 6000,
      });
    }
  }, [dashboard.id, dashboard.eligible_for_subscription, emailOn, enabled]);
}
