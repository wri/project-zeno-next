import {
  Field,
  Flex,
  Input,
  NativeSelect,
  Portal,
  Select,
  Text,
  createListCollection,
} from "@chakra-ui/react";
import {
  AUDIENCE_OPTIONS,
  PROFILE_OPTIONS,
  SIGNUP_SOURCE_OPTIONS,
  USER_TYPE_OPTIONS,
  type Option,
  type UserFilters,
} from "../lib/filter-users";

const userTypes = createListCollection({ items: USER_TYPE_OPTIONS });

function FilterSelect<T extends string>({
  id,
  label,
  anyLabel,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  anyLabel: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <Field.Root id={id} width="auto">
      <Field.Label fontSize="xs">{label}</Field.Label>
      <NativeSelect.Root size="sm" width="auto">
        <NativeSelect.Field
          value={value ?? ""}
          onChange={(e) =>
            onChange(
              options.find((o) => o.value === e.target.value)?.value ?? null
            )
          }
        >
          <option value="">{anyLabel}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Field.Root>
  );
}

export function UserFiltersBar({
  filters,
  onChange,
  countryOptions,
  sectorOptions,
}: {
  filters: UserFilters;
  onChange: (patch: Partial<UserFilters>) => void;
  countryOptions: Option[];
  sectorOptions: Option[];
}) {
  const byJoinDate = filters.joinedFrom !== null || filters.joinedTo !== null;

  return (
    <Flex direction="column" gap={3} role="search">
      <Flex gap={3} wrap="wrap" alignItems="flex-end">
        <Field.Root id="search" width="64">
          <Field.Label fontSize="xs">Search</Field.Label>
          <Input
            size="sm"
            type="search"
            placeholder="Email, name or organization"
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
          />
        </Field.Root>
        <Select.Root
          multiple
          collection={userTypes}
          size="sm"
          width="44"
          value={filters.userTypes}
          onValueChange={(d) =>
            onChange({ userTypes: d.items.map((item) => item.value) })
          }
        >
          <Select.HiddenSelect />
          <Select.Label fontSize="xs">User type</Select.Label>
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="All types" />
            </Select.Trigger>
            <Select.IndicatorGroup>
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Control>
          <Portal>
            <Select.Positioner>
              <Select.Content>
                {userTypes.items.map((item) => (
                  <Select.Item item={item} key={item.value}>
                    {item.label}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Portal>
        </Select.Root>
        <FilterSelect
          id="audience"
          label="Internal or external"
          anyLabel="All users"
          options={AUDIENCE_OPTIONS}
          value={filters.audience}
          onChange={(audience) => onChange({ audience })}
        />
        <FilterSelect
          id="country"
          label="Country"
          anyLabel="All countries"
          options={countryOptions}
          value={filters.country}
          onChange={(country) => onChange({ country })}
        />
        <FilterSelect
          id="sector"
          label="Sector"
          anyLabel="All sectors"
          options={sectorOptions}
          value={filters.sector}
          onChange={(sector) => onChange({ sector })}
        />
        <FilterSelect
          id="profile"
          label="Profile"
          anyLabel="Any"
          options={PROFILE_OPTIONS}
          value={filters.profile}
          onChange={(profile) => onChange({ profile })}
        />
        <FilterSelect
          id="signup-source"
          label="Signup source"
          anyLabel="Any source"
          options={SIGNUP_SOURCE_OPTIONS}
          value={filters.signupSource}
          onChange={(signupSource) => onChange({ signupSource })}
        />
      </Flex>
      <Flex gap={3} wrap="wrap" alignItems="flex-end">
        <Field.Root id="joined-from" width="auto">
          <Field.Label fontSize="xs">Joined from</Field.Label>
          <Input
            size="sm"
            type="date"
            max={filters.joinedTo ?? undefined}
            value={filters.joinedFrom ?? ""}
            onChange={(e) => onChange({ joinedFrom: e.target.value || null })}
          />
        </Field.Root>
        <Field.Root id="joined-to" width="auto">
          <Field.Label fontSize="xs">Joined to</Field.Label>
          <Input
            size="sm"
            type="date"
            min={filters.joinedFrom ?? undefined}
            value={filters.joinedTo ?? ""}
            onChange={(e) => onChange({ joinedTo: e.target.value || null })}
          />
        </Field.Root>
        {byJoinDate && (
          // Level with the inputs, beside the dates it explains.
          <Text
            h="9"
            display="flex"
            alignItems="center"
            fontSize="xs"
            color="fg.muted"
          >
            Users with no join date are left out while a join date is set.
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
