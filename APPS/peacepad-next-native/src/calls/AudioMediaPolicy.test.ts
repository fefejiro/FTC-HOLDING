import { verifyTurnConfiguration } from "./AudioMediaPolicy";

describe("foreground audio media policy", () => {
  it("requires authenticated TURN and forces relay-only ICE", () => {
    const servers = [{
      urls: ["turn:ca-relay.peacepad.test:3478?transport=udp", "turns:ca-relay.peacepad.test:5349"],
      username: "short-lived-user",
      credential: "short-lived-credential",
    }];
    expect(verifyTurnConfiguration(servers)).toEqual({
      iceServers: servers,
      iceTransportPolicy: "relay",
    });
  });

  it.each([
    { servers: [] },
    { servers: [{ urls: "stun:public.example.test:3478" }] },
    { servers: [{ urls: "turn:relay.example.test:3478", username: "user" }] },
    { servers: [{ urls: "turn:relay.example.test:3478", credential: "secret" }] },
    { servers: [{ urls: ["turn:relay.example.test:3478", "https://not-ice.example.test"], username: "user", credential: "secret" }] },
  ])("fails closed for absent, public-only, or incomplete relay configuration", ({ servers }) => {
    expect(() => verifyTurnConfiguration(servers)).toThrow("Secure audio relay is unavailable.");
  });
});
