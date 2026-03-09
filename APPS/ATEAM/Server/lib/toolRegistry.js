function trim(text, limit = 300) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

export function createToolRegistry({ taskStore, threadStore, voice }) {
  const tools = {
    get_time: {
      description: "Return local date and time",
      run: async () => ({
        iso: new Date().toISOString(),
        local: new Date().toLocaleString()
      })
    },
    list_tasks: {
      description: "List known tasks and statuses",
      run: async () => {
        const store = await taskStore.listTasks();
        const tasks = Object.values(store.tasks || {}).slice(0, 50);
        return tasks.map((item) => ({
          taskId: item.taskId,
          status: item.status,
          updatedAt: item.updatedAt
        }));
      }
    },
    get_task_status: {
      description: "Get a single task status",
      run: async (args) => {
        const taskId = String(args?.taskId || "global");
        return taskStore.getTask(taskId);
      }
    },
    recent_thread: {
      description: "Get recent messages from a task thread",
      run: async (args) => {
        const taskId = String(args?.taskId || "global");
        const limit = Math.max(1, Number(args?.limit || 8));
        const thread = await threadStore.getThread(taskId);
        return thread.slice(-limit).map((msg) => ({
          role: msg.role,
          agent: msg.agent,
          content: trim(msg.content, 160),
          ts: msg.ts
        }));
      }
    },
    voice_capabilities: {
      description: "Return local voice module capabilities",
      run: async () => voice.getCapabilities()
    }
  };

  async function runTool(name, args = {}) {
    const key = String(name || "").trim();
    const tool = tools[key];
    if (!tool) {
      throw new Error(`Unknown tool: ${key}`);
    }
    const output = await tool.run(args);
    return { name: key, output };
  }

  function listTools() {
    return Object.entries(tools).map(([name, item]) => ({
      name,
      description: item.description
    }));
  }

  return {
    runTool,
    listTools
  };
}
