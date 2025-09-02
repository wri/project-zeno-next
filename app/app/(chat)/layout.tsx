"use client";

import { Box, Grid } from "@chakra-ui/react";
import { useEffect } from "react";

import ChatPanel from "@/app/ChatPanel";
import LoginOverlay from "@/app/components/LoginOverlay";
import UploadAreaDialog from "@/app/components/UploadAreaDialog";
import Map from "@/app/components/Map";
import { Sidebar } from "@/app/sidebar";
import useMapStore from "@/app/store/mapStore";
import useContextStore from "@/app/store/contextStore";
import PageHeader from "@/app/components/PageHeader";
import WelcomeModal from "@/app/components/WelcomeModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { reset: resetMapStore } = useMapStore();
  const { reset: resetContextStore } = useContextStore();

  useEffect(() => {
    resetMapStore();
    resetContextStore();
  }, [resetMapStore, resetContextStore]);

  return (
    <Grid
      maxH="100vh"
      h="100vh"
      templateRows="min-content minmax(0px, 1fr)"
      bg="bg"
    >
      <LoginOverlay />
      <WelcomeModal />
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
      {children}
    </Grid>
  );
}
