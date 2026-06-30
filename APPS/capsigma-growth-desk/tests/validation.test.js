import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canAutoSendLead,
  canSendLead,
  isHealthcareContext,
  isPlaceholderEmail,
  normalizeFitScore,
  normalizeLead,
  sanitizeOutreachText,
  scanDraftQuality,
  scanDraftQualityForLead,
  validateLead,
} from '../functions/_lib/validation.js'
import { decryptSecret, encryptSecret } from '../functions/_lib/crypto.js'
import { messageToReply, parseEmailAddress } from '../functions/_lib/gmail.js'
import { classifyReply } from '../functions/_lib/replies.js'
import { buildCcRecipients, parseEmailList, resolveRecipients } from '../functions/api/send-email.js'
import { normalizeSearchParameters } from '../functions/api/prospect-runs.js'
import { assertPurgeConfirmation, buildPurgePlan, PURGE_CONFIRMATION } from '../functions/_lib/demo-purge.js'
import { buildScheduleSafety, checkEmailDomain, nextScheduledTime, normalizeIntelligenceInput, normalizeSendWindows } from '../functions/_lib/evidence.js'

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

test('draft quality blocks healthcare compliance claims outside healthcare context', () => {
  const educationLead = {
    company: 'Simon Fraser University Archives and Records Management',
    industry: 'Education',
    reason: 'Records digitization and information management workflows.',
    service_lane: 'forms_records_digitization',
  }
  const healthcareLead = {
    company: 'Harris Health System',
    industry: 'Healthcare',
    reason: 'Patient records and revenue cycle administrative support.',
    service_lane: 'non_clinical_support',
  }

  assert.equal(isHealthcareContext(educationLead), false)
  assert.equal(isHealthcareContext(healthcareLead), true)

  const blocked = scanDraftQualityForLead(
    educationLead,
    'Records processing pilot',
    'CapSigma can support records workflows with HIPAA-aligned controls.',
  )
  assert.equal(blocked.ok, false)
  assert.match(blocked.issues.join(' '), /HIPAA outside/)

  const allowed = scanDraftQualityForLead(
    healthcareLead,
    'Revenue cycle support pilot',
    'CapSigma can support patient records workflows with HIPAA-aligned controls.',
  )
  assert.equal(allowed.ok, true)
})

test('reply classifier flags positive replies for human attention', () => {
  const reply = classifyReply({
    subject: 'Re: CapSigma pilot',
    body: 'This looks interesting. Can we book a call next week?',
  })

  assert.equal(reply.classification, 'positive')
  assert.equal(reply.needsHuman, true)
})

test('encrypts and decrypts mailbox secrets', async () => {
  const encrypted = await encryptSecret('refresh-token-value', 'local-test-secret')
  assert.notEqual(encrypted, 'refresh-token-value')
  assert.equal(await decryptSecret(encrypted, 'local-test-secret'), 'refresh-token-value')
})

test('parses Gmail sender headers into reply records', () => {
  assert.deepEqual(parseEmailAddress('"Jane Doe" <jane@example.com>'), {
    name: 'Jane Doe',
    email: 'jane@example.com',
  })

  const reply = messageToReply({
    id: 'gmail_msg_1',
    threadId: 'thread_1',
    snippet: 'This looks interesting. Can we book time?',
    payload: {
      headers: [
        { name: 'From', value: '"Jane Doe" <jane@example.com>' },
        { name: 'Subject', value: 'Re: CapSigma pilot' },
        { name: 'Date', value: 'Fri, 12 Jun 2026 10:00:00 -0400' },
      ],
    },
  })

  assert.equal(reply.provider, 'gmail')
  assert.equal(reply.messageId, 'gmail_msg_1')
  assert.equal(reply.fromEmail, 'jane@example.com')
  assert.equal(reply.subject, 'Re: CapSigma pilot')
})

test('demo purge plan targets explicit test data and preserves real prospects', () => {
  const plan = buildPurgePlan({
    leads: [
      {
        id: 'lead_capsigma-internal-smoke-2026',
        company: 'CapSigma Internal Smoke 2026',
        email: 'fejiro.efiuvwere+smoke@example.com',
        source: 'production smoke test',
      },
      {
        id: 'lead_harris-health',
        company: 'Harris Health System',
        email: 'victoria.nikitin@harrishealth.org',
        source: 'public web research',
      },
    ],
    drafts: [
      { id: 'draft_demo', lead_id: 'lead_capsigma-internal-smoke-2026' },
      { id: 'draft_real', lead_id: 'lead_harris-health' },
    ],
    sends: [
      { id: 'send_demo', lead_id: 'lead_capsigma-internal-smoke-2026', subject: 'Internal production delivery test' },
      { id: 'send_real', lead_id: 'lead_harris-health', subject: 'Revenue cycle support' },
    ],
    replies: [
      { id: 'reply_demo', lead_id: 'lead_capsigma-internal-smoke-2026', send_event_id: 'send_demo' },
      { id: 'reply_real', lead_id: 'lead_harris-health', send_event_id: 'send_real' },
    ],
    activities: [
      { id: 'act_demo', lead_id: 'lead_capsigma-internal-smoke-2026', label: 'Smoke proof' },
      { id: 'act_real', lead_id: 'lead_harris-health', label: 'Real prospect proof' },
    ],
  })

  assert.deepEqual(plan.leadIds, ['lead_capsigma-internal-smoke-2026'])
  assert.deepEqual(plan.draftIds, ['draft_demo'])
  assert.deepEqual(plan.sendIds, ['send_demo'])
  assert.deepEqual(plan.replyIds, ['reply_demo'])
  assert.deepEqual(plan.activityIds, ['act_demo'])
  assert.equal(plan.counts.leads, 1)
  assert.ok(plan.preservedConfig.includes('suppression list'))
})

test('demo purge requires exact destructive confirmation phrase', () => {
  assert.equal(assertPurgeConfirmation(PURGE_CONFIRMATION), true)
  assert.equal(assertPurgeConfirmation('purge capsigma demo data'), false)
  assert.equal(assertPurgeConfirmation('PURGE ALL DATA'), false)
})

test('campaign send windows normalize to safe HH:mm values', () => {
  assert.deepEqual(normalizeSendWindows(['08:00', '15:00', '25:00', '8am', '15:00']), ['08:00', '15:00'])
  assert.deepEqual(normalizeIntelligenceInput({ sendWindows: ['09:30'] }).sendWindows, ['09:30'])
})

test('schedule safety requires draft, valid email, qualified status, and configured window', () => {
  const safe = buildScheduleSafety({
    status: 'approved',
    email: 'buyer@example.com',
    draft_subject: 'CapSigma pilot',
    draft_body: 'Hello from CapSigma.',
  }, '08:00')
  assert.equal(safe.ok, true)

  const unsafe = buildScheduleSafety({
    status: 'new',
    email: '',
    draft_subject: '',
    draft_body: '',
  }, '8am')
  assert.equal(unsafe.ok, false)
  assert.equal(unsafe.checks.qualified, false)
  assert.equal(unsafe.checks.hasVerifiedFormatEmail, false)
  assert.equal(unsafe.checks.hasDraft, false)
  assert.equal(unsafe.checks.sendWindow, false)
})

test('next scheduled time rolls past elapsed send windows', () => {
  const afterEight = nextScheduledTime('08:00', new Date('2026-06-18T09:00:00-04:00'))
  assert.equal(afterEight.startsWith('2026-06-19'), true)
})

test('email domain verification separates format, domain match, and MX readiness', () => {
  assert.deepEqual(checkEmailDomain({
    email: 'ops@idt.example',
    sourceUrl: 'https://www.idt.example/about',
  }), {
    domain: 'idt.example',
    formatValid: true,
    domainMatch: true,
    mxCheckStatus: 'not_checked_provider_needed',
  })

  const unmatched = checkEmailDomain({
    email: 'ops@other.example',
    sourceUrl: 'https://idt.example/about',
  })
  assert.equal(unmatched.formatValid, true)
  assert.equal(unmatched.domainMatch, false)

  const invalid = checkEmailDomain({ email: 'not-an-email', sourceUrl: '' })
  assert.equal(invalid.formatValid, false)
  assert.equal(invalid.mxCheckStatus, 'missing_domain')
})

test('prospect search parameters normalize distance controls safely', () => {
  assert.deepEqual(normalizeSearchParameters({
    targetLocations: ['Houston, TX', ''],
    startingRadius: '50',
    radiusIncrement: '25',
    maxRadius: '100',
  }), {
    targetLocations: ['Houston, TX'],
    startingRadius: 50,
    radiusIncrement: 25,
    maxRadius: 100,
    nextRadius: 75,
  })

  assert.deepEqual(normalizeSearchParameters({
    targetLocations: '',
    startingRadius: '150',
    radiusIncrement: '50',
    maxRadius: '100',
  }), {
    targetLocations: ['Houston, TX'],
    startingRadius: 150,
    radiusIncrement: 50,
    maxRadius: 150,
    nextRadius: 150,
  })
})
