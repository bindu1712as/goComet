# goCometUI Playwright Framework – Complete Analysis & Implementation Guide

**Author:** Test Automation Framework Team  
**Date:** June 2026  
**Version:** 1.0  
**Status:** Production Ready

---

## Executive Summary

The goCometUI Playwright TypeScript framework is a production-grade test automation solution with:
- **Self-healing locators** using priority-based candidate fallbacks
- **AI-powered failure analysis** leveraging OpenAI LLM + RAG architecture
- **ChromaDB vector storage** for historical failure tracking
- **Structured logging** via Winston
- **CI/CD ready** with Playwright reporters and custom analytics
- **3 UI test suites** (Login Valid, Login Invalid, Search Admin) – all passing

**Current Status:** ✅ All tests passing | ✅ AI framework integrated | ✅ CI/CD ready

---

# PHASE 1: FRAMEWORK ARCHITECTURE

## 1.1 Folder Structure

```
goCometUI/
├── framework/
│   ├── ai/
│   │   ├── failureAnalyzer.ts        # Orchestrates AI analysis
│   │   ├── vectorStore.ts             # ChromaDB + local store adapter
│   │   ├── rootCauseGenerator.ts       # OpenAI LLM integration
│   │   ├── ai-summary-reporter.js      # Playwright reporter extension
│   │   ├── ui/
│   │   │   ├── server.ts              # Express UI for manual resolution
│   │   │   └── index.html             # Web interface
│   │   └── __tests__/
│   │       ├── vectorStore.test.ts
│   │       └── rootCauseGenerator.test.ts
│   ├── pages/
│   │   ├── LoginPage.ts               # Login page object
│   │   ├── DashboardPage.ts           # Dashboard page object
│   │   └── SearchPage.ts              # Search page object (self-healing)
│   ├── fixtures/
│   │   └── testfixtures.ts            # Playwright fixture extensions
│   └── utils/
│       ├── selfHealingLocator.ts      # Locator recovery engine
│       ├── logger.ts                  # Winston-based structured logging
│       ├── env.ts                     # Environment variables
│       └── selfHealingCache.worker-*.json  # Per-worker cache
├── tests/
│   ├── login/
│   │   ├── valid-login.spec.ts
│   │   └── invalid-login.spec.ts
│   └── search/
│       └── search.spec.ts
├── reports/
│   ├── failure-*.json                 # AI failure artifacts
│   └── ai-failure-report-*.md         # AI failure analysis reports
├── playwright.config.ts               # Test runner configuration
├── tsconfig.json                      # TypeScript configuration
├── package.json                       # Dependencies and scripts
└── FRAMEWORK_ANALYSIS.md              # This file
```

## 1.2 Component Purposes

| Component | Purpose | Key Files |
|-----------|---------|-----------|
| **Page Objects** | Encapsulate page interactions using Page Object Model | `LoginPage.ts`, `DashboardPage.ts`, `SearchPage.ts` |
| **Fixtures** | Extend Playwright test with custom page instances and hooks | `testfixtures.ts` |
| **Self-Healing Locator** | Recover from locator failures using candidate fallbacks | `selfHealingLocator.ts` |
| **AI Failure Analysis** | Analyze test failures using LLM + RAG + vector search | `failureAnalyzer.ts`, `vectorStore.ts`, `rootCauseGenerator.ts` |
| **Logging** | Structured logging via Winston with JSON output | `logger.ts` |
| **Configuration** | Playwright test runner settings (trace, video, screenshot) | `playwright.config.ts` |

## 1.3 Test Execution Flow (High-Level)

```
Test Execution Lifecycle
├─ 1. Playwright discovers tests in ./tests
├─ 2. Fixtures initialize (LoginPage, DashboardPage, SearchPage)
│  └─ searchPage fixture attaches console/network collectors
├─ 3. Test runs (e.g., SearchPage.searchAndVerify('Admin'))
│  ├─ SearchPage.getSearchInput() calls SelfHealingLocator.get()
│  └─ SelfHealingLocator returns Locator after candidate testing
├─ 4. On failure: afterEach hook captures artifacts
│  ├─ Screenshot, DOM snapshot, console logs, network failures
│  └─ Calls analyzeFailure(artifact)
├─ 5. AI Analysis Pipeline
│  ├─ Classifies failure (Locator/Network/Assert/etc)
│  ├─ Persists to local + optional ChromaDB
│  ├─ Queries similar historical failures (RAG)
│  └─ Calls LLM (OpenAI) with context to generate root cause
├─ 6. Reports written to ./reports
│  └─ failure-<ts>.json + ai-failure-report-<ts>.md
└─ 7. Reporter prints fail-fast summary in console
```

## 1.4 Configuration Management

**Playwright Config** (`playwright.config.ts`):
- Test discovery: `testDir: './tests'`
- Reporters: `html`, `allure-playwright`
- Tracing: `'retain-on-failure'`
- Screenshot: `'only-on-failure'`
- Video: `'retain-on-failure'`
- Parallelism: `fullyParallel: true`

**Environment Variables**:
- `OPENAI_API_KEY` – OpenAI embeddings & LLM calls
- `CHROMA_URL` – ChromaDB REST endpoint (optional)
- `FAILURE_TTL_DAYS` – TTL for local failure records (default 90)
- `PLAYWRIGHT_WORKER_INDEX` – worker ID for per-worker cache naming
- `BASE_URL`, `USERNAME`, `PASSWORD` – test credentials (in `env.ts`)

**Fixture Setup** (`testfixtures.ts`):
```typescript
// Extends Playwright test with custom fixtures
export const test = base.extend<MyFixtures>({
  LoginPage: async ({ page }, use) => await use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => await use(new DashboardPage(page)),
  searchPage: async ({ page }, use) => {
    // Attach lightweight collectors
    (page as any).__consoleLogs = [];
    (page as any).__networkFailures = [];
    page.on('console', msg => {
      (page as any).__consoleLogs.push({ type: msg.type(), text: msg.text(), timestamp: new Date().toISOString() });
    });
    page.on('requestfailed', req => {
      (page as any).__networkFailures.push({ url: req.url(), failure: req.failure()?.errorText });
    });
    await use(new SearchPage(page));
  }
});

// Global afterEach hook for AI failure analysis
base.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return; // skip if passed
  // Capture artifacts and call analyzeFailure()
});
```

## 1.5 Test Data Management

- Test credentials stored in `framework/utils/env.ts`
- Tests access via `ENV.BASE_URL`, `ENV.USERNAME`, `ENV.PASSWORD`
- No external test-data loader; credentials injected at runtime
- **Improvement:** Could add test-data-builder pattern or fixtures for dynamic data

## 1.6 Reporting Architecture

| Reporter | Purpose | Output |
|----------|---------|--------|
| **Playwright HTML** | Default Playwright report | `playwright-report/index.html` |
| **Allure** | Allure TestOps integration | `allure-results/` |
| **AI Summary Reporter** | Custom Playwright reporter extension | Console fail-fast summary + `reports/` |
| **Failure JSON** | Structured failure artifact | `reports/failure-<ts>.json` |
| **Failure Markdown** | Human-readable AI analysis | `reports/ai-failure-report-<ts>.md` |

---

# PHASE 2: SELF-HEALING LOCATOR STRATEGY

## 2.1 Overview

**File:** `framework/utils/selfHealingLocator.ts`

The self-healing locator strategy is implemented via a utility class that:
1. Maintains a worker-scoped cache of successful locator indices
2. Tests candidates sequentially (priority-based)
3. Persists the selected candidate for future runs
4. Logs all attempts via structured logger

**Scope:** Currently integrated only into `SearchPage.searchAndVerify()`

## 2.2 Candidate Fallback Strategy (Priority Order)

**SearchPage locator candidates** (in `framework/pages/searchPage.ts`):

```typescript
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

**Priority Order:**
1. **getByPlaceholder('Search')** – Semantic locator (preferred, stable placeholder attribute)
2. **locator('input[placeholder="Search"]')** – Explicit CSS attribute selector
3. **locator('.oxd-input')** – CSS class fallback (when placeholder changed)
4. **getByRole('textbox')** – Generic ARIA role (broad fallback)
5. **XPath** – Last resort

## 2.3 Locator Selection Algorithm

**File:** `framework/utils/selfHealingLocator.ts` – `SelfHealingLocator.get()` method

```
Algorithm: SelfHealingLocator.get(page, name, candidates)

1. Read worker-scoped cache: selfHealingCache.worker-<index>.json
2. If cached index exists for 'name':
   a. Test cached candidate (count > 0 AND isVisible() AND isEnabled())
   b. If passes → return locator (fast path)
   c. If fails → log failure, continue to step 3
3. Iterate candidates in order:
   FOR each candidate:
     a. Create locator via candidate.factory(page)
     b. Check: count() > 0 (element exists)
     c. Check: isVisible() (visible on page)
     d. Check: isEnabled() (interactable)
     IF all pass:
       - Write cache: cache[name] = candidateIndex
       - Persist to file
       - Log selection
       - Return locator.first()
     ELSE:
       - Log failure reason
       - Continue to next candidate
4. If no candidate passes:
   - Throw Error: "no valid locator found for <name>"
```

## 2.4 Failure Detection & Recovery

**Failure Triggers:**
- `locator.count() === 0` – element not found in DOM
- `!isVisible()` – element exists but hidden
- `!isEnabled()` – element exists but disabled
- Exceptions from Playwright API

**Recovery Flow:**
- Each failed candidate is logged with reason
- Next candidate in priority order is tested
- First passing candidate is selected and cached
- If all fail → test failure (afterEach → AI analysis)

**Logging Example:**
```json
{
  "level": "info",
  "message": "SelfHealingLocator: using candidate 0 (getByPlaceholder('Search')) for searchInput",
  "timestamp": "2026-06-18T18:20:20.137Z"
}
```

## 2.5 Cache Persistence

**File:** `framework/utils/selfHealingCache.worker-<index>.json`

Example cache file:
```json
{
  "searchInput": 0,
  "loginButton": 2,
  "usernameField": 1
}
```

**Per-Worker Caching:**
- Each Playwright worker (parallel execution) has its own cache file
- Avoids write races in parallel test runs
- Cache read/write operations are best-effort (failures logged but non-blocking)

**TTL:** Currently no explicit TTL; cache persists until manually cleared or test run resets the worker

---

# PHASE 3: LOCATOR ANALYSIS & VALIDATION

## 3.1 Existing Test Locator Review

### Test 1: `tests/login/valid-login.spec.ts`

**Locators Used:**
- LoginPage: `getByPlaceholder('username')`, `getByPlaceholder('password')`, `getByRole('button', { name: 'Login' })`
- DashboardPage: `getByText('Dashboard')`

**Risk Assessment:** ✅ **Low Risk**
- Uses semantic locators (placeholder, role, text)
- Stable attributes (placeholder, button role, dashboard text)
- Fallback hierarchy: role > text > attribute

**Reliability:** High  
**Recovery Strategy:** Already using role-based + text-based (semantic)

---

### Test 2: `tests/login/invalid-login.spec.ts`

**Locators Used:**
- Same as valid-login (LoginPage, DashboardPage)

**Risk Assessment:** ✅ **Low Risk**
- Identical to valid-login
- Tests negative flow; locators stable

---

### Test 3: `tests/search/search.spec.ts` ⭐ Self-Healing

**Locators Used:**
- SearchPage: 5-candidate fallback chain (placeholder → CSS class → role → XPath)

**Risk Assessment:** ✅ **Medium Risk** (mitigated by self-healing)
- Primary locator (`getByPlaceholder('Search')`) is moderate risk
- UI changes could break placeholder attribute
- **Mitigation:** Self-healing candidate chain handles changes
- **Recovered:** With CSS class + role fallbacks

**Reliability:** High (with self-healing)

---

## 3.2 Fallback Strategy Effectiveness

| Test | Primary Locator | Fallback 1 | Fallback 2 | Fallback 3 | Risk | Coverage |
|------|-----------------|-----------|-----------|-----------|------|----------|
| Login Valid | Semantic (role/text) | N/A | N/A | N/A | Low | ✅ 100% |
| Login Invalid | Semantic (role/text) | N/A | N/A | N/A | Low | ✅ 100% |
| Search | Placeholder | CSS attr | CSS class | Role+XPath | Medium | ✅ 100% |

## 3.3 Validation Summary

**Current Framework Status:**
- ✅ All tests passing (3/3)
- ✅ Locators stable in current environment
- ✅ Self-healing search test has 5-layer fallback
- ✅ Login tests use semantic locators (lowest failure risk)

**Recommendations:**
1. Add CSS data-testid attributes to application (for semantic locators)
2. Extend self-healing to LoginPage (protective measure)
3. Monitor for UI changes that affect locators
4. Review placeholder/class stability quarterly

See detailed report: `locator-analysis-report.md` (generated separately)

---

# PHASE 4: AI FAILURE ANALYSIS (Data Collection)

## 4.1 Artifact Capture Pipeline

**File:** `framework/fixtures/testfixtures.ts` – `afterEach` hook

When a test fails, the framework automatically captures:

| Artifact | File | Storage | Purpose |
|----------|------|---------|---------|
| Screenshot | `failure-screenshot.png` | `testInfo.outputDir` | Visual failure evidence |
| DOM Snapshot | `dom-snapshot.html` | `testInfo.outputDir` | HTML structure at failure |
| Console Logs | `console-logs.json` | `testInfo.outputDir` | Application/browser logs |
| Network Failures | `network-failures.json` | `testInfo.outputDir` | Failed HTTP requests |
| Trace | `<auto>.zip` | `testInfo.outputDir` | Playwright trace (if enabled) |
| Video | `<auto>.webm` | `testInfo.outputDir` | Test execution video |

**Capture Code:**
```typescript
base.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return; // skip if passed

  const outDir = testInfo.outputDir;
  
  // 1. Screenshot
  await page.screenshot({ path: path.join(outDir, 'failure-screenshot.png'), fullPage: true });
  
  // 2. DOM snapshot
  const html = await page.content();
  fs.writeFileSync(path.join(outDir, 'dom-snapshot.html'), html, 'utf8');
  
  // 3. Console logs (collected via page.on('console'))
  fs.writeFileSync(path.join(outDir, 'console-logs.json'), JSON.stringify((page as any).__consoleLogs), 'utf8');
  
  // 4. Network failures (collected via page.on('requestfailed'))
  fs.writeFileSync(path.join(outDir, 'network-failures.json'), JSON.stringify((page as any).__networkFailures), 'utf8');
  
  // Call AI analyzer
  await analyzeFailure(artifact);
});
```

## 4.2 Storage Structure

```
goCometUI/test-results/
├── <browserName>-<test-name>/
│   ├── failure-screenshot.png
│   ├── dom-snapshot.html
│   ├── console-logs.json
│   ├── network-failures.json
│   ├── trace.zip (if enabled)
│   └── video.webm (if enabled)

goCometUI/reports/
├── failure-<timestamp>.json          # AI failure artifact
└── ai-failure-report-<timestamp>.md  # AI analysis report
```

## 4.3 Artifact Structure

**Example artifact passed to AI analyzer:**
```typescript
{
  testName: "Search Admin Menu",
  timestamp: "2026-06-18T19:05:50.342Z",
  errorMessage: "Locator('input[placeholder="Search"]') not found",
  stackTrace: "Error at /path/to/searchPage.ts:18...",
  screenshotPath: "/path/to/failure-screenshot.png",
  tracePath: "/path/to/trace.zip",
  videoPath: "/path/to/video.webm",
  consoleLogs: [{ type: "log", text: "Login successful", timestamp: "..." }],
  networkErrors: [{ url: "https://...", method: "GET", failure: "ERR_CONNECTION_REFUSED" }],
  domSnapshotPath: "/path/to/dom-snapshot.html"
}
```

---

# PHASE 5: VECTOR DATABASE (ChromaDB)

## 5.1 Architecture

**File:** `framework/ai/vectorStore.ts`

The vector store provides:
1. **Local fallback store** – worker-scoped JSON file for offline operation
2. **Remote ChromaDB integration** – optional remote vector DB for embeddings + RAG search
3. **Embeddings generation** – OpenAI `text-embedding-3-small` model
4. **TTL & resolution tracking** – historical failure records with expiration and manual resolution

## 5.2 Storage Implementation

### Local Store (Fallback)

**File:** `framework/ai/historical_failures.worker-<index>.json`

```json
[
  {
    "id": "uuid-1",
    "testName": "Search Admin Menu",
    "errorMessage": "Locator with placeholder 'Search' not found",
    "rootCause": "Placeholder attribute was renamed to 'find'",
    "resolution": null,
    "createdAt": 1687200000000,
    "expiresAt": 1694976000000,
    "resolved": false,
    "resolvedAt": null
  }
]
```

**Features:**
- Worker-scoped (per-parallel worker)
- TTL-aware (90 days default via `FAILURE_TTL_DAYS`)
- Manual resolution tracking (`resolved`, `resolution`, `resolvedAt`)
- Persists immediately on failure detection

### Remote Store (ChromaDB)

**Connection:** HTTP REST API to ChromaDB server (if `CHROMA_URL` set)

**Collection:** `failures_worker_<index>` (worker-scoped)

**Document schema:**
```json
{
  "id": "uuid",
  "embedding": [0.123, -0.456, ...],
  "metadata": {
    "testName": "Search Admin Menu",
    "errorMessage": "Locator not found",
    "rootCause": "UI change",
    "resolution": "Updated locator"
  }
}
```

## 5.3 Data Stored

| Field | Description | Example |
|-------|-------------|---------|
| `id` | Unique failure ID | `550e8400-e29b-41d4-a716-446655440000` |
| `testName` | Test that failed | `Search Admin Menu` |
| `errorMessage` | Error message | `Locator not found` |
| `rootCause` | AI-determined root cause | `Placeholder attribute changed` |
| `resolution` | Manual resolution notes | `Updated locator to use CSS class` |
| `createdAt` | Timestamp (ms) | `1687200000000` |
| `expiresAt` | Expiration timestamp | `1694976000000` (90 days later) |
| `resolved` | Resolution status | `true` / `false` |

## 5.4 Functions

**Upsert Failure:**
```typescript
await upsertFailureToChroma({
  testName: "Search Admin Menu",
  errorMessage: "Locator not found"
});
// Returns: { failureId: "uuid" }
```

**Query Similar Failures:**
```typescript
const similar = await querySimilarFailures(errorMessage, topK=5);
// Returns: [
//   { id: "uuid1", metadata: {...}, distance: 0.1 },
//   { id: "uuid2", metadata: {...}, distance: 0.2 }
// ]
```

**List Local Failures:**
```typescript
const failures = listLocalHistoricalFailures();
// Returns: array of all local failures
```

**Resolve Failure:**
```typescript
resolveLocalFailure(failureId, "Fixed by updating locator");
// Marks failure as resolved + stores resolution notes
```

---

# PHASE 6: RAG PIPELINE

## 6.1 Architecture

**RAG = Retrieval Augmented Generation**

The pipeline augments LLM prompts with relevant historical context:

```
Current Failure
  ↓
Vector Embedding (text-embedding-3-small)
  ↓
ChromaDB/Local Similarity Search (top-5 matches)
  ↓
Retrieve Similar Historical Failures
  ↓
Build Context Prompt
  ↓
OpenAI LLM (gpt-4o-mini)
  ↓
Root Cause + Recommended Fix
```

## 6.2 RAG Orchestration

**File:** `framework/ai/failureAnalyzer.ts` – `analyzeFailure()` function

```typescript
export async function analyzeFailure(artifact: Artifact) {
  // Step 1: Classify failure (heuristics)
  const category = classifyFailure(artifact);
  
  // Step 2: Store to vector DB (local + optional remote)
  await upsertFailureToChroma({
    testName: artifact.testName,
    errorMessage: artifact.errorMessage
  });
  
  // Step 3: Retrieve similar failures
  const similar = await querySimilarFailures(artifact.errorMessage, 5);
  
  // Step 4: Call LLM with context
  const llmResult = await generateRootCause(artifact, similar);
  
  // Step 5: Compose and write report
  const report = {
    testName: artifact.testName,
    failureCategory: category,
    rootCause: llmResult.mostProbableRootCause,
    confidence: llmResult.confidence,
    recommendedFix: llmResult.recommendedFix,
    similarHistoricalFailures: similar
  };
  
  // Write JSON + Markdown reports
  fs.writeFileSync(`reports/failure-${Date.now()}.json`, JSON.stringify(report, null, 2));
  fs.writeFileSync(`reports/ai-failure-report-${Date.now()}.md`, formatMarkdown(report));
}
```

## 6.3 RAG Benefits

- **Contextual analysis:** LLM receives historical context (similar failures)
- **Reduced hallucination:** Similar cases ground the analysis in real data
- **Pattern recognition:** LLM identifies patterns across multiple incidents
- **Confidence scoring:** Similar matches help assess confidence
- **Scalability:** Local fallback allows RAG without external dependencies

---

# PHASE 7: OPENAI INTEGRATION

## 7.1 LLM Configuration

**File:** `framework/ai/rootCauseGenerator.ts`

**Model:** `gpt-4o-mini`  
**Temperature:** `0.2` (deterministic, focused)  
**Max tokens:** `500`  

## 7.2 Failure Classification

**File:** `framework/ai/failureAnalyzer.ts` – `classifyFailure()` function

Classification uses heuristics on error message and stack trace:

```typescript
function classifyFailure(artifact: Artifact): string {
  const msg = artifact.errorMessage.toLowerCase();
  const stack = artifact.stackTrace.toLowerCase();

  if (artifact.networkErrors?.length > 0 || msg.includes('socket') || msg.includes('timeout'))
    return 'Network Failure';
  
  if (msg.includes('expect') || msg.includes('assert'))
    return 'Assertion Failure';
  
  if (msg.includes('auth') || msg.includes('401') || msg.includes('403'))
    return 'Authentication Failure';
  
  if (msg.includes('timeout') || msg.includes('timed out'))
    return 'Performance Issue';
  
  if (msg.includes('locator') || msg.includes('no node') || msg.includes('not visible') || msg.includes('detached'))
    return 'Locator Change';
  
  if (msg.includes('enotfound') || msg.includes('dns') || msg.includes('proxy'))
    return 'Environment Failure';
  
  if (msg.includes('data') && msg.includes('missing'))
    return 'Test Data Issue';
  
  return 'Application Defect';
}
```

**Supported Categories:**
1. Locator Change
2. Assertion Failure
3. Network Failure
4. Environment Failure
5. Authentication Failure
6. Test Data Issue
7. Application Defect
8. Performance Issue

## 7.3 LLM Prompt Construction

**File:** `framework/ai/rootCauseGenerator.ts` – `generateRootCause()` function

```typescript
const system = `You are an AI that analyzes test failures and suggests root causes and fixes. Respond in JSON only.`;

const user = `
Current failure:
${JSON.stringify(currentFailure, null, 2)}

Similar historical failures:
${JSON.stringify(similarFailures, null, 2)}

Provide JSON with keys: mostProbableRootCause, confidence (0-1), recommendedFix, similarHistoricalIncidents.
Keep answers concise.
`;

// Call OpenAI
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.2,
    max_tokens: 500
  })
});
```

## 7.4 LLM Output Parsing

**Expected JSON Response:**
```json
{
  "mostProbableRootCause": "The search input placeholder was changed from 'Search' to 'Find' in a recent UI update.",
  "confidence": 0.87,
  "recommendedFix": "Update the test's getByPlaceholder() locator to use 'Find' or add an additional CSS selector fallback.",
  "similarHistoricalIncidents": [
    { "id": "uuid1", "summary": "Similar placeholder change in v2.1" }
  ]
}
```

**Fallback Handling:**
- If JSON parsing fails, raw text is returned
- Missing keys default to safe values (confidence=0, fix='')
- Errors are logged via structured `logger`

---

# PHASE 8: FAILURE ANALYSIS REPORTS

## 8.1 Report Generation

**Files Generated:**
1. `failure-<timestamp>.json` – Structured artifact
2. `ai-failure-report-<timestamp>.md` – Human-readable analysis

## 8.2 JSON Report Structure

**File:** `reports/failure-1687200000000.json`

```json
{
  "testName": "Search Admin Menu",
  "timestamp": "2026-06-18T19:05:50.342Z",
  "failureCategory": "Locator Change",
  "errorMessage": "Locator('input[placeholder=\"Search\"]') not found",
  "stackTrace": "Error at /path/to/searchPage.ts:18:...",
  "screenshotPath": "/path/to/failure-screenshot.png",
  "tracePath": "/path/to/trace.zip",
  "videoPath": "/path/to/video.webm",
  "consoleLogs": [
    { "type": "log", "text": "Login successful", "timestamp": "2026-06-18T19:05:50.300Z" }
  ],
  "networkErrors": [],
  "domSnapshotPath": "/path/to/dom-snapshot.html",
  "rootCause": "The search input placeholder attribute was renamed from 'Search' to 'Find'.",
  "confidence": 0.87,
  "recommendedFix": "Update the getByPlaceholder() locator to 'Find' or add CSS class fallback.",
  "similarHistoricalFailures": [
    {
      "id": "uuid1",
      "metadata": {
        "testName": "Search Feature Test",
        "errorMessage": "Placeholder not found"
      },
      "distance": 0.15
    }
  ]
}
```

## 8.3 Markdown Report

**File:** `reports/ai-failure-report-1687200000000.md`

```markdown
# AI Failure Analysis

Test Name: Search Admin Menu

Failure Category: Locator Change

Root Cause: The search input placeholder attribute was renamed from 'Search' to 'Find' in a recent UI update.

Confidence: 87%

Recommended Fix:

Update the test's getByPlaceholder() locator to use 'Find' or add an additional CSS selector fallback. Consider adding data-testid='search-input' to the application for stability.

**Similar Historical Failures:**

1. id=uuid1 distance=0.15 summary={"testName":"Search Feature Test","errorMessage":"Placeholder not found"}

**LLM Summary:**

The search input placeholder attribute was renamed from 'Search' to 'Find' in a recent UI update.
```

## 8.4 Reporter Integration

**File:** `framework/ai/ai-summary-reporter.js` – Playwright reporter extension

Prints fail-fast summary during test run:

```
[AI] Search Admin Menu | Category: Locator Change | RootCause: Placeholder renamed… | Confidence: 87%

[AI Failure Summary — Aggregate]
1. Search Admin Menu — Locator Change — Placeholder renamed... — confidence=87%
```

---

# PHASE 9: CI/CD INTEGRATION

## 9.1 Local Execution

**Commands:**

```bash
# Run all tests
npm test

# Run with UI mode
npm run test:ui

# Run in debug mode
npm run test:debug

# Run with AI failure summary reporter
npm run ai-report

# Run AI unit tests
npm run ai-unit

# Start AI failure resolution UI server
npm run ai-server
```

**Local Output:**
- HTML report: `playwright-report/index.html`
- Failure artifacts: `test-results/<test-name>/`
- AI reports: `reports/failure-<ts>.json` + `reports/ai-failure-report-<ts>.md`
- Console: fail-fast summaries from reporter

## 9.2 Jenkins Integration

**Pipeline Stage (Example):**

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
      archiveArtifacts artifacts: 'goCometUI/reports/**', allowEmptyArchive: true
      archiveArtifacts artifacts: 'goCometUI/test-results/**', allowEmptyArchive: true
    }
  }
}
```

**Artifacts Published:**
- `goCometUI/playwright-report/` – HTML report
- `goCometUI/reports/` – AI failure reports
- `goCometUI/test-results/` – Screenshots, traces, videos

## 9.3 GitHub Actions Integration

**Workflow (Example):**

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
          retention-days: 30
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: ai-failure-reports
          path: goCometUI/reports/
          retention-days: 30
```

**GitHub Artifacts:**
- `playwright-report` – downloadable HTML report
- `ai-failure-reports` – AI analysis JSON/markdown

## 9.4 Environment Setup for CI/CD

**Required Secrets:**
- `OPENAI_API_KEY` – set in Jenkins/GitHub for AI integration
- `CHROMA_URL` – optional, for remote vector DB

**Example GitHub Actions:**

```yaml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  CHROMA_URL: ${{ secrets.CHROMA_URL }}
  FAILURE_TTL_DAYS: 90
```

## 9.5 Failure Recovery Workflow (CI/CD)

1. Test fails in CI
2. `afterEach` captures artifacts
3. `analyzeFailure()` is called
4. AI analyzer queries vector store, calls LLM
5. JSON/MD reports written to `reports/`
6. Reports uploaded as build artifacts
7. Team can review AI-generated root cause
8. Manual resolution recorded in local store
9. Next run uses learned patterns

---

# Summary & Checklist

## ✅ Completed Components

- [x] **Self-healing locator** – SearchPage with 5-candidate fallback
- [x] **AI failure analysis** – classifier, vector store, LLM integration
- [x] **ChromaDB integration** – local fallback + optional remote
- [x] **RAG pipeline** – embeddings, similarity search, LLM augmentation
- [x] **Structured logging** – Winston JSON logs
- [x] **Failure reports** – JSON + Markdown
- [x] **Reporter integration** – Playwright custom reporter
- [x] **Local execution** – npm scripts, tests passing
- [x] **CI/CD readiness** – Jenkins + GitHub Actions examples
- [x] **Unit tests** – vectorStore and rootCauseGenerator mocks

## 🚀 Production Ready

**Current Status:** All 3 tests passing | AI framework integrated | CI/CD configured

**Next Recommendations:**
1. Set up OPENAI_API_KEY in CI/CD
2. Optional: Configure CHROMA_URL for centralized vector storage
3. Monitor AI report quality and refine prompts as needed
4. Extend self-healing to LoginPage (defensive measure)
5. Add manual failure resolution UI (already implemented, available at `npm run ai-server`)

---

**End of Analysis Report**
