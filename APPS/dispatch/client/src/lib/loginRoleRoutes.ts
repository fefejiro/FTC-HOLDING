export type LoginRole = 'operator' | 'admin';

const PUBLIC_DISPATCH_OPERATOR_URL = 'https://dispatch.unalabs.cloud/operator';
const PRIVATE_DISPATCH_ADMIN_URL = 'https://dispatch-admin.unalabs.cloud/admin';

function hostName() {
  if (typeof window === 'undefined') return '';
  return String(window.location.hostname || '').toLowerCase();
}

function isLocalHost(host: string) {
  return host === 'localhost' || host === '127.0.0.1';
}

function isPrivateAdminHost(host: string) {
  return host === 'dispatch-admin.unalabs.cloud';
}

export function loginRoleHref(role: LoginRole) {
  const host = hostName();

  if (!host || isLocalHost(host)) {
    return role === 'operator' ? '/operator' : '/admin';
  }

  if (role === 'admin') {
    return isPrivateAdminHost(host) ? '/admin' : PRIVATE_DISPATCH_ADMIN_URL;
  }

  return isPrivateAdminHost(host) ? PUBLIC_DISPATCH_OPERATOR_URL : '/operator';
}
