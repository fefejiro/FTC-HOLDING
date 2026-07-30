const standaloneInstallArgs = Object.freeze([
  "install",
  "--workspaces=false",
]);

const requiredStandaloneDependencies = Object.freeze([
  "expo-modules-core",
]);

const standaloneMetroPolicy = Object.freeze({
  disableHierarchicalLookup: true,
  nodeModulesDirectory: "node_modules",
  watchFolders: Object.freeze([]),
});

module.exports = {
  requiredStandaloneDependencies,
  standaloneInstallArgs,
  standaloneMetroPolicy,
};
