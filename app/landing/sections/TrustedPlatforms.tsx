import { Box, Container, Heading, Image, Card, Text } from "@chakra-ui/react";

const PARTNER_ORGS = [
  {
    name: "Conservation International",
    logo: "/images/ci-logo.png",
    description:
      "Using our data and technology to enrich their research and support governments in policy writing.",
  },
  {
    name: "Global Forest Watch",
    logo: "/images/gfw-logo.png",
    description: "The world’s most trusted platform for monitoring forests.",
  },
  {
    name: "Land & Carbon Lab",
    logo: "/images/lcl-logo.png",
    description: "A global leader in land use and carbon monitoring.",
  },
];

export default function TrustedPlatformsSection() {
  return (
    <Box py="24" pb="28" borderBlockEnd="1px solid" borderColor="bg.emphasized">
      <Container>
        <Container textAlign="center" maxW="3xl">
          <Heading size={{ base: "3xl", md: "4xl" }}>
            Building upon the legacy of World Resources Institute&rsquo;s
            trusted platforms
          </Heading>
          <Text fontSize="lg">
            Global Nature Watch is build on the data and research of Global Forest Watch
            and Land & Carbon Lab, as trusted by NGOs, governments and
            geospatial experts worldwide for over 14 years.
          </Text>
        </Container>
        <Container
          display="flex"
          gap="6"
          flexWrap="wrap"
          justifyContent="center"
          mt="8"
        >
          {PARTNER_ORGS.map((org) => {
            return (
              <Card.Root
                key={org.name}
                size="sm"
                maxW="xs"
                overflow="hidden"
                bg="bg.muted"
              >
                <Box
                  bg="lime.200"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  minH="8rem"
                  overflow="hidden"
                >
                  <Image src={org.logo} alt={`${org.name} logo`} />
                </Box>
                <Card.Body>
                  <Card.Title>{org.name}</Card.Title>
                  <Card.Description>{org.description}</Card.Description>
                </Card.Body>
              </Card.Root>
            );
          })}
        </Container>
      </Container>
    </Box>
  );
}
