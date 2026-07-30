const standaloneInstallArgs = Object.freeze([
  "install",
  "--workspaces=false",
]);

const requiredStandaloneDependencies = Object.freeze([
  "expo-modules-core",
]);

module.exports = {
  requiredStandaloneDependencies,
  standaloneInstallArgs,
};
