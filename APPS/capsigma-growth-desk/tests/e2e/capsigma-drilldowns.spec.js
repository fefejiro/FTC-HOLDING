import { expect, test } from '@playwright/test'

const fixture = {
  leads: [
    {
      id: 'lead-horatio',
      company: 'Horatio',
      industry: 'Healthcare',
      fitScore: 65,
      reason: 'Referral records are handled across disconnected intake teams.',
      contactName: '',
      contactTitle: 'Sales Team',
      email: '',
      sourceUrl: 'https://horatio.example/source',
      source: 'public web research',
      serviceLane: 'forms_records_digitization',
      researchSummary: 'Healthcare back-office records support.',
      evidenceJson: JSON.stringify({
        sourceTitle: 'Horatio services',
        sourceQuote: 'Public page mentions healthcare support operations.',
        whyReachOut: 'Back-office record handling fit.',
      }),
      reviewStatus: 'Missing public email; review before outreach.',
      discoveryRunId: 'run-healthcare-latest',
      status: 'needs_review',
      draftSubject: '',
      draftBody: '',
      emailsDrafted: 0,
      emailsSent: 0,
      lastDraftedAt: '',
      lastSentAt: '',
      lastReplyAt: '',
      replyType: '',
      createdAt: '2026-06-16T13:59:00.000Z',
      updatedAt: '2026-06-16T13:59:00.000Z',
    },
    {
      id: 'lead-idt',
      company: 'Integrated Document Technologies',
      industry: 'Healthcare',
      fitScore: 88,
      reason: 'Document management services match CapSigma digitization.',
      contactName: 'Nora Fields',
      contactTitle: 'Operations Director',
      email: 'nora@idt.example',
      sourceUrl: 'https://idt.example/about',
      source: 'public web research',
      serviceLane: 'forms_records_digitization',
      researchSummary: 'Official site describes document workflow services.',
      evidenceJson: JSON.stringify({
        sourceTitle: 'IDT about',
        sourceQuote: 'Document workflow services for healthcare teams.',
      }),
      reviewStatus: '',
      discoveryRunId: 'run-healthcare-latest',
      status: 'qualified',
      draftSubject: '',
      draftBody: '',
      emailsDrafted: 0,
      emailsSent: 0,
      lastDraftedAt: '',
      lastSentAt: '',
      lastReplyAt: '',
      replyType: '',
      createdAt: '2026-06-16T14:02:00.000Z',
      updatedAt: '2026-06-16T14:02:00.000Z',
    },
    {
      id: 'lead-computyne',
      company: 'Computyne',
      industry: 'Healthcare',
      fitScore: 82,
      reason: 'Data processing and compliance operations fit.',
      contactName: 'Ada Stone',
      contactTitle: 'VP Operations',
      email: 'ada@computyne.example',
      sourceUrl: 'https://computyne.example/services',
      source: 'manual research',
      serviceLane: 'data_cleanup',
      researchSummary: 'Public services page lists data operations.',
      evidenceJson: JSON.stringify({
        sourceTitle: 'Computyne services',
        sourceQuote: 'Data operations support for regulated teams.',
      }),
      reviewStatus: '',
      discoveryRunId: 'run-older',
      status: 'approved',
      draftSubject: 'Back-office records support',
      draftBody: 'Hello Ada, CapSigma can help with data processing.',
      emailsDrafted: 1,
      emailsSent: 0,
      lastDraftedAt: '2026-06-16T15:00:00.000Z',
      lastSentAt: '',
      lastReplyAt: '',
      replyType: '',
      createdAt: '2026-06-15T14:02:00.000Z',
      updatedAt: '2026-06-16T15:00:00.000Z',
    },
    {
      id: 'lead-suppressed',
      company: 'Suppressed Health',
      industry: 'Healthcare',
      fitScore: 55,
      reason: 'Suppressed manual test account.',
      contactName: 'Sam Suppressed',
      contactTitle: 'Director',
      email: 'sam@suppressed.example',
      sourceUrl: 'https://suppressed.example',
      source: 'manual import',
      serviceLane: '',
      researchSummary: '',
      evidenceJson: '{}',
      reviewStatus: '',
      discoveryRunId: 'run-older',
      status: 'do_not_contact',
      draftSubject: '',
      draftBody: '',
      emailsDrafted: 0,
      emailsSent: 0,
      lastDraftedAt: '',
      lastSentAt: '',
      lastReplyAt: '',
      replyType: '',
      createdAt: '2026-06-14T14:02:00.000Z',
      updatedAt: '2026-06-14T14:02:00.000Z',
    },
    {
      id: 'lead-low',
      company: 'Low Fit Logistics',
      industry: 'Logistics',
      fitScore: 45,
      reason: 'No clear CapSigma fit yet.',
      contactName: '',
      contactTitle: '',
      email: '',
      sourceUrl: '',
      source: '',
      serviceLane: '',
      researchSummary: '',
      evidenceJson: '{}',
      reviewStatus: '',
      discoveryRunId: '',
      status: 'new',
      draftSubject: '',
      draftBody: '',
      emailsDrafted: 0,
      emailsSent: 0,
      lastDraftedAt: '',
      lastSentAt: '',
      lastReplyAt: '',
      replyType: '',
      createdAt: '2026-06-13T14:02:00.000Z',
      updatedAt: '2026-06-13T14:02:00.000Z',
    },
  ],
  sends: [
    {
      id: 'send-sandbox',
      leadId: 'lead-idt',
      toEmail: 'nora@idt.example',
      intendedRecipient: 'nora@idt.example',
      actualRecipient: 'fejiro.efiuvwere@gmail.com',
      subject: 'Document operations support',
      body: 'Sandbox proof body.',
      status: 'sandbox_sent',
      provider: 'sendgrid',
      providerMessageId: 'sg-sandbox',
      sandbox: true,
      error: '',
      createdAt: '2026-06-16T16:00:00.000Z',
      company: 'Integrated Document Technologies',
      industry: 'Healthcare',
      fitScore: 88,
      reason: 'Document management services match CapSigma digitization.',
      contactName: 'Nora Fields',
      contactTitle: 'Operations Director',
      sourceUrl: 'https://idt.example/about',
      source: 'public web research',
    },
    {
      id: 'send-live',
      leadId: 'lead-computyne',
      toEmail: 'ada@computyne.example',
      intendedRecipient: 'ada@computyne.example',
      actualRecipient: 'ada@computyne.example',
      subject: 'Data operations support',
      body: 'Live proof body.',
      status: 'live_sent',
      provider: 'sendgrid',
      providerMessageId: 'sg-live',
      sandbox: false,
      error: '',
      createdAt: '2026-06-16T17:00:00.000Z',
      company: 'Computyne',
      industry: 'Healthcare',
      fitScore: 82,
      reason: 'Data processing and compliance operations fit.',
      contactName: 'Ada Stone',
      contactTitle: 'VP Operations',
      sourceUrl: 'https://computyne.example/services',
      source: 'manual research',
    },
    {
      id: 'send-failed',
      leadId: 'lead-suppressed',
      toEmail: 'sam@suppressed.example',
      intendedRecipient: 'sam@suppressed.example',
      actualRecipient: 'sam@suppressed.example',
      subject: 'Failed proof',
      body: 'Failed proof body.',
      status: 'failed',
      provider: 'sendgrid',
      providerMessageId: '',
      sandbox: false,
      error: 'Provider rejected the message.',
      createdAt: '2026-06-16T18:00:00.000Z',
      company: 'Suppressed Health',
      industry: 'Healthcare',
      fitScore: 55,
      reason: 'Suppressed manual test account.',
      contactName: 'Sam Suppressed',
      contactTitle: 'Director',
      sourceUrl: 'https://suppressed.example',
      source: 'manual import',
    },
  ],
  replies: [
    {
      id: 'reply-positive',
      leadId: 'lead-horatio',
      sendEventId: 'send-sandbox',
      provider: 'gmail',
      messageId: 'msg-positive',
      threadId: 'thread-positive',
      fromEmail: 'buyer@horatio.example',
      fromName: 'Buyer Horatio',
      subject: 'Interested',
      body: 'Yes, this is interesting. Send details.',
      classification: 'positive_human',
      needsHuman: true,
      receivedAt: '2026-06-16T19:00:00.000Z',
      createdAt: '2026-06-16T19:00:00.000Z',
      company: 'Horatio',
      contactName: '',
      contactTitle: 'Sales Team',
      sourceUrl: 'https://horatio.example/source',
    },
    {
      id: 'reply-auto',
      leadId: 'lead-idt',
      provider: 'gmail',
      fromEmail: 'auto@idt.example',
      fromName: 'Auto Responder',
      subject: 'Automatic reply',
      body: 'We received your email.',
      classification: 'auto_reply',
      needsHuman: false,
      receivedAt: '2026-06-16T19:10:00.000Z',
      createdAt: '2026-06-16T19:10:00.000Z',
      company: 'Integrated Document Technologies',
      sourceUrl: 'https://idt.example/about',
    },
    {
      id: 'reply-ooo',
      leadId: 'lead-computyne',
      provider: 'gmail',
      fromEmail: 'ooo@computyne.example',
      fromName: 'OOO',
      subject: 'Out of office',
      body: 'I am out of office.',
      classification: 'out_of_office',
      needsHuman: false,
      receivedAt: '2026-06-16T19:20:00.000Z',
      createdAt: '2026-06-16T19:20:00.000Z',
      company: 'Computyne',
      sourceUrl: 'https://computyne.example/services',
    },
    {
      id: 'reply-bounce',
      leadId: 'lead-suppressed',
      provider: 'gmail',
      fromEmail: 'mailer-daemon@example.com',
      fromName: 'Mailer Daemon',
      subject: 'Delivery failed',
      body: 'Message bounced.',
      classification: 'bounce',
      needsHuman: false,
      receivedAt: '2026-06-16T19:30:00.000Z',
      createdAt: '2026-06-16T19:30:00.000Z',
      company: 'Suppressed Health',
      sourceUrl: 'https://suppressed.example',
    },
  ],
  scheduledSends: [
    {
      id: 'scheduled-existing',
      leadId: 'lead-computyne',
      contactEmail: 'ada@computyne.example',
      subject: 'Data operations support',
      body: 'Hello Ada, CapSigma can help with data processing.',
      status: 'scheduled',
      scheduledAt: '2026-06-18T19:00:00.000Z',
      sendWindowLabel: '15:00',
      approvalStatus: 'approved',
      confidence: 82,
      safetyChecks: { qualified: true, hasVerifiedFormatEmail: true, hasDraft: true, sendWindow: true },
      createdAt: '2026-06-18T01:00:00.000Z',
      updatedAt: '2026-06-18T01:00:00.000Z',
    },
  ],
  agentEvents: [
    {
      id: 'agent-event-backfill',
      runId: 'backfill_test',
      leadId: '',
      workerName: 'evidence_backfill',
      eventType: 'legacy_evidence_normalized',
      status: 'completed',
      input: { source: 'legacy leads' },
      output: { sourceRows: 1, emailRows: 1 },
      confidence: 100,
      error: '',
      createdAt: '2026-06-18T01:00:00.000Z',
    },
  ],
  reports: {
    summary: [
      { id: 'leads-discovered', label: 'Leads discovered', value: 5, metricId: 'total-leads' },
      { id: 'emails-scheduled', label: 'Emails scheduled', value: 1, metricId: 'emails-scheduled' },
      { id: 'human-replies', label: 'Human replies', value: 1, metricId: 'human-replies' },
      { id: 'missing-source', label: 'Missing source', value: 1, qualityFilter: 'missing_source', actionLabel: 'Open quality filter' },
    ],
    drilldowns: {},
    snapshots: [],
  },
  acceptance: {
    status: 'yellow',
    ready: false,
    checks: [
      { id: 'database', label: 'D1 database', ok: true, detail: 'CAPSIGMA_DB binding responded.' },
      { id: 'evidenceTables', label: 'Normalized evidence tables', ok: true, detail: '1 source rows, 1 email rows.' },
      { id: 'sendgridConfigured', label: 'SendGrid delivery', ok: false, detail: 'Preview-only until SendGrid is configured.' },
    ],
    lastRun: null,
  },
  prospectRuns: [
    {
      id: 'run-healthcare-latest',
      query: 'Find healthcare document operations companies',
      targetIndustries: 'Healthcare',
      status: 'completed',
      requestedLimit: 10,
      importedCount: 2,
      rejectedCount: 3,
      summary: 'Latest source-backed healthcare run.',
      createdAt: '2026-06-16T13:58:00.000Z',
      completedAt: '2026-06-16T13:59:00.000Z',
    },
    {
      id: 'run-older',
      query: 'Find older prospects',
      targetIndustries: 'Healthcare',
      status: 'completed',
      requestedLimit: 10,
      importedCount: 2,
      rejectedCount: 0,
      summary: 'Older run.',
      createdAt: '2026-06-15T13:58:00.000Z',
      completedAt: '2026-06-15T13:59:00.000Z',
    },
  ],
  activity: [
    {
      id: 'act-horatio',
      leadId: 'lead-horatio',
      type: 'prospect_run_completed',
      label: 'Horatio discovered by source-backed run',
      metadata: { runId: 'run-healthcare-latest' },
      createdAt: '2026-06-16T13:59:00.000Z',
    },
    {
      id: 'act-draft',
      leadId: 'lead-computyne',
      type: 'draft_created',
      label: 'Draft created for Computyne',
      metadata: {},
      createdAt: '2026-06-16T15:00:00.000Z',
    },
  ],
  purgePlan: {
    dryRun: true,
    confirmationPhrase: 'PURGE CAPSIGMA DEMO DATA',
    counts: {
      leads: 2,
      drafts: 2,
      sends: 3,
      replies: 1,
      activities: 2,
    },
    preservedConfig: [
      'CapSigma company intelligence',
      'campaign parameters',
      'sender settings',
      'approved templates',
      'suppression list',
      'system users',
    ],
    sampleLeadIds: ['lead_capsigma-internal-smoke', 'lead_capsigma-recipient-test'],
  },
  intelligence: {
    versionId: 'intel_default',
    versionNumber: 1,
    positioning: {
      short: 'Your data, our discipline.',
      valueProposition: 'CapSigma helps teams turn messy records into reliable workflows.',
      preferredCta: 'Explore a no-cost pilot',
    },
    services: ['Forms and Records Digitization', 'Data Cleansing and Enrichment'],
    industries: ['Healthcare', 'Energy'],
    differentiators: ['CapSigma Protocol', 'Transparent reporting'],
    parameters: {
      targetCountry: 'United States',
      targetLocations: ['Houston, TX'],
      startingRadius: 25,
      radiusIncrement: 25,
      maxRadius: 100,
      fitScoreMinimum: 60,
      autoDraftThreshold: 70,
      autoScheduleThreshold: 80,
      automationMode: 'review_required',
    },
    sendWindows: ['08:00', '15:00'],
  },
  evidence: {
    leadSources: [
      {
        id: 'source_lead-horatio',
        leadId: 'lead-horatio',
        sourceType: 'web_search',
        sourceName: 'public web research',
        sourceUrl: 'https://horatio.example/source',
        confidenceScore: 80,
        agentRunId: 'run-healthcare-latest',
      },
    ],
    emailEvidence: [
      {
        id: 'email_lead-idt',
        leadId: 'lead-idt',
        email: 'nora@idt.example',
        validationStatus: 'format_valid',
        validationConfidence: 70,
        discoveryMethod: 'source_record',
      },
    ],
  },
}

const expectedMetricCounts = {
  'total-leads': 5,
  'new-leads-this-run': 2,
  'leads-imported': 4,
  'leads-deduplicated': 0,
  'leads-rejected': 0,
  'leads-enriched': 4,
  'emails-found': 3,
  'emails-verified': 3,
  'qualified-leads': 2,
  'high-fit-leads': 2,
  'medium-fit-leads': 1,
  'low-fit-leads': 2,
  'drafts-generated': 1,
  'drafts-pending-review': 1,
  'drafts-approved': 1,
  'emails-scheduled': 1,
  'emails-sent': 2,
  bounces: 2,
  'auto-replies': 1,
  'out-of-office-replies': 1,
  'human-replies': 1,
  'positive-human-replies': 1,
  'needs-attention': 2,
  'suppressed-do-not-contact': 1,
}

async function expectLightSurface(locator) {
  const background = await locator.evaluate((element) => getComputedStyle(element).backgroundColor)
  const channels = background.match(/\d+/g)?.slice(0, 3).map(Number) || []
  expect(channels, `Expected an rgb/rgba background, got ${background}`).toHaveLength(3)
  const [red, green, blue] = channels
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
  expect(luminance, `Expected a light presentation surface, got ${background}`).toBeGreaterThan(175)
}

async function mockApis(page) {
  let purgeApplied = false
  let intelligence = fixture.intelligence
  let scheduledSends = [...fixture.scheduledSends]
  let replies = fixture.replies.map((reply) => ({ ...reply, lastAction: null }))
  let reports = { ...fixture.reports, snapshots: [] }
  let acceptance = fixture.acceptance
  await page.route('**/api/session', (route) =>
    route.fulfill({
      json: {
        authenticated: true,
        configured: {
          database: true,
          openai: true,
          sendgrid: true,
          gmail: true,
          gmailConnected: true,
          gmailEmail: 'fejiro.efiuvwere@gmail.com',
          fromEmail: 'fejiro.efiuvwere@gmail.com',
          replyToEmail: 'fejiro.efiuvwere@gmail.com',
          ccEmails: ['fejiro.efiuvwere@gmail.com'],
          sandboxMode: true,
          recipientOverride: 'fejiro.efiuvwere@gmail.com',
        },
      },
    }),
  )
  await page.route('**/api/leads', (route) => route.fulfill({ json: { leads: fixture.leads } }))
  await page.route('**/api/activity', (route) => route.fulfill({ json: { activity: fixture.activity } }))
  await page.route('**/api/prospect-runs', async (route) => {
    if (route.request().method() === 'POST') {
      const body = await route.request().postDataJSON()
      const params = body.searchParameters || {}
      if (
        params.startingRadius !== 75 ||
        params.radiusIncrement !== 50 ||
        params.maxRadius !== 250 ||
        !params.targetLocations?.includes('Dallas, TX')
      ) {
        return route.fulfill({ status: 400, json: { error: `Unexpected search parameters: ${JSON.stringify(params)}` } })
      }
      return route.fulfill({
        json: {
          runId: 'prospect_run_radius_test',
          imported: [],
          rejected: [],
          summary: 'Radius-aware run accepted.',
          searchParameters: params,
        },
      })
    }
    return route.fulfill({ json: { runs: fixture.prospectRuns } })
  })
  await page.route('**/api/replies', (route) => route.fulfill({ json: { replies } }))
  await page.route('**/api/replies/*', async (route) => {
    const id = route.request().url().split('/').pop()
    const body = await route.request().postDataJSON()
    replies = replies.map((reply) =>
      reply.id === id
        ? { ...reply, needsHuman: body.action === 'handled' || body.action === 'archive' ? false : reply.needsHuman, lastAction: { action: body.action, status: body.action === 'archive' ? 'archived' : 'completed' } }
        : reply,
    )
    const reply = replies.find((item) => item.id === id)
    return route.fulfill({ json: { ok: true, actionId: 'reply_action_test', reply } })
  })
  await page.route('**/api/mailbox/gmail/status', (route) =>
    route.fulfill({ json: { configured: true, connected: true, email: 'fejiro.efiuvwere@gmail.com', lastSyncAt: '2026-06-16T20:00:00.000Z' } }),
  )
  await page.route('**/api/sends', (route) => route.fulfill({ json: { sends: fixture.sends } }))
  await page.route('**/api/evidence', (route) => route.fulfill({ json: fixture.evidence }))
  await page.route('**/api/intelligence', async (route) => {
    if (route.request().method() === 'POST') {
      const body = await route.request().postDataJSON()
      intelligence = { ...body, versionId: 'intel_updated', versionNumber: 2, createdAt: '2026-06-18T01:20:00.000Z' }
      return route.fulfill({ json: { intelligence } })
    }
    return route.fulfill({ json: { intelligence } })
  })
  await page.route('**/api/schedule', async (route) => {
    if (route.request().method() === 'POST') {
      const body = await route.request().postDataJSON()
      if (body.due) {
        scheduledSends = scheduledSends.map((send) => ({ ...send, status: 'preview_ready' }))
        return route.fulfill({ json: { processed: scheduledSends.map((send) => ({ id: send.id, status: 'preview_ready' })) } })
      }
      const lead = fixture.leads.find((item) => item.id === body.leadId)
      const scheduledSend = {
        id: 'scheduled_send_test',
        leadId: body.leadId,
        contactEmail: lead.email,
        subject: lead.draftSubject,
        body: lead.draftBody,
        status: 'scheduled',
        scheduledAt: '2026-06-18T19:00:00.000Z',
        sendWindowLabel: body.windowTime,
        approvalStatus: 'approved',
        confidence: lead.fitScore,
        safetyChecks: { qualified: true, hasVerifiedFormatEmail: true, hasDraft: true, sendWindow: true },
        createdAt: '2026-06-18T01:20:00.000Z',
        updatedAt: '2026-06-18T01:20:00.000Z',
      }
      scheduledSends = [scheduledSend, ...scheduledSends]
      return route.fulfill({ json: { scheduledSend } })
    }
    return route.fulfill({ json: { scheduledSends, sendWindows: intelligence.sendWindows } })
  })
  await page.route('**/api/agent-events', (route) => route.fulfill({ json: { events: fixture.agentEvents } }))
  await page.route('**/api/reports', async (route) => {
    if (route.request().method() === 'POST') {
      const snapshot = { id: 'report_snapshot_test', reportType: 'agent_trust', title: 'CapSigma Agent Trust Report', createdAt: '2026-06-18T01:30:00.000Z' }
      reports = { ...reports, snapshots: [snapshot] }
      return route.fulfill({ json: { snapshot } })
    }
    return route.fulfill({ json: reports })
  })
  await page.route('**/api/acceptance', async (route) => {
    if (route.request().method() === 'POST') {
      acceptance = { ...fixture.acceptance, lastRun: { id: 'acceptance_test', status: 'yellow', createdAt: '2026-06-18T01:40:00.000Z' } }
      return route.fulfill({ json: acceptance })
    }
    return route.fulfill({ json: acceptance })
  })
  await page.route('**/api/admin/backfill-evidence', async (route) =>
    route.fulfill({ json: { runId: 'backfill_test', leadsScanned: 5, sourceRows: 1, emailRows: 1 } }),
  )
  await page.route('**/api/admin/purge-demo-data', async (route) => {
    if (route.request().method() === 'POST') {
      purgeApplied = true
      return route.fulfill({
        json: {
          ok: true,
          purgedAt: '2026-06-18T01:00:00.000Z',
          counts: fixture.purgePlan.counts,
          preservedConfig: fixture.purgePlan.preservedConfig,
          preservedConfigSnapshotId: 'preserved_config_snapshot_test',
        },
      })
    }
    return route.fulfill({
      json: purgeApplied
        ? { ...fixture.purgePlan, counts: { leads: 0, drafts: 0, sends: 0, replies: 0, activities: 0 }, sampleLeadIds: [] }
        : fixture.purgePlan,
    })
  })
}

test.beforeEach(async ({ page }) => {
  await mockApis(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Autonomous Sales Agent Control Room' })).toBeVisible()
})

test('command center presentation surfaces stay light', async ({ page }) => {
  await expectLightSurface(page.getByRole('button', { name: /^Run Agent$/ }))
  await expectLightSurface(page.getByRole('button', { name: /Drafts pending review/ }))
  await expectLightSurface(page.getByRole('button', { name: /Human replies/ }).first())
  await expectLightSurface(page.getByRole('button', { name: /Bounces \/ failed sends/ }))

  for (const metricId of ['total-leads', 'emails-found', 'emails-verified', 'qualified-leads']) {
    await expectLightSurface(page.getByTestId(`funnel-step-${metricId}`))
  }
})

test('command center funnel steps drill into matching records', async ({ page }) => {
  for (const metricId of ['total-leads', 'emails-found', 'emails-verified', 'qualified-leads', 'drafts-approved', 'emails-sent', 'human-replies']) {
    const expectedCount = expectedMetricCounts[metricId]
    const step = page.getByTestId(`funnel-step-${metricId}`)
    await expect(step).toContainText(String(expectedCount))
    await step.click()
    await expect(page.getByTestId('metric-drilldown')).toBeVisible()
    await expect(page.getByTestId('metric-drilldown-count')).toHaveText(String(expectedCount))
    await expect(page.getByTestId('metric-drilldown-row')).toHaveCount(expectedCount)
    await page.getByRole('button', { name: 'Collapse' }).click()
    await expect(page.getByTestId('metric-drilldown')).toHaveCount(0)
  }
  await expect(page.getByTestId('funnel-step-leads-enriched')).toHaveCount(0)
})

test('lead metric search filters records without changing the source count', async ({ page }) => {
  await page.getByTestId('funnel-step-total-leads').click()
  await expect(page.getByTestId('metric-drilldown-count')).toHaveText('5')
  await page.getByLabel('Search drilldown records').fill('Computyne')
  await expect(page.getByTestId('metric-drilldown-row')).toHaveCount(1)
  await expect(page.getByTestId('metric-drilldown')).toContainText('Computyne')
})

test('client-facing header hides personal mailbox details while settings masks integrations', async ({ page }) => {
  await expect(page.getByText('fejiro.efiuvwere@gmail.com')).toHaveCount(0)
  await expect(page.getByText('System healthy')).toBeVisible()

  await page.getByRole('button', { name: 'Settings Integrations' }).click()
  await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible()
  await expect(page.getByText('fe***@gmail.com').first()).toBeVisible()
  await expect(page.getByText('hello@capsigma.com after client approval and SendGrid verification')).toBeVisible()
})

test('pipeline data-quality badges can filter risky leads', async ({ page }) => {
  await expect(page.getByText('Showing 5 of 5 leads')).toBeVisible()

  await page.getByLabel('Filter by data quality').selectOption('missing_email')
  await expect(page.getByText('Showing 2 of 5 leads')).toBeVisible()
  await expect(page.getByTestId('pipeline-row')).toHaveCount(2)
  await expect(page.getByText('Horatio')).toBeVisible()
  await expect(page.getByText('Low Fit Logistics')).toBeVisible()

  await page.getByLabel('Filter by data quality').selectOption('missing_source')
  await expect(page.getByText('Showing 1 of 5 leads')).toBeVisible()
  await expect(page.getByText('Low Fit Logistics')).toBeVisible()
})

test('leads workspace supports table filters, columns, row selection, and detail drawer', async ({ page }) => {
  await page.getByRole('button', { name: 'Leads Workspace' }).click()
  await expect(page.getByTestId('leads-workspace-table')).toBeVisible()
  await expect(page.getByText('Showing 5 of 5 leads')).toBeVisible()

  await page.getByLabel('Search leads workspace').fill('Computyne')
  await expect(page.getByTestId('leads-workspace-row')).toHaveCount(1)
  await expect(page.getByTestId('leads-workspace-row')).toContainText('Computyne')

  await page.getByRole('button', { name: 'Columns' }).click()
  await page.getByLabel('Title').uncheck()
  await expect(page.getByRole('columnheader', { name: 'Title' })).toHaveCount(0)

  await page.getByLabel('Select Computyne').check()
  await expect(page.getByRole('button', { name: /Selected: 1/ })).toBeVisible()

  await page.getByTestId('leads-workspace-row').click()
  await expect(page.getByTestId('lead-detail-drawer')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Computyne' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Email Trust' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Timeline' })).toBeVisible()
})

test('drilldown rows open the lead trust ledger', async ({ page }) => {
  await page.getByTestId('funnel-step-total-leads').click()
  await page.getByRole('button', { name: 'Horatio' }).click()
  await expect(page.getByTestId('lead-detail-drawer')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Horatio' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Evidence' })).toBeVisible()
  await expect(page.getByText('Missing public email; review before outreach.').first()).toBeVisible()
})

test('handover purge requires exact confirmation and shows proof', async ({ page }) => {
  await page.getByRole('button', { name: 'Admin QA and handoff' }).click()
  await expect(page.getByRole('button', { name: 'Admin QA and handoff' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Admin-only handover reset')).toBeVisible()
  await expect(page.getByText('Activity logs')).toBeVisible()
  await expect(page.getByText('suppression list')).toBeVisible()
  await expect(page.getByText('lead_capsigma-internal-smoke')).toBeVisible()

  const purgeButton = page.getByRole('button', { name: 'Purge demo data' })
  await expect(purgeButton).toBeDisabled()
  await page.getByLabel('Type PURGE CAPSIGMA DEMO DATA to confirm').fill('purge capsigma demo data')
  await expect(purgeButton).toBeDisabled()
  await page.getByLabel('Type PURGE CAPSIGMA DEMO DATA to confirm').fill('PURGE CAPSIGMA DEMO DATA')
  await expect(purgeButton).toBeEnabled()
  await purgeButton.click()

  await expect(page.getByText('Last purge completed')).toBeVisible()
  await expect(page.getByText('preserved_config_snapshot_test')).toBeVisible()
})

test('intelligence editor saves send windows as a new version', async ({ page }) => {
  await page.getByRole('button', { name: 'Intelligence' }).click()
  await expect(page.getByText('Active version: 1')).toBeVisible()
  await page.getByLabel('Send windows, one HH:mm time per line').fill('08:00\n15:00\n16:30')
  await page.getByRole('button', { name: 'Save new intelligence version' }).click()
  await expect(page.getByText('CapSigma intelligence version 2 activated.')).toBeVisible()
  await expect(page.getByText('Active version: 2')).toBeVisible()
})

test('lead discovery distance parameters are editable, saved, and sent to prospect runs', async ({ page }) => {
  await page.getByRole('button', { name: 'Leads Workspace' }).click()
  await page.getByLabel('Target locations').fill('Dallas, TX')
  await page.getByLabel('Start radius miles').fill('75')
  await page.getByLabel('Radius step miles').fill('50')
  await page.getByLabel('Max radius miles').fill('250')
  await expect(page.getByText('Starts at 75 mi, expands by 50 mi, max 250 mi.')).toBeVisible()

  await page.getByRole('button', { name: 'Save parameters' }).click()
  await expect(page.getByText('Campaign distance parameters saved.')).toBeVisible()

  await page.getByRole('button', { name: 'Find prospects' }).click()
  await expect(page.getByText('Prospect run imported 0 prospect(s). Rejected 0. Radius used: 75 mi.')).toBeVisible()
})

test('approved draft can be scheduled into chosen send window', async ({ page }) => {
  await page.getByRole('button', { name: 'Command Center Agent overview' }).click()
  await page.getByTestId('pipeline-row').filter({ hasText: 'Computyne' }).click()
  await expect(page.getByRole('heading', { name: 'Schedule into send queue' })).toBeVisible()
  await page.getByLabel('Send window').selectOption('15:00')
  await page.getByRole('button', { name: 'Schedule approved draft' }).click()
  await expect(page.getByText('Computyne scheduled for 15:00.')).toBeVisible()
  await page.getByRole('button', { name: 'Queue' }).click()
  await expect(page.getByText('Scheduled send queue')).toBeVisible()
  await expect(page.getByTestId('scheduled-send-row')).toHaveCount(2)
  await expect(page.getByTestId('scheduled-send-row').filter({ hasText: 'Back-office records support' })).toContainText('ada@computyne.example')
  await expect(page.getByTestId('scheduled-send-row').filter({ hasText: 'Back-office records support' })).toContainText('15:00')
})

test('scheduled send queue can process due sends without losing proof status', async ({ page }) => {
  await page.getByRole('button', { name: 'Queue' }).click()
  await expect(page.getByTestId('scheduled-send-row')).toContainText('scheduled')
  await page.getByRole('button', { name: 'Process due sends' }).click()
  await expect(page.getByText('Processed 1 due scheduled send(s).')).toBeVisible()
  await expect(page.getByTestId('scheduled-send-row')).toContainText('preview_ready')
})

test('reply workflow filters and records operator actions', async ({ page }) => {
  await page.getByRole('button', { name: 'Replies Human response desk' }).click()
  await expect(page.getByLabel('Filter replies')).toHaveValue('needs_human')
  await expect(page.getByText('Showing 1 of 4')).toBeVisible()
  await page.getByRole('button', { name: 'Mark handled' }).click()
  await expect(page.getByText('Reply positive_human saved.')).toBeVisible()
  await page.getByLabel('Filter replies').selectOption('handled')
  await expect(page.getByText('Showing 4 of 4')).toBeVisible()
  await expect(page.getByText('Last action: handled', { exact: false })).toBeVisible()
})

test('reports are clickable and can save snapshots', async ({ page }) => {
  await page.getByRole('button', { name: 'Reports' }).click()
  await expect(page.getByText('Clickable operator reports')).toBeVisible()
  await page.getByTestId('report-card-emails-scheduled').click()
  await expect(page.getByTestId('metric-drilldown-count')).toHaveText('1')

  await page.getByRole('button', { name: 'Reports' }).click()
  await page.getByTestId('report-card-missing-source').click()
  await expect(page.getByRole('button', { name: 'Command Center Agent overview' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Showing 1 of 5 leads')).toBeVisible()

  await page.getByRole('button', { name: 'Reports' }).click()
  await page.getByRole('button', { name: 'Save report snapshot' }).click()
  await expect(page.getByText('Report snapshot saved: report_snapshot_test.')).toBeVisible()
  await expect(page.getByText('report_snapshot_test', { exact: true })).toBeVisible()
})

test('handover backfills normalized evidence and agent run logs are visible', async ({ page }) => {
  await page.getByRole('button', { name: 'Admin QA and handoff' }).click()
  await page.getByRole('button', { name: 'Backfill legacy evidence' }).click()
  await expect(page.getByText('Backfilled 1 source row(s) and 1 email evidence row(s) across 5 lead(s).')).toBeVisible()

  await page.getByRole('button', { name: 'Agent Runs' }).click()
  await expect(page.getByText('Agent run step logs')).toBeVisible()
  await expect(page.getByTestId('agent-event-row')).toContainText('evidence_backfill')
})

test('acceptance pass records yellow and green readiness checks', async ({ page }) => {
  await page.getByRole('button', { name: 'Admin QA and handoff' }).click()
  await expect(page.getByText('Production acceptance pass')).toBeVisible()
  await expect(page.getByText('D1 database')).toBeVisible()
  await expect(page.getByText('SendGrid delivery')).toBeVisible()
  await page.getByRole('button', { name: 'Record acceptance pass' }).click()
  await expect(page.getByText('Acceptance snapshot saved with remaining yellow items.')).toBeVisible()
  await expect(page.getByText('Last recorded:')).toBeVisible()
})
