import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function routeSlice(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex, `Missing route marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `Missing route end marker: ${end}`).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

function expectAuthorizationBeforeMutation(
  source: string,
  authorizationMarker: string,
  mutationMarker: string,
) {
  const authorizationIndex = source.indexOf(authorizationMarker);
  const mutationIndex = source.indexOf(mutationMarker);
  expect(authorizationIndex, `Missing authorization marker: ${authorizationMarker}`).toBeGreaterThanOrEqual(0);
  expect(mutationIndex, `Missing mutation marker: ${mutationMarker}`).toBeGreaterThanOrEqual(0);
  expect(authorizationIndex).toBeLessThan(mutationIndex);
}

describe("record and partnership authorization guard", () => {
  const routes = readSource("../../server/routes.ts");

  it("authorizes notes, tasks, and child updates through their stored partnership", () => {
    const notePatch = routeSlice(
      routes,
      'app.patch("/api/notes/:id"',
      'app.delete("/api/notes/:id"',
    );
    expectAuthorizationBeforeMutation(notePatch, "getAuthorizedPartnership", "storage.updateNote");
    expect(notePatch).toContain("existingNote.partnershipId");
    expect(notePatch).toContain("existingNote.createdBy");

    const noteDelete = routeSlice(
      routes,
      'app.delete("/api/notes/:id"',
      "// Task routes",
    );
    expectAuthorizationBeforeMutation(noteDelete, "getAuthorizedPartnership", "storage.deleteNote");

    const taskPatch = routeSlice(
      routes,
      'app.patch("/api/tasks/:id"',
      'app.delete("/api/tasks/:id"',
    );
    expectAuthorizationBeforeMutation(taskPatch, "getAuthorizedPartnership", "storage.updateTask");
    expect(taskPatch).toContain("oldTask.partnershipId");
    expect(taskPatch).toContain("oldTask.createdBy");
    expect(taskPatch).toContain("Invalid task assignee");

    const taskDelete = routeSlice(
      routes,
      'app.delete("/api/tasks/:id"',
      "// Child update routes",
    );
    expectAuthorizationBeforeMutation(taskDelete, "getAuthorizedPartnership", "storage.deleteTask");

    const childDelete = routeSlice(
      routes,
      'app.delete("/api/child-updates/:id"',
      "// Children routes",
    );
    expectAuthorizationBeforeMutation(
      childDelete,
      "getAuthorizedPartnership",
      "storage.deleteChildUpdate",
    );
  });

  it("derives expense and settlement authority from persisted records before writes", () => {
    const expenseCreate = routeSlice(
      routes,
      'app.post("/api/expenses"',
      "// Settlement routes",
    );
    expectAuthorizationBeforeMutation(
      expenseCreate,
      "getAuthorizedPartnership",
      "storage.createExpense",
    );
    expect(expenseCreate).toContain("validatedSplitPercentages");
    expect(expenseCreate).toContain("total 100");

    const settlementCreate = routeSlice(
      routes,
      'app.post("/api/settlements/initiate"',
      'app.patch("/api/settlements/:id/confirm"',
    );
    expectAuthorizationBeforeMutation(
      settlementCreate,
      "storage.getExpense(expenseId)",
      "storage.updateExpense(expenseId",
    );
    expect(settlementCreate).toContain("expense.paidBy !== userId");
    expect(settlementCreate).toContain("expense.partnershipId");
    expect(settlementCreate).toContain("resolvedPartnershipId");

    const settlementRead = routeSlice(
      routes,
      'app.get("/api/expenses/:id/settlements"',
      "// Therapist search endpoint",
    );
    expectAuthorizationBeforeMutation(
      settlementRead,
      "storage.getExpense(expenseId)",
      "storage.getExpenseSettlements(expenseId)",
    );
    expect(settlementRead).toContain("expense.paidBy !== userId");
  });

  it("authorizes story and shopping child records through their parent partnership", () => {
    const storyRoutes = routeSlice(
      routes,
      "// Storybooks API",
      "// Shopping lists API",
    );
    expect(storyRoutes).toContain("storage.getStorybook");
    expect(storyRoutes).toContain("storage.getStoryPage");
    expect(storyRoutes.match(/getAuthorizedPartnership/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(storyRoutes).toContain("createdBy: userId");
    expect(storyRoutes).toContain("createdBy: existingPage.createdBy");

    const shoppingRoutes = routeSlice(
      routes,
      "// Shopping lists API",
      "// Beta Feedback API",
    );
    expect(shoppingRoutes).toContain("storage.getShoppingList");
    expect(shoppingRoutes).toContain("storage.getShoppingItem");
    expect(shoppingRoutes.match(/getAuthorizedPartnership/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(shoppingRoutes).toContain("addedBy: userId");
    expect(shoppingRoutes).toContain("addedBy: existingItem.addedBy");
  });

  it("protects shared conversations and lower-use private records", () => {
    const conversationDelete = routeSlice(
      routes,
      'app.delete("/api/conversations/:id"',
      "// Note routes",
    );
    expect(conversationDelete).toContain("Shared conversations cannot be deleted");
    expectAuthorizationBeforeMutation(
      conversationDelete,
      "members.some((member) => member.userId !== userId)",
      "storage.deleteConversation",
    );

    const moodRead = routeSlice(
      routes,
      'app.get("/api/session-mood/:sessionId"',
      "// Parenting tips API",
    );
    expect(moodRead).toContain("summary.participants.includes(userId)");

    const interventionUpdate = routeSlice(
      routes,
      'app.put("/api/agent/interventions/:id"',
      "// Get/update agent settings",
    );
    expectAuthorizationBeforeMutation(
      interventionUpdate,
      "getAuthorizedPartnership",
      "storage.updateAgentIntervention",
    );
    expect(interventionUpdate).toContain("intervention.targetUserId !== userId");

    const templateDelete = routeSlice(
      routes,
      'app.delete("/api/schedule-templates/:id"',
      "// AI conflict detection for events",
    );
    expectAuthorizationBeforeMutation(
      templateDelete,
      "storage.getScheduleTemplate",
      "storage.deleteScheduleTemplate",
    );
    expect(templateDelete).toContain("template.createdBy !== userId");
    expect(templateDelete).toContain("template.isPublic");
  });
});
