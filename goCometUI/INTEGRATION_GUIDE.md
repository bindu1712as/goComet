# Framework Integration Guide

This guide explains how to integrate the AI failure analysis system into your test execution lifecycle.

## Overview

The AI failure analysis system is **optional** and works alongside your existing tests. It:
- Automatically captures failure artifacts
- Analyzes root causes (with or without OpenAI)
- Generates reports in multiple formats
- Learns from historical failures

## Integration Methods

### Method 1: Automatic Hook Integration (Recommended)

Add an `afterEach` hook in your test spec that automatically triggers analysis on failure:

```typescript
// tests/search/search.spec.ts
import { test, expect } from '@playwright/test';
import { SearchPage } from '../../framework/pages/searchPage';
import { failureCollector } from '../../framework/ai/failureCollector';
import { failureClassifier } from '../../framework/ai/failureClassifier';
import { vectorStore } from '../../framework/ai/vectorStore';
import { ragAnalyzer } from '../../framework/ai/ragAnalyzer';
import { failureAnalyzer } from '../../framework/ai/failureAnalyzer';
import { reportGenerator } from '../../framework/ai/reportGenerator';
import { logger } from '../../framework/utils/logger';

test.describe('Search Tests', () => {
  test.afterEach(async ({ page }, testInfo) => {
    // Only analyze on failure
    if (testInfo.status !== 'passed') {
      try {
        logger.info(`Starting failure analysis for: ${testInfo.title}`);

        // Step 1: Collect artifacts
        const error = new Error(testInfo.error?.message || 'Test failed');
        const artifact = await failureCollector.collectArtifacts(
          testInfo.title,
          error,
          {
            testStatus: testInfo.status,
            duration: testInfo.duration,
            retry: testInfo.retry
          }
        );

        // Step 2: Classify failure
        const category = failureClassifier.classify(
          error.message,
          error.stack || ''
        );

        // Step 3: Query vector store for similar failures
        const { similarFailures } = await ragAnalyzer.getContext(artifact);

        // Step 4: Analyze with LLM
        const analysis = await failureAnalyzer.analyzeFail(
          artifact,
          similarFailures,
          category
        );

        // Step 5: Store in vector database
        await vectorStore.addFailure({
          id: artifact.id,
          testName: artifact.testName,
          errorMessage: artifact.errorMessage,
          category: category,
          timestamp: artifact.timestamp,
          rootCause: analysis.rootCause,
          suggestedFix: analysis.suggestedFix,
          confidence: analysis.confidence
        });

        // Step 6: Generate reports
        const reports = await reportGenerator.generateReports(
          artifact,
          analysis,
          similarFailures
        );

        logger.info(`✓ Failure analysis complete`);
        logger.info(`  - HTML Report: ${reports.html}`);
        logger.info(`  - JSON Report: ${reports.json}`);
        logger.info(`  - Markdown Report: ${reports.markdown}`);
      } catch (analysisError) {
        logger.error(`Failure analysis error: ${analysisError}`);
        // Don't fail the test due to analysis errors
      }
    }
  });

  test('Search Admin Menu', async ({ page }) => {
    const searchPage = new SearchPage(page);
    await searchPage.searchAndVerify('Admin');
  });
});
```

### Method 2: Global Fixture Hook

Create a global fixture in `testfixtures.ts`:

```typescript
// framework/fixtures/testfixtures.ts
import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { failureCollector } from '../ai/failureCollector';
import { failureClassifier } from '../ai/failureClassifier';
import { vectorStore } from '../ai/vectorStore';
import { ragAnalyzer } from '../ai/ragAnalyzer';
import { failureAnalyzer } from '../ai/failureAnalyzer';
import { reportGenerator } from '../ai/reportGenerator';
import { logger } from '../utils/logger';

type Fixtures = {
  page: Page;
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.login('Admin', 'admin123');
    
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.verifyDashboard();
    
    await use(page);
  }
});

// Global afterEach hook for failure analysis
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    try {
      logger.info(`Analyzing failure: ${testInfo.title}`);

      const error = new Error(testInfo.error?.message || 'Test failed');
      const artifact = await failureCollector.collectArtifacts(
        testInfo.title,
        error,
        {
          testStatus: testInfo.status,
          duration: testInfo.duration
        }
      );

      const category = failureClassifier.classify(error.message, error.stack || '');
      const { similarFailures } = await ragAnalyzer.getContext(artifact);
      const analysis = await failureAnalyzer.analyzeFail(artifact, similarFailures, category);

      await vectorStore.addFailure({
        id: artifact.id,
        testName: artifact.testName,
        errorMessage: artifact.errorMessage,
        category,
        timestamp: artifact.timestamp,
        rootCause: analysis.rootCause,
        suggestedFix: analysis.suggestedFix,
        confidence: analysis.confidence
      });

      const reports = await reportGenerator.generateReports(
        artifact,
        analysis,
        similarFailures
      );

      logger.info(`✓ Reports generated`);
    } catch (e) {
      logger.error(`Analysis failed: ${e}`);
    }
  }
});

export { expect } from '@playwright/test';
```

Then use in tests:

```typescript
import { test, expect } from '../../framework/fixtures/testfixtures';

test('Search Admin Menu', async ({ authenticatedPage: page }) => {
  // Use authenticatedPage which auto-logs in and analyzes failures
});
```

### Method 3: Manual Analysis (For Debugging)

Call analysis manually for specific tests:

```typescript
import { analyzeLastFailure } from '../../framework/ai/manualAnalysis';

test('Search Admin Menu', async ({ page }) => {
  try {
    const searchPage = new SearchPage(page);
    await searchPage.searchAndVerify('Admin');
  } catch (error) {
    // Manually trigger analysis
    await analyzeLastFailure('Search Admin Menu', error, page);
    throw error;
  }
});
```

## Configuration

### Enable/Disable Analysis

In `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Set to false to disable AI analysis
    enableAnalysis: true,
    
    // Only analyze specific failure types
    analyzeCategories: ['LocatorFailure', 'TimingIssue'],
    
    // Skip analysis for known flaky tests
    skipAnalysisPatterns: ['**/flaky/**', '**/known-issue/**']
  }
});
```

### Configure LLM

Create `.env`:

```bash
# Enable/disable OpenAI analysis
ENABLE_LLM_ANALYSIS=true

# OpenAI configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_TEMPERATURE=0.3
OPENAI_MAX_TOKENS=1000
```

## Output Structure

After test execution, check:

```
reports/
├── failure-analysis-1718806430123_abc123.json  # Structured data
├── failure-analysis-1718806430123_abc123.html  # Styled HTML report
└── failure-analysis-1718806430123_abc123.md    # Markdown summary

artifacts/
├── failures.json                                 # Vector store
└── failures/
    ├── failure-abc123.json                      # Artifact 1
    └── failure-def456.json                      # Artifact 2

logs/
└── test-logs-2024-06-19.json                    # Structured logs
```

## Viewing Reports

### HTML Report (Best for Human Review)
1. Open `reports/failure-analysis-*.html` in browser
2. Features:
   - Styled layout with confidence badges
   - Color-coded severity
   - Similar failures section
   - Recommended fixes highlighted

### JSON Report (Best for Automation)
1. Parse `reports/failure-analysis-*.json`
2. Fields:
   - `analysis.rootCause`: Primary issue
   - `analysis.confidence`: 0.0-1.0 score
   - `analysis.suggestedFix`: Recommended action
   - `similarFailures`: Historical context

### Markdown Report (Best for Documentation)
1. Review `reports/failure-analysis-*.md`
2. Contains:
   - Executive summary
   - Detailed analysis
   - Historical context
   - Recommended fixes

## Usage Examples

### Example 1: Basic Test with Analysis

```typescript
test('Search function', async ({ page }) => {
  const search = new SearchPage(page);
  await search.searchAndVerify('Admin');
});
```

When this test fails:
1. ✅ Artifact automatically captured
2. ✅ Failure classified (e.g., "LocatorFailure")
3. ✅ Vector store queried for similar cases
4. ✅ LLM analyzes if API key configured
5. ✅ Reports generated in 3 formats

### Example 2: Custom Error Context

```typescript
test('Login validation', async ({ page }) => {
  try {
    const login = new LoginPage(page);
    await login.navigateToLogin();
    await login.login('invalid', 'password');
  } catch (error) {
    const artifact = await failureCollector.collectArtifacts(
      'Login validation',
      error,
      {
        username: 'invalid',
        isNegativeTest: true,
        expectedBehavior: 'Show error message'
      }
    );
    throw error;
  }
});
```

### Example 3: Conditional Analysis

```typescript
test('Search with fallbacks', async ({ page }) => {
  const search = new SearchPage(page);
  
  // Self-healing search input
  const input = await SelfHealingLocator.get(page, 'searchInput', [
    { desc: 'getByPlaceholder', factory: p => p.getByPlaceholder('Search') },
    { desc: 'CSS', factory: p => p.locator('input[placeholder="Search"]') },
    { desc: 'Role', factory: p => p.getByRole('textbox') }
  ]);
  
  await input.fill('Admin');
  await input.press('Enter');
  
  // If fails, analysis captures which locator worked/failed
});
```

## Troubleshooting

### Reports Not Generated
```bash
# Check logs directory
ls -la logs/

# Check reports directory  
ls -la reports/

# Verify artifacts were collected
ls -la artifacts/failures/
```

### Analysis Failing Silently
```typescript
// Enable debug logging
import { logger } from '../utils/logger';

logger.info('Analysis starting...');
const analysis = await failureAnalyzer.analyzeFail(artifact, [], category);
logger.info(`Analysis complete: ${JSON.stringify(analysis)}`);
```

### OpenAI Not Working
```bash
# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check logs for API errors
cat logs/test-logs-*.json | grep "OpenAI\|api.openai"
```

### Vector Store Issues
```bash
# Check failures.json exists and is valid JSON
cat artifacts/failures.json | jq . | head -20

# Clear and rebuild if corrupted
rm artifacts/failures.json
npm test  # Rebuilds on next run
```

## Best Practices

1. ✅ **Always capture artifacts**: Enables better analysis
2. ✅ **Use descriptive error messages**: Helps classification
3. ✅ **Monitor vector store size**: Archive old failures periodically
4. ✅ **Review similar failures**: Spot patterns
5. ✅ **Validate LLM suggestions**: Don't blindly trust AI
6. ✅ **Keep logs clean**: Archive old logs monthly
7. ✅ **Version control reports**: Check in summary reports
8. ✅ **Integrate with CI/CD**: Publish artifacts automatically

## Next Steps

1. **Choose integration method** (Hook, Fixture, or Manual)
2. **Configure `.env`** with OpenAI key (optional)
3. **Run tests**: `npm test`
4. **Review reports** in `reports/` directory
5. **Fine-tune prompts** based on accuracy
6. **Integrate with CI/CD** (Jenkins/GitHub Actions)

---

For questions or issues, review:
- `FRAMEWORK_ENHANCEMENT_REPORT.md` - Architecture details
- `framework/ai/*.ts` - Source code documentation
- `framework/utils/logger.ts` - Logging examples
