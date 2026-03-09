import fs from "fs/promises";
import path from "path";
import { safeTaskId } from "./threadStore.js";

const DEFAULT_ALLOWED = [
  "created",
  "assigned",
  "proposed",
  "awaiting_approval",
  "approved",
  "executed",
  "rejected",
  "archived",
  "approve",
  "revise",
  "kill"
];

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

function defaultStore() {
  return {
    version: 1,
    allowedStatuses: [...DEFAULT_ALLOWED],
    tasks: {},
    updatedAt: null
  };
}

export function createTaskStore({ memoryDir }) {
  const tasksDir = path.join(memoryDir, "tasks");
  const tasksFile = path.join(tasksDir, "tasks.json");

  async function ensure() {
    await fs.mkdir(tasksDir, { recursive: true });
    if (!(await exists(tasksFile))) {
      await writeJson(tasksFile, defaultStore());
    }
  }

  async function readStore() {
    await ensure();
    const raw = await readJson(tasksFile, defaultStore());
    const store = defaultStore();

    if (Array.isArray(raw.allowedStatuses)) {
      store.allowedStatuses = [...new Set(raw.allowedStatuses.map((v) => String(v).toLowerCase()))];
    }

    if (raw && typeof raw.tasks === "object" && !Array.isArray(raw.tasks)) {
      for (const [taskId, value] of Object.entries(raw.tasks)) {
        if (!value || typeof value !== "object") continue;
        const tid = safeTaskId(taskId);
        store.tasks[tid] = {
          taskId: tid,
          status: String(value.status || "created").toLowerCase(),
          decisionNote: String(value.decisionNote || ""),
          title: String(value.title || ""),
          assignedAgent: String(value.assignedAgent || ""),
          updatedAt: String(value.updatedAt || "") || null
        };
      }
    }

    store.updatedAt = raw?.updatedAt || null;
    return store;
  }

  async function writeStore(store) {
    const next = {
      ...defaultStore(),
      ...store,
      updatedAt: new Date().toISOString()
    };
    await writeJson(tasksFile, next);
    return next;
  }

  async function getTask(taskId) {
    const store = await readStore();
    const tid = safeTaskId(taskId);
    const task = store.tasks[tid] || {
      taskId: tid,
      status: "created",
      decisionNote: "",
      title: "",
      assignedAgent: "",
      updatedAt: null
    };
    return { ...task };
  }

  async function updateTask(taskId, patch = {}) {
    const store = await readStore();
    const tid = safeTaskId(taskId);
    const prev = store.tasks[tid] || {
      taskId: tid,
      status: "created",
      decisionNote: "",
      title: "",
      assignedAgent: "",
      updatedAt: null
    };

    const nextStatus = patch.status ? String(patch.status).toLowerCase() : prev.status;
    if (!store.allowedStatuses.includes(nextStatus)) {
      const err = new Error(`Invalid status: ${nextStatus}`);
      err.code = "INVALID_STATUS";
      err.allowedStatuses = store.allowedStatuses;
      throw err;
    }

    const next = {
      ...prev,
      ...patch,
      taskId: tid,
      status: nextStatus,
      decisionNote: patch.decisionNote !== undefined ? String(patch.decisionNote || "") : prev.decisionNote,
      title: patch.title !== undefined ? String(patch.title || "") : prev.title,
      assignedAgent: patch.assignedAgent !== undefined ? String(patch.assignedAgent || "") : prev.assignedAgent,
      updatedAt: new Date().toISOString()
    };

    store.tasks[tid] = next;
    await writeStore(store);
    return next;
  }

  async function listTasks() {
    const store = await readStore();
    return store;
  }

  return {
    ensure,
    getTask,
    updateTask,
    listTasks
  };
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
