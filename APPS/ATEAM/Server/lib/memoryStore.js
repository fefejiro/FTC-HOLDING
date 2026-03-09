import fs from "fs/promises";
import path from "path";
import { safeTaskId } from "./threadStore.js";
import { createContextBundleService } from "./contextBundle.js";

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

function defaultGlobalMemory() {
  return {
    version: 1,
    identity: {
      name: "ATEAM",
      mode: "local_mvp",
      owner: "Manchi"
    },
    persona: {
      tone: ["human", "practical", "clear"],
      avoid: ["contractions", "em-dash"]
    },
    policies: {
      localOnly: true,
      noCloud: true,
      defaultAgent: "Coach"
    },
    routing: {
      fallbackAgent: "Coach"
    },
    updatedAt: null
  };
}

function defaultTaskMemory(taskId) {
  return {
    taskId: safeTaskId(taskId),
    notes: [],
    pinned: [],
    updatedAt: null
  };
}

export function createMemoryStore({ memoryDir, threadStore, taskStore }) {
  const globalFile = path.join(memoryDir, "global.json");
  const projectsDir = path.join(memoryDir, "projects");
  const agentsDir = path.join(memoryDir, "agents");

  function taskMemoryFile(taskId) {
    return path.join(projectsDir, `${safeTaskId(taskId)}.json`);
  }

  async function ensure() {
    await fs.mkdir(memoryDir, { recursive: true });
    await fs.mkdir(projectsDir, { recursive: true });
    await fs.mkdir(agentsDir, { recursive: true });
    if (!(await exists(globalFile))) {
      const memory = defaultGlobalMemory();
      memory.updatedAt = new Date().toISOString();
      await writeJson(globalFile, memory);
    }
    await contextBundleService.ensure();
  }

  async function getGlobalMemory() {
    await ensure();
    const data = await readJson(globalFile, defaultGlobalMemory());
    return data || defaultGlobalMemory();
  }

  async function saveGlobalMemory(next) {
    await ensure();
    const merged = {
      ...defaultGlobalMemory(),
      ...(next || {}),
      updatedAt: new Date().toISOString()
    };
    await writeJson(globalFile, merged);
    contextBundleService.invalidate();
    return merged;
  }

  async function getTaskMemory(taskId) {
    await ensure();
    const file = taskMemoryFile(taskId);
    if (!(await exists(file))) {
      const seed = defaultTaskMemory(taskId);
      seed.updatedAt = new Date().toISOString();
      await writeJson(file, seed);
      return seed;
    }
    const data = await readJson(file, defaultTaskMemory(taskId));
    return data || defaultTaskMemory(taskId);
  }

  async function saveTaskMemory(taskId, next) {
    await ensure();
    const current = await getTaskMemory(taskId);
    const merged = {
      ...current,
      ...(next || {}),
      taskId: safeTaskId(taskId),
      updatedAt: new Date().toISOString()
    };
    await writeJson(taskMemoryFile(taskId), merged);
    contextBundleService.invalidate(taskId);
    return merged;
  }

  const contextBundleService = createContextBundleService({
    memoryDir,
    threadStore,
    taskStore,
    getGlobalMemory,
    getTaskMemory
  });

  if (typeof threadStore.onThreadChange === "function") {
    threadStore.onThreadChange((tid) => contextBundleService.invalidate(tid));
  }

  async function getContextBundle({ taskId, agent, mode }) {
    return contextBundleService.getContextBundle({ taskId, agent, mode });
  }

  function invalidateContextCache(taskId) {
    contextBundleService.invalidate(taskId);
  }

  return {
    ensure,
    getGlobalMemory,
    saveGlobalMemory,
    getTaskMemory,
    saveTaskMemory,
    getContextBundle,
    invalidateContextCache
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
