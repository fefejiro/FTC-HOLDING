import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Admin from "@/pages/admin";

function renderWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Admin />
    </QueryClientProvider>,
  );
}

describe("admin page login gate", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/admin/session")) {
        return new Response(JSON.stringify({ authenticated: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/api/admin/login") && init?.method === "POST") {
        const payload = JSON.parse(String(init.body || "{}"));
        if (payload.username === "mike.fejiro@gmail.com" && payload.password === "Efiuvwere@1234!") {
          return new Response(JSON.stringify({ authenticated: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ error: "Invalid" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows login form when no admin session exists", async () => {
    renderWithClient();

    expect(await screen.findByText("Admin login required")).toBeInTheDocument();
    expect(screen.getByTestId("input-admin-username")).toBeInTheDocument();
    expect(screen.getByTestId("input-admin-password")).toBeInTheDocument();
  });

  it("unlocks batch import after valid credentials", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await screen.findByText("Admin login required");
    await user.type(screen.getByTestId("input-admin-password"), "Efiuvwere@1234!");
    await user.click(screen.getByTestId("button-admin-login"));

    await waitFor(() => {
      expect(screen.getByText("Batch Import Tool")).toBeInTheDocument();
      expect(screen.getByTestId("text-admin-authenticated")).toBeInTheDocument();
    });
  });
});
