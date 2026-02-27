/**
 * FTC Holding Configuration Package
 * Centralized configuration for all FTC applications
 */

export const PORTS = {
  /** FTC Site (Next.js) - must be 3001 for test consistency */
  FTC: 3001,
  /** PeacePad server port */
  PEACEPAD: 5000,
  /** SayWetin server port */
  SAYWETIN: 5001,
} as const;

export const IS_CI = process.env.CI === 'true';

export const ENVIRONMENT = {
  DEV: 'development',
  PROD: 'production',
  TEST: 'test',
} as const;

export default {
  PORTS,
  IS_CI,
  ENVIRONMENT,
};
