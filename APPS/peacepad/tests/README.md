# PeacePad E2E Test Suite

## Test Organization

Tests are organized by priority level:

### P1 Critical (Must Pass)
- **auth.spec.ts** - Session persistence, login flow
- **chat.spec.ts** - Core chat functionality, message input, send button
- **safety.spec.ts** - Help/support accessibility, safety plan features

### P2 Important (Should Pass)
- **partnership.spec.ts** - Invite/share functionality, partnership creation
- **ai-features.spec.ts** - AI analysis toggle, tone warnings
- **attachments.spec.ts** - File attachments, share events/expenses

### P3 Nice-to-Have (Nice to Pass)
- **responsive.spec.ts** - Desktop/tablet/mobile viewport tests
- **accessibility.spec.ts** - Skip links, heading structure, ARIA

### Performance
- **page-load.spec.ts** - Page load times, time-to-interactive
- **network.spec.ts** - API call count, bundle sizes

## Running Tests

### Run All Tests (against production)
```bash
npx playwright test
```

### Run Only P1 Critical Tests
```bash
npx playwright test --project=p1-critical-chromium
```

### Run Only P2 Important Tests
```bash
npx playwright test --project=p2-important-chromium
```

### Run Performance Tests
```bash
npx playwright test --project=performance
```

### Run with Browser Visible (headed mode)
```bash
npx playwright test --headed --slow-mo=500
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/p1-critical/chat.spec.ts --headed
```

### Run Against Local Development
**Mac/Linux:**
```bash
PLAYWRIGHT_BASE_URL=http://localhost:5000 npx playwright test
```

**Windows (cmd):**
```cmd
set PLAYWRIGHT_BASE_URL=http://localhost:5000
npx playwright test
```

**Windows (PowerShell):**
```powershell
$env:PLAYWRIGHT_BASE_URL="http://localhost:5000"; npx playwright test
```

## Reports

After running tests, reports are available in:

- **HTML Report**: `playwright-report/index.html`
- **JSON Report**: `test-results/results.json`
- **JUnit XML**: `test-results/junit.xml`
- **Excel Summary**: `peacepad-test-summary.xlsx` (generated separately)

### View HTML Report
```bash
npx playwright show-report
```

### Generate Excel QA Report

After running tests, generate a comprehensive Excel report for QA review:

```bash
npm run test:report
```

Or directly:
```bash
node scripts/generateTestSummary.js
```

**Features of the Excel Report:**
- **Auto-priority detection** from folder paths (p1-critical → P1, p2-important → P2, etc.)
- **Performance flags** for slow tests (>5 seconds)
- **Screenshot links** for failed tests
- **Two worksheets**: Detailed results + Summary statistics
- **Sorted by priority**: Failed P1 tests appear first

**Excel Output Includes:**
| Column | Description |
|--------|-------------|
| Priority | P1, P2, P3, PERF, or SETUP |
| Status | passed, failed, timedOut, skipped |
| Test Title | Name of the test |
| Suite | Parent test suite |
| Duration (ms) | How long the test took |
| Perf Flag | SLOW if >5000ms |
| File | Test file path |
| Error Message | Error details (truncated) |
| Screenshots | Paths to failure screenshots |
| Retry | Retry attempt number |

### Complete Workflow Example

**Step 1: Run all tests locally**
```bash
# Mac/Linux
PLAYWRIGHT_BASE_URL=http://localhost:5000 npx playwright test

# Windows PowerShell
$env:PLAYWRIGHT_BASE_URL="http://localhost:5000"; npx playwright test
```

**Step 2: Generate Excel report**
```bash
npm run test:report
```

**Step 3: Open the report**
- Open `peacepad-test-summary.xlsx` in Excel/Google Sheets
- Review the "Summary" tab for quick stats
- Check the "Test Summary" tab for detailed results
- Filter by Priority column to focus on P1 issues first

## Test Configuration

Configuration is in `playwright.config.ts`. Key settings:
- Default URL: `https://peacepad.ca`
- Retries: 1 (local), 2 (CI)
- Screenshots: On failure only
- Video: On first retry
- Trace: On first retry

## Adding New Tests

1. Choose the appropriate priority folder
2. Follow existing test patterns
3. Use `data-testid` attributes when possible
4. Handle visibility checks gracefully with `.catch(() => false)`
