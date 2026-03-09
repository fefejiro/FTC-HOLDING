import { createThreadStore } from "../../threadStore.js";
import { createTaskStore } from "../../taskStore.js";
import { createMemoryStore } from "../../memoryStore.js";
import { createSpeechClarityStore } from "../../speechClarity/speechClarityStore.js";

export function createLocalRepositories({ memoryDir = "" } = {}) {
  const threadStore = createThreadStore({ memoryDir });
  const taskStore = createTaskStore({ memoryDir });
  const memoryStore = createMemoryStore({
    memoryDir,
    threadStore,
    taskStore
  });
  const speechClarityStore = createSpeechClarityStore({ memoryDir });

  return {
    backend: "local",
    threadStore,
    taskStore,
    memoryStore,
    speechClarityStore
  };
}
