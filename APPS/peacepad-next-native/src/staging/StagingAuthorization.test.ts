import { canStagingReadFamily, requireStagingPermission, StagingAuthorizationError } from "./StagingAuthorization";

const context = { familyId: "family-a", familyPermissions: { "family-a": ["read:family", "write:message"] } } as const;

test("allows only the configured family permission", () => {
  expect(canStagingReadFamily(context, "family-a")).toBe(true);
  expect(() => requireStagingPermission(context, "family-a", "write:message")).not.toThrow();
});

test("rejects cross-family and missing permissions", () => {
  expect(canStagingReadFamily(context, "family-b")).toBe(false);
  expect(() => requireStagingPermission(context, "family-b", "write:message")).toThrow(StagingAuthorizationError);
  expect(() => requireStagingPermission(context, "family-a", "write:calendar")).toThrow(StagingAuthorizationError);
});
