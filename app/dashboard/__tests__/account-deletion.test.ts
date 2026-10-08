import { describe, expect, it } from "vitest";
import { accountDeletionMailto } from "../account-deletion";

function parse(href: string) {
  const [address, query] = href.replace(/^mailto:/, "").split("?");
  const params = new URLSearchParams(query);
  return {
    address,
    subject: params.get("subject"),
    body: params.get("body"),
  };
}

describe("accountDeletionMailto", () => {
  it("addresses the Land & Carbon Lab inbox with the account's email", () => {
    const href = accountDeletionMailto("maria@example.org");
    expect(href.startsWith("mailto:")).toBe(true);
    const { address, subject, body } = parse(href);
    expect(address).toBe("landcarbonlab@wri.org");
    expect(subject).toMatch(/delete my .* account/i);
    expect(body).toContain("Account email: maria@example.org");
    expect(body).toMatch(/remove .* account and all of its data/i);
  });

  it("encodes spaces as %20, not +", () => {
    expect(accountDeletionMailto("a@b.org")).not.toContain("+");
  });

  it("asks for the sign-in email when the account's isn't known", () => {
    expect(parse(accountDeletionMailto("  ")).body).toContain(
      "Account email: (the email I signed in with)"
    );
  });
});
