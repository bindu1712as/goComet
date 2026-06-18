# goCometUI Framework – Quick Reference Guide

**Purpose:** Fast lookup for common tasks and commands  
**Audience:** QA Engineers, SDETs, Team Members  
**Last Updated:** June 2026

---

## 📋 Quick Commands

### Test Execution

```bash
# Run all tests
npm test

# Run with interactive UI
npm run test:ui

# Run specific test file
npx playwright test tests/search/search.spec.ts

# Run with headed browser (see what's happening)
npx playwright test --headed

# Run in debug mode (step through)
npx playwright test --debug

# Run with trace viewer
npx playwright test --trace on
```

### Reports & Analysis

```bash
# View Playwright HTML report
npx playwright show-report

# View AI failure reports (if tests failed)
ls reports/ai-failure-report-*.md

# View locator cache (for debugging)
cat framework/utils/selfHealingCache.worker-0.json

# View historical failures database
cat framework/ai/historical_failures.worker-0.json
```

### AI Features

```bash
# Run AI failure analyzer manually
npm run ai-report

# Run AI unit tests
npm run ai-unit

# Start manual resolution UI (web interface)
npm run ai-server
# Then open http://localhost:5600 in browser
```

### Type Checking

```bash
# Check TypeScript compilation
npm run typecheck

# Auto-fix TypeScript errors
npx tsc --noEmit
```

---

## 🔍 Debugging Issues

### Test Fails Intermittently

**Step 1:** Run in headed mode to see what's happening
```bash
npx playwright test tests/search/search.spec.ts --headed
```

**Step 2:** Check self-healing cache
```bash
cat framework/utils/selfHealingCache.worker-0.json
# If a locator is using fallback candidate (index >= 2), UI may be unstable
```

**Step 3:** Review AI failure report
```bash
cat reports/ai-failure-report-*.md
# AI-generated suggestions for the failure
```

### Locator Not Found

**Step 1:** Verify element exists in application
```bash
# Use headed mode to inspect
npx playwright test --headed --debug
# In REPL: await page.$('input[placeholder="Search"]')
```

**Step 2:** Check browser console logs
```bash
cat test-results/*/console-logs.json | jq '.[] | select(.type=="error")'
```

**Step 3:** Add debug logging
```typescript
// In page object
const locator = await SelfHealingLocator.get(this.page, 'fieldName', candidates);
logger.info(`Locator selected: fieldName`);
```

### Tests Timeout

**Solution 1:** Increase timeout in `playwright.config.ts`
```typescript
timeout: 120000,  // 2 minutes instead of 1
```

**Solution 2:** Check for stalled network requests
```bash
cat test-results/*/network-failures.json
```

**Solution 3:** Check application performance
- Ensure test environment (BASE_URL) is responding quickly
- Check database connectivity
- Review application logs

---

## 📝 Common Tasks

### Add a New Test

**1. Create test file:**
```bash
touch tests/feature/mytest.spec.ts
```

**2. Write test using fixtures:**
```typescript
import { test } from '../../framework/fixtures/testfixtures';
import { LoginPage } from '../../framework/pages/LoginPage';

test('My new test', async ({ page, LoginPage }) => {
  await page.goto('https://...');
  // Your test code
  await expect(page.getByText('Success')).toBeVisible();
});
```

**3. Run test:**
```bash
npx playwright test tests/feature/mytest.spec.ts
```

### Create a New Page Object

**1. Create file:**
```bash
touch framework/pages/MyPage.ts
```

**2. Implement page object:**
```typescript
import { Page, expect, Locator } from '@playwright/test';
import { SelfHealingLocator } from '../utils/selfHealingLocator';

export class MyPage {
  constructor(private page: Page) {}

  private async getElement(): Promise<Locator> {
    return await SelfHealingLocator.get(this.page, 'elementName', [
      { desc: `getByTestId('element')`, factory: p => p.getByTestId('element') },
      { desc: `locator('div.element')`, factory: p => p.locator('div.element') }
    ]);
  }

  async performAction() {
    const elem = await this.getElement();
    await elem.click();
  }

  async verifyState() {
    await expect(this.page.getByText('Expected Text')).toBeVisible();
  }
}
```

**3. Add to fixtures:**
```typescript
// In framework/fixtures/testfixtures.ts
myPage: async ({ page }, use) => {
  await use(new MyPage(page));
}
```

**4. Use in tests:**
```typescript
test('Use my page', async ({ myPage }) => {
  await myPage.performAction();
  await myPage.verifyState();
});
```

### Configure AI Features

**1. Set environment variables:**
```bash
export OPENAI_API_KEY='sk-...'  # Required for AI
export CHROMA_URL='http://localhost:8000'  # Optional for remote vector DB
export FAILURE_TTL_DAYS=90  # Optional, default 90
```

**2. In CI/CD (GitHub Actions):**
```yaml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  CHROMA_URL: ${{ secrets.CHROMA_URL }}
```

**3. In CI/CD (Jenkins):**
```groovy
environment {
  OPENAI_API_KEY = credentials('openai-api-key')
  CHROMA_URL = 'http://chroma.internal:8000'
}
```

### Clear Test Cache

```bash
# Remove self-healing locator cache
rm framework/utils/selfHealingCache.worker-*.json

# Remove historical failures (local store)
rm framework/ai/historical_failures.worker-*.json

# Clear all reports
rm -rf reports/

# Clear test results
rm -rf test-results/

# Clear Playwright report
rm -rf playwright-report/
```

### Analyze Test Performance

```bash
# Run tests and capture durations
npx playwright test --reporter=json > test-results.json

# Extract slowest tests
cat test-results.json | jq '.tests | sort_by(.duration) | reverse | .[0:5]'
```

---

## 🤖 Understanding AI Reports

### What Gets Generated When a Test Fails

```
reports/
├── failure-1687200000000.json          ← Structured failure data
└── ai-failure-report-1687200000000.md  ← Human-readable analysis
```

### Reading the JSON Report

```json
{
  "testName": "Search Admin Menu",
  "failureCategory": "Locator Change",
  "errorMessage": "Element not found",
  "rootCause": "Placeholder was renamed",
  "confidence": 0.87,                    ← How confident (0-1)
  "recommendedFix": "Update locator...",
  "similarHistoricalFailures": [...]
}
```

**What the fields mean:**
- **failureCategory** – Type of failure (Locator/Network/Assertion/etc)
- **rootCause** – AI's diagnosis of the problem
- **confidence** – 0-1 score (0.9 = very confident, 0.5 = uncertain)
- **recommendedFix** – Suggested action to fix
- **similarHistoricalFailures** – Past failures that match this one

### Reading the Markdown Report

```markdown
# AI Failure Analysis

Test Name: Search Admin Menu
Failure Category: Locator Change
Root Cause: The search input placeholder was changed from 'Search' to 'Find'
Confidence: 87%

Recommended Fix: Update the test's getByPlaceholder() locator or add a CSS class fallback.

**Similar Historical Failures:**
1. id=uuid1 distance=0.15 ... [Previous placeholder change]
```

**How to use:**
1. Read "Root Cause" – understand what failed
2. Read "Recommended Fix" – see suggested solution
3. Check "Similar Historical Failures" – see if same issue happened before
4. Apply fix – update locators or report bug to development team

---

## 📊 Monitoring & Maintenance

### Weekly Tasks

- [ ] Review AI failure reports
- [ ] Check self-healing cache usage (if many fallbacks used, UI may be unstable)
- [ ] Verify all tests passing
- [ ] Check test execution times for regressions

**Command:**
```bash
npm test 2>&1 | tee weekly-test-run.log
cat reports/ai-failure-report-*.md
```

### Monthly Tasks

- [ ] Review locator stability (check if candidates changing frequently)
- [ ] Clean up old historical failures (TTL auto-expires after 90 days)
- [ ] Check vector DB size (if using ChromaDB, ensure not growing too large)
- [ ] Update application locator selectors if UI changed

**Command:**
```bash
# See what locators are being used
grep "using candidate" weekly-test-run.log | sort | uniq -c

# Check database size
du -sh framework/ai/historical_failures.worker-*.json
```

### Quarterly Tasks

- [ ] Audit all locators against current application UI
- [ ] Review AI prompt effectiveness (are suggested fixes accurate?)
- [ ] Update self-healing candidate chains if UI patterns changed
- [ ] Document any new UI patterns (e.g., if data-testid added)

**Command:**
```bash
# Generate comprehensive locator audit
npx playwright test --reporter=json | jq '.tests[] | {title, duration}' | sort -k2 -nr
```

---

## 🏗️ Architecture Reference

### Request/Response Flow (Example)

```
Test calls: searchPage.getSearchInput()
  ↓
SelfHealingLocator.get(page, 'searchInput', [5 candidates])
  ├─ Read cache: selfHealingCache.worker-0.json
  ├─ Test cached candidate
  └─ If pass: return | If fail: try next candidate
  ↓
Locator returned to test
  ↓
Test continues: locator.fill('Admin')
  ↓
Test passes or fails
  ↓
afterEach hook triggered
  ├─ Capture artifacts (screenshot, DOM, logs)
  └─ If failed: analyzeFailure(artifact)
     ├─ Classify failure (heuristics)
     ├─ Store to vector DB
     ├─ Query similar failures (RAG)
     ├─ Call LLM for root cause
     └─ Write JSON/Markdown reports
```

### File Dependency Graph

```
tests/
  ├─ login/
  │   ├─ valid-login.spec.ts
  │   │   └─ uses → LoginPage.ts
  │   │       └─ uses → selfHealingLocator.ts
  │   └─ invalid-login.spec.ts
  │       └─ uses → LoginPage.ts
  │
  └─ search/
      └─ search.spec.ts
          └─ uses → SearchPage.ts
              └─ uses → selfHealingLocator.ts

fixtures/
  └─ testfixtures.ts
      ├─ uses → LoginPage.ts
      ├─ uses → DashboardPage.ts
      ├─ uses → SearchPage.ts
      └─ afterEach → analyzeFailure()
          ├─ uses → failureAnalyzer.ts
          │   ├─ uses → vectorStore.ts
          │   └─ uses → rootCauseGenerator.ts
          │       └─ calls → OpenAI API
          └─ writes → reports/

utils/
  ├─ selfHealingLocator.ts
  │   └─ uses → logger.ts
  │       └─ Winston logging
  ├─ logger.ts
  └─ env.ts (constants)

ai/
  ├─ failureAnalyzer.ts
  ├─ vectorStore.ts
  └─ rootCauseGenerator.ts
```

---

## 💻 Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `OPENAI_API_KEY` | If using AI | None | OpenAI API key for embeddings & LLM |
| `CHROMA_URL` | No | None | ChromaDB HTTP endpoint (optional) |
| `FAILURE_TTL_DAYS` | No | 90 | Days before historical failures expire |
| `BASE_URL` | Yes | (in env.ts) | Application URL for tests |
| `USERNAME` | Yes | (in env.ts) | Test login username |
| `PASSWORD` | Yes | (in env.ts) | Test login password |

**Set environment variables:**
```bash
# Linux/Mac
export OPENAI_API_KEY='sk-...'

# Windows PowerShell
$env:OPENAI_API_KEY = 'sk-...'

# .env file (create in goCometUI/)
OPENAI_API_KEY=sk-...
CHROMA_URL=http://localhost:8000
```

---

## 🆘 Getting Help

### Framework Issues

**Problem:** Tests won't run
```bash
# Check Node.js version
node --version  # Should be 16+

# Reinstall dependencies
rm -rf node_modules
npm install
npm install --save-dev @types/node
```

**Problem:** TypeScript errors
```bash
# Check compilation
npm run typecheck

# Review tsconfig.json
cat tsconfig.json
```

**Problem:** Locator fails intermittently
```bash
# Enable tracing for detailed debug info
npx playwright test --trace on
npx playwright show-trace trace.zip
```

### AI Integration Issues

**Problem:** OpenAI API fails
```bash
# Verify key is set
echo $OPENAI_API_KEY

# Test API connectivity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Problem:** Reports not generating
```bash
# Check if test actually failed
npx playwright test --reporter=verbose

# Look for error logs in reporteroutput
grep -i error test-results.json
```

### Vector Database Issues

**Problem:** ChromaDB not connecting
```bash
# Verify endpoint
curl $CHROMA_URL/api/v1/heartbeat

# Fall back to local store (automatic)
# Local JSON store will be used if remote unavailable
```

---

## 📚 Documentation Hierarchy

This quick reference is Part 3 of comprehensive documentation:

1. **IMPLEMENTATION_GUIDE.md** – Start here for learning framework
2. **FRAMEWORK_ANALYSIS.md** – Deep-dive on 9 phases (for interviews/design reviews)
3. **locator-analysis-report.md** – Locator stability assessment
4. **QUICK_REFERENCE.md** ← You are here (day-to-day usage)

---

## 🚀 Pro Tips

### Tip 1: Use Self-Healing Everywhere
```typescript
// Before: fragile
const input = page.locator('input.search');

// After: resilient
const input = await SelfHealingLocator.get(page, 'searchInput', [
  { desc: 'semantic', factory: p => p.getByPlaceholder('Search') },
  { desc: 'css', factory: p => p.locator('input.search') }
]);
```

### Tip 2: Leverage Historical Failures
```bash
# When you see an AI report with high confidence, apply the recommended fix
# The vector DB learns from the fix and will suggest it for similar failures next time
```

### Tip 3: Monitor Cache Hit Rate
```bash
# If cache is hitting fallback candidates frequently, investigate UI stability
grep "candidate [2-4]" weekly-test-run.log
# If you see indices 2-4, the primary locators are failing → alert development team
```

### Tip 4: Use Headed Mode for Development
```bash
# When writing new tests, run in headed mode
npm run test:ui
# or
npx playwright test --headed --debug
# Step through and see what the browser sees
```

### Tip 5: Check Similar Historical Failures First
```bash
# Before updating a failing locator, check AI report
cat reports/ai-failure-report-*.md
# Often the fix has been done before; learn from similar cases
```

---

## 📞 Support

**For Framework Questions:** Review FRAMEWORK_ANALYSIS.md  
**For Implementation Help:** Review IMPLEMENTATION_GUIDE.md  
**For Daily Tasks:** This Quick Reference (you are here)  
**For Interview Prep:** Use FRAMEWORK_ANALYSIS.md + IMPLEMENTATION_GUIDE.md

**Common Searches:**
- "How do I add a test?" → See "Add a New Test" section
- "Test is failing, what do I do?" → See "Debugging Issues" section  
- "How does self-healing work?" → See IMPLEMENTATION_GUIDE.md
- "What's in an AI report?" → See "Understanding AI Reports" section

---

**Version:** 1.0  
**Last Updated:** June 2026  
**Status:** Production Ready ✅
