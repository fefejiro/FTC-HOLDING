import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tips = JSON.parse(fs.readFileSync(path.join(root, 'content', 'evergreen', 'tips.json'), 'utf8'))
const levels = ['beginner', 'builder', 'power-user', 'business']

test('evergreen library covers the full AI user spectrum', () => {
  assert.ok(tips.length >= 16)
  for (const level of levels) {
    assert.ok(tips.filter((tip) => tip.level === level).length >= 4, `Expected at least four ${level} tips`)
  }
})

test('every evergreen tip is practical and publication ready', () => {
  const ids = new Set()
  for (const tip of tips) {
    assert.ok(tip.id)
    assert.ok(!ids.has(tip.id), `Duplicate tip id: ${tip.id}`)
    ids.add(tip.id)
    assert.ok(levels.includes(tip.level))
    for (const field of ['category', 'title', 'hook', 'tip', 'why', 'prompt', 'question']) {
      assert.ok(String(tip[field] || '').trim(), `${tip.id} is missing ${field}`)
    }
    assert.equal(tip.steps.length, 4)
    assert.ok(tip.steps.every((step) => String(step).trim()))
    assert.ok(tip.hashtags.length >= 4 && tip.hashtags.length <= 7)
  }
})

test('evergreen library includes model evaluation and AI moat guidance', () => {
  assert.ok(tips.some((tip) => tip.category === 'AI models'))
  assert.ok(tips.filter((tip) => tip.category === 'AI MOAT').length >= 2)
})
