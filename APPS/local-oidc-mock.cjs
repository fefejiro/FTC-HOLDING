const http = require("http");
const port = 8787;
const issuer = `http://127.0.0.1:${port}`;
const json = (res, obj) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
http.createServer((req, res) => {
  if (req.url === "/.well-known/openid-configuration") {
    return json(res, {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/jwks`,
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"]
    });
  }
  if (req.url === "/jwks") return json(res, { keys: [] });
  if (req.url === "/authorize") { res.writeHead(302, { Location: "/" }); return res.end(); }
  if (req.url === "/token") return json(res, {});
  if (req.url === "/userinfo") return json(res, {});
  res.writeHead(404); res.end("not found");
}).listen(port, "127.0.0.1", () => console.log(`oidc-mock on ${issuer}`));
