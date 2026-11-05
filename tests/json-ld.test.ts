import { describe, expect, it } from "vitest";
import { jsonLdString } from "@/lib/json-ld";

describe("jsonLdString", () => {
  it("escapes script-breaking characters as JSON unicode escapes", () => {
    const out = jsonLdString({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c/script\\u003e");
    // Round-trips to the original value for JSON-LD consumers.
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>" });
  });

  it("escapes ampersands and JS line separators", () => {
    const tricky = { a: "Fish & Chips", b: "x\u2028y\u2029z" };
    const out = jsonLdString(tricky);
    expect(out).not.toContain("&");
    expect(out).not.toContain("\u2028");
    expect(JSON.parse(out)).toEqual(tricky);
  });
});
