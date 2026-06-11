import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canSendLead,
  isPlaceholderEmail,
  normalizeLead,
  validateLead,
} from '../functions/_lib/validation.js'
import { buildCcRecipients, parseEmailList } from '../functions/api/send-email.js'

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

test('blocks placeholder emails from production send eligibility', () => {
  assert.equal(isPlaceholderEmail('firstname.lastname@company.com'), true)
  assert.equal(isPlaceholderEmail('name@yourdomain.com'), true)
  assert.equal(isPlaceholderEmail('person@company.com'), false)
})

test('requires approved draft inputs before send route can proceed', () => {
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
  const ccEmails = parseEmailList('fejiro.efiuvwere@gmail.com, sales@capsigma.com, fejiro.efiuvwere@gmail.com')

  assert.deepEqual(ccEmails, [
    'fejiro.efiuvwere@gmail.com',
    'sales@capsigma.com',
    'fejiro.efiuvwere@gmail.com',
  ])
  assert.deepEqual(buildCcRecipients(ccEmails, 'sales@capsigma.com'), [
    { email: 'fejiro.efiuvwere@gmail.com' },
  ])
  assert.deepEqual(buildCcRecipients(ccEmails, 'fejiro.efiuvwere@gmail.com'), [
    { email: 'sales@capsigma.com' },
  ])
})
