import { describe, expect, it } from "vitest";
import { isValidPhone, normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it("adds default country code to 10-digit numbers", () => expect(normalizePhone("98765 43210")).toBe("919876543210"));
  it("strips leading 0 / 00 and symbols", () => {
    expect(normalizePhone("09876543210")).toBe("919876543210");
    expect(normalizePhone("+91-98765-43210")).toBe("919876543210");
    expect(normalizePhone("00971501234567")).toBe("971501234567");
  });
  it("respects a custom country code", () => expect(normalizePhone("5551234567", "1")).toBe("15551234567"));
  it("validates length", () => {
    expect(isValidPhone("919876543210")).toBe(true);
    expect(isValidPhone("12345")).toBe(false);
  });
});
