const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const config = getDefaultConfig(__dirname);

// MacInCloud Watchman has been flaky for this lab workspace. Force Metro to use
// the Node filesystem crawler so iOS simulator checks do not stall on Watchman.
config.resolver.useWatchman = false;

// This isolated release worktree installs the native app locally so it does
// not need the monorepo's very large root node_modules directory. Keep Metro
// inside the app dependency boundary and ignore workspace paths that are not
// materialized in a sparse or low-disk checkout.
config.watchFolders = (config.watchFolders ?? []).filter((folder) => fs.existsSync(folder));
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

module.exports = config;
