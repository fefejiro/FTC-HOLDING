import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell">
      <header>
        <h1>Anion Class App</h1>
        <p>Premium tutoring foundation scaffold.</p>
      </header>
      {children}
    </main>
  );
}