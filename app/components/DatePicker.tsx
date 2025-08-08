/* eslint-disable react/no-array-index-key */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  ButtonProps,
  chakra,
  Field,
  Flex,
  IconButton,
  Input,
} from "@chakra-ui/react";
import {
  DatePicker as ArcDatePicker,
  parseDate,
} from "@ark-ui/react/date-picker";
import { format, isValid } from "date-fns";
import { withMask } from "use-mask-input";
import { CalendarDotsIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

const DatePickerContent = chakra(ArcDatePicker.Content, {
  base: {
    borderRadius: "md",
    boxShadow: "md",
    bg: "white",
    p: 4,
    w: "19rem",
    transformOrigin: "top center",
    animationDuration: "fast",

    '&[data-state="open"]': {
      animationName: "scale-in, fade-in",
    },
    '&[data-state="closed"]': {
      animationName: "scale-out, fade-out",
    },
  },
});

const DatePickerTable = chakra(ArcDatePicker.Table, {
  base: {
    w: "100%",
  },
});

const DatePickerTableHeader = chakra(ArcDatePicker.TableHeader, {
  base: {
    fontWeight: "bold",
    color: "gray.500",
    fontSize: "sm",
    p: 1,
  },
});

const DatePickerTableCell = chakra(ArcDatePicker.TableCell, {
  base: {
    textAlign: "center",

    "& [data-outside-range]": {
      color: "gray.500",
    },
  },
});

const DatePickerViewControl = chakra(ArcDatePicker.ViewControl, {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    mb: 4,
  },
});

const DatePickerTableCellButton = (props: ButtonProps) => (
  <Button
    variant="ghost"
    size="xs"
    fontSize="sm"
    css={{
      "&[data-today]": {
        bg: "blue.100",
      },
      "&[data-selected]": {
        bg: "gray.100",
      },
      '[aria-selected="true"] &': {
        bg: "gray.100",
      },
    }}
    {...props}
  />
);

export interface DatePickerProps {
  dateRange: Date[];
  onChange: (date: Date[]) => void;
  view?: "day" | "month" | "year";
}

function ViewControl(props: {
  children: React.ReactNode;
  withoutTrigger?: boolean;
}) {
  return (
    <DatePickerViewControl>
      <ArcDatePicker.PrevTrigger asChild>
        <IconButton variant="ghost" size="xs">
          <CaretLeftIcon />
        </IconButton>
      </ArcDatePicker.PrevTrigger>
      {props.withoutTrigger ? (
        props.children
      ) : (
        <ArcDatePicker.ViewTrigger asChild>
          <Button variant="ghost" size="sm">
            {props.children}
          </Button>
        </ArcDatePicker.ViewTrigger>
      )}
      <ArcDatePicker.NextTrigger asChild>
        <IconButton variant="ghost" size="xs">
          <CaretRightIcon />
        </IconButton>
      </ArcDatePicker.NextTrigger>
    </DatePickerViewControl>
  );
}

export function DatePicker(props: DatePickerProps) {
  const { dateRange, onChange, view = "day" } = props;

  const dateValue = useMemo(
    () => dateRange.map((d) => parseDate(d)),
    [dateRange]
  );

  const setDateValue = useCallback(
    (
      v:
        | ArcDatePicker.DateValue[]
        | ((prev: ArcDatePicker.DateValue[]) => ArcDatePicker.DateValue[])
    ) => {
      const range = typeof v === "function" ? v(dateValue) : v;
      const [start, end] = range;
      const newVal =
        start && end && end.compare(start) < 0 ? [end, start] : range;
      onChange(newVal.map((date) => date.toDate("UTC")));
    },
    [dateValue, onChange]
  );

  const [calendarView, setCalendarView] = useState(view);
  useEffect(() => setCalendarView(view), [view]);

  return (
    <ArcDatePicker.Root
      unmountOnExit
      value={dateValue}
      onValueChange={({ value }) => {
        setDateValue(value);
        setCalendarView(view);
      }}
      onViewChange={({ view }) => setCalendarView(view)}
      view={calendarView}
      // View changes when opening/closing the calendar.
      // Ensure it stays the same.
      onOpenChange={() => setCalendarView(view)}
      minView={view}
      selectionMode="range"
      positioning={{
        strategy: "fixed",
        hideWhenDetached: true,
        placement: "top",
      }}
    >
      <Flex gap={2} alignItems="end">
        <Field.Root>
          <Field.Label fontWeight="normal" fontSize="xs">
            From:
          </Field.Label>
          <DateInput
            calendarView={calendarView}
            onChange={(date) => {
              setDateValue(
                (prev) =>
                  [date ? parseDate(date) : undefined, prev[1]].filter(
                    Boolean
                  ) as ArcDatePicker.DateValue[]
              );
            }}
            value={dateValue[0] ? dateValue[0].toDate("UTC") : null}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label fontWeight="normal" fontSize="xs">
            To:
          </Field.Label>
          <DateInput
            calendarView={calendarView}
            onChange={(date) => {
              setDateValue(
                (prev) =>
                  [prev[0], date ? parseDate(date) : undefined].filter(
                    Boolean
                  ) as ArcDatePicker.DateValue[]
              );
            }}
            value={dateValue[1] ? dateValue[1].toDate("UTC") : null}
          />
        </Field.Root>
        <ArcDatePicker.Control>
          <ArcDatePicker.Trigger asChild>
            <IconButton size="sm" variant="ghost" alignSelf="end">
              <CalendarDotsIcon />
            </IconButton>
          </ArcDatePicker.Trigger>
        </ArcDatePicker.Control>
      </Flex>
      <ArcDatePicker.Positioner>
        <DatePickerContent>
          <ArcDatePicker.View view="day">
            <ArcDatePicker.Context>
              {(datePicker) => (
                <>
                  <ViewControl>
                    <ArcDatePicker.RangeText />
                  </ViewControl>
                  <DatePickerTable>
                    <ArcDatePicker.TableHead>
                      <ArcDatePicker.TableRow>
                        {datePicker.weekDays.map((weekDay, id) => (
                          <DatePickerTableHeader key={id}>
                            {weekDay.narrow}
                          </DatePickerTableHeader>
                        ))}
                      </ArcDatePicker.TableRow>
                    </ArcDatePicker.TableHead>
                    <ArcDatePicker.TableBody>
                      {datePicker.weeks.map((week, id) => (
                        <ArcDatePicker.TableRow key={id}>
                          {week.map((day, id) => (
                            <DatePickerTableCell key={id} value={day}>
                              <ArcDatePicker.TableCellTrigger asChild>
                                <DatePickerTableCellButton>
                                  {day.day}
                                </DatePickerTableCellButton>
                              </ArcDatePicker.TableCellTrigger>
                            </DatePickerTableCell>
                          ))}
                        </ArcDatePicker.TableRow>
                      ))}
                    </ArcDatePicker.TableBody>
                  </DatePickerTable>
                </>
              )}
            </ArcDatePicker.Context>
          </ArcDatePicker.View>
          <ArcDatePicker.View view="month">
            <ArcDatePicker.Context>
              {(datePicker) => (
                <>
                  <ViewControl>
                    {datePicker.visibleRange.start.year}
                  </ViewControl>
                  <DatePickerTable>
                    <ArcDatePicker.TableBody>
                      {datePicker
                        .getMonthsGrid({ columns: 4, format: "short" })
                        .map((months, id) => (
                          <ArcDatePicker.TableRow key={id}>
                            {months.map((month, id) => (
                              <DatePickerTableCell key={id} value={month.value}>
                                <ArcDatePicker.TableCellTrigger asChild>
                                  <DatePickerTableCellButton>
                                    {month.label}
                                  </DatePickerTableCellButton>
                                </ArcDatePicker.TableCellTrigger>
                              </DatePickerTableCell>
                            ))}
                          </ArcDatePicker.TableRow>
                        ))}
                    </ArcDatePicker.TableBody>
                  </DatePickerTable>
                </>
              )}
            </ArcDatePicker.Context>
          </ArcDatePicker.View>
          <ArcDatePicker.View view="year">
            <ArcDatePicker.Context>
              {(datePicker) => (
                <>
                  <ViewControl withoutTrigger>
                    <span>
                      {datePicker.getDecade().start} —{" "}
                      {datePicker.getDecade().end}
                    </span>
                  </ViewControl>
                  <DatePickerTable>
                    <ArcDatePicker.TableBody>
                      {datePicker
                        .getYearsGrid({ columns: 4 })
                        .map((years, id) => (
                          <ArcDatePicker.TableRow key={id}>
                            {years.map((year, id) => (
                              <DatePickerTableCell key={id} value={year.value}>
                                <ArcDatePicker.TableCellTrigger asChild>
                                  <DatePickerTableCellButton>
                                    {year.label}
                                  </DatePickerTableCellButton>
                                </ArcDatePicker.TableCellTrigger>
                              </DatePickerTableCell>
                            ))}
                          </ArcDatePicker.TableRow>
                        ))}
                    </ArcDatePicker.TableBody>
                  </DatePickerTable>
                </>
              )}
            </ArcDatePicker.Context>
          </ArcDatePicker.View>
        </DatePickerContent>
      </ArcDatePicker.Positioner>
    </ArcDatePicker.Root>
  );
}

function getInputFormat(view: DatePickerProps["view"]) {
  const validate = (v: string) => {
    const date = new Date(v);
    return isValid(date) ? date : null;
  };

  switch (view) {
    case "year":
      return {
        ref: withMask("9999"),
        placeholder: "yyyy",
        toValue: (v: Date | null) => (v ? format(v, "yyyy") : ""),
        toDate: (v: string) => validate(`${v}/01/01`),
      };
    case "month":
      return {
        ref: withMask("9999/99"),
        placeholder: "yyyy/mm",
        toValue: (v: Date | null) => (v ? format(v, "yyyy/MM") : ""),
        toDate: (v: string) => validate(`${v}/01`),
      };
    default:
      return {
        ref: withMask("9999/99/99"),
        placeholder: "yyyy/mm/dd",
        toValue: (v: Date | null) => (v ? format(v, "yyyy/MM/dd") : ""),
        toDate: (v: string) => validate(v),
      };
  }
}

interface DateInputProps {
  calendarView: DatePickerProps["view"];
  onChange: (date: Date | null) => void;
  value: Date | null;
}

function DateInput(props: DateInputProps) {
  const { calendarView, onChange, value } = props;

  const { toValue, toDate, ...fieldProps } = useMemo(
    () => getInputFormat(calendarView),
    [calendarView]
  );

  const [draftValue, setDraftValue] = useState<string>(toValue(value));

  useEffect(() => {
    setDraftValue(toValue(value));
  }, [value, toValue]);

  const commitDate = (dateStr: string) => {
    // Validate date
    const date = toDate(dateStr);
    if (date) {
      onChange(date);
    } else {
      // If invalid, reset initial value
      setDraftValue(toValue(value));
    }
  };

  return (
    <Input
      {...fieldProps}
      w="7rem"
      size="xs"
      value={draftValue}
      onBlur={() => {
        commitDate(draftValue);
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter") {
          commitDate(draftValue);
        }
      }}
      onChange={(e) => setDraftValue(e.target.value)}
    />
  );
}
