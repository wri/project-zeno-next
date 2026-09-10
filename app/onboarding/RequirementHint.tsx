import { Text } from "@chakra-ui/react";
import {
  isOnboardingFieldRequired,
  type OnboardingFieldKey,
} from "@/app/config/onboarding";

/**
 * The requirement marker shown beside a field's label: a red asterisk when the
 * field is required, a quiet italic "(Optional)" when it is not.
 *
 * Both states are spelled out because nothing on the page explains what the
 * asterisk means on its own. Always derive the marker from the field key rather
 * than hand-writing it, so a label can never disagree with the validation in
 * `REQUIRED_ONBOARDING_FIELDS`.
 */
export default function RequirementHint({
  field,
}: {
  field: OnboardingFieldKey;
}) {
  if (isOnboardingFieldRequired(field)) {
    return (
      <Text as="span" color="red.500" ml={1}>
        *
      </Text>
    );
  }

  return (
    <Text as="span" color="fg.muted" fontSize="xs" fontStyle="italic" ml={1}>
      (Optional)
    </Text>
  );
}
