import { beforeAll, describe, expect, it } from "vitest";
import { decrypt, encrypt, isEncrypted, maskSecret } from "@/lib/secret";

beforeAll(() => { process.env.ENCRYPTION_KEY = "test-key-for-vitest"; });

describe("secret", () => {
  it("round-trips and hides plaintext", () => {
    const e = encrypt("EAAG-secret-token-1234");
    expect(isEncrypted(e)).toBe(true);
    expect(e).not.toContain("secret-token");
    expect(decrypt(e)).toBe("EAAG-secret-token-1234");
  });
  it("uses a fresh IV each time", () => {
    expect(encrypt("same")).not.toBe(encrypt("same"));
  });
  it("is idempotent and keeps legacy plaintext readable", () => {
    const e = encrypt("abc");
    expect(encrypt(e)).toBe(e);
    expect(decrypt("legacy-plain")).toBe("legacy-plain");
    expect(decrypt(null)).toBe("");
  });
  it("rejects tampered ciphertext", () => {
    const e = encrypt("hello world");
    const parts = e.split(":");
    parts[4] = Buffer.from("tampered").toString("base64url");
    expect(() => decrypt(parts.join(":"))).toThrow();
  });
  it("masks with the plaintext tail", () => {
    expect(maskSecret(encrypt("token-9876"))).toBe("••••9876");
    expect(maskSecret(null)).toBeNull();
  });
});
