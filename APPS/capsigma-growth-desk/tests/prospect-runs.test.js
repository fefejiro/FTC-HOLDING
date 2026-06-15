import test from 'node:test'
import assert from 'node:assert/strict'

import {
  cleanProspectEmail,
  strictLocation,
  strictTarget,
  validateSourceQuality,
  validateTargetLocation,
  validateTargetIndustry,
} from '../functions/api/prospect-runs.js'

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

test('accounting query creates a strict target even when industries are stale', () => {
  const target = strictTarget(
    'find accounting and business services firms within 500 miles of 77077 with an annual revenue of $5M',
    'Healthcare, Real Estate, Logistics, Financial Services, Retail',
  )

  assert.equal(target.label, 'accounting and business services')
})

test('strict accounting target accepts accounting and business services prospects', () => {
  const target = strictTarget('accounting and business services firms', 'Healthcare, Real Estate')
  const errors = validateTargetIndustry({
    company: 'Gulf Coast CPA Advisors',
    industry: 'Accounting and Professional Services',
    reason: 'CPA firm with bookkeeping, payroll, tax, and outsourced finance operations.',
    researchSummary: 'Public services page lists accounting, payroll, and advisory support.',
  }, target)

  assert.deepEqual(errors, [])
})

test('strict accounting target rejects unrelated prospects', () => {
  const target = strictTarget('accounting and business services firms', 'Healthcare, Real Estate')
  const errors = validateTargetIndustry({
    company: 'Regional Health Records',
    industry: 'Healthcare',
    reason: 'Medical records management and non-clinical administrative support.',
    researchSummary: 'Public contact page for records management.',
  }, target)

  assert.deepEqual(errors, ['Prospect does not match target industry: accounting and business services'])
})

test('source quality rejects reference and directory pages', () => {
  assert.deepEqual(validateSourceQuality({ sourceUrl: 'https://en.wikipedia.org/wiki/Eide_Bailly_LLP' }), [
    'sourceUrl must be an official company page, not a reference, social, or directory page',
  ])
  assert.deepEqual(validateSourceQuality({ sourceUrl: 'https://www.linkedin.com/company/example' }), [
    'sourceUrl must be an official company page, not a reference, social, or directory page',
  ])
})

test('source quality accepts official company pages', () => {
  assert.deepEqual(validateSourceQuality({ sourceUrl: 'https://www.examplecpa.com/contact' }), [])
})

test('77077 query creates a Houston region location target', () => {
  const target = strictLocation('find accounting firms within 500 miles of 77077')

  assert.equal(target.label, 'Houston / Gulf Coast region')
})

test('strict Houston location target accepts regional prospects', () => {
  const target = strictLocation('within 500 miles of 77077')
  const errors = validateTargetLocation({
    company: 'Bayou City Accounting',
    industry: 'Accounting',
    reason: 'Houston accounting firm supporting finance operations and back-office workflow.',
    sourceUrl: 'https://www.examplecpa.com/houston',
    researchSummary: 'Official locations page lists Houston, TX office.',
  }, target)

  assert.deepEqual(errors, [])
})

test('strict Houston location target rejects generic national prospects', () => {
  const target = strictLocation('within 500 miles of 77077')
  const errors = validateTargetLocation({
    company: 'Northwest Accounting Group',
    industry: 'Accounting',
    reason: 'Large accounting firm with U.S. operations.',
    sourceUrl: 'https://www.examplecpa.com',
    researchSummary: 'Official website lists national services but no source-backed regional office evidence.',
  }, target)

  assert.deepEqual(errors, ['Prospect does not show source-backed location fit: Houston / Gulf Coast region'])
})

test('cleans not-available prospect email values for review import', () => {
  assert.equal(cleanProspectEmail('Not publicly available'), '')
  assert.equal(cleanProspectEmail('n/a'), '')
  assert.equal(cleanProspectEmail('ops@example.com'), 'ops@example.com')
})
