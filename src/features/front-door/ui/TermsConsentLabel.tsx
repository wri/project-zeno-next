"use client";

import { Link } from "@chakra-ui/react";
import {
  GNW_AI_PRIVACY_POLICY,
  GNW_AI_TERMS_OF_USE,
  WRI_PRIVACY_POLICY,
  WRI_TERMS_OF_USE,
  type TermsLink,
} from "../model/terms";

function TermsAnchor({ link }: { link: TermsLink }) {
  return (
    <Link
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      textDecoration="underline"
    >
      {link.label}
    </Link>
  );
}

/**
 * The consent sentence and its four links, for a Checkbox.Label on
 * /onboarding and /welcome, so both ask people to agree to exactly the same
 * documents. The text is split into the same pieces the onboarding form had
 * inline, so the form renders exactly as before.
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
