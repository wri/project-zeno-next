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
    return <LclLogo width={size} avatarOnly={!wordmark} />;
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
