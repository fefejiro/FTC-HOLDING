export type StagingAuthorizationContext = Readonly<{
  familyId: string;
  familyPermissions: Readonly<Record<string, readonly string[]>>;
}>;

export class StagingAuthorizationError extends Error {
  public readonly code = "FORBIDDEN" as const;
  public constructor(message = "The staging actor is not authorized for this family action.") { super(message); }
}

export function requireStagingPermission(context: StagingAuthorizationContext, familyId: string, permission: string): void {
  if (context.familyId !== familyId) throw new StagingAuthorizationError();
  if (!context.familyPermissions[familyId]?.includes(permission)) throw new StagingAuthorizationError();
}

export function canStagingReadFamily(context: StagingAuthorizationContext, familyId: string): boolean {
  return context.familyId === familyId && Boolean(context.familyPermissions[familyId]?.some((permission) => permission === "read:family" || permission === "read"));
}
