import { ensureResumeFixtures } from "./resume_fixture.js";

export default async function setup(): Promise<void> {
  await ensureResumeFixtures();
}
