# goCometUI Framework Implementation Guide

**Target Audience:** SDET Interviews, Team Onboarding, Production Deployment  
**Duration:** 5-15 minutes (depending on depth required)  
**Status:** Production Ready  

---

## Quick Start (2 Minutes)

### Installation
```bash
cd goCometUI
npm install
```

### Run Tests
```bash
# Basic run
npm test

# With AI failure summary
npm run ai-report

# With UI mode (interactive)
npm run test:ui

# In debug mode
npm run test:debug
```

### Expected Output
```
Running 3 tests using 3 workers

✓ 1 [chromium] › tests/login/valid-login.spec.ts
✓ 2 [chromium] › tests/login/invalid-login.spec.ts
✓ 3 [chromium] › tests/search/search.spec.ts

3 passed (20s)
```

**Reports Generated:**
- `playwright-report/index.html` – Interactive test report
- `reports/` – AI failure analysis (if tests fail)

---

## Architecture Overview (2-3 Minutes)

### The Problem This Framework Solves

```
Traditional Approach:
Test fails → Manual investigation → Update locator → Commit fix
❌ Time-consuming | ❌ Manual error prone | ❌ No learning

goCometUI Approach:
Test fails → Auto-capture artifacts → AI analyzes → Suggests fix → Reports generated
✅ Fast | ✅ Systematic | ✅ Learning via vector DB
```

### Core Components

1. **Page Objects** (`framework/pages/`)
   - Encapsulate page interactions
   - Return Playwright Locators via self-healing utility
   - Example: `SearchPage.searchAndVerify('Admin')`

2. **Self-Healing Locator** (`framework/utils/selfHealingLocator.ts`)
   - Tries multiple fallback locators in priority order
   - Caches successful candidate per-worker
   - Automatically recovers from minor UI changes
   - **5 candidates for Search:** placeholder → CSS attr → CSS class → role → XPath

3. **AI Failure Analyzer** (`framework/ai/failureAnalyzer.ts`)
   - Captures failure artifacts (screenshot, DOM, logs, network)
   - Classifies failure (locator/network/assertion/etc)
   - Queries historical failures (RAG)
   - Calls LLM to generate root cause
   - Writes JSON + Markdown reports

4. **Vector Store** (`framework/ai/vectorStore.ts`)
   - Local worker-scoped JSON fallback
   - Optional remote ChromaDB integration
   - Stores historical failures with TTL
   - Tracks manual resolutions

5. **Reporters**
   - Playwright HTML report (default)
   - Allure report (if configured)
   - Custom AI summary reporter (prints fail-fast lines)

---

## Self-Healing Locator (3-4 Minutes)

### What Problem Does It Solve?

```
Scenario: Application changed search input placeholder from "Search" to "Find"

Without Self-Healing:
❌ Test fails
❌ Manual locator update required
❌ Time wasted

With Self-Healing:
✅ Tries placeholder "Search" → fails
✅ Automatically tries CSS class ".oxd-input" → passes
✅ Test continues
✅ Cache saves selection
✅ AI analyzer logs the change
```

### How It Works (Step-by-Step)

**Step 1: Test calls SearchPage.searchAndVerify('Admin')**
```typescript
// In search.spec.ts
await searchPage.searchAndVerify('Admin');
```

**Step 2: SearchPage gets the search input**
```typescript
// In SearchPage.ts
private async getSearchInput(): Promise<Locator> {
  return await SelfHealingLocator.get(this.page, 'searchInput', [
    { desc: `getByPlaceholder('Search')`, factory: p => p.getByPlaceholder('Search') },
    { desc: `locator('input[placeholder="Search"]')`, factory: p => p.locator('input[placeholder="Search"]') },
    { desc: `locator('.oxd-input')`, factory: p => p.locator('.oxd-input') },
    { desc: `getByRole('textbox')`, factory: p => p.getByRole('textbox') },
    { desc: `xpath input[@placeholder='Search']`, factory: p => p.locator("//input[@placeholder='Search']") }
  ]);
}
```

**Step 3: SelfHealingLocator tries candidates**

```
┌─ SelfHealingLocator.get('searchInput', [5 candidates])
│
├─ Check worker cache: selfHealingCache.worker-0.json
│  └─ Found: searchInput → index 0
│
├─ Test cached candidate 0: getByPlaceholder('Search')
│  ├─ count() > 0? YES
│  ├─ isVisible()? NO (placeholder was renamed, element not found)
│  └─ Cached candidate failed → try next
│
├─ Test candidate 1: locator('input[placeholder="Search"]')
│  ├─ count() > 0? NO
│  └─ Candidate failed → try next
│
├─ Test candidate 2: locator('.oxd-input')
│  ├─ count() > 0? YES
│  ├─ isVisible()? YES
│  ├─ isEnabled()? YES
│  └─ ✅ PASS → found it!
│
├─ Save cache: { searchInput: 2 }
│  └─ Write to selfHealingCache.worker-0.json
│
└─ Return: locator.first() (the found element)
```

**Step 4: Test continues with found locator**
```typescript
await input.fill('Admin');  // Uses the found locator
await page.getByText('Admin').toBeVisible();  // Verify result
```

**Step 5: On next run, cache is faster**
```
Next test run:
├─ Read cache: searchInput → index 2
├─ Test cached candidate 2 directly: locator('.oxd-input')
└─ ✅ Found immediately (no fallback needed)
```

### Cache Structure

**File:** `framework/utils/selfHealingCache.worker-<index>.json`

```json
{
  "searchInput": 2,
  "loginButton": 0,
  "usernameField": 1
}
```

**Purpose:** Stores successful candidate index per locator name, per worker

### Candidate Priority Order (Explained)

| # | Strategy | Why This Priority | When It Fails |
|---|----------|------------------|--------------|
| 1 | `getByPlaceholder('Search')` | Semantic locator (best practice) | Placeholder renamed or removed |
| 2 | `locator('input[placeholder="Search"]')` | Explicit CSS attribute | Same as #1 |
| 3 | `locator('.oxd-input')` | CSS class fallback | Class removed or changed |
| 4 | `getByRole('textbox')` | Generic ARIA role | Multiple textboxes present |
| 5 | XPath `//input[@placeholder='Search']` | Last resort | Page structure heavily modified |

### Effectiveness Metrics

```
Coverage: 5 candidates = high probability of recovery
Speed: Per-worker cache = fast on subsequent runs
Learning: AI analyzer logs if fallback used = patterns identified
Stability: Visibility + enabled checks = prevent false matches
```

---

## AI Failure Analysis (3-4 Minutes)

### Flow Diagram

```
Test Fails
  ↓
afterEach Hook
  ├─ Screenshot captured
  ├─ DOM snapshot captured
  ├─ Console logs captured
  ├─ Network failures captured
  └─ All artifacts collected
  ↓
analyzeFailure(artifact)
  ├─ Classify failure
  │  └─ Heuristics on error message & stack
  │  └─ Returns: Locator/Network/Assertion/etc
  │
  ├─ Store to vector DB
  │  ├─ Write to local: historical_failures.worker-<index>.json
  │  └─ Write to remote: ChromaDB (if CHROMA_URL set)
  │
  ├─ Query similar failures (RAG)
  │  ├─ Embed error message: text-embedding-3-small
  │  ├─ Search local/remote for similar
  │  └─ Return top-5 matches
  │
  ├─ Call LLM with context
  │  ├─ Build prompt: current + historical failures
  │  ├─ Call OpenAI: gpt-4o-mini
  │  └─ Parse response: root cause + fix + confidence
  │
  └─ Generate reports
     ├─ Write: failure-<ts>.json
     ├─ Write: ai-failure-report-<ts>.md
     └─ Print: fail-fast summary to console
```

### Example: Search Test Fails

**Scenario:** Placeholder attribute renamed to "find"

**Step 1: Artifact Captured**
```json
{
  "testName": "Search Admin Menu",
  "errorMessage": "Locator('input[placeholder=\"Search\"]') not found",
  "stackTrace": "Error at searchPage.ts:18...",
  "screenshotPath": "...",
  "consoleLogs": [
    { "type": "log", "text": "Login successful" }
  ],
  "networkErrors": []
}
```

**Step 2: Classified as "Locator Change"**
```
- Error message contains "Locator" → heuristic matched
- Category: Locator Change
```

**Step 3: Stored to Vector DB**
```json
// Written to: historical_failures.worker-0.json
{
  "id": "uuid-123",
  "testName": "Search Admin Menu",
  "errorMessage": "Locator not found",
  "createdAt": 1687200000000,
  "expiresAt": 1694976000000,
  "resolved": false
}

// Also upserted to ChromaDB (if configured)
// Embedding generated: text-embedding-3-small
// Collection: failures_worker_0
```

**Step 4: Similar Failures Queried**
```json
[
  {
    "id": "prev-uuid-1",
    "metadata": {
      "testName": "Login Field Locator",
      "errorMessage": "Similar placeholder change in v2.1"
    },
    "distance": 0.15
  },
  {
    "id": "prev-uuid-2",
    "metadata": {
      "testName": "Dashboard Search",
      "errorMessage": "CSS class changed"
    },
    "distance": 0.23
  }
]
```

**Step 5: LLM Analyzes with Context**
```
System Prompt:
"You are an AI that analyzes test failures and suggests root causes..."

User Prompt:
"Current failure: <current artifact JSON>

Similar historical failures:
<similar failures JSON>

Provide JSON with: mostProbableRootCause, confidence, recommendedFix..."

Response:
{
  "mostProbableRootCause": "The search input placeholder attribute was changed from 'Search' to 'find' in the latest UI update",
  "confidence": 0.87,
  "recommendedFix": "Update the test's getByPlaceholder() to use 'find' or add a CSS class fallback",
  "similarHistoricalIncidents": [...]
}
```

**Step 6: Reports Generated**

**JSON Report** (`reports/failure-1687200000000.json`):
```json
{
  "testName": "Search Admin Menu",
  "failureCategory": "Locator Change",
  "errorMessage": "Locator not found",
  "rootCause": "Placeholder changed from 'Search' to 'find'",
  "confidence": 0.87,
  "recommendedFix": "Update getByPlaceholder() or add CSS class fallback",
  "similarHistoricalFailures": [...]
}
```

**Markdown Report** (`reports/ai-failure-report-1687200000000.md`):
```markdown
# AI Failure Analysis

Test Name: Search Admin Menu

Failure Category: Locator Change

Root Cause: The search input placeholder attribute was changed from 'Search' to 'find' in the latest UI update

Confidence: 87%

Recommended Fix: Update the test's getByPlaceholder() to use 'find' or add a CSS class fallback

**Similar Historical Failures:**
1. id=prev-uuid-1 distance=0.15 ... (Login field similar change)
```

**Console Output**:
```
[AI] Search Admin Menu | Category: Locator Change | RootCause: Placeholder changed… | Confidence: 87%
```

---

## Vector Database & RAG (2-3 Minutes)

### What is RAG?

**RAG = Retrieval Augmented Generation**

```
Traditional LLM:
"Analyze this failure" → LLM guesses → may hallucinate
❌ No context

RAG (this framework):
"Analyze this failure + here are 5 similar historical cases" → LLM sees patterns → grounded response
✅ Contextual, accurate
```

### Vector Store Implementation

**Local Fallback** (`historical_failures.worker-<index>.json`):
```json
[
  {
    "id": "uuid-1",
    "testName": "Search Admin Menu",
    "errorMessage": "Placeholder not found",
    "rootCause": "Placeholder changed",
    "resolution": "Updated locator to use CSS class",
    "createdAt": 1687200000000,
    "expiresAt": 1694976000000,
    "resolved": true
  }
]
```

**Remote Option** (`ChromaDB HTTP`):
- Embeddings: OpenAI `text-embedding-3-small`
- Collection: `failures_worker_<index>`
- Documents stored as: id + embedding + metadata

### RAG Flow (Detailed)

```
1. Current Failure
   └─ errorMessage: "Locator with placeholder 'Search' not found"

2. Generate Embedding
   └─ text-embedding-3-small("Locator with placeholder 'Search' not found")
   └─ Vector: [0.123, -0.456, 0.789, ...]

3. Vector Search
   ├─ If ChromaDB: POST /collections/failures_worker_0/query
   │  └─ Returns: top-5 matches with distance scores
   └─ Else local: Token-based fuzzy match
      └─ Returns: top-5 matches with similarity scores

4. Context Retrieval
   ├─ Similar failure 1: "Placeholder changed in v2.1" (distance: 0.12)
   ├─ Similar failure 2: "CSS class selector failed" (distance: 0.18)
   └─ ... (top 5)

5. LLM Prompt Construction
   └─ System: "You are a test failure analyzer"
   └─ User: "Current failure: {...}\n\nSimilar cases: [{...}, {...}, ...]"

6. LLM Response
   └─ mostProbableRootCause: "Placeholder was changed"
   └─ confidence: 0.87
   └─ recommendedFix: "Use CSS class fallback or update placeholder name"

7. Report Generation
   └─ JSON + Markdown reports written
   └─ Reporters print summary
```

### Similarity Search Example

```
Query: "Search input locator not found"

Local Search Results:
┌─ Match 1: "Placeholder 'Search' not found in v2.1" (score: 0.15)
├─ Match 2: "CSS class .oxd-input removed" (score: 0.22)
├─ Match 3: "Button locator failed" (score: 0.35)
└─ Match 4: "Element not visible on load" (score: 0.42)

→ Used by LLM as context
```

---

## Playwright Integration & Configuration

### Configuration (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './tests',                    // Where tests are located
  fullyParallel: true,                   // Run in parallel
  forbidOnly: !!process.env.CI,          // Fail if .only used in CI
  retries: process.env.CI ? 2 : 0,       // Retry in CI
  timeout: 60000,                        // Per-test timeout (60s)
  
  reporter: [
    ['html'],                            // HTML report
    ['allure-playwright']                // Allure integration
  ],
  
  use: {
    trace: 'retain-on-failure',          // Playwright trace on failure
    screenshot: 'only-on-failure',       // Screenshot on failure
    video: 'retain-on-failure',          // Video on failure
    headless: true,                      // Headless mode
  },
  
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
```

### Fixtures Extension (`testfixtures.ts`)

```typescript
// Extend Playwright test with custom fixtures
export const test = base.extend<MyFixtures>({
  // Provide LoginPage to all tests
  LoginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  
  // Provide searchPage + attach collectors
  searchPage: async ({ page }, use) => {
    // Collect console logs
    (page as any).__consoleLogs = [];
    page.on('console', msg => {
      (page as any).__consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });
    
    // Collect network failures
    (page as any).__networkFailures = [];
    page.on('requestfailed', req => {
      (page as any).__networkFailures.push({
        url: req.url(),
        failure: req.failure()?.errorText
      });
    });
    
    await use(new SearchPage(page));
  }
});

// Global afterEach hook
base.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'failed') return; // only on failure
  
  // Capture artifacts
  await page.screenshot({ path: `${outDir}/failure.png` });
  const html = await page.content();
  fs.writeFileSync(`${outDir}/dom.html`, html);
  
  // Call AI analyzer
  await analyzeFailure(artifact);
});
```

---

## Code Examples

### Example 1: Create a New Page Object

```typescript
// framework/pages/NewPage.ts
import { Page, expect, Locator } from '@playwright/test';
import { SelfHealingLocator } from '../utils/selfHealingLocator';

export class NewPage {
  constructor(private page: Page) {}

  // Use self-healing for a form field
  private async getEmailField(): Promise<Locator> {
    return await SelfHealingLocator.get(this.page, 'emailField', [
      { desc: `getByLabel('Email')`, factory: p => p.getByLabel('Email') },
      { desc: `getByPlaceholder('email@example.com')`, factory: p => p.getByPlaceholder('email@example.com') },
      { desc: `getByTestId('email-input')`, factory: p => p.getByTestId('email-input') },
      { desc: `locator('input[type="email"]')`, factory: p => p.locator('input[type="email"]') }
    ]);
  }

  async fillEmail(email: string) {
    const field = await this.getEmailField();
    await field.fill(email);
  }

  async submitForm() {
    await this.page.getByRole('button', { name: 'Submit' }).click();
  }

  async verifySuccess() {
    await expect(this.page.getByText('Success')).toBeVisible();
  }
}
```

### Example 2: Use New Page Object in Test

```typescript
// tests/form/submit.spec.ts
import { test } from '../../framework/fixtures/testfixtures';
import { NewPage } from '../../framework/pages/NewPage';

test('Form submission flow', async ({ page }) => {
  const newPage = new NewPage(page);
  
  await page.goto('https://example.com/form');
  await newPage.fillEmail('user@example.com');
  await newPage.submitForm();
  await newPage.verifySuccess();
});
```

### Example 3: Extend Self-Healing to Multiple Locators

```typescript
// In a Page Object class
async getFormField(fieldName: string): Promise<Locator> {
  return await SelfHealingLocator.get(this.page, fieldName, [
    { desc: `getByTestId('${fieldName}')`, factory: p => p.getByTestId(fieldName) },
    { desc: `getByLabel('${fieldName}')`, factory: p => p.getByLabel(fieldName) },
    { desc: `getByPlaceholder('${fieldName}')`, factory: p => p.getByPlaceholder(fieldName) },
    { desc: `locator('input[name="${fieldName}"]')`, factory: p => p.locator(`input[name="${fieldName}"]`) }
  ]);
}

// Usage:
await this.getFormField('username').fill('testuser');
await this.getFormField('password').fill('testpass');
```

---

## Running Tests Locally

### Installation

```bash
cd goCometUI
npm install
```

### Basic Commands

```bash
# Run all tests
npm test

# Run with live UI
npm run test:ui

# Debug mode
npm run test:debug

# With AI failure reporter
npm run ai-report

# Specific test file
npx playwright test tests/search/search.spec.ts

# Headed mode (see browser)
npx playwright test --headed

# Single browser
npx playwright test --project=chromium
```

### Output

After running tests:
- `playwright-report/index.html` – Open in browser for interactive report
- `test-results/` – Screenshots/videos/traces per test
- `reports/` – AI failure analysis JSON/markdown (if tests failed)

### Viewing Reports

```bash
# Playwright HTML report
npx playwright show-report

# AI failure report (if generated)
cat reports/ai-failure-report-*.md
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Playwright Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd goCometUI && npm install
      - run: cd goCometUI && npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: goCometUI/playwright-report/
```

### Jenkins

```groovy
stage('UI Tests') {
  steps {
    sh 'cd goCometUI && npm install'
    sh 'cd goCometUI && npm test'
  }
  post {
    always {
      publishHTML([
        reportDir: 'goCometUI/playwright-report',
        reportFiles: 'index.html',
        reportName: 'Playwright Report'
      ])
    }
  }
}
```

---

## Troubleshooting

### Tests Timing Out

```bash
# Increase timeout in playwright.config.ts
timeout: 120000  // 2 minutes

# Or per test
test.setTimeout(120000);
```

### Locator Not Found

1. Check if element exists in application
2. Run in headed mode: `npx playwright test --headed`
3. Review self-healing cache: `cat framework/utils/selfHealingCache.worker-0.json`
4. Check AI failure report: `cat reports/ai-failure-report-*.md`

### AI Reports Not Generated

1. Ensure `OPENAI_API_KEY` is set: `echo $OPENAI_API_KEY`
2. Check logs for API errors
3. Reports still generated locally even if LLM fails (graceful degradation)

---

## Production Checklist

- [ ] All tests passing locally
- [ ] `package.json` scripts configured
- [ ] `playwright.config.ts` set for your environment
- [ ] `env.ts` has correct BASE_URL, credentials
- [ ] CI/CD pipeline configured (GitHub Actions or Jenkins)
- [ ] `OPENAI_API_KEY` secret configured in CI/CD
- [ ] Test reports artifact upload configured
- [ ] Team trained on self-healing + AI features

---

## Interview Talking Points

**"Tell us about your Playwright framework"**

✅ **Answer:**
- Page Object Model for maintainability
- Self-healing locator strategy with 5-candidate fallback chain
- Automatic failure recovery via cached successful selectors
- AI-powered root cause analysis using OpenAI + RAG
- Vector database (local fallback + optional ChromaDB)
- Structured logging via Winston
- Production-ready with CI/CD integration

**"How does the framework recover from UI changes?"**

✅ **Answer:**
- When a primary locator fails, framework automatically tries fallback candidates in priority order
- For example, if placeholder attribute changes, it falls back to CSS class selector
- Successful candidate is cached per-worker for performance
- On-failure artifacts are captured for AI analysis
- LLM suggests root cause and fix, stored in vector DB for future reference

**"How does AI help with test maintenance?"**

✅ **Answer:**
- Failure artifacts (screenshot, DOM, logs) automatically captured
- AI classifier categorizes failure type
- Vector search finds similar historical failures
- LLM generates root cause explanation + recommended fix
- Reports generated in JSON + Markdown for human review
- Over time, vector DB learns patterns and improves suggestions

---

## File Reference

| File | Purpose |
|------|---------|
| `framework/pages/SearchPage.ts` | Search page object with self-healing |
| `framework/pages/LoginPage.ts` | Login page object |
| `framework/utils/selfHealingLocator.ts` | Locator recovery engine |
| `framework/utils/logger.ts` | Structured logging (Winston) |
| `framework/fixtures/testfixtures.ts` | Playwright fixture extensions + afterEach hook |
| `framework/ai/failureAnalyzer.ts` | AI failure analysis orchestrator |
| `framework/ai/vectorStore.ts` | Local + ChromaDB vector storage |
| `framework/ai/rootCauseGenerator.ts` | OpenAI LLM integration |
| `framework/ai/ai-summary-reporter.js` | Playwright reporter extension |
| `playwright.config.ts` | Test runner configuration |
| `tsconfig.json` | TypeScript configuration |
| `package.json` | Dependencies + npm scripts |

---

**Framework Version:** 1.0  
**Last Updated:** June 2026  
**Status:** Production Ready ✅
