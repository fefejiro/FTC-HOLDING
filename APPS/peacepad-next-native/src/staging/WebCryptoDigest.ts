import type { SecretDigest } from "./InvitationService";

type SubtleDigest = Readonly<{
  digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer>;
}>;

const utf8 = (value: string) => {
  const bytes: number[] = [];
  for (const character of value) {
    const point = character.codePointAt(0)!;
    if (point <= 0x7f) bytes.push(point);
    else if (point <= 0x7ff) bytes.push(0xc0 | (point >> 6), 0x80 | (point & 0x3f));
    else if (point <= 0xffff) bytes.push(0xe0 | (point >> 12), 0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f));
    else bytes.push(0xf0 | (point >> 18), 0x80 | ((point >> 12) & 0x3f), 0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f));
  }
  return new Uint8Array(bytes);
};

export class WebCryptoSha256Digest implements SecretDigest {
  constructor(private readonly subtle: SubtleDigest) {}

  async digest(input: string): Promise<string> {
    const bytes = new Uint8Array(await this.subtle.digest("SHA-256", utf8(input)));
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
}
