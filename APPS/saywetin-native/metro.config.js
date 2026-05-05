// Metro config for monorepo root resolution.
// The repo root has a `package.json` with `workspaces`, so Metro auto-detection
// climbs up and picks the wrong project root. Lock it here.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);
config.projectRoot = projectRoot;

// getMetroServerRoot() walks up and finds C:\FTC HOLDING (monorepo root with
// workspaces in package.json) and sets config.server.unstable_serverRoot to
// that path. Metro's _resolveRelativePath(x, {relativeTo:'server'}) uses
// config.server.unstable_serverRoot as the base, so ./index.ts resolves from
// the monorepo root instead of the app root. Override it to the app root.
// Also reset _expoRelativeProjectRoot — @expo/metro-config sets it to
// path.relative(monorepoRoot, projectRoot) = 'APPS\saywetin-native', so the
// virtual metro entry imports './APPS/saywetin-native/index' which resolves
// to the wrong path. With serverRoot === projectRoot, the relative path is ''.
config.server = {
  ...config.server,
  unstable_serverRoot: projectRoot,
  _expoRelativeProjectRoot: '',
};

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(projectRoot, 'node_modules', 'expo', 'node_modules'),
  // Monorepo root node_modules for packages hoisted there by npm workspaces.
  // NOTE: this is NOT in watchFolders — adding it there was the original bug
  // that caused Metro to resolve ./index.ts from C:\FTC HOLDING.
  path.resolve(projectRoot, '..', '..', 'node_modules'),
];
// Only watch the app's own directory. Including the monorepo root in
// watchFolders causes Metro's legacySinglePageExportBundleAsync to resolve
// ./index.ts from C:\FTC HOLDING instead of the app root during Gradle embeds.
// All node_modules are local, so projectRoot is sufficient.
// Include the monorepo root node_modules in watchFolders so Metro can resolve
// packages hoisted there by npm workspaces (e.g. @babel/runtime, expo-asset).
// The unstable_serverRoot is pinned to projectRoot above so this does NOT
// cause ./index.ts to resolve from the monorepo root.
config.watchFolders = [
  projectRoot,
  path.resolve(projectRoot, '..', '..', 'node_modules'),
];

// Use resolveRequest to pin react to the app's own copy. This intercepts
// resolution BEFORE hierarchical lookup, which is the only reliable way to
// prevent packages in C:\FTC HOLDING\node_modules (e.g. @react-navigation)
// from resolving react via hierarchical walk to the monorepo root's React v18.
// extraNodeModules is a fallback (post-hierarchy) so it cannot override this.
const appReactDir = path.resolve(projectRoot, 'node_modules', 'react');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Expo virtual entry can occasionally ask for the workspace-relative path
  // even when serverRoot is already pinned. Resolve it to the app entry.
  if (moduleName === './APPS/saywetin-native/index') {
    return { filePath: path.join(projectRoot, 'index.ts'), type: 'sourceFile' };
  }
  if (moduleName === 'react') {
    return { filePath: path.join(appReactDir, 'index.js'), type: 'sourceFile' };
  }
  if (moduleName === 'react/jsx-runtime') {
    return { filePath: path.join(appReactDir, 'jsx-runtime.js'), type: 'sourceFile' };
  }
  if (moduleName === 'react/jsx-dev-runtime') {
    return { filePath: path.join(appReactDir, 'jsx-dev-runtime.js'), type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.extraNodeModules = {
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
