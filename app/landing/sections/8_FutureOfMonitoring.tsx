import {
  Box,
  Container,
  DataList,
  Heading,
  Flex,
  Text,
  Link as ChakraLink,
  Image,
} from "@chakra-ui/react";
import { Chart, useChart } from "@chakra-ui/charts";
import { PieChart, Pie, Cell } from "recharts";

export default function FutureOfMonitoringSection() {
  const chart = useChart({
    data: [
      { name: "Vegetation Cover Loss", value: 250000, color: "#1B6450" },
      {
        name: "Human-Driven Conversion Alerts",
        value: 100000,
        color: "#C5D692",
      },
      { name: "Natural Disturbances", value: 150000, color: "#CD9F60" },
    ],
  });
  return (
    <Box
      py={{ base: 14, md: 24 }}
      pb={{ base: 14, md: 28 }}
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
                We solve the hardest challenges in monitoring nature. Providing
                you with the data you&rsquo;ve always needed, and empowering you
                to take real-world action. Our data is globally available,
                consistent over time and created by some of the world&rsquo;s
                most talented field experts.
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
              {/* Images in the "Cuting edge data" section will animate in from container sides */}
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
                There&rsquo;s a lot of geospatial data in the world, and it can be
                difficult to understand which to use. The future places the
                power of having your own personal geospatial expert in your
                pocket. With our AI assistants trained on our cutting-edge data,
                we democratize data access for monitoring so it can reach more
                people and places, empowering both geospatial experts and
                novices alike.
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
              {/* Chat window items slide in from sides */}
              <Box
                fontSize="10px"
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
                fontSize="10px"
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
                tools that help you find and predict insights from an abundance
                of data. Nature Watch allows you to gain insights in a way that
                is natural and convenient for you. Insights in your language, on
                any of your devices, whenever you need it.
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
            <Box
              position="relative"
              h="72"
              w="full"
              display="grid"
              placeContent="center"
            >
              <Box
                w="220px"
                p="10px"
                bg="neutral.300"
                border="1px solid"
                borderColor="neutral.400"
                rounded="sm"
                shadow="sm"
              >
                <Text fontSize="10px" mb="2">
                  Currently the most disturbances to nature are occurring in
                  Brazil, with over 500,000 alerts of disturbances.
                </Text>
                <Box
                  p="2"
                  border="1px solid"
                  borderColor="neutral.400/50"
                  rounded="sm"
                >
                  <Chart.Root
                    chart={chart}
                    transform="rotate(-45deg)"
                    my="-20%"
                  >
                    <PieChart>
                      <Pie
                        innerRadius={15}
                        outerRadius={25}
                        isAnimationActive={true}
                        data={chart.data}
                        dataKey={chart.key("value")}
                        nameKey="name"
                        cornerRadius={2}
                      >
                        {chart.data.map((item) => {
                          return (
                            <Cell
                              key={item.name}
                              fill={chart.color(item.color)}
                            />
                          );
                        })}
                      </Pie>
                    </PieChart>
                  </Chart.Root>
                  <DataList.Root gap={0}>
                    {chart.data.map((item) => (
                      <DataList.Item
                        key={item.name}
                        display="flex"
                        flexDir="row"
                        alignItems="center"
                        gap="1"
                        m={0}
                      >
                        <Box
                          borderRadius="1.5px"
                          border="0.5px solid"
                          borderColor="fg.inverted"
                          bg={item.color}
                          w="3"
                          h="1.5"
                        />
                        <DataList.ItemLabel fontSize="7px" flex="1">
                          {item.name}
                        </DataList.ItemLabel>
                        <DataList.ItemValue
                          fontSize="8px"
                          fontWeight="bold"
                          flex="unset"
                        >
                          {item.value.toLocaleString()}
                        </DataList.ItemValue>
                      </DataList.Item>
                    ))}
                  </DataList.Root>
                </Box>
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
                We believe the future of monitoring data and technology is open
                source, and accessible to everyone. That&rsquo;s why Nature
                Watch is open, extensible and ready to integrate with your own
                systems, extending the power of your own data.
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
            <Box
              position="relative"
              display="grid"
              placeContent="center"
              w="full"
            >
              <Image maxH="10" src="/fm-3-esri.png" alt="ESRI logo" />
              <Image maxH="10" src="/fm-3-qgis.png" alt="QGIS logo" />
              <Box
                p="6"
                bg="lime.300"
                rounded="lg"
                shadow="sm"
              >
                <Heading size="2xl" m={0}>
                  Nature Watch
                </Heading>
              </Box>
              <Image maxH="10" src="/fm-3-felt.png" alt="Felt logo" />
              <Image maxH="10" src="/fm-3-aws.png" alt="AWS logo" />
              <Image maxH="10" src="/fm-3-google.png" alt="Google Cloud logo" />
            </Box>
          </Flex>
        </Container>
      </Container>
    </Box>
  );
}
