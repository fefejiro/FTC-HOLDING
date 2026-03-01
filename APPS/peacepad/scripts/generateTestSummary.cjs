#!/usr/bin/env node
/**
 * PeacePad Test Summary Generator
 * 
 * Reads Playwright JSON results and generates an Excel report with:
 * - Auto-priority detection from folder paths (p1-critical, p2-important, p3-nice-to-have)
 * - Performance flagging for slow tests
 * - Screenshot links for failed tests
 * - Error messages and context
 * 
 * Usage: node scripts/generateTestSummary.js
 * Or:    npm run test:report
 */

const fs = require('fs-extra');
const path = require('path');
const ExcelJS = require('exceljs');

const PROJECT_ROOT = path.join(__dirname, '..');
const RESULTS_FILE = path.join(PROJECT_ROOT, 'test-results', 'results.json');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'peacepad-test-summary.xlsx');

const PERFORMANCE_THRESHOLD_MS = 5000;

const PRIORITY_FROM_PATH = {
  'p1-critical': 'P1',
  'p2-important': 'P2',
  'p3-nice-to-have': 'P3',
  'performance': 'PERF',
  'setup': 'SETUP',
};

const PRIORITY_FROM_KEYWORDS = {
  P1: ['auth', 'login', 'chat', 'message', 'safety', 'consent', 'session'],
  P2: ['partnership', 'invite', 'ai', 'tone', 'attachment', 'calendar'],
  P3: ['responsive', 'accessibility', 'layout', 'viewport'],
};

function detectPriority(testFile, testTitle) {
  for (const [pathKey, priority] of Object.entries(PRIORITY_FROM_PATH)) {
    if (testFile && testFile.includes(pathKey)) {
      return priority;
    }
  }
  
  const lower = testTitle.toLowerCase();
  for (const [priority, keywords] of Object.entries(PRIORITY_FROM_KEYWORDS)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return priority;
    }
  }
  
  return 'P3';
}

function getPerformanceFlag(duration, testTitle) {
  if (duration > PERFORMANCE_THRESHOLD_MS) {
    return 'SLOW';
  }
  if (testTitle.toLowerCase().includes('performance')) {
    return 'PERF';
  }
  return '';
}

function extractTests(data, tests = [], filePath = '') {
  if (data.suites) {
    for (const suite of data.suites) {
      const suitePath = suite.file || filePath;
      extractTests(suite, tests, suitePath);
    }
  }
  
  if (data.specs) {
    for (const spec of data.specs) {
      const specFile = spec.file || filePath;
      
      for (const test of spec.tests || []) {
        for (const result of test.results || []) {
          const duration = result.duration || 0;
          const status = result.status || test.status || 'unknown';
          
          const screenshots = (result.attachments || [])
            .filter(a => a.contentType && a.contentType.includes('image'))
            .map(a => a.path || a.name)
            .join('; ');
          
          let errorMessage = '';
          if (result.errors && result.errors.length > 0) {
            errorMessage = result.errors
              .map(e => e.message || e.stack || String(e))
              .join('\n')
              .substring(0, 500);
          } else if (result.error) {
            errorMessage = (result.error.message || result.error.stack || String(result.error))
              .substring(0, 500);
          }
          
          tests.push({
            title: spec.title || test.title || 'Unknown',
            suite: data.title || '',
            file: specFile,
            status: status,
            duration: duration,
            priority: detectPriority(specFile, spec.title || ''),
            perfFlag: getPerformanceFlag(duration, spec.title || ''),
            errorMessage: errorMessage,
            screenshots: screenshots,
            projectName: test.projectName || '',
            retry: result.retry || 0,
          });
        }
      }
    }
  }
  
  return tests;
}

function processPlaywrightResults(data) {
  const tests = [];
  
  if (data.suites) {
    for (const suite of data.suites) {
      extractTests(suite, tests, suite.file || '');
    }
  }
  
  return tests;
}

async function generateExcelReport(tests) {
  tests.sort((a, b) => {
    const statusOrder = { 'failed': 0, 'timedOut': 1, 'unexpected': 2, 'skipped': 3, 'passed': 4 };
    const priorityOrder = { 'P1': 0, 'P2': 1, 'P3': 2, 'PERF': 3, 'SETUP': 4 };
    
    const statusDiff = (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
    if (statusDiff !== 0) return statusDiff;
    
    const priorityDiff = (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5);
    if (priorityDiff !== 0) return priorityDiff;
    
    return b.duration - a.duration;
  });

  const workbook = new ExcelJS.Workbook();
  
  const ws = workbook.addWorksheet('Test Summary');
  ws.columns = [
    { header: 'Priority', key: 'priority', width: 8 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Test Title', key: 'title', width: 50 },
    { header: 'Suite', key: 'suite', width: 30 },
    { header: 'Duration (ms)', key: 'duration', width: 12 },
    { header: 'Perf Flag', key: 'perfFlag', width: 10 },
    { header: 'File', key: 'file', width: 40 },
    { header: 'Error Message', key: 'errorMessage', width: 60 },
    { header: 'Screenshots', key: 'screenshots', width: 40 },
    { header: 'Retry', key: 'retry', width: 6 },
  ];
  
  for (const t of tests) {
    ws.addRow({
      priority: t.priority,
      status: t.status,
      title: t.title,
      suite: t.suite,
      duration: t.duration,
      perfFlag: t.perfFlag,
      file: t.file,
      errorMessage: t.errorMessage,
      screenshots: t.screenshots,
      retry: t.retry,
    });
  }
  
  const summaryWs = workbook.addWorksheet('Summary');
  await addSummaryData(summaryWs, tests);
  
  await workbook.xlsx.writeFile(OUTPUT_FILE);
  console.log(`\nTest summary Excel generated: ${OUTPUT_FILE}`);
}

async function addSummaryData(ws, tests) {
  const stats = {
    total: tests.length,
    passed: tests.filter(t => t.status === 'passed').length,
    failed: tests.filter(t => t.status === 'failed' || t.status === 'timedOut').length,
    skipped: tests.filter(t => t.status === 'skipped').length,
  };
  
  const byPriority = {};
  for (const t of tests) {
    if (!byPriority[t.priority]) {
      byPriority[t.priority] = { total: 0, passed: 0, failed: 0 };
    }
    byPriority[t.priority].total++;
    if (t.status === 'passed') byPriority[t.priority].passed++;
    if (t.status === 'failed' || t.status === 'timedOut') byPriority[t.priority].failed++;
  }
  
  const slowTests = tests.filter(t => t.duration > PERFORMANCE_THRESHOLD_MS);
  
  ws.addRow(['PeacePad Test Summary Report']);
  ws.addRow(['Generated:', new Date().toISOString()]);
  ws.addRow([]);
  ws.addRow(['Overall Statistics']);
  ws.addRow(['Total Tests:', stats.total]);
  ws.addRow(['Passed:', stats.passed]);
  ws.addRow(['Failed:', stats.failed]);
  ws.addRow(['Skipped:', stats.skipped]);
  ws.addRow(['Pass Rate:', `${((stats.passed / stats.total) * 100).toFixed(1)}%`]);
  ws.addRow([]);
  ws.addRow(['By Priority']);
  ws.addRow(['Priority', 'Total', 'Passed', 'Failed', 'Pass Rate']);
  
  for (const [priority, s] of Object.entries(byPriority)) {
    ws.addRow([
      priority,
      s.total,
      s.passed,
      s.failed,
      `${((s.passed / s.total) * 100).toFixed(1)}%`
    ]);
  }
  
  ws.addRow([]);
  ws.addRow([`Slow Tests (>${PERFORMANCE_THRESHOLD_MS}ms):`, slowTests.length]);
  
  if (slowTests.length > 0) {
    ws.addRow(['Test', 'Duration (ms)']);
    for (const t of slowTests.slice(0, 10)) {
      ws.addRow([t.title, t.duration]);
    }
  }
}

async function main() {
  console.log('PeacePad Test Summary Generator');
  console.log('================================\n');
  
  if (!await fs.pathExists(RESULTS_FILE)) {
    console.error(`Error: Results file not found at ${RESULTS_FILE}`);
    console.error('\nRun your Playwright tests first:');
    console.error('  npx playwright test');
    process.exit(1);
  }
  
  console.log(`Reading results from: ${RESULTS_FILE}`);
  const data = await fs.readJson(RESULTS_FILE);
  
  const tests = processPlaywrightResults(data);
  console.log(`Found ${tests.length} test results`);
  
  const passed = tests.filter(t => t.status === 'passed').length;
  const failed = tests.filter(t => t.status === 'failed' || t.status === 'timedOut').length;
  const skipped = tests.filter(t => t.status === 'skipped').length;
  
  console.log(`\nQuick Summary:`);
  console.log(`  Passed:  ${passed}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  
  if (failed > 0) {
    console.log(`\nFailed Tests:`);
    tests
      .filter(t => t.status === 'failed' || t.status === 'timedOut')
      .slice(0, 5)
      .forEach(t => console.log(`  [${t.priority}] ${t.title}`));
    if (failed > 5) console.log(`  ... and ${failed - 5} more`);
  }
  
  await generateExcelReport(tests);
  
  console.log('\nDone! Open the Excel file to review the full report.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
