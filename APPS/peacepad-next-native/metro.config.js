const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// MacInCloud Watchman has been flaky for this lab workspace. Force Metro to use
// the Node filesystem crawler so iOS simulator checks do not stall on Watchman.
config.resolver.useWatchman = false;

module.exports = config;
