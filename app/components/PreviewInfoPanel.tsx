import { Box, Flex, Text } from "@chakra-ui/react";
import { ArrowSquareOutIcon, InfoIcon, XIcon } from "@phosphor-icons/react";
import { PREVIEW_LINKS } from "@/app/constants/preview-content";
import { useTranslation } from "@/src/shared/lib/i18n";
import PreviewSupportLinks from "./PreviewSupportLinks";

interface PreviewInfoPanelProps {
  onClose: () => void;
}

export default function PreviewInfoPanel({ onClose }: PreviewInfoPanelProps) {
  const { t } = useTranslation();

  return (
    <Box
      position="absolute"
      top="calc(100% + 8px)"
      left={0}
      w="400px"
      bg="#FFFFFF"
      borderRadius="8px"
      borderWidth="1px"
      borderColor="#E0E2E5"
      p={4}
      display="flex"
      flexDirection="column"
      gap={3}
      boxShadow="0px 0px 1px 0px rgba(24,24,27,0.3), 0px 24px 40px 0px rgba(24,24,27,0.16)"
      zIndex={1400}
    >
      {/* Close button */}
      <Box
        as="button"
        position="absolute"
        right={6}
        top={5}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="transparent"
        border="none"
        cursor="pointer"
        p={0}
        color="#B2B6BD"
        _hover={{ color: "#656E7B" }}
        onClick={onClose}
        aria-label={t("header.preview.close")}
      >
        <XIcon size={16} />
      </Box>

      {/* Icon badge */}
      <Flex
        w={8}
        h={8}
        borderRadius="full"
        bg="#F0F9B9"
        align="center"
        justify="center"
        flexShrink={0}
      >
        <InfoIcon size={16} color="#8E9954" weight="fill" />
      </Flex>

      {/* Title + Body */}
      <Box>
        <Text
          fontFamily="sans-serif"
          fontWeight="medium"
          fontSize="14px"
          color="#131619"
          lineHeight="1.4"
        >
          {t("header.preview.title")}
        </Text>
        <Text
          fontFamily="sans-serif"
          fontWeight="normal"
          fontSize="xs"
          color="#656E7B"
          lineHeight="150%"
          mt={1}
        >
          {t("header.preview.body")}
        </Text>
        <Text
          fontFamily="sans-serif"
          fontWeight="normal"
          fontSize="xs"
          color="#656E7B"
          lineHeight="150%"
          mt={4}
        >
          <PreviewSupportLinks linkColor="#0049AA" />
        </Text>
      </Box>

      {/* Footer separator */}
      <Box borderTop="1px solid #E0E2E5" pt={3}>
        <Flex gap={3} flexWrap="wrap">
          {PREVIEW_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontFamily: "sans-serif",
                fontWeight: 400,
                fontSize: "12px",
                lineHeight: "150%",
                color: "#0049AA",
                textDecoration: "none",
              }}
            >
              <ArrowSquareOutIcon size={16} />
              {t(`header.preview.${link.id}`)}
            </a>
          ))}
        </Flex>
      </Box>
    </Box>
  );
}
