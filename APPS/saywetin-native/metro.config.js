// Metro config for monorepo root resolution.
// The repo root has a `package.json` with `workspaces`, so Metro auto-detection
// climbs up and picks the wrong project root. Lock it here.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);
config.projectRoot = projectRoot;

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// Prevent Metro from watching the entire monorepo. Expo's getDefaultConfig
// auto-detects the workspace root and adds ALL sibling apps to watchFolders.
// This causes ENOENT crashes on Windows when sibling build tools (Next.js .next,
// Gradle .cxx) create and delete directories while Metro is watching them.
// All node_modules are local to this app, so we only need to watch projectRoot.
const workspaceRoot = path.resolve(projectRoot, '..', '..');
config.watchFolders = [projectRoot, workspaceRoot];

config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules', 'react'),
  'react-native': path.resolve(projectRoot, 'node_modules', 'react-native'),
  '@react-native/virtualized-lists': path.resolve(
    projectRoot,
    'node_modules',
    '@react-native',
    'virtualized-lists',
  ),
};

// Exclude CMake temp directories created/deleted during Gradle builds.
// Without this, Metro's FallbackWatcher crashes with ENOENT on Windows
// when Gradle (.cxx) or Next.js (.next) clean up dirs mid-watch (race condition).
config.resolver.blockList = [
  /node_modules\/.*\/android\/\.cxx\/.*/,
  /android\/\.cxx\/.*/,
  /APPS\/.*\/\.next\/.*/,
  /\.next\/.*/,
];

module.exports = config;
