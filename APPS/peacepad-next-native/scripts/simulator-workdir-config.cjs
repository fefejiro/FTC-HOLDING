const standaloneInstallArgs = Object.freeze([
  "install",
  "--workspaces=false",
]);

const requiredStandaloneDependencies = Object.freeze([
  "@react-native/virtualized-lists",
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
