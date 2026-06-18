# goCometUI Testing Guide

Complete guide for running, debugging, and analyzing tests in the goCometUI Playwright framework.

## Quick Start

### Run All Tests Locally

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with UI mode (interactive)
npm run test:ui

# Run with debug mode
npm run test:debug
```

### Check Test Status

```bash
# List all tests
npx playwright test --list

# Run specific test file
npx playwright test tests/login/valid-login.spec.ts

# Run tests matching pattern
npx playwright test --grep "Login"

# Run single test
npx playwright test tests/login/valid-login.spec.ts -g "Valid Login"
```

## Test Structure

### Available Tests

```
tests/
├── login/
│   ├── valid-login.spec.ts      # Positive login test
│   │   └─ Valid Login (5-10s)
│   └── invalid-login.spec.ts    # Negative login test
│       └─ Invalid Login (8-12s)
└── search/
    └── search.spec.ts           # Search functionality test
        └─ Search Admin (15-20s)
```

### Test Execution Details

| Test | Duration | Purpose | Browser |
|------|----------|---------|---------|
| Valid Login | 5-10s | Verify successful login | All |
| Invalid Login | 8-12s | Verify error handling | All |
| Search Admin | 15-20s | Verify search with self-healing | Chromium |

## Running Tests

### Local Execution

```bash
# Single browser
npx playwright test --project=chromium

# Multiple browsers
npx playwright test --project=chromium --project=firefox

# All browsers
npx playwright test

# Headed mode (see browser)
npx playwright test --headed

# Debug mode (step through)
npx playwright test --debug

# Interactive UI mode
npx playwright test --ui
```

### With Reporters

```bash
# HTML report
npx playwright test --reporter=html
# View: playwright-report/index.html

# JSON report
npx playwright test --reporter=json > results.json

# GitHub Actions reporter
npx playwright test --reporter=github

# All reporters
npx playwright test \
  --reporter=html \
  --reporter=json \
  --reporter=junit \
  --reporter=github
```

### CI/CD Execution

```bash
# Via npm script
npm test

# Via container (if using Docker)
docker build -t gocometui-tests .
docker run --rm gocometui-tests

# With environment variables
BASE_URL="https://test.example.com" npm test
```

## Test Results

### View HTML Report

```bash
# After running tests
npx playwright show-report

# Or open directly
open playwright-report/index.html
```

### Analyze Results

```bash
# View test execution summary
npx playwright show-report --show

# Extract statistics
cat test-results/results.json | jq '.stats'

# Find failed tests
cat test-results/results.json | jq '.suites[].tests[] | select(.status != "passed")'
```

### Access Artifacts

```bash
# Screenshots on failure
ls test-results/**/*.png

# Videos (if enabled)
ls test-results/**/*.webm

# Traces (if enabled)
ls test-results/**/*.zip
```

## Debugging Failed Tests

### Step 1: Run with Debug Mode

```bash
# Interactive debugging
npx playwright test tests/search/search.spec.ts --debug

# This opens Playwright Inspector where you can:
# - Step through code line by line
# - Inspect DOM
# - Evaluate expressions
# - Set breakpoints
```

### Step 2: Review HTML Report

```bash
# Open the Playwright report
npx playwright show-report

# The report shows:
# ✓ Test status
# ✓ Execution time
# ✓ Error messages
# ✓ Screenshots on failure
# ✓ Video playback
# ✓ Trace files
```

### Step 3: Check Failure Analysis Reports

```bash
# After test failure (with AI analysis enabled)
ls -la reports/

# View HTML report (styled)
open reports/failure-analysis-*.html

# View JSON (for parsing)
cat reports/failure-analysis-*.json | jq

# View Markdown (for documentation)
cat reports/failure-analysis-*.md
```

### Step 4: Examine Logs

```bash
# View structured logs
cat logs/test-logs-*.json | jq '.'

# Filter by level
cat logs/test-logs-*.json | jq 'select(.level == "ERROR")'

# Filter by timestamp
cat logs/test-logs-*.json | jq 'select(.timestamp > "2024-06-19T10:00")'
```

### Step 5: Check Self-Healing Cache

```bash
# View which locators worked
cat framework/utils/selfHealingCache.json | jq '.'

# Example output:
# {
#   "searchInput": 0
# }
# ^ Means candidate 0 (getByPlaceholder) worked
```

## Debugging Scenarios

### Scenario: Test Fails - Locator Not Found

```bash
# Run with trace collection
npx playwright test --trace=on

# After failure, open trace
npx playwright show-trace test-results/trace.zip
```

Then in Trace Viewer:
1. Navigate to the failing action
2. Inspect the DOM snapshot
3. Verify locator selector
4. Check if element exists

**Solution**: Update locator or add fallback candidate in `selfHealingCache.json`

### Scenario: Test Fails - Timeout

```bash
# Increase timeout temporarily
npx playwright test --timeout=60000

# Or in test file:
test.setTimeout(60000);
```

**Debugging Steps**:
1. Check network tab in trace viewer
2. Verify element load time
3. Consider adding explicit waits

**Solution**:
```typescript
// Add explicit wait before action
await page.waitForLoadState('networkidle');
await searchPage.searchAndVerify('Admin');
```

### Scenario: Test Passes Locally, Fails in CI

```bash
# Simulate CI environment
CI=true npm test

# Check for environment variables
echo $BASE_URL
echo $LOG_LEVEL

# Check network connectivity
curl -I $BASE_URL
```

**Common Causes**:
- Different BASE_URL in CI
- Missing environment variables
- Network restrictions
- Timing issues (add waits)

**Solution**: Update `.env` or CI configuration

## Analyzing Failures with AI

### Automatic Analysis (If Enabled)

After a test failure, reports are generated automatically:

```
reports/
├── failure-analysis-1718806430123_abc123.json
├── failure-analysis-1718806430123_abc123.html
└── failure-analysis-1718806430123_abc123.md
```

### View Analysis Reports

```bash
# HTML (Best for visual review)
open reports/failure-analysis-*.html

# JSON (Best for automation)
cat reports/failure-analysis-*.json | jq '.analysis'

# Markdown (Best for documentation)
cat reports/failure-analysis-*.md
```

### Example Analysis Output

```json
{
  "rootCause": "Element not found: input[placeholder='Search'] is no longer available",
  "category": "LocatorFailure",
  "confidence": 0.92,
  "suggestedFix": "Update selector to use data-testid or getByRole('textbox')",
  "owner": "Automation Engineer"
}
```

### Learning from History

Vector store tracks all failures:

```bash
# View historical failures
cat artifacts/failures.json | jq '. | length'  # Total failures

# Find similar past failures
cat artifacts/failures.json | jq '.[] | select(.category == "LocatorFailure")'

# Analyze trends
cat artifacts/failures.json | jq 'group_by(.category) | map({category: .[0].category, count: length})'
```

## Best Practices

### 1. **Before Running Tests**

```bash
# Check environment setup
npm run verify-setup

# Verify .env is configured
cat .env

# Ensure browser is installed
npx playwright install chromium
```

### 2. **During Test Development**

```bash
# Use headed mode to watch execution
npx playwright test --headed

# Use debug mode for stepping
npx playwright test --debug

# Use UI mode for interactive exploration
npx playwright test --ui
```

### 3. **After Test Failures**

```bash
# 1. View HTML report
npx playwright show-report

# 2. Review AI analysis
open reports/failure-analysis-*.html

# 3. Check logs
tail -f logs/test-logs-*.json | jq '.[] | select(.level == "ERROR")'

# 4. Inspect trace
npx playwright show-trace test-results/trace.zip
```

### 4. **For CI/CD Integration**

```bash
# Test CI configuration locally
CI=true npm test

# Verify artifact generation
[ -f reports/failure-analysis-*.json ] && echo "✓ Reports generated" || echo "✗ No reports"

# Check log directory
[ -d logs ] && ls -la logs/ || echo "✗ Logs not found"
```

## Troubleshooting Guide

### Problem: Tests Won't Run

```bash
# Step 1: Check Node version
node --version  # Should be 18+

# Step 2: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Step 3: Install browsers
npx playwright install

# Step 4: Verify Playwright setup
npx playwright install --with-deps chromium
```

### Problem: Tests Run But Fail Immediately

```bash
# Step 1: Check BASE_URL
echo $BASE_URL

# Step 2: Verify network connectivity
curl -I $BASE_URL

# Step 3: Check credentials
echo "Username: $USERNAME"
# Don't echo password for security

# Step 4: Run single test with trace
npx playwright test tests/login/valid-login.spec.ts --trace=on
```

### Problem: Self-Healing Locator Not Working

```bash
# Step 1: Check cache file
cat framework/utils/selfHealingCache.json

# Step 2: View logs
cat logs/test-logs-*.json | jq 'select(.message | contains("SelfHealing"))'

# Step 3: Delete cache and retry
rm framework/utils/selfHealingCache.json
npm test
```

### Problem: AI Analysis Not Working

```bash
# Step 1: Check OpenAI key
echo "Key set: $([ -n "$OPENAI_API_KEY" ] && echo 'Yes' || echo 'No')"

# Step 2: Check reports directory
ls -la reports/ || echo "No reports generated"

# Step 3: Check logs for errors
grep -i "openai\|analysis" logs/test-logs-*.json

# Step 4: Verify artifacts exist
ls artifacts/failures/ || echo "No failure artifacts"
```

### Problem: Tests Pass Locally, Fail in CI

```bash
# Step 1: Replicate CI environment
docker run --rm -v $(pwd):/workspace node:18 bash -c "cd /workspace && npm test"

# Step 2: Check environment variables in CI
# Verify BASE_URL is set correctly

# Step 3: Check for timing issues
# Add explicit waits before assertions

# Step 4: Review CI logs
# Look for network errors, permission issues, etc.
```

## Performance Optimization

### Parallel Execution

```bash
# Enabled by default in playwright.config.ts
# fullyParallel: true

# Run all tests in parallel (fastest)
npm test

# Run sequentially if needed
npx playwright test --workers=1
```

### Reduce Execution Time

```bash
# Run only specific browser
npx playwright test --project=chromium

# Run only specific test file
npx playwright test tests/login/

# Skip video/trace collection
npx playwright test --reporter=html (default is fastest)
```

### Monitor Performance

```bash
# Get test duration summary
cat test-results/results.json | jq '.suites[].tests[] | {title, duration}'

# Find slowest tests
cat test-results/results.json | jq '.suites[].tests[] | select(.duration) | sort_by(.duration) | reverse | .[0:5] | .[] | {title, duration}'
```

## CI/CD Setup

### GitHub Actions

```bash
# Check workflow file
cat .github/workflows/test.yml

# View workflow runs
# Go to: https://github.com/YOUR_REPO/actions
```

### Jenkins

```bash
# Check Jenkinsfile
cat Jenkinsfile

# Run locally (requires Jenkins or Docker)
docker run --rm -v $(pwd):/workspace -e CI=true node:18 bash -c "cd /workspace && npm test"
```

## Reporting and Analytics

### Generate Test Report

```bash
# View default HTML report
npx playwright show-report

# Export to PDF (requires additional setup)
# Or screenshot the report manually
```

### Create Failure Summary

```bash
# Extract failure statistics
cat test-results/results.json | jq '{
  total: .stats.expected,
  passed: (.stats.expected - .stats.failed),
  failed: .stats.failed,
  skipped: .stats.skipped,
  passRate: (((.stats.expected - .stats.failed) / .stats.expected) * 100 | round) / 100
}'
```

### Share Results

```bash
# Copy HTML report
cp -r playwright-report/ /path/to/shared/reports/

# Export JSON
cp test-results/results.json /path/to/shared/results.json

# Archive
tar czf test-results-2024-06-19.tar.gz test-results/ reports/ artifacts/
```

## Additional Resources

- **Framework Architecture**: See `FRAMEWORK_ENHANCEMENT_REPORT.md`
- **Integration Guide**: See `INTEGRATION_GUIDE.md`
- **Playwright Docs**: https://playwright.dev
- **Self-Healing Guide**: See `framework/utils/selfHealingLocator.ts`
- **Logger Guide**: See `framework/utils/logger.ts`

## Quick Commands Reference

```bash
# Run tests
npm test                              # All tests, all browsers
npm run test:debug                    # Interactive debugging
npm run test:ui                       # Interactive UI mode
npx playwright test --headed          # Watch execution
npx playwright test --project=chromium # Single browser

# View reports
npx playwright show-report            # HTML report
npx playwright show-trace ...trace.zip # Trace viewer

# Debug
npx playwright test --debug           # Step through
npx playwright test --trace=on        # Collect trace

# CI/CD
CI=true npm test                      # Simulate CI environment
npm run typecheck                     # TypeScript check

# Maintenance
npm install                           # Install deps
npx playwright install                # Install browsers
npm run clean                         # Clean artifacts
```

---

**Last Updated**: June 19, 2026  
**Framework Version**: 2.0  
**Status**: Production Ready
