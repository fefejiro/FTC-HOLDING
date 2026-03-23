"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { saveAteamDemoHandoff } from "../../lib/ateamHandoff";
import { ateamModeStageLabels } from "../../lib/ateamMode";

type DemoOutput = {
  summary: string;
  recommendedLane: string;
  recommendedDirection: string;
  phases: string[];
  stack: string[];
  deliverables: string[];
  nextSteps: string[];
};

const categories = [
  { value: "website", label: "Website" },
  { value: "lead-automation", label: "Lead automation" },
  { value: "product-app", label: "App" },
  { value: "internal-tool", label: "Internal tool" },
  { value: "ai-feature", label: "AI workflow" }
] as const;

type CategoryValue = (typeof categories)[number]["value"];

export default function AteamDemoClient() {
  const [idea, setIdea] = useState("");
  const [category, setCategory] = useState<CategoryValue>(categories[0].value);
  const [output, setOutput] = useState<DemoOutput | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (status !== "loading") {
      setStageIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setStageIndex((current) => (current + 1) % ateamModeStageLabels.length);
    }, 700);

    return () => window.clearInterval(interval);
  }, [status]);

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
      setError("Share a bit more detail so the demo can frame a believable next step.");
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

      const elapsedMs = Date.now() - loadingStartedAtMs;
      const minLoadingMs = 3200;
      if (elapsedMs < minLoadingMs) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingMs - elapsedMs));
      }

      setOutput(resolvedOutput);
      setStatus("idle");

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
          <label htmlFor="ateam-idea">Describe the idea</label>
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

        <div className="ateam-demo-stage-rail" aria-label="ATEAM workflow stages">
          {ateamModeStageLabels.map((stage, index) => {
            const isActive = status === "loading" && index <= stageIndex;
            const isComplete = status !== "loading" && output;
            return (
              <div
                key={stage}
                className={`ateam-demo-stage ${isActive || isComplete ? "is-active" : ""}`}
              >
                <span>{index + 1}</span>
                <strong>{stage}</strong>
              </div>
            );
          })}
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
        {status === "loading" ? (
          <div className="card ateam-demo-loading">
            <div className="ateam-demo-loading-top">
              <p className="card-kicker">ATEAM processing</p>
              <span className="ateam-demo-pill">{selectedCategoryLabel}</span>
            </div>
            <h3>Reviewing your idea and building a scoped next step</h3>
            <p className="muted">
              ATEAM is grounding the brief in Memory, routing it through Office, aligning Team
              context, and preparing the Factory handoff you can continue into intake.
            </p>
            <div className="ateam-demo-loading-bar" aria-hidden="true">
              <span
                style={{ width: `${((stageIndex + 1) / ateamModeStageLabels.length) * 100}%` }}
              />
            </div>
            <div className="ateam-demo-loading-grid">
              {ateamModeStageLabels.map((stage, index) => (
                <div
                  key={stage}
                  className={`ateam-demo-loading-card ${index === stageIndex ? "is-current" : ""}`}
                >
                  <span>{index + 1}</span>
                  <p>{stage}</p>
                </div>
              ))}
            </div>
          </div>
        ) : output ? (
          <article className="card ateam-demo-brief-card">
            <div className="ateam-demo-brief-top">
              <div>
                <p className="card-kicker">Generated brief</p>
                <h3>Clear next step for your idea</h3>
              </div>
              <span className="ateam-demo-pill">{selectedCategoryLabel}</span>
            </div>
            <div className="ateam-demo-idea">
              <p className="ateam-demo-idea-label">Idea</p>
              <p className="ateam-demo-idea-text">{idea}</p>
            </div>
            <div className="ateam-demo-brief-grid">
              <section className="ateam-demo-brief-section ateam-demo-brief-section--summary">
                <h4>Recommended lane</h4>
                <p className="ateam-demo-lane">{output.recommendedLane}</p>
                <p>{output.summary}</p>
                <p className="muted">{output.recommendedDirection}</p>
              </section>
              <section className="ateam-demo-brief-section">
                <h4>Suggested phases</h4>
                <ul className="ateam-demo-list">
                  {output.phases.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <section className="ateam-demo-brief-section">
                <h4>Likely deliverables</h4>
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
                <h4>Clear next step</h4>
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
                Continue with this idea
              </Link>
              <Link href="/work" prefetch={false} className="btn btn-secondary">
                View Client Launches
              </Link>
            </div>
          </article>
        ) : (
          <div className="card ateam-demo-placeholder">
            <p className="card-kicker">Demo output</p>
            <h3>Run an ATEAM-mode pass on the idea</h3>
            <p className="muted">
              ATEAM mode will walk through Memory, Office, Team, and Factory, then return a
              recommended lane, structured summary, phases, likely deliverables, and the next step
              you can continue into intake.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
