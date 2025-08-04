import {
  Box,
  Button,
  ButtonGroup,
  Container,
  Flex,
  Heading,
  Image,
  Input,
  Link as ChakraLink,
  Text,
  Card,
  Tabs,
} from "@chakra-ui/react";
import { CaretRightIcon } from "@phosphor-icons/react";
import Link from "next/link";

const SAMPLE_PROMPTS = [
  "Tell me about wild fires in the Brazilian Amazon Rainforest",
  "What are the latest deforestation trends in Indonesia?",
  "How is climate change affecting biodiversity in the Amazon?",
  "Show me recent land use changes in the Congo Basin",
  "What country's forests sequester the most carbon?",
  "Where are the most disturbances to nature happening now?",
  "Show me high priority areas in my monitoring portfolio",
];

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

const FEATURE_TABS = [
  {
    value: "feature-tab-1",
    label: "Find new areas of interest",
    description:
      "Using our data and technology to enrich research and support governments in policy writing.",
    image: "https://placehold.co/800x500",
  },
  {
    value: "feature-tab-2",
    label: "Monitor your existing portfolio",
    description:
      "Track changes and disturbances in your areas of interest with real-time updates.",
    image: "https://placehold.co/800x500",
  },
  {
    value: "feature-tab-3",
    label: "Compare national or regional impact",
    description:
      "Analyze the effects of policies and interventions across different regions.",
    image: "https://placehold.co/800x500",
  },
];
const HOW_STEPS = [
  {
    title: "Processing your intent",
    description:
      "When you ask Nature Watch a question, we use LangChain to process the natural language and determine your intent. This allows us to select the best AI models and analysis tools to calculate Nature Watch&rsquo;s response.",
    image: "https://placehold.co/200x80",
  },
  {
    title: "Retrieving quality data",
    description:
      "We use our trusted APIs to pull data from Global Forest Watch and Land & Carbon Lab. This means verifiable data direct from authoritative sources, not from model training data.",
    image: "https://placehold.co/200x80",
  },
  {
    title: "Tuning AI model&rsquo;s response",
    description:
      "We use Retrieval-Augmented Generation (RAG) to link data retrieved via our trusted APIs with real documentation, methods papers and metadata from our research.",
    image: "https://placehold.co/200x80",
  },
  {
    title: "Returning a response",
    description:
      "Our agents are currently able to create spatial summary statistics, perform dataset searches and return natural-language summaries.",
    image: "https://placehold.co/200x80",
  },
];
export default function LandingPage() {
  return (
    <div>
      {/* Top Section - header and hero with video background */}
      <Box>
        {/* Video Background */}
        <Box
          position="relative"
          top="0"
          left="0"
          zIndex="10"
          height="100%"
          overflow="hidden"
          width="100%"
          _after={{
            bgGradient:
              "linear(180deg, rgba(6, 0, 11, 0.29) 70.65%, #06000B 100%)",
            width: "100%",
            height: "100%",
            position: "absolute",
            content: "' '",
            top: 0,
            left: 0,
          }}
        >
          <Box
            width="100%"
            height="100%"
            position="absolute"
            objectFit="cover"
            zIndex="0"
            pointerEvents="none"
            css={{
              "& > video": {
                height: "100%",
                width: "100%",
                objectFit: "cover",
              },
            }}
          >
            <video autoPlay loop muted playsInline preload="auto">
              <source src="https://videos.pexels.com/video-files/27034712/12052397_2560_1440_30fps.mp4" />
            </video>
          </Box>

          {/* Non-App Page Header */}
          <Container
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            maxW="8xl"
            color="fg.inverted"
            py="2"
            zIndex="10"
          >
            <Flex
              divideColor={"whiteAlpha.300"}
              divideStyle={"solid"}
              divideX={"1px"}
              alignItems="center"
              gap="4"
            >
              <Heading m="0" size="2xl">
                NatureWATCH
              </Heading>
              <Text
                pl="4"
                fontSize="xs"
                display="inline-block"
                lineHeight="1.1"
              >
                Intelligent nature monitoring,
                <br /> trusted by experts
              </Text>
            </Flex>
            <Flex>
              <ButtonGroup size="sm" gap="2" variant="ghost">
                <Button asChild>
                  <Link href="#">Testimonials</Link>
                </Button>
                <Button asChild>
                  <Link href="#">Use cases</Link>
                </Button>
                <Button asChild>
                  <Link href="#">Research</Link>
                </Button>
                <Button asChild>
                  <Link href="#">Technology</Link>
                </Button>
                <Button asChild>
                  <Link href="#">Team</Link>
                </Button>
                <Button asChild variant="solid" colorPalette="blue">
                  <Link href="/">Try the preview</Link>
                </Button>
              </ButtonGroup>
            </Flex>
          </Container>
          {/* Hero Container */}
          <Box py="20" zIndex="10">
            <Container textAlign="center" maxW="2xl" color="fg.inverted">
              <Heading size="5xl">
                Tackle nature&rsquo;s toughest monitoring challenges
              </Heading>
              <Text fontSize="lg">
                NatureWATCH is your personal geospatial AI assistant, trained on
                the latest nature monitoring breakthroughs by the worl&apos;s
                leading researchers.
              </Text>
            </Container>
            <Container rounded="md" bg="bg" p="4" mt="8" maxW="xl" zIndex="10">
              <Input
                p="0"
                outline="none"
                borderWidth="0"
                size="lg"
                placeholder="Where are the most disturbances to nature happening now?"
              />
              <Flex
                justifyContent="space-between"
                alignItems="flex-start"
                mt="4"
              >
                <Flex gap="2" alignItems="flex-start" flexDirection="column">
                  <Button variant="solid" bg="lime.400" color="fg">
                    New Suggestion
                  </Button>
                  <Text fontSize="xs" color="fg.subtle">
                    Automatically updating in 4s
                  </Text>
                </Flex>
                <Button variant="solid" colorPalette="blue">
                  Go
                  {/* <CaretRightIcon weight="bold" /> TODO - fix */}
                </Button>
              </Flex>
            </Container>
            <Container
              display="flex"
              bg="blackAlpha.400"
              justifyContent="space-between"
              alignItems="center"
              rounded="md"
              fontSize="xs"
              color="fg.inverted"
              zIndex="10"
              maxW="xl"
              mt="3"
              px="2"
              py="1"
            >
              <Text>NatureWATCH is in open Beta</Text>
              <ChakraLink
                asChild
                color="fg.inverted"
                textDecoration="underline"
              >
                <Link href="#">Capped at 100 prompts</Link>
              </ChakraLink>
            </Container>
          </Box>
        </Box>
      </Box>
      {/* Sliding prompts section */}
      <Box
        py="8"
        borderBlockEnd="1px solid"
        borderColor="bg.emphasized"
        gap="4"
        overflow="hidden"
        display="flex"
        flexDirection="column"
      >
        <Flex gap="4">
          {SAMPLE_PROMPTS.map((prompt, i) => (
            <Box
              key={i}
              bg="lime.100"
              borderWidth="1px"
              borderColor="lime.400"
              p="3"
              rounded="md"
              maxW="18rem"
              flexShrink="0"
            >
              {prompt}
            </Box>
          ))}
        </Flex>
        <Flex gap="4">
          {SAMPLE_PROMPTS.reverse().map((prompt, i) => (
            <Box
              key={i}
              bg="lime.100"
              borderWidth="1px"
              borderColor="lime.400"
              p="3"
              rounded="md"
              maxW="18rem"
              flexShrink="0"
            >
              {prompt}
            </Box>
          ))}
        </Flex>
      </Box>
      {/* Partners section */}
      <Box
        py="24"
        pb="28"
        borderBlockEnd="1px solid"
        borderColor="bg.emphasized"
      >
        <Container>
          <Container textAlign="center" maxW="3xl">
            <Heading size="4xl">
              Building upon the legacy of World Resources Institute&rsquo;s
              trusted platforms
            </Heading>
            <Text fontSize="lg">
              NatureWATCH is build on the data and research of Global Forest
              Watch and Land & Carbon Lab, as trusted by NGOs, governments and
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
      {/* Features Section */}
      <Box
        py="24"
        pb="28"
        borderBlockEnd="1px solid"
        borderColor="bg.emphasized"
      >
        <Container>
          <Container textAlign="center" maxW="3xl">
            <Heading size="4xl">
              Get answers to your toughest questions about natural landscapes
            </Heading>
            <Text fontSize="lg">
              NatureWATCH&rsquo;s AI understands your questions in plian
              language and delivers the most relevant data, satellite imagery
              and insights, formatted to fit your wofrkflow.
            </Text>
            <Button asChild variant="solid" colorPalette="blue" mt="4">
              <Link href="/">
                Launch the Preview
                {/* <CaretRightIcon weight="bold" /> TODO: Fix icon import */}
              </Link>
            </Button>
          </Container>
          <Container mt="12">
            <Tabs.Root orientation="vertical" colorPalette="blue">
              <Tabs.List>
                {FEATURE_TABS.map((tab) => (
                  <Tabs.Trigger
                    key={tab.value}
                    value={tab.value}
                    display="flex"
                    flexDir="column"
                    maxW="sm"
                    alignItems="flex-start"
                    textAlign="left"
                    height="auto"
                  >
                    <Text fontWeight="bold">{tab.label}</Text>
                    <Text fontWeight="normal">{tab.description}</Text>
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              {FEATURE_TABS.map((tab) => (
                <Tabs.Content
                  key={tab.value}
                  value={tab.value}
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  gap="4"
                >
                  <Image src={tab.image} alt={tab.label} />
                  <Text
                    fontSize="xs"
                    textAlign="center"
                    as="figcaption"
                    color="fg.muted"
                  >
                    {tab.description}
                  </Text>
                </Tabs.Content>
              ))}
            </Tabs.Root>
          </Container>
        </Container>
      </Box>
      <Box
        py="24"
        pb="28"
        borderBlockEnd="1px solid"
        borderColor="bg.emphasized"
        bg="green.fg"
      >
        <Container textAlign="center" maxW="2xl" rounded="md">
          <Heading size="3xl">
            See how monitoring intelligence can support your work
          </Heading>
          <Text fontSize="md" mb="4">
            From field work to policy writing, NatureWATCH empowers smarter
            decisions, and meaningful action in the places you care about.
          </Text>
        </Container>
        {/* Ideas Section */}
        <Container maxW="4xl" mt="8" p="0">
          <Tabs.Root variant="enclosed">
            <Tabs.List alignContent="center">
              <Tabs.Trigger value="restoration">Restoration</Tabs.Trigger>
              <Tabs.Trigger value="conservation">Conservation</Tabs.Trigger>
              <Tabs.Trigger value="Policy">Policy</Tabs.Trigger>
              <Tabs.Trigger value="Research">Research</Tabs.Trigger>
              <Tabs.Trigger value="Journalism">Journalism</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content
              value="restoration"
              bg="bg"
              display="flex"
              rounded="lg"
              gap="4"
              padding="8"
            >
              <Box
                display="flex"
                flexDirection="column"
                alignItems="flex-start"
                gap="4"
                bg="lime.100"
                rounded="md"
                p="4"
                maxW="18rem"
              >
                <Image src="https://placehold.co/200x80" alt="Restoration" />
                <Heading size="sm" as="p">
                  Highlight priority areas for intervation
                </Heading>
                <Text fontSize="xs" color="fg.muted">
                  Identify regions most in need of restoration by exploring
                  global and local ecological activity from forest loss to land
                  conversion.
                </Text>
              </Box>
              <Box
                display="flex"
                flexDirection="column"
                alignItems="flex-start"
                gap="4"
                bg="lime.100"
                rounded="md"
                p="4"
                maxW="18rem"
              >
                <Image src="https://placehold.co/200x80" alt="Restoration" />
                <Heading size="sm" as="p">
                  Highlight priority areas for intervation
                </Heading>
                <Text fontSize="xs" color="fg.muted">
                  Identify regions most in need of restoration by exploring
                  global and local ecological activity from forest loss to land
                  conversion.
                </Text>
              </Box>
              <Box
                display="flex"
                flexDirection="column"
                alignItems="flex-start"
                gap="4"
                bg="lime.100"
                rounded="md"
                p="4"
                maxW="18rem"
              >
                <Image src="https://placehold.co/200x80" alt="Restoration" />
                <Heading size="sm" as="p">
                  Highlight priority areas for intervation
                </Heading>
                <Text fontSize="xs" color="fg.muted">
                  Identify regions most in need of restoration by exploring
                  global and local ecological activity from forest loss to land
                  conversion.
                </Text>
              </Box>
            </Tabs.Content>
          </Tabs.Root>
        </Container>
        <Container
          maxW="4xl"
          mt="8"
          p="4"
          rounded="md"
          bg="bg"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <Heading size="md" as="p">
            How will you use monitoring intelligence?
          </Heading>
          <Button asChild variant="solid" colorPalette="blue">
            <Link href="/">Start Exploring</Link>
          </Button>
        </Container>
      </Box>
      {/* How it works section */}
      <Box
        py="24"
        pb="28"
        borderBlockEnd="1px solid"
        borderColor="bg.emphasized"
      >
        <Container textAlign="center" maxW="2xl">
          <Heading size="3xl">How it works</Heading>
        </Container>
        <Container maxW="2xl">
          {HOW_STEPS.map((step, index) => (
            <Box key={index} title={step.title}>
              <Heading>{step.title}</Heading>
              <Text>{step.description}</Text>
            </Box>
          ))}
        </Container>
      </Box>
      {/* Land and Carbon Lab Updates */}
      <Box
        py="24"
        pb="28"
        borderBlockEnd="1px solid"
        borderColor="bg.emphasized"
      >
        <Container>
          <Container textAlign="center" maxW="2xl">
            <Heading size="3xl">Latest Updates</Heading>
            <Text fontSize="lg" mb="4">
              We combine cutting-edge geospatial research from Land & Carbon Lab
              with the latest advances in technology.
            </Text>
          </Container>
          <Flex gap="16">
            <Card.Root>
              <Image src="https://placehold.co/400x300" alt="Update 1" />
              <Card.Body>
                <Card.Title>
                  How UNESCO is Using Emissions Data to Help Safeguard World
                  Heritage Forest Carbon Sinks
                </Card.Title>
                <Card.Description>July 8, 2025</Card.Description>
              </Card.Body>
            </Card.Root>
            <Card.Root>
              <Image src="https://placehold.co/400x300" alt="Update 1" />
              <Card.Body>
                <Card.Title>
                  A New Satellite Data App Supports Better Monitoring of
                  European Forests
                </Card.Title>
                <Card.Description>June 30, 2025</Card.Description>
              </Card.Body>
            </Card.Root>
          </Flex>
          <Container
            maxW="4xl"
            mt="8"
            p="4"
            rounded="md"
            bg="bg"
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
      {/* The future of monitoring section */}
      <Box
        py="24"
        pb="28"
        borderBlockEnd="1px solid"
        borderColor="bg.emphasized"
      >
        <Container>
          <Container textAlign="center" maxW="2xl">
            <Heading size="3xl">The future of monitoring</Heading>
            <Text fontSize="lg" mb="4">
              We’re making geospatial data more accessible, easier to use and
              more impactful for everyone working to protect the planet.{" "}
            </Text>
          </Container>
          <Container display="flex" gap="8" flexDir={"column"}>
            <Flex gap="4">
              <Box>
                <Heading size="sm">Cutting-edge data</Heading>
                <Text>
                  We solve the hardest challenges in monitoring nature.
                  Providing you with the data you’ve always needed but never
                  had, and empowering you to take real-world action. Our data is
                  globally available, consistent over time and created by some
                  of the world’s most talented field experts.
                </Text>
                <Link href="#">Learn more about our data</Link>
              </Box>
              <Image
                src="https://placehold.co/400x300"
                alt="Future of monitoring"
              />
            </Flex>
            <Flex gap="4">
              <Box>
                <Heading size="sm">Cutting-edge data</Heading>
                <Text>
                  We solve the hardest challenges in monitoring nature.
                  Providing you with the data you’ve always needed but never
                  had, and empowering you to take real-world action. Our data is
                  globally available, consistent over time and created by some
                  of the world’s most talented field experts.
                </Text>
                <Link href="#">Learn more about our data</Link>
              </Box>
              <Image
                src="https://placehold.co/400x300"
                alt="Future of monitoring"
              />
            </Flex>
            <Flex gap="4">
              <Box>
                <Heading size="sm">Monitoring intelligence</Heading>
                <Text>
                  Traditional geospatial analysis has hit a ceiling. The future
                  places the power of having your own personal geospatial expert
                  in your pocket. With our AI assistants trained on our
                  cutting-edge data, we democratize data access for monitoring
                  so it can reach more people and places, empowering both
                  geospatial experts and novices alike.
                </Text>
                <Link href="#">Learn more about our models and agents</Link>
              </Box>
              <Image
                src="https://placehold.co/400x300"
                alt="Future of monitoring"
              />
            </Flex>
            <Flex gap="4">
              <Box>
                <Heading size="sm">Intelligent tools</Heading>
                <Text>
                  The new era of AI brings with it a requirement for intelligent
                  tools that help you find and predict insights from an
                  abundance of data. Nature Watch allows you to gain insights in
                  a way that is natural and convenient for you. Insights in your
                  language, on any of your devices, whenever you need it.
                </Text>
                <Link href="#">Learn more about our tools</Link>
              </Box>
              <Image
                src="https://placehold.co/400x300"
                alt="Future of monitoring"
              />
            </Flex>
            <Flex gap="4">
              <Box>
                <Heading size="sm">
                  Integrative technology (coming soon)
                </Heading>
                <Text>
                  We believe the future of monitoring data and technology is
                  open source, and accessible to everyone. That’s why Nature
                  Watch is open, extensible and ready to integrate with your own
                  systems, extending the power of your own data.
                </Text>
                <Link href="#">Learn more about our integrations</Link>
              </Box>
              <Image
                src="https://placehold.co/400x300"
                alt="Future of monitoring"
              />
            </Flex>
          </Container>
        </Container>
      </Box>
      {/* Logos Section */}
      <Box
        py="24"
        pb="28"
        borderBlockEnd="1px solid"
        borderColor="bg.emphasized"
      >
        <Container>
          <Container textAlign="center" maxW="2xl">
            <Heading size="3xl">The team behind Nature Watch</Heading>
            <Text fontSize="lg" mb="4">
              Nature Watch is the work of World Resources Institute and Land &
              Carbon Lab, in collaboration with other teams working to shape the
              future of monitoring research, data and analysis.
            </Text>
          </Container>
          <Flex gap="4" wrap="wrap" justifyContent="center">
            {/* Team org logos */}
            {["WRI", "LCL", "BEF", "GFW"].map((name) => (
              <Link
                key={name}
                href={`https://www.${name.toLowerCase()}.org`}
                target="_blank"
              >
                <Image
                  src={`/images/${name.toLowerCase()}-logo.png`}
                  alt={`${name} logo`}
                  maxW="10rem"
                />
              </Link>
            ))}
          </Flex>
        </Container>
      </Box>
      <Box
        py="24"
        pb="28"
        borderBlockEnd="1px solid"
        borderColor="bg.emphasized"
      >
        <Container>
          <Container maxW="2xl">
            <Heading textAlign="center" size="3xl">
              The marker of a new era
            </Heading>
            <Text fontSize="lg" mb="4">
              World Resources Institute tools have been transforming global
              geospatial analysis for over 14 years, with Global Forest Watch
              having particularly successful impact over forest monitoring
              across the tropics.
            </Text>
            <Text fontSize="lg" mb="4">
              However, as we look to the latest advances in technology, AI
              unlocks an opportunity for us to shift from global-first,
              fixed-structure outputs to highly-targeted, actionable insights in
              the language, terminology and regions that matter most to our
              users.
            </Text>
            <Text fontSize="lg" mb="4">
              Nature Watch marks a new chapter in our monitoring research, data
              and tools. We step away from simply watching ecosystems, and
              toward empowering intelligence-backed action.
            </Text>
          </Container>
          <Container
            bg="bg.subtle"
            shadow="md"
            border="1px solid"
            borderColor="blackAlpha.200"
            rounded="md"
            p="6"
            mt="8"
            maxW="2xl"
          >
            <Heading
              borderStart="2px solid"
              borderColor="pink.400"
              pl="4"
              size="lg"
              as="blockquote"
            >
              “Meaningful change doesn’t come from simply watching, it comes
              from taking action”
            </Heading>
            <Text as="cite" fontSize="sm">
              Craig Mills, Land & Carbon Lab
            </Text>
          </Container>
        </Container>
      </Box>
      {/* Footer Section */}
      <Box
        py="24"
        pb="28"
        borderBlockEnd="1px solid"
        borderColor="bg.emphasized"
      >
        <Container>
          <Container
            maxW="4xl"
            mt="8"
            p="4"
            rounded="md"
            bg="bg"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Heading size="md" as="p">
                How will you use monitoring intelligence?{" "}
              </Heading>
              <Text fontSize="sm" color="fg.muted">
                Join the future of ecosystem monitoring and help us shape what
                comes next.
              </Text>
            </Box>
            <Button asChild variant="solid" colorPalette="blue">
              <Link href="/">Try the preview</Link>
              {/* <CaretRightIcon weight="bold" /> TODO - fix */}
            </Button>
          </Container>
        </Container>
      </Box>
      <Box as="footer" p="12" pb="0">
        <Container display="flex" flexDirection="column" gap={8}>
          <Flex justifyContent="space-between" alignItems="center" gap={4}>
            <Heading size="3xl">NatureWATCH</Heading>
            <Flex>
              {PARTNER_ORGS.map((org) =>
                <Image key={org.name} src={org.logo} alt={`${org.name} logo`} />
              )}
            </Flex>
          </Flex>
          <Flex justifyContent="space-between" alignItems="center" gap={4}>
            <Flex alignItems="center" gap={4}>
              <Text>{Date.now()} © NatureWATCH</Text>
              <Link href="#">Privacy Policy</Link>
              <Link href="#">Cookie Preferences</Link>
            </Flex>
            <Flex alignItems="center" gap={4}>
              <Link href="#">Instagram</Link>
              <Link href="#">Linkedin</Link>
              <Link href="#">Twitter</Link>
            </Flex>
          </Flex>
        </Container>
      </Box>
    </div>
  );
}
