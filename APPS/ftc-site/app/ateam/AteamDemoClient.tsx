"use client";

import { useState, type FormEvent } from "react";

type DemoOutput = {
  summary: string;
  recommendedDirection: string;
  phases: string[];
  stack: string[];
  deliverables: string[];
  nextSteps: string[];
};

const categories = [
  { value: "website", label: "Website / marketing site" },
  { value: "lead-automation", label: "Lead automation / follow-up" },
  { value: "product-app", label: "Product or mobile app" },
  { value: "internal-tool", label: "Internal tool / ops system" },
  { value: "ai-feature", label: "AI feature or assistant" }
] as const;

type CategoryValue = (typeof categories)[number]["value"];

export default function AteamDemoClient() {
  const [idea, setIdea] = useState("");
  const [category, setCategory] = useState<CategoryValue>(categories[0].value);
  const [output, setOutput] = useState<DemoOutput | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (idea.trim().length < 12) {
      setStatus("error");
      setError("Share a bit more detail so the demo can respond properly.");
      return;
    }

    setStatus("loading");
    setOutput(null);

    try {
      const response = await fetch("/api/ateam-demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idea, category })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        setStatus("error");
        setError(payload?.message ?? "Something went wrong. Please try again.");
        return;
      }

      setOutput(payload.output as DemoOutput);
      setStatus("idle");
    } catch (requestError) {
      setStatus("error");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reach the demo endpoint."
      );
    }
  };

  return (
    <div className="ateam-demo">
      <form className="ateam-demo-form" onSubmit={handleSubmit}>
        <div className="ateam-demo-field">
          <label htmlFor="ateam-idea">Project idea</label>
          <textarea
            id="ateam-idea"
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="Example: Build a lead capture site for a local service business with automated follow-up."
            rows={4}
          />
        </div>
        <div className="ateam-demo-field">
          <label htmlFor="ateam-category">Category</label>
          <select
            id="ateam-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as CategoryValue)}
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Running demo..." : "Generate demo output"}
        </button>
        {error ? <p className="ateam-demo-error">{error}</p> : null}
      </form>

      <div className="ateam-demo-output">
        {output ? (
          <div className="ateam-demo-output-grid">
            <div className="card ateam-demo-output-card">
              <p className="card-kicker">Summary</p>
              <p>{output.summary}</p>
              <p className="muted">{output.recommendedDirection}</p>
            </div>
            <div className="card ateam-demo-output-card">
              <p className="card-kicker">Phases</p>
              <ul className="ateam-demo-list">
                {output.phases.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="card ateam-demo-output-card">
              <p className="card-kicker">Suggested stack</p>
              <ul className="ateam-demo-list">
                {output.stack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="card ateam-demo-output-card">
              <p className="card-kicker">Deliverables</p>
              <ul className="ateam-demo-list">
                {output.deliverables.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="card ateam-demo-output-card">
              <p className="card-kicker">Next steps</p>
              <ul className="ateam-demo-list">
                {output.nextSteps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="card ateam-demo-placeholder">
            <p className="card-kicker">Demo output</p>
            <p className="muted">
              Submit an idea to see the structured execution summary and suggested
              delivery plan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
