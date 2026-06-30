import { requireAuth } from '../_lib/auth.js'
import { addActivity, getDb, newId, nowIso } from '../_lib/db.js'
import { mapIntelligence, normalizeIntelligenceInput } from '../_lib/evidence.js'
import { json, methodNotAllowed, readJson } from '../_lib/json.js'

async function getActive(db) {
  const [version, settings] = await Promise.all([
    db.prepare('SELECT * FROM intelligence_versions WHERE active = 1 ORDER BY version_number DESC LIMIT 1').first(),
    db.prepare('SELECT * FROM campaign_settings WHERE id = ?').bind('active').first(),
  ])
  return mapIntelligence({ version, settings })
}

async function nextVersionNumber(db) {
  const row = await db.prepare('SELECT MAX(version_number) AS max_version FROM intelligence_versions').first()
  return Number(row?.max_version || 0) + 1
}

export async function onRequest({ request, env }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  if (request.method === 'GET') {
    return json({ intelligence: await getActive(db) })
  }

  if (request.method !== 'POST') return methodNotAllowed()

  const body = await readJson(request)
  if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 })

  const normalized = normalizeIntelligenceInput(body)
  const now = nowIso()
  const versionNumber = await nextVersionNumber(db)
  const versionId = newId('intel')

  await db.prepare('UPDATE intelligence_versions SET active = 0 WHERE active = 1').run()
  await db
    .prepare(
      `INSERT INTO intelligence_versions (
        id, version_number, active, positioning_json, services_json, industries_json,
        differentiators_json, parameters_json, send_windows_json, created_by, created_at
      ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      versionId,
      versionNumber,
      JSON.stringify(normalized.positioning),
      JSON.stringify(normalized.services),
      JSON.stringify(normalized.industries),
      JSON.stringify(normalized.differentiators),
      JSON.stringify(normalized.parameters),
      JSON.stringify(normalized.sendWindows),
      'operator',
      now,
    )
    .run()

  await db
    .prepare(
      `INSERT INTO campaign_settings (
        id, active_intelligence_version_id, target_country, target_locations_json,
        starting_radius, radius_increment, max_radius, max_leads_per_run,
        max_leads_per_day, max_emails_per_day, included_industries_json,
        excluded_industries_json, included_titles_json, excluded_titles_json,
        email_validation_minimum, fit_score_minimum, auto_draft_threshold,
        auto_schedule_threshold, automation_mode, send_windows_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        active_intelligence_version_id = excluded.active_intelligence_version_id,
        target_country = excluded.target_country,
        target_locations_json = excluded.target_locations_json,
        starting_radius = excluded.starting_radius,
        radius_increment = excluded.radius_increment,
        max_radius = excluded.max_radius,
        max_leads_per_run = excluded.max_leads_per_run,
        max_leads_per_day = excluded.max_leads_per_day,
        max_emails_per_day = excluded.max_emails_per_day,
        included_industries_json = excluded.included_industries_json,
        excluded_industries_json = excluded.excluded_industries_json,
        included_titles_json = excluded.included_titles_json,
        excluded_titles_json = excluded.excluded_titles_json,
        email_validation_minimum = excluded.email_validation_minimum,
        fit_score_minimum = excluded.fit_score_minimum,
        auto_draft_threshold = excluded.auto_draft_threshold,
        auto_schedule_threshold = excluded.auto_schedule_threshold,
        automation_mode = excluded.automation_mode,
        send_windows_json = excluded.send_windows_json,
        updated_at = excluded.updated_at`,
    )
    .bind(
      'active',
      versionId,
      normalized.parameters.targetCountry,
      JSON.stringify(normalized.parameters.targetLocations || []),
      normalized.parameters.startingRadius,
      normalized.parameters.radiusIncrement,
      normalized.parameters.maxRadius,
      normalized.parameters.maxLeadsPerRun,
      normalized.parameters.maxLeadsPerDay,
      normalized.parameters.maxEmailsPerDay,
      JSON.stringify(normalized.parameters.includedIndustries || []),
      JSON.stringify(normalized.parameters.excludedIndustries || []),
      JSON.stringify(normalized.parameters.includedTitles || []),
      JSON.stringify(normalized.parameters.excludedTitles || []),
      normalized.parameters.emailValidationMinimum,
      normalized.parameters.fitScoreMinimum,
      normalized.parameters.autoDraftThreshold,
      normalized.parameters.autoScheduleThreshold,
      normalized.parameters.automationMode,
      JSON.stringify(normalized.sendWindows),
      now,
    )
    .run()

  await addActivity(db, {
    type: 'intelligence_updated',
    label: `CapSigma intelligence version ${versionNumber} activated`,
    metadata: { versionId, sendWindows: normalized.sendWindows },
  })

  return json({ intelligence: await getActive(db) })
}
