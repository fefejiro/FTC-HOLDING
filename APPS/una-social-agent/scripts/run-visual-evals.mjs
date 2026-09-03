import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildStoryFacts,
  createVisualBrief,
  evaluateImageRelevance,
  improveBriefFromEvaluation,
} from './visuals/news-visual-pipeline.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const casesPath = path.join(root, 'evals', 'visual_cases.jsonl')
const outDir = path.join(root, 'evals', 'results')

function readArg(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : ''
}

const limit = Number(readArg('--limit') || 0)
const raw = await fs.readFile(casesPath, 'utf8')
const cases = raw
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .slice(0, limit || undefined)

const results = []
for (const [index, item] of cases.entries()) {
  const entry = {
    region: item.region,
    story: {
      sourceName: item.sourceName,
      title: item.title,
      url: item.url,
      summary: item.summary,
      publishedAt: item.publishedAt,
      topics: item.topics,
    },
  }
  const facts = buildStoryFacts(entry, index)
  let brief = createVisualBrief(facts)
  let evaluation = evaluateImageRelevance(facts, brief)
  let attempts = 1
  const retryLog = []
  while (evaluation.decision === 'retry' && attempts < 3) {
    retryLog.push({ attempt: attempts, evaluation })
    brief = improveBriefFromEvaluation(brief, evaluation)
    attempts += 1
    evaluation = evaluateImageRelevance(facts, brief)
  }
  results.push({
    id: facts.story_id,
    region: facts.region,
    headline: facts.headline,
    primary_subject: facts.primary_subject,
    environment: facts.physical_environment,
    attempts,
    decision: evaluation.decision,
    overall_score: evaluation.overall_score,
    story_alignment: evaluation.story_alignment,
    technology_specificity: evaluation.technology_specificity,
    generic_stock_risk: evaluation.generic_stock_risk,
    stereotype_risk: evaluation.stereotype_risk,
    retryLog,
  })
}

const failed = results.filter((result) => result.decision !== 'accept')
await fs.mkdir(outDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const outPath = path.join(outDir, `visual-results-${stamp}.json`)
await fs.writeFile(
  outPath,
  `${JSON.stringify(
    {
      status: failed.length ? 'failed' : 'passed',
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      results,
    },
    null,
    2,
  )}\n`,
  'utf8',
)

console.log(
  JSON.stringify(
    {
      status: failed.length ? 'failed' : 'passed',
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      report: path.relative(root, outPath),
    },
    null,
    2,
  ),
)

if (failed.length) process.exitCode = 1
