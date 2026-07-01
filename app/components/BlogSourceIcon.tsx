"use client";
import { Image } from "@chakra-ui/react";
import LclLogo from "@/app/components/LclLogo";
import {
  blogSourceBranding,
  type BlogSource,
} from "@/app/lib/blog-source-branding";

interface BlogSourceIconProps {
  source: BlogSource;
  size?: number;
  /** Use the full wordmark asset instead of the compact avatar glyph. */
  wordmark?: boolean;
}

export function BlogSourceIcon({
  source,
  size = 12,
  wordmark = false,
}: BlogSourceIconProps) {
  const branding = blogSourceBranding(source);

  if (branding.useLclLogo) {
    // The WRI favicon fills a size×size box, so match the LCL mark's HEIGHT to
    // `size` (it's portrait — sizing by width would leave it ~30% too tall).
    return wordmark ? (
      <LclLogo width={size} />
    ) : (
      <LclLogo height={size} avatarOnly />
    );
  }

  return (
    <Image
      src={branding.favicon}
      alt=""
      boxSize={`${size}px`}
      objectFit="contain"
    />
  );
}
