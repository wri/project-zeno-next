import { describe, expect, it } from "vitest";

import { personNames } from "../person-names";

describe("personNames", () => {
  it("prefers the GFW profile's names", () => {
    expect(
      personNames({ firstName: "Maria", lastName: "Silva" }, "M. Silva")
    ).toEqual({ firstName: "Maria", lastName: "Silva" });
  });

  it("splits the Resource Watch name on the first space when GFW has none", () => {
    expect(personNames({}, "Maria da Silva")).toEqual({
      firstName: "Maria",
      lastName: "da Silva",
    });
  });

  it("falls back per name (a thin GFW profile with only a last name)", () => {
    expect(personNames({ lastName: "Rivera" }, "Tomás Rivera")).toEqual({
      firstName: "Tomás",
      lastName: "Rivera",
    });
  });

  it("sends only a first name for a one-word display name", () => {
    expect(personNames({}, "Amina")).toEqual({ firstName: "Amina" });
  });

  it("leaves unknown names out", () => {
    expect(personNames({}, null)).toEqual({});
    expect(personNames({}, "   ")).toEqual({});
    expect(personNames({}, undefined)).toEqual({});
  });

  it("trims around the name", () => {
    expect(personNames({}, "  Amina   Otieno  ")).toEqual({
      firstName: "Amina",
      lastName: "Otieno",
    });
  });
});
