import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Anion Class App</h1>
        <p>Premium tutoring foundation focused on real role, discovery, booking, and profile contracts.</p>
      </header>
      {children}
    </main>
  );
}