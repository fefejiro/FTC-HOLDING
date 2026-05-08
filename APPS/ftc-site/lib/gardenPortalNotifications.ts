type GardenEmailPayload = {
  to: string;
  subject: string;
  text: string;
};

function normalizeEmail(value: string): string {
  return String(value || "").trim().toLowerCase();
}

export async function sendGardenPortalEmail(payload: GardenEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = normalizeEmail(payload.to);

  if (!apiKey || !to) {
    return;
  }

  const from = process.env.GARDEN_CLEANERS_ADMIN_EMAIL_FROM || "Garden Cleaners <noreply@gardencleaners.ca>";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: payload.subject,
      text: payload.text
    })
  });
}
