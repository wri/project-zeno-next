import { Text } from "@chakra-ui/react";
import {
  isOnboardingFieldRequired,
  type OnboardingFieldKey,
} from "@/app/config/onboarding";

/**
 * The red asterisk shown beside a required field's label.
 *
 * Always derive the marker from the field key rather than hand-writing it, so
 * a label can never disagree with the validation in
 * `REQUIRED_ONBOARDING_FIELDS`. Renders nothing for optional fields.
 */
export default function RequirementHint({
  field,
}: {
  field: OnboardingFieldKey;
}) {
  if (!isOnboardingFieldRequired(field)) return null;

  return (
    <Text as="span" color="red.500" ml={1}>
      *
    </Text>
  );
}
