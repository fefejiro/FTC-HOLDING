/**
 * FTC Holding Shared Types Package
 * Common type definitions for all FTC applications
 */

/** FTC application metadata */
export interface ApplicationMetadata {
  name: string;
  version: string;
  description?: string;
}

/** API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  timestamp: string;
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** User role enumeration */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

/** Base entity with timestamps */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export default {
  ApplicationMetadata: {} as ApplicationMetadata,
  ApiResponse: {} as ApiResponse,
  PaginatedResponse: {} as PaginatedResponse<unknown>,
  UserRole,
  BaseEntity: {} as BaseEntity,
};
