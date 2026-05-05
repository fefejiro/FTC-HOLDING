// src/api/config.ts
import Constants from 'expo-constants';

/**
 * Resolves the API base URL for SayWetin Native.
 * Priority:
 *   1. process.env.EXPO_PUBLIC_API_BASE_URL (inlined by Expo/EAS/.env)
 *   2. Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL (from app.json)
 *   3. Fallback: public production URL
 */
export function getApiBaseUrl(): string {
  return (
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ||
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL as string)?.trim() ||
    'https://api.saywetin.app'
  );
}
