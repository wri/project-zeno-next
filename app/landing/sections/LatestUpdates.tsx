import {
  Box,
  Container,
  Heading,
  Image,
  Text,
  SimpleGrid,
  Card,
  Button,
} from "@chakra-ui/react";
import Link from "next/link";

const POSTS = [
  {
    title:
      "How UNESCO is Using Emissions Data to Help Safeguard World Heritage Forest Carbon Sinks",
    date: "July 8, 2025",
  },
  {
    title:
      "A New Satellite Data App Supports Better Monitoring of European Forests",
    date: "June 30, 2025",
  },
];
export default function LatestUpdatesSection() {
  return (
    <Box py="24" pb="28" borderBlockEnd="1px solid" borderColor="bg.emphasized">
      <Container
        css={{ "& > *": { px: 0 } }}
        display="flex"
        flexDir="column"
        gap={{ base: "8", md: "10" }}
      >
        <Container textAlign="center" maxW="2xl">
          <Heading size={{ base: "3xl", md: "4xl" }} color="neutral.900">
            Latest Updates
          </Heading>
          <Text fontSize="lg" mb="4" color="neutral.700">
            We combine cutting-edge geospatial research from Land & Carbon Lab
            with the latest advances in technology.
          </Text>
        </Container>
        <Container maxW="5xl">
          <SimpleGrid columns={2} gap={8}>
            {POSTS.map((post) => {
              return (
                <Card.Root border="none" key={post.title}>
                  <Image src="https://placehold.co/400x300" alt="Update 1" />
                  <Card.Body>
                    <Card.Title>
                      {post.title}
                    </Card.Title>
                    <Card.Description>{post.date}</Card.Description>
                  </Card.Body>
                </Card.Root>
              );
            })}
          </SimpleGrid>
        </Container>
        <Container
          maxW="5xl"
          p="4"
          rounded="md"
          bg="bg.emphasized"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <Heading size="md" as="p">
            Learn more about our data and research
          </Heading>
          <Button asChild variant="solid" colorPalette="blue">
            <Link href="/">Visit Land & Carbon Lab</Link>
          </Button>
        </Container>
      </Container>
    </Box>
  );
}
