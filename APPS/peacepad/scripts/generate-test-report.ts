import * as fs from 'fs';
import ExcelJS from 'exceljs';

interface TestResult {
  testName: string;
  testFile: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  project: string;
  browser: string;
  device: string;
  os: string;
  retries: number;
  error?: string;
}

const PROJECT_DEVICE_MAP: Record<string, { browser: string; device: string; os: string }> = {
  'p1-critical-chromium': { browser: 'Chrome', device: 'Desktop', os: 'Linux' },
  'p1-critical-firefox': { browser: 'Firefox', device: 'Desktop', os: 'Linux' },
  'p1-critical-webkit': { browser: 'Safari', device: 'Desktop', os: 'macOS' },
  'p2-important-chromium': { browser: 'Chrome', device: 'Desktop', os: 'Linux' },
  'p3-nice-to-have-chromium': { browser: 'Chrome', device: 'Desktop', os: 'Linux' },
  'p4-staging-chromium': { browser: 'Chrome', device: 'Desktop', os: 'Linux' },
  'performance': { browser: 'Chrome', device: 'Desktop', os: 'Linux' },
  'mobile-iphone-14': { browser: 'Safari', device: 'iPhone 14', os: 'iOS' },
  'mobile-iphone-13': { browser: 'Safari', device: 'iPhone 13', os: 'iOS' },
  'mobile-iphone-se': { browser: 'Safari', device: 'iPhone SE', os: 'iOS' },
  'mobile-galaxy-s21': { browser: 'Chrome', device: 'Galaxy S9+', os: 'Android' },
  'mobile-pixel-7': { browser: 'Chrome', device: 'Pixel 7', os: 'Android' },
  'mobile-pixel-5': { browser: 'Chrome', device: 'Pixel 5', os: 'Android' },
  'tablet-ipad-pro': { browser: 'Safari', device: 'iPad Pro 11', os: 'iOS' },
  'tablet-ipad-mini': { browser: 'Safari', device: 'iPad Mini', os: 'iOS' },
  'setup': { browser: 'Chrome', device: 'Desktop', os: 'Linux' },
};

function parsePlaywrightJson(jsonPath: string): TestResult[] {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const results: TestResult[] = [];
  
  if (!data.suites) {
    console.log('No suites found in JSON');
    return results;
  }
  
  function extractTests(suite: any, suitePath: string = '') {
    const currentPath = suitePath ? `${suitePath} > ${suite.title}` : suite.title;
    
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests || []) {
          const projectName = test.projectName || suite.project || 'unknown';
          const deviceInfo = PROJECT_DEVICE_MAP[projectName] || { browser: 'Unknown', device: 'Unknown', os: 'Unknown' };
          
          let status: TestResult['status'] = 'passed';
          let error: string | undefined;
          let duration = 0;
          
          if (test.results && test.results.length > 0) {
            const lastResult = test.results[test.results.length - 1];
            status = lastResult.status === 'passed' ? 'passed' : 
                     lastResult.status === 'failed' ? 'failed' :
                     lastResult.status === 'skipped' ? 'skipped' : 'timedOut';
            duration = lastResult.duration || 0;
            
            if (lastResult.error) {
              error = lastResult.error.message || 'Unknown error';
            }
          }
          
          results.push({
            testName: spec.title,
            testFile: spec.file || '',
            suite: currentPath,
            status,
            duration,
            project: projectName,
            browser: deviceInfo.browser,
            device: deviceInfo.device,
            os: deviceInfo.os,
            retries: (test.results?.length || 1) - 1,
            error,
          });
        }
      }
    }
    
    if (suite.suites) {
      for (const childSuite of suite.suites) {
        extractTests(childSuite, currentPath);
      }
    }
  }
  
  for (const suite of data.suites) {
    extractTests(suite);
  }
  
  return results;
}

function generateCSV(results: TestResult[], outputPath: string) {
  const headers = ['Test Name', 'Suite', 'File', 'Status', 'Duration (ms)', 'Project', 'Browser', 'Device', 'OS', 'Retries', 'Error'];
  const rows = results.map(r => [
    r.testName,
    r.suite,
    r.testFile,
    r.status,
    r.duration.toString(),
    r.project,
    r.browser,
    r.device,
    r.os,
    r.retries.toString(),
    r.error || '',
  ]);
  
  const csv = [headers, ...rows].map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  fs.writeFileSync(outputPath, csv);
  console.log(`CSV report generated: ${outputPath}`);
}

async function generateExcel(results: TestResult[], outputPath: string) {
  const workbook = new ExcelJS.Workbook();
  
  const ws = workbook.addWorksheet('Test Results');
  ws.columns = [
    { header: 'Test Name', key: 'testName', width: 40 },
    { header: 'Suite', key: 'suite', width: 50 },
    { header: 'File', key: 'file', width: 30 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Duration (ms)', key: 'duration', width: 15 },
    { header: 'Project', key: 'project', width: 20 },
    { header: 'Browser', key: 'browser', width: 10 },
    { header: 'Device', key: 'device', width: 15 },
    { header: 'OS', key: 'os', width: 10 },
    { header: 'Retries', key: 'retries', width: 8 },
    { header: 'Error', key: 'error', width: 50 },
  ];
  
  for (const r of results) {
    ws.addRow({
      testName: r.testName,
      suite: r.suite,
      file: r.testFile,
      status: r.status,
      duration: r.duration,
      project: r.project,
      browser: r.browser,
      device: r.device,
      os: r.os,
      retries: r.retries,
      error: r.error || '',
    });
  }
  
  const summaryWs = workbook.addWorksheet('Summary');
  summaryWs.addRow(['Summary']);
  summaryWs.addRow(['Total Tests', results.length]);
  summaryWs.addRow(['Passed', results.filter(r => r.status === 'passed').length]);
  summaryWs.addRow(['Failed', results.filter(r => r.status === 'failed').length]);
  summaryWs.addRow(['Skipped', results.filter(r => r.status === 'skipped').length]);
  summaryWs.addRow(['Timed Out', results.filter(r => r.status === 'timedOut').length]);
  summaryWs.addRow(['']);
  summaryWs.addRow(['By Browser']);
  
  const browserCounts = results.reduce((acc, r) => {
    acc[r.browser] = (acc[r.browser] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  for (const [browser, count] of Object.entries(browserCounts)) {
    summaryWs.addRow([browser, count]);
  }
  
  summaryWs.addRow(['']);
  summaryWs.addRow(['By Device']);
  
  const deviceCounts = results.reduce((acc, r) => {
    acc[r.device] = (acc[r.device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  for (const [device, count] of Object.entries(deviceCounts)) {
    summaryWs.addRow([device, count]);
  }
  
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Excel report generated: ${outputPath}`);
}

async function main() {
  const jsonPath = process.argv[2] || 'test-results/results.json';
  const outputDir = 'test-reports';
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`JSON file not found: ${jsonPath}`);
    console.log('Usage: npx tsx scripts/generate-test-report.ts [path-to-results.json]');
    process.exit(1);
  }
  
  console.log(`Parsing test results from: ${jsonPath}`);
  const results = parsePlaywrightJson(jsonPath);
  
  if (results.length === 0) {
    console.log('No test results found');
    process.exit(0);
  }
  
  const timestamp = new Date().toISOString().split('T')[0];
  generateCSV(results, `${outputDir}/test-results-${timestamp}.csv`);
  await generateExcel(results, `${outputDir}/test-results-${timestamp}.xlsx`);
  
  console.log('\n=== Test Summary ===');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.status === 'passed').length}`);
  console.log(`Failed: ${results.filter(r => r.status === 'failed').length}`);
  console.log(`Skipped: ${results.filter(r => r.status === 'skipped').length}`);
}

main().catch(console.error);
