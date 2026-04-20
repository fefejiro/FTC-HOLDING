#!/usr/bin/env node
/**
 * Test harness for Una Labs webhook integration
 * 
 * Usage:
 *   node test-una-webhook.js [url] [ateam_key]
 * 
 * Defaults:
 *   url: http://localhost:3001/webhook/intake
 *   ateam_key: una_labs_webhook_secret_key_change_this
 * 
 * Example:
 *   node test-una-webhook.js http://localhost:3001/webhook/intake
 *   node test-una-webhook.js https://abc123.trycloudflare.com/webhook/intake una_labs_webhook_secret_key_change_this
 */

const url = process.argv[2] || "http://localhost:3001/webhook/intake";
const ateamKey = process.argv[3] || "una_labs_webhook_secret_key_change_this";

// Fake intake data
const testIntakeId = `test_intake_${Date.now()}`;
const testEmail = "test@example.com";

const payload = {
  type: "una_new_subscription",
  activation: {
    email: testEmail,
    tier: "starter",
    billing: "monthly",
    intake_id: testIntakeId,
    session_id: `cs_test_${Date.now()}`,
    created_at: new Date().toISOString(),
  },
  intake: {
    name: "John Doe",
    company: "Acme Corp",
    role: "Product Manager",
    teamSize: "5-10",
    intakeId: testIntakeId,
    email: testEmail,
    plan: "starter",
    billing: "monthly",
  },
};

console.log(`
┌─────────────────────────────────────────────────────┐
│ Una Labs Webhook Test Harness                       │
└─────────────────────────────────────────────────────┘

URL:       ${url}
ATEAM_KEY: ${ateamKey}
Email:     ${testEmail}
Tier:      starter
Intake ID: ${testIntakeId}

Sending payload...
`);

fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-unalabs-source": "stripe-api-worker",
    "authorization": `Bearer ${ateamKey}`,
  },
  body: JSON.stringify(payload),
})
  .then((res) => {
    console.log(`Status: ${res.status} ${res.statusText}`);
    return res.json();
  })
  .then((data) => {
    console.log(`Response: ${JSON.stringify(data, null, 2)}`);
    console.log(`
✓ Webhook delivered. Check:
  1. ATEAM logs for intake processing
  2. Supabase projects table for status change to 'scoping'
  3. Supabase milestones table for 3 new milestones
  4. Email inbox for kickoff email to ${testEmail} and notification to mike.fejiro@gmail.com
    `);
  })
  .catch((err) => {
    console.error(`✗ Error: ${err.message}`);
    process.exit(1);
  });
