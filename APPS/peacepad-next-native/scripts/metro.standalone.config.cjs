const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const {
  standaloneMetroPolicy,
} = require("./scripts/simulator-workdir-config.cjs");

const config = getDefaultConfig(__dirname);

// This config is copied into the generated .sim project. The project remains
// physically nested beneath the source monorepo, so Expo's workspace detection
// would otherwise prefer the parent node_modules tree.
config.projectRoot = __dirname;
config.watchFolders = [...standaloneMetroPolicy.watchFolders];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, standaloneMetroPolicy.nodeModulesDirectory),
];
config.resolver.disableHierarchicalLookup =
  standaloneMetroPolicy.disableHierarchicalLookup;
config.resolver.useWatchman = false;

module.exports = config;
