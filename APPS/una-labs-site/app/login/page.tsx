'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  return (
    <section className="bg-white min-h-[70vh] flex items-center">
      <div className="max-w-tight mx-auto px-6 py-20 w-full">
        <div className="mb-6 flex justify-center">
          <Badge variant="teal">Welcome back</Badge>
        </div>
        <h1 className="text-h2 text-tx-heading text-center mb-2">Log in to Una Labs</h1>
        <p className="text-body text-tx-secondary text-center mb-10">
          Don't have an account?{' '}
          <a href="/start" className="text-brand-teal font-semibold hover:underline">
            Start free trial
          </a>
        </p>

        <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="login-email" className="block text-body font-medium text-tx-heading mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="you@company.com"
              required
              className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-body font-medium text-tx-heading mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 border border-border rounded-lg text-body focus:outline-none focus:border-border-focus"
            />
          </div>
          <Button href="#" variant="primary" size="lg" className="w-full justify-center">
            Log in
          </Button>
          <p className="text-center text-body-sm text-tx-secondary">
            <a href="#" className="hover:text-brand-teal transition-colors">Forgot password?</a>
          </p>
        </form>
      </div>
    </section>
  );
}
