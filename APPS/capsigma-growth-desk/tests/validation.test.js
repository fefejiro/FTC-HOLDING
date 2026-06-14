import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canAutoSendLead,
  canSendLead,
  isPlaceholderEmail,
  normalizeFitScore,
  normalizeLead,
  sanitizeOutreachText,
  scanDraftQuality,
  validateLead,
} from '../functions/_lib/validation.js'
import { classifyReply } from '../functions/_lib/replies.js'
import { buildCcRecipients, parseEmailList, resolveRecipients } from '../functions/api/send-email.js'

test('normalizes a real lead without requiring demo data', () => {
  const lead = normalizeLead({
    company: 'Acme Health',
    industry: 'Healthcare',
    fitScore: '87',
    contactTitle: 'VP Revenue Operations',
    email: 'Jordan.Lee@Example.com',
  })

  assert.equal(lead.company, 'Acme Health')
  assert.equal(lead.fit_score, 87)
  assert.equal(lead.email, 'jordan.lee@example.com')
  assert.equal(validateLead(lead).length, 0)
})

test('normalizes 1-10 fit scores onto the 0-100 outreach scale', () => {
  assert.equal(normalizeFitScore(8), 80)
  assert.equal(normalizeFitScore('8.5'), 85)
  assert.equal(normalizeFitScore(87), 87)
  assert.equal(normalizeFitScore(120), 120)
})

test('blocks placeholder emails from production send eligibility', () => {
  assert.equal(isPlaceholderEmail('firstname.lastname@company.com'), true)
  assert.equal(isPlaceholderEmail('name@yourdomain.com'), true)
  assert.equal(isPlaceholderEmail('person@company.com'), false)
})

test('requires valid draft inputs before send route can proceed', () => {
  const check = canSendLead({
    email: 'person@company.com',
    draft_body: 'Hello from CapSigma.',
  })

  assert.equal(check.ok, true)
})

test('rejects invalid lead shape', () => {
  const lead = normalizeLead({ fitScore: 120, email: 'bad-email' })
  assert.deepEqual(validateLead(lead), [
    'company is required',
    'email must be valid',
    'fit score must be between 0 and 100',
  ])
})

test('builds proof-copy CC recipients without duplicating the target recipient', () => {
  const ccEmails = parseEmailList('fejiro.efiuvwere@gmail.com, hello@capsigma.com, fejiro.efiuvwere@gmail.com')

  assert.deepEqual(ccEmails, [
    'fejiro.efiuvwere@gmail.com',
    'hello@capsigma.com',
    'fejiro.efiuvwere@gmail.com',
  ])
  assert.deepEqual(buildCcRecipients(ccEmails, 'hello@capsigma.com'), [
    { email: 'fejiro.efiuvwere@gmail.com' },
  ])
  assert.deepEqual(buildCcRecipients(ccEmails, 'fejiro.efiuvwere@gmail.com'), [
    { email: 'hello@capsigma.com' },
  ])
})

test('auto-send allows moderate matching prospects with source proof', () => {
  const check = canAutoSendLead({
    email: 'ops@company.com',
    draft_subject: 'CapSigma pilot',
    draft_body: 'Hello from CapSigma.',
    source_url: 'https://company.com/contact',
    fit_score: 64,
    reason: 'Back-office operations team has records and admin processing workflows.',
  })

  assert.equal(check.ok, true)
  assert.equal(check.serviceLane, 'admin_processing')
})

test('auto-send blocks source-less or low-fit prospects', () => {
  assert.equal(canAutoSendLead({
    email: 'ops@company.com',
    draft_subject: 'CapSigma pilot',
    draft_body: 'Hello from CapSigma.',
    fit_score: 64,
    reason: 'Back-office operations team has records and admin processing workflows.',
  }).ok, false)

  assert.equal(canAutoSendLead({
    email: 'ops@company.com',
    draft_subject: 'CapSigma pilot',
    draft_body: 'Hello from CapSigma.',
    source_url: 'https://company.com/contact',
    fit_score: 55,
    reason: 'Back-office operations team has records and admin processing workflows.',
  }).ok, false)
})

test('sandbox recipient override preserves intended and actual recipients', () => {
  assert.deepEqual(resolveRecipients('ops@company.com', {
    OUTBOUND_RECIPIENT_OVERRIDE: 'fejiro.efiuvwere@gmail.com',
  }), {
    intendedRecipient: 'ops@company.com',
    actualRecipient: 'fejiro.efiuvwere@gmail.com',
    sandbox: true,
  })
})

test('draft sanitizer and scanner block awkward filler and punctuation artifacts', () => {
  const sanitized = sanitizeOutreachText('Umm hello -- [your email] _ _')
  assert.equal(sanitized.includes('Umm'), false)
  assert.equal(sanitized.includes('--'), false)
  assert.equal(sanitized.includes('[your email]'), false)

  const scan = scanDraftQuality('Hello --', 'This has an em dash — and eem filler.')
  assert.equal(scan.ok, false)
  assert.ok(scan.issues.length >= 1)
})

test('reply classifier flags positive replies for human attention', () => {
  const reply = classifyReply({
    subject: 'Re: CapSigma pilot',
    body: 'This looks interesting. Can we book a call next week?',
  })

  assert.equal(reply.classification, 'positive')
  assert.equal(reply.needsHuman, true)
})
