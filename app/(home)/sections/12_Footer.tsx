import {
  Box,
  Container,
  Flex,
  Text,
  Link as ChakraLink,
} from "@chakra-ui/react";
import LclLogo from "../../components/LclLogo";

export default function FooterSection() {
  return (
    <Box
      as="footer"
      p={{ base: 6, md: 12 }}
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
          justifyContent={{ base: "flex-start", md: "space-between" }}
          alignItems={{ base: "flex-start", md: "center" }}
          gap={4}
          flexDir={{ base: "column", md: "row" }}
        >
          <Flex alignItems="center" gap={4}>
            <LclLogo width={32} avatarOnly />
            <Text fontSize={{ base: "3xl", md: "5xl" }} fontWeight="semibold" lineHeight="1">
              Global Nature Watch
            </Text>
          </Flex>
        </Flex>
        <Flex
          justifyContent={{ base: "flex-start", md: "space-between" }}
          alignItems={{ base: "flex-start", md: "center" }}
          gap={4}
          pb="4"
          flexDir={{ base: "column", md: "row" }}
          >
          <Flex
            alignItems="center"
            justifyContent="flex-start"
            rowGap={6}
            columnGap={4}
            flexWrap="wrap"
            w={{ base: "full", md: "auto" }}
            flex={{ md: 2 }}
            >
              <Text>{new Date().getFullYear()} Global Nature Watch</Text>
            <ChakraLink
              textDecoration="underline"
              textDecorationStyle="dotted"
              href="https://www.wri.org/about/privacy-policy?sitename=landcarbonlab.org&osanoid=5a6c3f87-bd10-4df7-80c7-375ce6a77691"
              target="_blank" rel="noopener noreferrer"
            >
              Privacy Policy
            </ChakraLink>
            <ChakraLink
              textDecoration="underline"
              textDecorationStyle="dotted"
              href="https://help.globalnaturewatch.org/privacy-and-terms/global-nature-watch-ai-privacy-policy"
              target="_blank" rel="noopener noreferrer"
            >
              AI Privacy Policy
            </ChakraLink>
            <ChakraLink
              textDecoration="underline"
              textDecorationStyle="dotted"
              href="https://www.wri.org/about/legal/general-terms-use"
              target="_blank" rel="noopener noreferrer"
            >
              Terms of Use
            </ChakraLink>
            <ChakraLink
              textDecoration="underline"
              textDecorationStyle="dotted"
              href="https://help.globalnaturewatch.org/global-nature-watch-ai-terms-of-use"
              target="_blank" rel="noopener noreferrer"
            >
              AI Terms of Use
            </ChakraLink>
          </Flex>
          <Flex
            alignItems="center"
            justifyContent={{ base: "flex-start", md: "flex-end" }}
            rowGap={6}
            columnGap={4}
            flexWrap="wrap"
            w={{ base: "full", md: "auto" }}
            flex={{ md: 1 }}
            >
            <ChakraLink
              textDecoration="underline"
              textDecorationStyle="dotted"
              href="https://www.instagram.com/landcarbonlab/"
              target="_blank" rel="noopener noreferrer"
            >
              Instagram
            </ChakraLink>
            <ChakraLink
              textDecoration="underline"
              textDecorationStyle="dotted"
              href="https://www.linkedin.com/showcase/land-carbon-lab/"
              target="_blank" rel="noopener noreferrer"
            >
              Linkedin
            </ChakraLink>
            <ChakraLink
              textDecoration="underline"
              textDecorationStyle="dotted"
              href="https://x.com/landcarbonlab"
              target="_blank" rel="noopener noreferrer"
            >
              Twitter
            </ChakraLink>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}
