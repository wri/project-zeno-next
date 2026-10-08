"use client";

import { Link, type LinkProps } from "@chakra-ui/react";
import {
  GNW_AI_PRIVACY_POLICY,
  GNW_AI_TERMS_OF_USE,
  WRI_PRIVACY_POLICY,
  WRI_TERMS_OF_USE,
  type TermsLink,
} from "../model/terms";

/** One of the policy documents, opened in a new tab. */
export function TermsAnchor({
  link,
  color,
}: {
  link: TermsLink;
  color?: LinkProps["color"];
}) {
  return (
    <Link
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      textDecoration="underline"
      color={color}
    >
      {link.label}
    </Link>
  );
}

/**
 * The consent sentence and its four links, for /welcome's Checkbox.Label:
 * word for word what the old onboarding form asked people to agree to.
 */
export function TermsConsentLabel() {
  return (
    <>
      I accept the <TermsAnchor link={WRI_TERMS_OF_USE} /> and{" "}
      <TermsAnchor link={GNW_AI_TERMS_OF_USE} />
      {", "}
      and I acknowledge the privacy practices described in the{" "}
      <TermsAnchor link={WRI_PRIVACY_POLICY} /> and the{" "}
      <TermsAnchor link={GNW_AI_PRIVACY_POLICY} />.
    </>
  );
}
