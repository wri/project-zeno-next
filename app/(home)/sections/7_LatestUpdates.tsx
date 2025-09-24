import {
  Box,
  Container,
  Heading,
  IconButton,
  Image,
  Text,
  Card,
  Button,
  LinkBox,
  LinkOverlay,
  Skeleton,
  useBreakpointValue,
} from "@chakra-ui/react";
import { Carousel } from "../../components/ui/carousel";

import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

const POSTS = [
  {
    title:
      "New Global Data Provides the Best View Yet of Vegetation Height Outside of Forests",
    date: "September 5, 2025",
    image:
      "https://www.datocms-assets.com/135908/1756848110-paramo_colombia_3.jpeg?auto=compress,format,enhance",
    url: "https://landcarbonlab.org/insights/global-short-vegetation-height-outside-forest/",
  },
  {
    title:
      "Tracking the Health of Earth’s Ecosystems with New Global Productivity Data",
    date: "August 21, 2025",
    image:
      "https://www.datocms-assets.com/135908/1755789098-screenshot-2025-08-21-105942.png?auto=compress,format,enhance",
    url: "https://landcarbonlab.org/insights/global-productivity-data-ecosystem-health/",
  },
  {
    title:
      "How UNESCO is Using Emissions Data to Help Safeguard World Heritage Forest Carbon Sinks",
    date: "July 8, 2025",
    image:
      "https://www.datocms-assets.com/135908/1751919792-noelkempffmercado-2-morten-ross.jpg?auto=compress,format,enhance",
    url: "https://landcarbonlab.org/insights/unesco-emissions-data-world-heritage-forest-carbon-sinks/",
  },
  {
    title:
      "A New Satellite Data App Supports Better Monitoring of European Forests",
    date: "June 30, 2025",
    image:
      "https://www.datocms-assets.com/135908/1750706456-screenshot-2025-06-23-152038.png?auto=compress,format,enhance",
    url: "https://landcarbonlab.org/insights/satellite-data-app-monitoring-european-forests/",
  },
  {
    title:
      "World’s Forest Carbon Sink Shrank to its Lowest Point in at Least 2 Decades, Due to Fires and Persistent Deforestation",
    date: "July 24, 2025",
    image:
      "https://www.datocms-assets.com/135908/1753302808-brazil-forest-fire-amazon.jpg?auto=compress,format,enhance",
    url: "https://landcarbonlab.org/insights/forest-carbon-sink-shrinking-fires-deforestation/",
  },
  {
    title:
      "Protecting Naturally Regenerating Forests is a Crucial — and Overlooked — Climate Solution",
    date: "June 24, 2025",
    image:
      "https://www.datocms-assets.com/135908/1743777114-greenfleet-australia_flickr.jpg?auto=compress,format,enhance",
    url: "https://landcarbonlab.org/insights/protecting-secondary-forests-climate-solution/",
  }
];

export default function LatestUpdatesSection() {
  return (
    <Box
      id="research"
      py={{ base: 14, md: 24 }}
      pb={{ base: 14, md: 28 }}
      borderBlockEnd="1px solid"
      borderColor="border"
      overflowX="hidden"
    >
      <Container display="flex" flexDir="column" gap={{ base: "8", md: "10" }}>
        <Container textAlign="center" maxW="2xl" px={0}>
          <Heading size={{ base: "3xl", md: "4xl" }}>
            Latest updates & research
          </Heading>
          <Text fontSize="lg" mb="4">
            Global Nature Watch serves up the latest breakthroughs in geospatial data
            from the field-leading research and technology partners behind Land & Carbon Lab and Global Forest Watch.
          </Text>
        </Container>
        <Container maxW="5xl" px={0}>
          <Carousel.Root
            defaultPage={0}
            slideCount={POSTS.length}
            slidesPerPage={useBreakpointValue({ base: 1, md: 2 })}
            slidesPerMove={1}
            spacing="32px"
            flexWrap="wrap"
            justifyContent="center"
            position="relative"
          >
            <Carousel.Control
              position={{ base: "relative", md: "absolute" }}
              left={{ base: "initial", md: -8, lg: -12 }}
              top={{ base: "initial", md: "35%" }}
            >
              <Carousel.PrevTrigger asChild>
                <IconButton rounded="full" variant="surface" zIndex="100">
                  <CaretLeftIcon weight="bold" />
                </IconButton>
              </Carousel.PrevTrigger>
            </Carousel.Control>
            <Carousel.ItemGroup order={{ base: -1, md: "inherit" }}>
              {POSTS.map((post, idx) => {
                return (
                  <Carousel.Item key={idx} index={idx}>
                    <LinkBox
                      as={Card.Root}
                      border="none"
                      key={post.title}
                      flex={1}
                      gap={4}
                      rounded="lg"
                      _hover={{ bg: "bg.subtle" }}
                    >
                      <Skeleton loading={false}>
                        <Image
                          src={post.image}
                          alt={post.title}
                          rounded="lg"
                          width="full"
                          height={{ base: "213px", md: "330px" }}
                        />
                      </Skeleton>
                      <Card.Body p={0}>
                        <Card.Title mb={2}>{post.title}</Card.Title>
                        <Card.Description
                          textTransform="uppercase"
                          letterSpacing="wider"
                        >
                          {post.date}
                        </Card.Description>
                        <LinkOverlay href={post.url} target="_blank" />
                      </Card.Body>
                    </LinkBox>
                  </Carousel.Item>
                );
              })}
            </Carousel.ItemGroup>
            <Carousel.Control
              position={{ base: "relative", md: "absolute" }}
              right={{ base: "initial", md: -8, lg: -12 }}
              top={{ base: "initial", md: "35%" }}
              pl={{ base: 8, md: "initial" }}
            >
              <Carousel.NextTrigger asChild>
                <IconButton rounded="full" variant="surface" zIndex="100">
                  <CaretRightIcon weight="bold" />
                </IconButton>
              </Carousel.NextTrigger>
            </Carousel.Control>
          </Carousel.Root>
        </Container>
        <Container maxW="5xl" px={0}>
          <Box
            p="4"
            rounded="md"
            bg="bg.muted"
            display="flex"
            flexDir={{ base: "column", md: "row" }}
            alignItems={{ base: "stretch", md: "center" }}
            gap={4}
            justifyContent="space-between"
          >
            <Heading size="xl" as="p">
              Learn more about our data and research
            </Heading>
            <Button
              asChild
              variant="solid"
              colorPalette="primary"
              rounded="lg"
              size="md"
              ml={{ base: "inherit", md: "auto" }}
            >
              <Link href="https://landcarbonlab.org/" target="_blank" rel="noopener noreferrer">
                Visit Land & Carbon Lab
              </Link>
            </Button>
            <Button
              asChild
              variant="solid"
              colorPalette="primary"
              rounded="lg"
              size="md"
            >
              <Link href="https://www.globalforestwatch.org/" target="_blank" rel="noopener noreferrer">
                Visit Global Forest Watch
              </Link>
            </Button>
          </Box>
        </Container>
      </Container>
    </Box>
  );
}
