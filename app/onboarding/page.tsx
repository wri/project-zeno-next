import { Suspense } from "react";
import { Box, Spinner, Center } from "@chakra-ui/react";
import OnboardingForm from "./form";

function Loading() {
  return (
    <Box minH="100vh" bg="bg" py={24}>
      <Center>
        <Spinner size="xl" />
      </Center>
    </Box>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OnboardingForm />
    </Suspense>
  );
}