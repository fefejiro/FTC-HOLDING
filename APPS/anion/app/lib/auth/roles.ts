export type AppRole = 'student' | 'parent' | 'tutor' | 'admin';

const defaultRolePriority: AppRole[] = ['admin', 'tutor', 'student', 'parent'];

export function resolveActiveRole(
  roles: AppRole[],
  preferredRole?: AppRole | AppRole[],
): AppRole {
  const uniqueRoles = Array.from(new Set(roles));
  const preferredRoles = Array.isArray(preferredRole)
    ? preferredRole
    : preferredRole
      ? [preferredRole]
      : [];

  for (const role of preferredRoles) {
    if (uniqueRoles.includes(role)) return role;
  }

  for (const role of defaultRolePriority) {
    if (uniqueRoles.includes(role)) return role;
  }

  return 'parent';
}

