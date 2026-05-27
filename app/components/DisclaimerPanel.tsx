"use client";

import { useState, useEffect } from "react";
import { Box, CloseButton, Flex, Link, Text } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";

const STORAGE_KEY = "gnw_disclaimer_dismissed";

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
      p={3}
      bg="lime.100"
      border="1px solid"
      borderColor="lime.400"
      rounded="sm"
      fontSize="xs"
      fontFamily="body"
    >
      <Flex gap={2} align="flex-start">
        <InfoIcon
          weight="fill"
          size={16}
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <Box flex="1" pr={5}>
          <Text mb={1}>
            You&apos;re using an{" "}
            <Text as="span" fontWeight="medium">
              experimental preview
            </Text>{" "}
            that&apos;s still under active development. You may encounter errors
            or incomplete results, so verify results with primary sources.
            Features, datasets, and assistant behavior may change or be removed
            as we iterate.
          </Text>
          <Text>
            Share feedback via{" "}
            <Link
              color="#0049aa"
              textDecoration="underline"
              href="mailto:landcarbonlab@wri.org"
            >
              landcarbonlab@wri.org
            </Link>{" "}
            or visit the{" "}
            <Link
              color="#0049aa"
              textDecoration="underline"
              href="https://help.globalnaturewatch.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Help Center
            </Link>{" "}
            to learn more.
          </Text>
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
      <Flex mt={2} gap={3} flexWrap="wrap" fontSize="xs" fontFamily="heading">
        <Link
          color="#0049aa"
          textDecoration="underline"
          href="https://help.globalnaturewatch.org/methodology"
          target="_blank"
          rel="noopener noreferrer"
        >
          Methodology
        </Link>
        <Link
          color="#0049aa"
          textDecoration="underline"
          href="https://help.globalnaturewatch.org/datasets"
          target="_blank"
          rel="noopener noreferrer"
        >
          Datasets
        </Link>
        <Link
          color="#0049aa"
          textDecoration="underline"
          href="https://help.globalnaturewatch.org/accuracy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Accuracy
        </Link>
        <Link
          color="#0049aa"
          textDecoration="underline"
          href="https://help.globalnaturewatch.org/known-issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          Known Issues
        </Link>
      </Flex>
    </Box>
  );
}
