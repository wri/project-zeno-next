import Map from "@/app/components/Map"
import { Box, Flex, Grid, Heading } from "@chakra-ui/react"
import { useColorModeValue } from "./components/ui/color-mode";

export default function Home() {
  return (
    <Grid
      maxH="vh"
      h="vh"
      templateRows="min-content minmax(0, 1fr)"
      bg="bg"
    >
      <Grid templateColumns="28rem 1fr" p="4" pt="0" gap="2" minH="vh">
        <Grid
          gap="4"
          templateRows="1fr max-content"
          borderRadius="lg"
          shadow="md"
          p="4"
          pb="2"
          minH="100%"
        >
          <Box overflowY="auto" height="100%" mx="-4" px="4">
          </Box>
          <Box>
          </Box>
        </Grid>
        <Grid templateRows="1fr" gap="2">
          <Box borderRadius="lg" shadow="md" overflow="hidden">
            <Map />
          </Box>
        </Grid>
      </Grid>
    </Grid>
  );
}
