const processType = String(process.env.JOB_AGENT_PROCESS || "web").trim().toLowerCase();

if (processType === "web") {
  const { startProductServer } = await import("./product_server.js");
  await startProductServer();
} else if (processType === "worker") {
  const { startProductWorker } = await import("./product_worker.js");
  await startProductWorker();
} else if (processType === "migrate") {
  await import("./product_migrate.js");
} else {
  throw new Error("JOB_AGENT_PROCESS must be web, worker, or migrate.");
}

export {};
