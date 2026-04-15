"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type WorkflowStatus = "idle" | "activating" | "done" | "error";

export default function ConfirmationClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  const [status, setStatus] = useState<WorkflowStatus>("idle");
  const activated = useRef(false);

  useEffect(() => {
    if (!sessionId || activated.current) return;
    activated.current = true;

    setStatus("activating");

    const raw = sessionStorage.getItem("una_intake");
    const intake = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;

    fetch("/api/activate-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, intake })
    })
      .then((res) => {
        if (res.ok) {
          setStatus("done");
          sessionStorage.removeItem("una_intake");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [sessionId]);

  return (
    <div className="confirmation-content">
      <div className="confirmation-icon-wrap">
        <div className="confirmation-icon">✓</div>
      </div>

      <h1>Your build has started.</h1>
      <p className="lead">
        Payment confirmed. Your project is now in the queue and we're on it.
      </p>

      {status === "activating" ? (
        <p className="confirmation-status confirmation-status--activating">
          Activating your project…
        </p>
      ) : null}

      {status === "done" ? (
        <p className="confirmation-status confirmation-status--done">
          Project activated. Kickoff email incoming.
        </p>
      ) : null}

      <div className="confirmation-next-steps card">
        <h2>What happens now</h2>
        <ol className="confirmation-steps-list">
          <li>
            <strong>Check your inbox</strong>
            <p>
              You'll receive a project kickoff email within 24 hours confirming your brief and
              next steps.
            </p>
          </li>
          <li>
            <strong>We scope the build</strong>
            <p>
              We review your intake, confirm the Version 1 scope, and set the build timeline.
            </p>
          </li>
          <li>
            <strong>Build begins</strong>
            <p>
              Development starts on schedule. You'll get progress updates throughout the month.
            </p>
          </li>
          <li>
            <strong>Launch + support</strong>
            <p>
              Your app goes live and you get a full month of post-launch support included.
            </p>
          </li>
        </ol>
      </div>

      <div className="confirmation-actions">
        <Link href="/" className="btn btn-secondary">
          Back to Una Labs
        </Link>
        <Link href="/work" className="btn btn-secondary" prefetch={false}>
          See what we've shipped
        </Link>
      </div>

      {sessionId ? (
        <p className="confirmation-ref">
          Payment reference: <code>{sessionId}</code>
        </p>
      ) : null}
    </div>
  );
}
