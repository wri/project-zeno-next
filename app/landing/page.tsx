"use client";
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
  Badge,
} from "@chakra-ui/react";
import {
  ArrowsClockwiseIcon,
  CaretRightIcon,
  PencilRulerIcon,
} from "@phosphor-icons/react";
import { Tooltip } from "@/components/ui/tooltip";
import Link from "next/link";
import { Button as WRIButton } from "@worldresources/wri-design-systems";

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
          bg="hsla(225, 52%, 11%, 1)"
          backgroundImage="radial-gradient(circle at 80% 80%, hsl(225deg 70% 15%) 0%, hsl(224deg 65% 11%) 50%)"
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
            top={28}
            zIndex="0"
            pointerEvents="none"
            css={{
              "& > video": {
                height: "100%",
                width: "100%",
                objectFit: "cover",
                objectPosition: "top",
              },
            }}
          >
            <video autoPlay loop muted playsInline preload="auto">
              <source src={"/landing-hero-bg.mp4"} type="video/mp4" />
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
            backdropBlur="10px"
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
              <Heading size={{ base: "4xl", md: "5xl" }}>
                Tackle nature&rsquo;s toughest monitoring challenges
              </Heading>
              <Text fontSize="lg">
                NatureWATCH is your personal geospatial AI assistant, trained on
                the latest nature monitoring breakthroughs by the worl&apos;s
                leading researchers.
              </Text>
            </Container>
            <Container
              rounded="md"
              bg="bg"
              p="4"
              mt="8"
              maxW={{ base: "lg", md: "xl" }}
              zIndex="10"
            >
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
                  <Button
                    variant="outline"
                    _after={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: 0,
                      right: 0,
                      content: "''",
                      zIndex: -1,
                      width: "40%",
                      height: "100%",
                      bg: "lime.100",
                    }}
                  >
                    <ArrowsClockwiseIcon />
                    New Suggestion
                  </Button>
                  <Text fontSize="xs" color="fg.subtle">
                    Automatically updating in 4s
                  </Text>
                </Flex>
                <WRIButton
                  variant="primary"
                  rightIcon={<CaretRightIcon weight="bold" />}
                  label="Go"
                />
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
              maxW={{ base: "lg", md: "xl" }}
              mt="3"
              px="2"
              py="1"
            >
              <Text>
                <Badge size="xs" fontSize="8px" rounded="none" mr="1">
                  BETA
                </Badge>
                NatureWATCH is in open Beta
              </Text>
              <Tooltip content="While NatureWATCH is in Beta, prompt limits exist to let you trial the assistant while keeping it fast, reliable, and affordable for all.">
                <Box
                  color="fg.inverted"
                  textDecoration="underline"
                  textDecorationStyle="dotted"
                  cursor="pointer"
                  display="flex"
                  gap="1"
                  alignItems="center"
                >
                  <PencilRulerIcon />
                  Capped at 100 prompts
                </Box>
              </Tooltip>
            </Container>
          </Box>
        </Box>
      </Box>
      {/* Sliding prompts section */}
      <Box
        py="8"
        bg="neutral.300"
        borderBlockEnd="1px solid"
        borderColor="neutral.400"
        gap="4"
        overflow="hidden"
        display="flex"
        flexDirection="column"
      >
        <Flex gap="4">
          {SAMPLE_PROMPTS.map((prompt, i) => (
            <Box
              key={i}
              bg="neutral.200"
              borderWidth="1px"
              borderColor="neutral.400"
              p="3"
              rounded="md"
              maxW="18rem"
              flexShrink="0"
              fontSize="sm"
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
            <Heading size={{ base: "3xl", md: "4xl" }}>
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
            <Heading size={{ base: "3xl", md: "4xl" }}>
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
                <CaretRightIcon weight="bold" />
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
        bg="linear-gradient(0deg, rgba(0, 0, 0, 0.10) 0%, rgba(0, 0, 0, 0.64) 85%), url(/landing-bg-image2.png) lightgray 50% / cover no-repeat"
      >
        <Container
          textAlign="center"
          maxW="2xl"
          rounded="md"
          color="fg.inverted"
        >
          <Heading size={{ base: "3xl", md: "4xl" }}>
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
          <Heading size={{ base: "4xl", md: "5xl" }}>How it works</Heading>
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
        <Container
          css={{ "& > *": { px: 0 } }}
          display="flex"
          flexDir="column"
          gap={{ base: "8", md: "10" }}
        >
          <Container textAlign="center" maxW="2xl">
            <Heading size={{ base: "3xl", md: "4xl" }}>Latest Updates</Heading>
            <Text fontSize="lg" mb="4">
              We combine cutting-edge geospatial research from Land & Carbon Lab
              with the latest advances in technology.
            </Text>
          </Container>
          <Container display="flex" gap="8" maxW="5xl">
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
      {/* The future of monitoring section */}
      <Box
        py="24"
        pb="28"
        borderBlockEnd="1px solid"
        borderColor="bg.emphasized"
      >
        <Container
          css={{ "& > *": { px: 0 } }}
          display="flex"
          flexDir="column"
          gap={{ base: "8", md: "14" }}
        >
          <Container textAlign="center" maxW="2xl">
            <Heading size={{ base: "3xl", md: "4xl" }}>
              The future of monitoring
            </Heading>
            <Text fontSize="lg" mb="4">
              We&rsquo;re making geospatial data more accessible, easier to use
              and more impactful for everyone working to protect the planet.{" "}
            </Text>
          </Container>
          <Container display="flex" gap="14" flexDir={"column"} maxW="5xl">
            <Flex
              flexDir={{ base: "column-reverse", md: "row" }}
              alignItems="center"
              gap={{ base: "10", md: "16" }}
            >
              <Box maxW="lg">
                <Heading size={{ base: "xl", md: "2xl" }} mb="2">
                  Cutting-edge data
                </Heading>
                <Text fontSize="lg" mb="4">
                  We solve the hardest challenges in monitoring nature.
                  Providing you with the data you&rsquo;ve always needed but
                  never had, and empowering you to take real-world action. Our
                  data is globally available, consistent over time and created
                  by some of the world&rsquo;s most talented field experts.
                </Text>
                <ChakraLink
                  fontSize="lg"
                  color="primary.700"
                  textDecoration="underline"
                  href="#"
                >
                  Learn more about our data
                </ChakraLink>
              </Box>
              <Box position="relative" h="72" w="full">
                <Image
                  position="absolute"
                  h="121px"
                  w="201px"
                  rounded="md"
                  top="0.5"
                  src="/fm-1a.png"
                  alt="image of a field"
                />
                <Image
                  position="absolute"
                  h="127px"
                  w="178px"
                  rounded="md"
                  top="25%"
                  right="0"
                  src="/fm-1b.png"
                  alt="image of a field"
                />
                <Image
                  position="absolute"
                  h="124px"
                  w="172px"
                  rounded="md"
                  bottom="5%"
                  left="15%"
                  src="/fm-1c.png"
                  alt="image of a field"
                />
              </Box>
            </Flex>
            <Flex
              flexDir={{ base: "column-reverse", md: "row" }}
              alignItems="center"
              gap={{ base: "10", md: "16" }}
            >
              <Box maxW="lg">
                <Heading size={{ base: "xl", md: "2xl" }} mb="2">
                  Monitoring intelligence
                </Heading>
                <Text fontSize="lg" mb="4">
                  Traditional geospatial analysis has hit a ceiling. The future
                  places the power of having your own personal geospatial expert
                  in your pocket. With our AI assistants trained on our
                  cutting-edge data, we democratize data access for monitoring
                  so it can reach more people and places, empowering both
                  geospatial experts and novices alike.
                </Text>
                <ChakraLink
                  fontSize="lg"
                  color="primary.700"
                  textDecoration="underline"
                  href="#"
                >
                  Learn more about our models and agents
                </ChakraLink>
              </Box>
              <Box position="relative" h="72" w="full">
                <Box
                  fontSize="8px"
                  padding="6px"
                  bg="neutral.300"
                  border="1px solid"
                  borderColor="neutral.400"
                  rounded="sm"
                  shadow="sm"
                  position="absolute"
                  maxW="172px"
                  top="20%"
                  zIndex="10"
                >
                  Identify disturbances in my project portfolio
                </Box>
                <Box
                  fontSize="8px"
                  padding="6px"
                  bg="neutral.300"
                  border="1px solid"
                  borderColor="neutral.400"
                  rounded="sm"
                  shadow="sm"
                  position="absolute"
                  maxW="172px"
                  right="0"
                  top="50%"
                  zIndex="10"
                >
                  Show me high priority areas for agroforesty projects
                </Box>
                <Image
                  src="/fm-2.png"
                  alt="Smartphone mockup of monitoring application"
                  width="136px"
                  h="280px"
                  objectPosition="80%"
                  position="relative"
                  left="50%"
                  transform="translateX(-50%)"
                />
              </Box>
            </Flex>
            <Flex
              flexDir={{ base: "column-reverse", md: "row" }}
              alignItems="center"
              gap={{ base: "10", md: "16" }}
            >
              <Box maxW="lg">
                <Heading size={{ base: "xl", md: "2xl" }} mb="2">
                  Intelligent tools
                </Heading>
                <Text fontSize="lg" mb="4">
                  The new era of AI brings with it a requirement for intelligent
                  tools that help you find and predict insights from an
                  abundance of data. Nature Watch allows you to gain insights in
                  a way that is natural and convenient for you. Insights in your
                  language, on any of your devices, whenever you need it.
                </Text>
                <ChakraLink
                  fontSize="lg"
                  color="primary.700"
                  textDecoration="underline"
                  href="#"
                >
                  Learn more about our tools
                </ChakraLink>
              </Box>
              <Box position="relative" h="72" w="full" display="grid" placeContent="center">
                <Box
                  w="220px"
                  fontSize="8px"
                  p="10px"
                  bg="neutral.300"
                  border="1px solid"
                  borderColor="neutral.400"
                  rounded="sm"
                  shadow="sm"
                >
                  <Text fontSize="8px">
                    Currently the most disturbances to nature are occurring in
                    Brazil, with over 500,000 alerts of disturbances.
                  </Text>
                  Vegetation Cover Loss 250,000 Human-Driven Conversion Alerts
                  100,000 Natural Disturbances 150,000
                </Box>
              </Box>
            </Flex>
            <Flex
              flexDir={{ base: "column-reverse", md: "row" }}
              alignItems="center"
              gap={{ base: "10", md: "16" }}
            >
              <Box maxW="lg">
                <Heading size={{ base: "xl", md: "2xl" }} mb="2">
                  Integrative technology (coming soon)
                </Heading>
                <Text fontSize="lg" mb="4">
                  We believe the future of monitoring data and technology is
                  open source, and accessible to everyone. That&rsquo;s why
                  Nature Watch is open, extensible and ready to integrate with
                  your own systems, extending the power of your own data.
                </Text>
                <ChakraLink
                  fontSize="lg"
                  color="primary.700"
                  textDecoration="underline"
                  href="#"
                >
                  Learn more about our integrations
                </ChakraLink>
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
        <Container
          css={{ "& > *": { px: 0 } }}
          display="flex"
          flexDir="column"
          gap={{ base: "8", md: "14" }}
        >
          <Container textAlign="center" maxW="2xl">
            <Heading size={{ base: "3xl", md: "4xl" }}>
              The team behind Nature Watch
            </Heading>
            <Text fontSize="lg" mb="4">
              Nature Watch is the work of World Resources Institute and Land &
              Carbon Lab, in collaboration with other teams working to shape the
              future of monitoring research, data and analysis.
            </Text>
          </Container>
          <Flex
            gap="12"
            alignItems="center"
            flexWrap="wrap"
            justifyContent="center"
          >
            <ChakraLink href="https://www.wri.org/">
              <Image src="/WRI-logo.svg" alt="WRI Logo" height="64px" />
            </ChakraLink>
            <ChakraLink href="https://www.bezosearthfund.org/">
              <Image src="/BEF-logo.png" alt="BEF Logo" height="64px" />
            </ChakraLink>
            <ChakraLink href="https://landcarbonlab.org/">
              <Image src="/LCL-logo.svg" alt="LCL Logo" height="64px" />
            </ChakraLink>
            <ChakraLink href="https://www.globalforestwatch.org/">
              <Image src="/GFW-logo.svg" alt="GFW Logo" height="64px" />
            </ChakraLink>
          </Flex>
        </Container>
      </Box>
      {/* New Era Quote Section - hidden on mobile */}
      <Box
        py="24"
        pb="28"
        borderBlockEnd="1px solid"
        borderColor="bg.emphasized"
        hideBelow={"sm"}
      >
        <Container maxW="2xl">
          <Heading textAlign="center" size={{ base: "3xl", md: "4xl" }}>
            The marker of a new era
          </Heading>
          <Text fontSize="lg" mb="4">
            World Resources Institute tools have been transforming global
            geospatial analysis for over 14 years, with Global Forest Watch
            having particularly successful impact over forest monitoring across
            the tropics.
          </Text>
          <Text fontSize="lg" mb="4">
            However, as we look to the latest advances in technology, AI unlocks
            an opportunity for us to shift from global-first, fixed-structure
            outputs to highly-targeted, actionable insights in the language,
            terminology and regions that matter most to our users.
          </Text>
          <Text fontSize="lg" mb="4">
            Nature Watch marks a new chapter in our monitoring research, data
            and tools. We step away from simply watching ecosystems, and toward
            empowering intelligence-backed action.
          </Text>
        </Container>
        <Container
          bg="neutral.200"
          rounded="xl"
          p="6"
          mt="8"
          maxW="2xl"
          display="flex"
          flexDir="column"
          gap="2"
        >
          <Heading
            borderStart="2px solid"
            borderColor="blue.700"
            pl="4"
            size="xl"
            as="blockquote"
          >
            “Meaningful change doesn&rsquo;t come from simply watching, it comes
            from taking action”
          </Heading>
          <Text as="cite">Craig Mills, Land & Carbon Lab</Text>
        </Container>
      </Box>
      {/* Final CTA */}
      <Box
        py="24"
        pb="28"
        borderBlockEnd="1px solid"
        borderColor="bg.emphasized"
      >
        <Container>
          <Container
            maxW="4xl"
            py="4"
            px="5"
            rounded="md"
            bg={{ base: "bg.emphasized", md: "lime.200" }}
            display="flex"
            flexDirection={{ base: "column", md: "row" }}
            alignItems={{ base: "flex-start", md: "center" }}
            gap={3}
            justifyContent="space-between"
          >
            <Box display="flex" flexDir="column" gap="2">
              <Heading size="md" as="p">
                How will you use monitoring intelligence?{" "}
              </Heading>
              <Text fontSize="sm" color="fg.muted">
                Join the future of ecosystem monitoring and help us shape what
                comes next.
              </Text>
            </Box>
            <Button asChild variant="solid" colorPalette="blue">
              <Link href="/">
                Try the preview
                <CaretRightIcon weight="bold" />
              </Link>
            </Button>
          </Container>
        </Container>
      </Box>
      {/* Footer Section */}
      <Box
        as="footer"
        p="12"
        pb="0"
        bg="linear-gradient(98deg, #1D84BE -1.78%, #42A1DD 4.02%, #6ABFFF 20.15%, #C1E23E 78.8%, #E3F37F 99.99%)"
      >
        <Container
          css={{ "& > *": { px: 0 } }}
          display="flex"
          flexDir="column"
          gap={{ base: "10", md: "16" }}
        >
          <Flex
            justifyContent={{ base: "center", md: "space-between" }}
            alignItems="center"
            gap={4}
            flexDir={{ base: "column", md: "row" }}
          >
            <Heading size={{ base: "3xl", md: "5xl" }} fontWeight="semibold">
              NatureWATCH
            </Heading>
            <Flex
              gap="12"
              alignItems="center"
              flexWrap="wrap"
              justifyContent="center"
            >
              <ChakraLink href="https://www.wri.org/">
                <Image src="/WRI-logo-mono.svg" alt="WRI Logo" height="64px" />
              </ChakraLink>
              <ChakraLink href="https://www.bezosearthfund.org/">
                <Image src="/BEF-logo-mono.svg" alt="BEF Logo" height="64px" />
              </ChakraLink>
              <ChakraLink href="https://landcarbonlab.org/">
                <Image src="/LCL-logo.svg" alt="LCL Logo" height="64px" />
              </ChakraLink>
              <ChakraLink href="https://www.globalforestwatch.org/">
                <Image src="/GFW-logo-mono.svg" alt="GFW Logo" height="64px" />
              </ChakraLink>
            </Flex>
          </Flex>
          <Flex
            justifyContent={{ base: "center", md: "space-between" }}
            alignItems={{ base: "flex-start", md: "center" }}
            gap={4}
            pb="12"
            flexDir={{ base: "column", md: "row" }}
          >
            <Flex
              alignItems="center"
              justifyContent={{ base: "center", md: "flex-start" }}
              gap={6}
              flexWrap="wrap"
              w="full"
            >
              <Text>{new Date().getFullYear()} © NatureWATCH</Text>
              <ChakraLink
                textDecoration="underline"
                textDecorationStyle="dotted"
                asChild
              >
                <Link href="#">Privacy Policy</Link>
              </ChakraLink>
              <ChakraLink
                textDecoration="underline"
                textDecorationStyle="dotted"
                asChild
              >
                <Link href="#">Cookie Preferences</Link>
              </ChakraLink>
            </Flex>
            <Flex
              alignItems="center"
              justifyContent={{ base: "center", md: "flex-start" }}
              gap={6}
              flexWrap="wrap"
              w="full"
            >
              <ChakraLink
                textDecoration="underline"
                textDecorationStyle="dotted"
                href="#"
              >
                Instagram
              </ChakraLink>
              <ChakraLink
                textDecoration="underline"
                textDecorationStyle="dotted"
                href="#"
              >
                Linkedin
              </ChakraLink>
              <ChakraLink
                textDecoration="underline"
                textDecorationStyle="dotted"
                href="#"
              >
                Twitter
              </ChakraLink>
            </Flex>
          </Flex>
        </Container>
      </Box>
    </div>
  );
}
