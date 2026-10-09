export interface PersonNames {
  firstName?: string;
  lastName?: string;
}

/**
 * The names to send Ortto with the profile card: the GFW profile's names
 * when it has them, otherwise the Resource Watch display name split on its
 * first space ("Maria da Silva" → "Maria" / "da Silva"). Each name falls back
 * separately, since a thin GFW profile may hold only a last name. Unknown
 * names are left out rather than sent empty.
 */
export function personNames(
  fromProfile: PersonNames,
  displayName: string | null | undefined
): PersonNames {
  const name = displayName?.trim() ?? "";
  const space = name.indexOf(" ");
  const split: PersonNames =
    name === ""
      ? {}
      : space === -1
        ? { firstName: name }
        : {
            firstName: name.slice(0, space),
            lastName: name.slice(space + 1).trim(),
          };

  const names: PersonNames = {};
  const firstName = fromProfile.firstName || split.firstName;
  const lastName = fromProfile.lastName || split.lastName;
  if (firstName) names.firstName = firstName;
  if (lastName) names.lastName = lastName;
  return names;
}
