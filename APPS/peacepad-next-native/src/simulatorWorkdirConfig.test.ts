const {
  requiredStandaloneDependencies,
  standaloneInstallArgs,
  standaloneMetroPolicy,
} = require("../scripts/simulator-workdir-config.cjs") as {
  requiredStandaloneDependencies: readonly string[];
  standaloneInstallArgs: readonly string[];
  standaloneMetroPolicy: {
    readonly disableHierarchicalLookup: boolean;
    readonly nodeModulesDirectory: string;
    readonly watchFolders: readonly string[];
  };
};

describe("standalone iOS simulator workdir", () => {
  it("prevents npm from installing into the parent monorepo workspace", () => {
    expect(standaloneInstallArgs).toEqual([
      "install",
      "--workspaces=false",
    ]);
  });

  it("fails preparation when Expo's native module runtime is absent", () => {
    expect(requiredStandaloneDependencies).toContain(
      "@react-native/virtualized-lists",
    );
    expect(requiredStandaloneDependencies).toContain("expo-asset");
    expect(requiredStandaloneDependencies).toContain("expo-modules-core");
  });

  it("pins Metro resolution to the standalone dependency tree", () => {
    expect(standaloneMetroPolicy).toEqual({
      disableHierarchicalLookup: false,
      nodeModulesDirectory: "node_modules",
      watchFolders: [],
    });
  });
});
