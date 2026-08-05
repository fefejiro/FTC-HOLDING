import { buildInvitationQrPath } from "./InvitationQr";

describe("Invitation QR", () => {
  it("builds a standards-based matrix with a four-module quiet zone", () => {
    const first = buildInvitationQrPath("peacepadnextlab://invite/P00001");
    const second = buildInvitationQrPath("peacepadnextlab://invite/P00002");

    expect(first.moduleCount).toBeGreaterThan(20);
    expect(first.viewBoxSize).toBe(first.moduleCount + 8);
    expect(first.path).toMatch(/^M\d+ \d+h1v1h-1z/);
    expect(second.path).not.toBe(first.path);
  });
});
