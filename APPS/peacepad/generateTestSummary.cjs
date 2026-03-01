const fs = require('fs-extra');
const path = require('path');
const ExcelJS = require('exceljs');

const TEST_RESULTS_DIR = path.join(__dirname, 'test-results');
const OUTPUT_FILE = path.join(__dirname, 'peacepad-test-summary.xlsx');

const PRIORITY_RULES = {
  P1: ['login', 'consent', 'messaging', 'onboarding'],
  P2: ['calendar', 'sidebar', 'notifications', 'settings'],
  P3: ['responsive', 'layout', 'performance', 'minor'],
};

function classifyPriority(testTitle) {
  const lower = testTitle.toLowerCase();
  for (const p in PRIORITY_RULES) {
    if (PRIORITY_RULES[p].some(keyword => lower.includes(keyword))) return p;
  }
  return 'P3';
}

async function readAllJsonResults(dir) {
  const files = await fs.readdir(dir);
  const allResults = [];
  for (const file of files) {
    if (file.endsWith('.json')) {
      const content = await fs.readJson(path.join(dir, file));
      allResults.push(content);
    }
  }
  return allResults;
}

function flattenTests(jsonResults) {
  const tests = [];
  for (const result of jsonResults) {
    for (const project of result.projects || []) {
      for (const testSuite of project.suites || []) {
        for (const test of testSuite.tests || []) {
          tests.push({
            title: test.title,
            status: test.status,
            project: project.name,
            duration: test.timeout,
            errorMessage: test.error ? test.error.message : '',
            priority: classifyPriority(test.title),
            screenshots: (test.attachments || [])
              .filter(a => a.contentType && a.contentType.includes('image'))
              .map(a => a.path)
          });
        }
      }
    }
  }
  return tests;
}

async function generateExcelReport(tests) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Test Summary');
  
  ws.columns = [
    { header: 'Title', key: 'title', width: 40 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Project', key: 'project', width: 20 },
    { header: 'Duration', key: 'duration', width: 12 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Error Message', key: 'errorMessage', width: 50 },
    { header: 'Screenshots', key: 'screenshots', width: 40 },
  ];

  for (const t of tests) {
    ws.addRow({
      title: t.title,
      status: t.status,
      project: t.project,
      duration: t.duration,
      priority: t.priority,
      errorMessage: t.errorMessage,
      screenshots: t.screenshots.join('; '),
    });
  }

  await workbook.xlsx.writeFile(OUTPUT_FILE);
  console.log(`Test summary Excel generated at: ${OUTPUT_FILE}`);
}

(async () => {
  const jsonResults = await readAllJsonResults(TEST_RESULTS_DIR);
  const tests = flattenTests(jsonResults);
  await generateExcelReport(tests);
})();
