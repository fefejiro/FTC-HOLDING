export type DeployRole = "api" | "fullstack";

interface ResolveDeploymentRoleOptions {
  nodeEnv: string;
  explicitRole?: string;
  publicBaseUrl?: string;
  railwayEnvPresent?: boolean;
}

function normalizeRole(value: string | undefined): DeployRole | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "api") {
    return "api";
  }

  if (normalized === "fullstack") {
    return "fullstack";
  }

  return undefined;
}

function toHostname(originOrHost: string): string | undefined {
  if (!originOrHost || originOrHost === "*") {
    return undefined;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(originOrHost)) {
    try {
      return new URL(originOrHost).hostname.toLowerCase();
    } catch {
      return undefined;
    }
  }

  return originOrHost.split(":")[0].toLowerCase();
}

export function resolveDeploymentRole(options: ResolveDeploymentRoleOptions): DeployRole {
  const explicit = normalizeRole(options.explicitRole);
  if (explicit) {
    return explicit;
  }

  if (options.nodeEnv !== "production") {
    return "fullstack";
  }

  const host = toHostname(options.publicBaseUrl ?? "");
  if (host === "api.saywetin.app") {
    return "api";
  }

  if (host === "saywetin.app" || host === "www.saywetin.app") {
    return "fullstack";
  }

  if (options.railwayEnvPresent) {
    return "api";
  }

  return "fullstack";
}

export function shouldServeFrontend(role: DeployRole): boolean {
  return role === "fullstack";
}
