import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'career', 'outputs');
const ANSWERS_PATH = path.join(ROOT, 'career', 'form-answers.json');

function newestQuickApplyJson() {
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter((f) => f.startsWith('quick-apply-') && f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    return null;
  }

  return path.join(OUTPUT_DIR, files[files.length - 1]);
}

function sanitizeName(value) {
  return String(value || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function main() {
  const inputArg = process.argv[2];
  const maxArg = Number(process.argv[3] || 8);
  const max = Number.isFinite(maxArg) && maxArg > 0 ? Math.floor(maxArg) : 8;

  const quickApplyPath = inputArg
    ? (path.isAbsolute(inputArg) ? inputArg : path.join(ROOT, inputArg))
    : newestQuickApplyJson();

  if (!quickApplyPath || !fs.existsSync(quickApplyPath)) {
    console.error('Quick-apply JSON not found. Run career:batch first or pass a path.');
    process.exit(1);
  }

  if (!fs.existsSync(ANSWERS_PATH)) {
    console.error(`Form answers file not found: ${ANSWERS_PATH}`);
    process.exit(1);
  }

  const rows = JSON.parse(fs.readFileSync(quickApplyPath, 'utf8'));
  const cfg = JSON.parse(fs.readFileSync(ANSWERS_PATH, 'utf8'));
  const outDir = path.join(OUTPUT_DIR, 'form-packets');

  fs.mkdirSync(outDir, { recursive: true });

  const selected = rows.slice(0, max);
  const indexLines = [
    '# Form Packets Index',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '| Rank | Role | Company | Packet |',
    '|---:|---|---|---|',
  ];

  selected.forEach((job, idx) => {
    const slug = `${String(idx + 1).padStart(2, '0')}-${sanitizeName(job.company)}-${sanitizeName(job.title)}`;
    const outPath = path.join(outDir, `${slug}.md`);

    const qna = cfg.questionMappings.map((q) => {
      const ans = cfg.commonAnswers[q.answerKey] ?? '';
      return `- Q: ${q.question}\n  A: ${ans}`;
    }).join('\n');

    const text = [
      `# Application Packet: ${job.title}`,
      '',
      `Company: ${job.company}`,
      `Link: ${job.link || ''}`,
      `Location: ${job.location || ''}`,
      `Type: ${job.employmentType || ''}`,
      `Salary: ${job.salary || ''}`,
      `Score: ${job.score ?? ''}`,
      '',
      '## Quick Answers',
      qna,
      '',
      '## Contact Block',
      `- Name: Fejiro Efiuvwere`,
      `- Phone: 416 473 2732`,
      `- Email: fejiro.efiuvwere@gmail.com`,
      `- Website: https://unalabs.cloud/`,
      '',
      '## Tailored Notes',
      ...(job?.bullets?.summary || []).map((x) => `- ${x}`),
      ...(job?.bullets?.exp || []).map((x) => `- ${x}`),
      '',
      '## Recruiter Message Draft',
      '```text',
      job.outreach || '',
      '```',
      ''
    ].join('\n');

    fs.writeFileSync(outPath, text, 'utf8');
    indexLines.push(`| ${idx + 1} | ${job.title} | ${job.company} | ${path.relative(ROOT, outPath).replace(/\\/g, '/')} |`);
  });

  const indexPath = path.join(outDir, `index-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
  fs.writeFileSync(indexPath, indexLines.join('\n'), 'utf8');

  console.log('Form packets generated:');
  console.log(indexPath);
  console.log(`Packets: ${selected.length}`);
}

main();
