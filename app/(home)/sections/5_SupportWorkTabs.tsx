import {
  Box,
  Button,
  Container,
  Heading,
  IconButton,
  Image,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react";
import { Carousel } from "../../components/ui/carousel";
import { CaretRightIcon, CaretLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;
const SUPPORT_TABS = [
  {
    title: "Track the vegetation disturbances that matter most",
    content:
      "View near real-time disturbance alerts anywhere in the world and filter by type, such as wildfire, conversion, or flooding, to focus on the events most relevant to your project or region.",
    image: "https://placehold.co/800x500/0D1429/FFFFFF?text=alert by type pie chart",
  },
  {
    title: "Understand natural ecosystem",
    content:
      "Identify remaining natural lands in your area of interest and track alerts that flag likely conversion to agriculture, mining, or urban expansion, critical for meeting conservation and compliance goals.",
    image: "https://placehold.co/800x500/0D1429/FFFFFF?text=natural ecosystem map",
  },
  {
    title: "Monitor grassland health and conversion",
    content:
    "See how grasslands are changing over time, whether from degradation or conversion, and assess likely causes, supporting sustainable agriculture and land-use planning.",
    image: "https://placehold.co/800x500/0D1429/FFFFFF?text=chart showing trends in grasslands",
  },
  {
    title: "Assess land cover change",
    content: "Get a clear snapshot of land cover anywhere on Earth and see how it has shifted over the past decade, helping you evaluate ecosystem trends and land-use trade-offs.",
    image: "https://placehold.co/800x500/0D1429/FFFFFF?text=map or chart - whatever looks better",
  },
  {
    title: "Analyze drivers of forest change",
    content: "Pinpoint the causes of tree cover loss, from commodity production to wildfire, and quickly understand the pressures shaping forests in your region.",
    image: "https://placehold.co/800x500/0D1429/FFFFFF?text=map or chart - whatever looks better",
  },
];
export default function SupportWorkTabsSection() {
  return (
    <Container
      py={{ base: 14, md: 24 }}
      pb={{ base: 14, md: 28 }}
      borderBlockEnd="1px solid"
      borderColor="border"
      bg="linear-gradient(0deg, rgba(0, 0, 0, 0.10) 0%, rgba(0, 0, 0, 0.64) 85%), url(/landing-bg-image2.png) lightgray 50% / cover no-repeat"
    >
      <Container
        textAlign="center"
        maxW="2xl"
        rounded="md"
        color="fg.inverted"
        px={0}
      >
        <Heading size={{ base: "3xl", md: "4xl" }} color="fg.inverted">
          See how monitoring intelligence can support your work
        </Heading>
        <Text fontSize="md" mb="4">
        Global Nature Watch makes advanced monitoring data easy to use,
        <br /> 
        so you can make smarter, faster decisions for people and the planet.
        </Text>
      </Container>
      <Container maxW="5xl" mt={{ base: "8", md: "10" }} px={0}>
        <Carousel.Root
          slideCount={SUPPORT_TABS.length}
          slidesPerPage={useBreakpointValue({ base: 1, md: 2, lg: 3 })}
          slidesPerMove={1}
          spacing="16px"
          position="relative"
        >
          <Carousel.Control
            position="absolute"
            left={{ base: -4, md: -16 }}
            top="50%"
            transform="translateY(-50%)"
            zIndex={2}
          >
            <Carousel.PrevTrigger asChild>
              <IconButton
                size="lg"
                rounded="full"
                variant="surface"
              >
                <CaretLeftIcon weight="bold" />
              </IconButton>
            </Carousel.PrevTrigger>
          </Carousel.Control>
          <Carousel.ItemGroup>
            {SUPPORT_TABS.map((card, idx) => (
              <Carousel.Item key={idx} index={idx}>
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="stretch"
                  gap="4"
                  bg="secondary.100"
                  rounded="lg"
                  p="4"
                  height="100%"
                >
                  <Image src={card.image} alt={card.title} />
                  <Heading size="lg" as="p" m={0} minH="3em">
                    {card.title}
                  </Heading>
                  <Text color="fg.muted">{card.content}</Text>
                </Box>
              </Carousel.Item>
            ))}
          </Carousel.ItemGroup>
          <Carousel.Control
            position="absolute"
            right={{ base: -4, md: -16 }}
            top="50%"
            transform="translateY(-50%)"
            zIndex={2}
          >
            <Carousel.NextTrigger asChild>
              <IconButton
              size="lg"
              rounded="full"
              variant="surface"
              >
                <CaretRightIcon weight="bold" />
              </IconButton>
            </Carousel.NextTrigger>
          </Carousel.Control>
        </Carousel.Root>
      </Container>
      {LANDING_PAGE_VERSION !== "closed" && (
        <Container maxW="5xl" mt={{ base: "8", md: "10" }} px={0}>
          <Box
            py={4}
            px={5}
            rounded="xl"
            bg="bg"
            display="flex"
            flexDir={{ base: "column", md: "row" }}
            alignItems={{ base: "flex-start", md: "center" }}
            justifyContent="space-between"
            gap={3}
          >
            <Heading size="md" as="p">
              How will you use monitoring intelligence?
            </Heading>
            <Button asChild variant="solid" colorPalette="primary" rounded="lg">
              <Link href="/app">
              Explore the beta
                <CaretRightIcon weight="bold" />
              </Link>
            </Button>
          </Box>
        </Container>
      )}
    </Container>
  );
}
