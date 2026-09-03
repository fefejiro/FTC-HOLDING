const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// MacInCloud Watchman has been flaky for this lab workspace. Force Metro to use
// the Node filesystem crawler so iOS simulator checks do not stall on Watchman.
config.resolver.useWatchman = false;

// expo-notifications depends on @ide/backoff, whose tiny validation helper
// imports Node's `assert`. Resolve that single import to a native-safe shim;
// no Node standard-library code belongs in the Android/iOS bundle.
const defaultResolveRequest = config.resolver.resolveRequest;
const appReactPath = (moduleName) => require.resolve(moduleName, { paths: [path.resolve(__dirname, "node_modules")] });
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react") {
    return { type: "sourceFile", filePath: appReactPath("react") };
  }
  if (moduleName.startsWith("react/")) {
    return { type: "sourceFile", filePath: appReactPath(moduleName) };
  }
  if (moduleName === "assert") {
    return { type: "sourceFile", filePath: path.resolve(__dirname, "src/shims/assert.ts") };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
