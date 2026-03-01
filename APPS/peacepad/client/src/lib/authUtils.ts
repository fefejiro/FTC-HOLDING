export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

/**
 * Handle unauthorized errors consistently across the app
 * Clears session and redirects to login
 */
export function handleUnauthorizedError(toast: any): void {
  toast({
    title: "Unauthorized",
    description: "You are logged out. Logging in again...",
    variant: "destructive",
    duration: 5000,
  });
  localStorage.removeItem("peacepad_session_id");
  setTimeout(() => {
    window.location.href = "/";
  }, 1000);
}
