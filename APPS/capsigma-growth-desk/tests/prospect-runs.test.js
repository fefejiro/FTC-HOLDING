import test from 'node:test'
import assert from 'node:assert/strict'

import { cleanProspectEmail, strictTarget, validateTargetIndustry } from '../functions/api/prospect-runs.js'

test('oil and gas only creates a strict industry target', () => {
  const target = strictTarget('oil and gas only', 'oil and gas only')

  assert.equal(target.label, 'oil and gas')
})

test('strict oil and gas target accepts oilfield prospects', () => {
  const target = strictTarget('oil and gas only', 'oil and gas only')
  const errors = validateTargetIndustry({
    company: 'Prairie Midstream Services',
    industry: 'Oil and Gas',
    reason: 'Pipeline records, field-ticket processing, and back-office operations support.',
    researchSummary: 'Public contact page for oilfield services operations.',
  }, target)

  assert.deepEqual(errors, [])
})

test('strict oil and gas target rejects healthcare prospects', () => {
  const target = strictTarget('oil and gas only', 'oil and gas only')
  const errors = validateTargetIndustry({
    company: 'Regional Health Records',
    industry: 'Healthcare',
    reason: 'Medical records management and non-clinical administrative support.',
    researchSummary: 'Public contact page for records management.',
  }, target)

  assert.deepEqual(errors, ['Prospect does not match target industry: oil and gas'])
})

test('cleans not-available prospect email values for review import', () => {
  assert.equal(cleanProspectEmail('Not publicly available'), '')
  assert.equal(cleanProspectEmail('n/a'), '')
  assert.equal(cleanProspectEmail('ops@example.com'), 'ops@example.com')
})
