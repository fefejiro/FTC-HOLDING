export function getDb(env) {
  return env.CAPSIGMA_DB || null
}

export function nowIso() {
  return new Date().toISOString()
}

export function newId(prefix = 'id') {
  const value =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}_${value}`
}

export async function addActivity(db, { leadId = '', type, label, metadata = {} }) {
  const id = newId('act')
  const createdAt = nowIso()
  await db
    .prepare(
      `INSERT INTO activities (id, lead_id, type, label, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, leadId, type, label, JSON.stringify(metadata), createdAt)
    .run()

  return { id, lead_id: leadId, type, label, metadata, created_at: createdAt }
}

export async function getLead(db, id) {
  return db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first()
}
