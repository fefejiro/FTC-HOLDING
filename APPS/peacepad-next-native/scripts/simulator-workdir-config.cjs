const standaloneInstallArgs = Object.freeze([
  "install",
  "--workspaces=false",
]);

const requiredStandaloneDependencies = Object.freeze([
  "expo-asset",
  "expo-modules-core",
]);

const standaloneMetroPolicy = Object.freeze({
  disableHierarchicalLookup: false,
  nodeModulesDirectory: "node_modules",
  watchFolders: Object.freeze([]),
});

module.exports = {
  requiredStandaloneDependencies,
  standaloneInstallArgs,
  standaloneMetroPolicy,
};
