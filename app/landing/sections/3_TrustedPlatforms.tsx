import {
  Box,
  Container,
  Heading,
  Image,
  Card,
  Text,
  IconButton,
  useBreakpointValue,
} from "@chakra-ui/react";
import { Carousel } from "../../components/ui/carousel";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
const PARTNER_ORGS = [
  {
    name: "Conservation International",
    logo: "/CI-logo.svg",
    description:
      "Using our data and technology to enrich their research and support governments in policy writing.",
  },
  {
    name: "Global Forest Watch",
    logo: "/GFW-logo-mono.svg",
    description: "The world’s most trusted platform for monitoring forests.",
  },
  {
    name: "Land & Carbon Lab",
    logo: "/LCL-logo.svg",
    description: "A global leader in land use and carbon monitoring.",
  },
];

export default function TrustedPlatformsSection() {
  return (
    <Box
      py={{ base: 14, md: 24 }}
      pb={{ base: 14, md: 28 }}
      borderBlockEnd="1px solid"
      borderColor="bg.emphasized"
    >
      <Container>
        <Container textAlign="center" maxW="3xl">
          <Heading size={{ base: "3xl", md: "4xl" }}>
            Building upon the legacy of World Resources Institute&rsquo;s
            trusted platforms
          </Heading>
          <Text fontSize="lg">
            Global Nature Watch is built on the data and research of Global
            Forest Watch and Land & Carbon Lab, as trusted by NGOs, governments,
            journalists, communities, companies and geospatial experts
            worldwide for over 14 years.
          </Text>
        </Container>
        <Container
          display="flex"
          gap="6"
          flexWrap="wrap"
          justifyContent="center"
          maxW="5xl"
          mt="12"
          px={0}
        >
          <Carousel.Root
            defaultPage={0}
            slideCount={PARTNER_ORGS.length}
            slidesPerPage={useBreakpointValue({ base: 1, md: 3 })}
            slidesPerMove={1}
            spacing="32px"
            flexWrap="wrap"
            justifyContent="center"
            position="relative"
            maxW="100%"
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
            <Carousel.ItemGroup
              order={{ base: -1, md: "inherit" }}
              pb={{ base: 6, md: 0 }}
            >
              {PARTNER_ORGS.map((org, idx) => {
                return (
                  <Carousel.Item key={idx} index={idx}>
                    <Card.Root
                      size="sm"
                      overflow="hidden"
                      bg="bg.muted"
                      h="full"
                      rounded="xl"
                    >
                      <Box
                        bg="lime.200"
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        h="8.5rem"
                        p={4}
                        overflow="hidden"
                      >
                        <Image src={org.logo} alt={`${org.name} logo`} />
                      </Box>
                      <Card.Body>
                        <Card.Title fontSize="lg">{org.name}</Card.Title>
                        <Card.Description fontSize="md">
                          {org.description}
                        </Card.Description>
                      </Card.Body>
                    </Card.Root>
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
      </Container>
    </Box>
  );
}
