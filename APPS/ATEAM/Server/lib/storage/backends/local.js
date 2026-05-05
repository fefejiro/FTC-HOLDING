import { createThreadStore } from "../../threadStore.js";
import { createTaskStore } from "../../taskStore.js";
import { createMemoryStore } from "../../memoryStore.js";
import { createSpeechClarityStore } from "../../speechClarity/speechClarityStore.js";
import { createContentPipelineStore } from "../../contentPipelineStore.js";
import { createApprovalStore } from "../../approvalStore.js";
import { createWorkItemStore } from "../../workItemStore.js";
import { createWorkflowRunStore } from "../../workflowRunStore.js";
import { createDocumentStore } from "../../documentStore.js";

export function createLocalRepositories({ memoryDir = "" } = {}) {
  const threadStore = createThreadStore({ memoryDir });
  const taskStore = createTaskStore({ memoryDir });
  const memoryStore = createMemoryStore({
    memoryDir,
    threadStore,
    taskStore
  });
  const speechClarityStore = createSpeechClarityStore({ memoryDir });
  const contentPipelineStore = createContentPipelineStore({ memoryDir });
  const approvalStore = createApprovalStore();
  const workItemStore = createWorkItemStore();
  const workflowRunStore = createWorkflowRunStore();
  const documentStore = createDocumentStore();

  return {
    backend: "local",
    capability: {
      provider: "local",
      configured: true,
      durableDomains: []
    },
    threadStore,
    taskStore,
    memoryStore,
    speechClarityStore,
    contentPipelineStore,
    approvalStore,
    workItemStore,
    workflowRunStore,
    documentStore
  };
}
