import { createRepositories } from "../../lib/storage/repositories.js";

describe("storage repositories", () => {
  test("local backend resolves local repositories", () => {
    const repositories = createRepositories({ backend: "local", memoryDir: "memory" });
    expect(repositories.backend).toBe("local");
    expect(typeof repositories.threadStore?.ensure).toBe("function");
    expect(typeof repositories.taskStore?.ensure).toBe("function");
    expect(typeof repositories.memoryStore?.ensure).toBe("function");
    expect(typeof repositories.speechClarityStore?.ensure).toBe("function");
  });

  test("supabase backend resolves scaffold repositories", () => {
    const previousUrl = process.env.SUPABASE_URL;
    const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const repositories = createRepositories({ backend: "supabase" });
      expect(repositories.backend).toBe("supabase");
      expect(repositories.capability).toMatchObject({
        provider: "supabase",
        configured: false
      });
      expect(typeof repositories.threadStore?.ensure).toBe("function");
    } finally {
      if (previousUrl != null) process.env.SUPABASE_URL = previousUrl;
      else delete process.env.SUPABASE_URL;
      if (previousKey != null) process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
      else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  });
});
