import type { GmailSentMessageProof } from "./gmail.js";
import type { PendingDraftForReconciliation } from "./message_store.js";

export interface SentDraftMatch {
  draft: PendingDraftForReconciliation;
  proof: GmailSentMessageProof;
}

function extractEmailAddresses(value: string): string[] {
  return Array.from(
    value
      .toLowerCase()
      .matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g),
    (match) => match[0]
  );
}

export function matchSentDraftProofs(
  drafts: PendingDraftForReconciliation[],
  proofs: GmailSentMessageProof[]
): { matches: SentDraftMatch[]; unmatched: PendingDraftForReconciliation[] } {
  const proofsByThread = new Map<string, GmailSentMessageProof[]>();
  for (const proof of proofs) {
    const threadProofs = proofsByThread.get(proof.threadId) || [];
    threadProofs.push(proof);
    proofsByThread.set(proof.threadId, threadProofs);
  }

  const matches: SentDraftMatch[] = [];
  const unmatched: PendingDraftForReconciliation[] = [];

  for (const draft of drafts) {
    const createdAt = new Date(draft.created_at).getTime();
    const earliestAllowed = Number.isNaN(createdAt) ? 0 : createdAt - 5 * 60 * 1000;
    const recipient = (draft.recipient_email || "").trim().toLowerCase();
    const candidates = (proofsByThread.get(draft.thread_id) || [])
      .filter((proof) => {
        const sentAt = new Date(proof.sentAt).getTime();
        if (Number.isNaN(sentAt) || sentAt < earliestAllowed) return false;
        if (!recipient) return true;
        return extractEmailAddresses(proof.recipientHeader).includes(recipient);
      })
      .sort((left, right) => new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime());

    const proof = candidates[0];
    if (proof) {
      matches.push({ draft, proof });
    } else {
      unmatched.push(draft);
    }
  }

  return { matches, unmatched };
}
