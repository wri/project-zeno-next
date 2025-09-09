"use client";

import { Box, Grid } from "@chakra-ui/react";
import { Suspense, useEffect } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

import ChatPanel from "@/app/ChatPanel";
import LoginOverlay from "@/app/components/LoginOverlay";
import UploadAreaDialog from "@/app/components/UploadAreaDialog";
import Map from "@/app/components/Map";
import { Sidebar } from "@/app/sidebar";
import PageHeader from "@/app/components/PageHeader";
import WelcomeModal from "@/app/components/WelcomeModal";
import CookieConsent from "@/app/components/CookieConsent";
import useCookieConsentStore from "@/app/store/cookieConsentStore";
import DebugToastsPanel from "@/app/components/DebugToastsPanel";
import { useSearchParams } from "next/navigation";
const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cookieConsent, setConsentStatus } = useCookieConsentStore();

  useEffect(() => {
    // As we can't read localStorage outside the useEffect, we update the
    // cookieConsent state value if the consent was given previously.
    if (
      GA_ID &&
      localStorage.getItem("analyticsConsent") === "true" &&
      !cookieConsent
    ) {
      setConsentStatus(true);
    }
  }, [cookieConsent, setConsentStatus]);

  function DebugToastsMount() {
    const params = useSearchParams();
    const debugEnabled =
      process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS === "true" ||
      params.get("debug") === "1";
    return <DebugToastsPanel enabled={debugEnabled} />;
  }

  return (
    <Grid
      maxH="100vh"
      h="100vh"
      templateRows="min-content minmax(0px, 1fr)"
      bg="bg"
    >
      {cookieConsent && GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      <LoginOverlay />
      <WelcomeModal />
      {GA_ID && <CookieConsent />}
      <UploadAreaDialog />
      <PageHeader />
      <Grid
        templateColumns="auto 36rem 1fr"
        templateAreas="'sidebar chat map'"
        templateRows="1fr"
        maxH="calc(100vh - 3rem)"
      >
        <Sidebar />
        <ChatPanel />
        <Grid templateRows="1fr" gridArea="map">
          <Box overflow="hidden">
            <Map />
          </Box>
        </Grid>
      </Grid>
      <Suspense fallback={null}>
        <DebugToastsMount />
      </Suspense>
      {children}
    </Grid>
  );
}
