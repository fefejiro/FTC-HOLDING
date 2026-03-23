"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { saveAteamDemoHandoff } from "../../lib/ateamHandoff";

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

  const selectedCategoryLabel = useMemo(() => {
    return categories.find((item) => item.value === category)?.label ?? category;
  }, [category]);

  const handoffPayload = useMemo(() => {
    if (!output) return null;
    return {
      version: 1 as const,
      createdAtMs: Date.now(),
      idea,
      categoryValue: category,
      categoryLabel: selectedCategoryLabel,
      output
    };
  }, [category, idea, output, selectedCategoryLabel]);

  const handleContinue = () => {
    if (!handoffPayload) return;
    saveAteamDemoHandoff(handoffPayload);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const submitIdea = idea;
    const submitCategory = category;
    const submitCategoryLabel = selectedCategoryLabel;

    if (submitIdea.trim().length < 12) {
      setStatus("error");
      setError("Share a bit more detail so the demo can respond properly.");
      return;
    }

    setStatus("loading");
    setOutput(null);
    const loadingStartedAtMs = Date.now();

    try {
      const response = await fetch("/api/ateam-demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idea: submitIdea, category: submitCategory })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        setStatus("error");
        setError(payload?.message ?? "Something went wrong. Please try again.");
        return;
      }

      const resolvedOutput = payload.output as DemoOutput;

      // Ensure the UI shows a visible "running" state (avoids feeling like a no-op on fast responses).
      const elapsedMs = Date.now() - loadingStartedAtMs;
      const minLoadingMs = 450;
      if (elapsedMs < minLoadingMs) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingMs - elapsedMs));
      }

      setOutput(resolvedOutput);
      setStatus("idle");

      // Persist the latest successful output so "Start a Project" (nav or CTA) can prefill the intake.
      saveAteamDemoHandoff({
        version: 1 as const,
        createdAtMs: Date.now(),
        idea: submitIdea,
        categoryValue: submitCategory,
        categoryLabel: submitCategoryLabel,
        output: resolvedOutput
      });
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
          <>
            <article className="card ateam-demo-brief-card">
              <div className="ateam-demo-brief-top">
                <p className="card-kicker">Generated brief</p>
                <span className="ateam-demo-pill">{selectedCategoryLabel}</span>
              </div>
              <div className="ateam-demo-idea">
                <p className="ateam-demo-idea-label">Project idea</p>
                <p className="ateam-demo-idea-text">{idea}</p>
              </div>
              <div className="ateam-demo-brief-grid">
                <section className="ateam-demo-brief-section ateam-demo-brief-section--summary">
                  <h4>Summary</h4>
                  <p>{output.summary}</p>
                  <p className="muted">{output.recommendedDirection}</p>
                </section>
                <section className="ateam-demo-brief-section">
                  <h4>Phases</h4>
                  <ul className="ateam-demo-list">
                    {output.phases.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section className="ateam-demo-brief-section">
                  <h4>Deliverables</h4>
                  <ul className="ateam-demo-list">
                    {output.deliverables.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section className="ateam-demo-brief-section">
                  <h4>Suggested stack</h4>
                  <ul className="ateam-demo-list">
                    {output.stack.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section className="ateam-demo-brief-section">
                  <h4>Next steps</h4>
                  <ul className="ateam-demo-list">
                    {output.nextSteps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>
              <div className="ateam-demo-next-cta">
                <Link
                  href="/work-with-ftc?from=ateam"
                  prefetch={false}
                  className="btn btn-primary"
                  onClick={handleContinue}
                >
                  Continue with this brief
                </Link>
                <Link href="/work" prefetch={false} className="btn btn-secondary">
                  View Client Launches
                </Link>
              </div>
            </article>
          </>
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
