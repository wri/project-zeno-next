"use client";

import { useState, useEffect } from "react";
import { Box, CloseButton, Flex, Icon, Link, Text } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";

const STORAGE_KEY = "gnw_disclaimer_dismissed_v2";

export default function DisclaimerPanel() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  return (
    <Box
      px={2}
      pt={2}
      pb={3}
      bg="lime.100"
      border="1px solid"
      borderColor="lime.400"
      rounded="sm"
      fontSize="xs"
      fontFamily="body"
    >
      <Flex gap={2} align="flex-start">
        <Icon color="lime.700" flexShrink={0} mt="2px" asChild>
          <InfoIcon weight="fill" size={16} />
        </Icon>
        <Box flex="1" pr={5}>
          <Text mb={1}>
            This is an{" "}
            <Text as="span" fontWeight="medium">
              experimental preview
            </Text>{" "}
            of Global Nature Watch. Results are grounded in trusted datasets,
            but AI summaries can be incomplete or incorrect. Verify important
            findings with source data.
          </Text>
          <Text>
            Feedback is welcome at{" "}
            <Link
              color="fg.link"
              textDecoration="underline"
              href="mailto:landcarbonlab@wri.org"
            >
              landcarbonlab@wri.org.
            </Link>{" "}
            <br />
            Visit the{" "}
            <Link
              color="fg.link"
              textDecoration="underline"
              href="https://help.globalnaturewatch.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Help Center
            </Link>{" "}
            to learn more about the preview.
          </Text>

          <Flex
            mt={4}
            gap={3}
            flexWrap="wrap"
            fontSize="xs"
            fontFamily="heading"
          >
            <Link
              color="fg.link"
              textDecoration="underline"
              href="https://help.globalnaturewatch.org/methodology"
              target="_blank"
              rel="noopener noreferrer"
            >
              Methodology
            </Link>
            <Link
              color="fg.link"
              textDecoration="underline"
              href="https://help.globalnaturewatch.org/datasets"
              target="_blank"
              rel="noopener noreferrer"
            >
              Datasets
            </Link>
            <Link
              color="fg.link"
              textDecoration="underline"
              href="https://help.globalnaturewatch.org/accuracy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Accuracy
            </Link>
            <Link
              color="fg.link"
              textDecoration="underline"
              href="https://help.globalnaturewatch.org/known-issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              Known Issues
            </Link>
          </Flex>
        </Box>
        <CloseButton
          size="2xs"
          position="absolute"
          top={2}
          right={2}
          onClick={dismiss}
          aria-label="Dismiss disclaimer"
        />
      </Flex>
    </Box>
  );
}
