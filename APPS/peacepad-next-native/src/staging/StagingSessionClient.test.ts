import { StagingSessionClient } from "./StagingSessionClient";

test("restores only through the staging session route", async () => {
  const fetcher = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ actor: { identityId: "fictional" }, region: "ca" }) });
  const client = new StagingSessionClient("http://127.0.0.1:8787", fetcher);
  await expect(client.restore("fictional-token")).resolves.toMatchObject({ region: "ca" });
  expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:8787/api/v2/session", { headers: { authorization: "Bearer fictional-token" } });
});

test("blocks production and non-HTTPS hosts", () => {
  expect(() => new StagingSessionClient("https://api.peacepad.ca")).toThrow("Production API hosts are blocked");
  expect(() => new StagingSessionClient("http://api.staging.peacepad.ca")).toThrow("staging HTTPS origin");
});
