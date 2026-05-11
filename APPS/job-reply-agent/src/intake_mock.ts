import fs from "node:fs";
import path from "node:path";
import type { RecruiterMessage } from "./types.js";

export function loadMockInbox(filePath = path.join(process.cwd(), "data", "inbox.sample.json")): RecruiterMessage[] {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as RecruiterMessage[];
}
