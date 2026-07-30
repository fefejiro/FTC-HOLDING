const {
  requiredStandaloneDependencies,
  standaloneInstallArgs,
} = require("../scripts/simulator-workdir-config.cjs") as {
  requiredStandaloneDependencies: readonly string[];
  standaloneInstallArgs: readonly string[];
};

describe("standalone iOS simulator workdir", () => {
  it("prevents npm from installing into the parent monorepo workspace", () => {
    expect(standaloneInstallArgs).toEqual([
      "install",
      "--workspaces=false",
    ]);
  });

  it("fails preparation when Expo's native module runtime is absent", () => {
    expect(requiredStandaloneDependencies).toContain("expo-modules-core");
  });
});
