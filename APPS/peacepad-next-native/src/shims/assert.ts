/**
 * Small React Native-safe assertion used by Expo's notification backoff helper.
 * The upstream helper only calls the default Node `assert` function; keeping
 * this shim local avoids pulling Node's standard-library implementation into
 * the native bundle.
 */
export default function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) throw new Error(message ?? "Assertion failed");
}
