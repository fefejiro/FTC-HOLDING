import { WebCryptoSha256Digest } from "./WebCryptoDigest";

describe("WebCryptoSha256Digest", () => {
  it("passes standards-compliant UTF-8 bytes to SHA-256 and returns lowercase hex", async () => {
    const digest = jest.fn(async (_algorithm: string, data: Uint8Array) => {
      expect([...data]).toEqual([80, 101, 97, 99, 101, 80, 97, 100, 32, 240, 159, 144, 154]);
      return new Uint8Array([0, 15, 16, 255]).buffer;
    });
    const hasher = new WebCryptoSha256Digest({ digest });

    await expect(hasher.digest("PeacePad 🐚")).resolves.toBe("000f10ff");
    expect(digest).toHaveBeenCalledWith("SHA-256", expect.any(Uint8Array));
  });
});
