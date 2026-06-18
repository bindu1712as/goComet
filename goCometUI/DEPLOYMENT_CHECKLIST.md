# Deployment & Maintenance Checklist

Quick reference for deploying and maintaining the goCometUI Playwright framework.

---

## Pre-Deployment Checklist

### ✅ Code Quality
- [ ] All tests passing: `npm test`
- [ ] TypeScript check clean: `npx tsc --noEmit`
- [ ] No console errors
- [ ] All files committed to git

### ✅ Configuration
- [ ] `.env` file configured with BASE_URL
- [ ] OPENAI_API_KEY set (optional but recommended)
- [ ] `playwright.config.ts` reviewed
- [ ] Browser compatibility verified (chromium/firefox/webkit)

### ✅ Documentation
- [ ] README.md updated
- [ ] Team onboarded on new features
- [ ] CI/CD credentials configured
- [ ] Runbooks shared with team

### ✅ Reports
- [ ] Test reports generated clean
- [ ] No failures in reports/
- [ ] artifacts/ directory clean
- [ ] logs/ directory accessible

---

## GitHub Actions Deployment

### Initial Setup (One-Time)

```bash
# 1. Enable GitHub Actions (if not enabled)
# Settings → Actions → Allow all actions

# 2. Create secrets (Settings → Secrets and variables → Actions)
OPENAI_API_KEY = sk-...your-key...
BASE_URL = https://...your-url...

# 3. Push to repository
git push origin main
```

### Verify Deployment

```bash
# 1. Go to: https://github.com/YOUR_REPO/actions
# 2. Click on "E2E Tests - Playwright" workflow
# 3. Verify latest run shows:
#    ✓ All tests passed
#    ✓ Artifacts published
#    ✓ Reports available
```

### Troubleshooting GitHub Actions

| Issue | Solution |
|-------|----------|
| Tests fail but pass locally | Check BASE_URL matches test environment |
| No artifacts uploaded | Verify secrets are set correctly |
| Workflow not running | Enable in Settings → Actions |
| Timeout errors | Increase timeout in `.github/workflows/test.yml` |

---

## Jenkins Deployment

### Initial Setup (One-Time)

```bash
# 1. Create Pipeline Job in Jenkins
#    - Name: goCometUI-E2E-Tests
#    - Pipeline script from SCM
#    - Repository URL: (your repo)
#    - Script path: Jenkinsfile

# 2. Add Credentials (Manage Jenkins → Credentials)
#    - openai-api-key: (secret text)
#    - base-url: (secret text)

# 3. Create post-build steps
#    - Publish HTML reports
#    - Archive artifacts
```

### Verify Deployment

```bash
# 1. Run job: Build Now
# 2. Monitor console output for:
#    ✓ Setup successful
#    ✓ Tests executed
#    ✓ Reports generated
#    ✓ Artifacts archived
```

### Troubleshooting Jenkins

| Issue | Solution |
|-------|----------|
| Credentials not found | Verify credential IDs match Jenkinsfile |
| Node not installed | Install Node.js on Jenkins agent |
| Browsers not found | Run: `npx playwright install` |
| Artifact not published | Check artifact path and permissions |

---

## Local Development Maintenance

### Daily Checks

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Run tests
npm test

# 4. Review reports (if any failures)
npx playwright show-report
open reports/failure-analysis-*.html
```

### Weekly Tasks

```bash
# 1. Review vector store size
wc -l artifacts/failures.json

# 2. Check log directory
du -sh logs/

# 3. Archive old reports
tar czf reports-archive-week-$(date +%U).tar.gz reports/
rm reports/failure-analysis-*

# 4. Update locators if needed
# Review SearchPage for element changes
# Update selfHealingLocator candidates
```

### Monthly Tasks

```bash
# 1. Review failure trends
cat artifacts/failures.json | jq 'group_by(.category)'

# 2. Clean old logs
find logs/ -mtime +30 -delete

# 3. Update dependencies
npm update
npx playwright install

# 4. Run full matrix test (all browsers)
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

---

## Feature Enablement

### Enable Self-Healing Locators

Already enabled in SearchPage. To add to LoginPage:

```typescript
// framework/pages/LoginPage.ts
import { SelfHealingLocator } from '../utils/selfHealingLocator';

usernameTextbox(): Locator {
  return SelfHealingLocator.get(this.page, 'username', [
    { desc: 'direct', factory: p => p.locator('input[name="username"]') },
    { desc: 'placeholder', factory: p => p.getByPlaceholder('Username') },
    { desc: 'role', factory: p => p.getByRole('textbox', { name: 'username' }) }
  ]);
}
```

### Enable AI Failure Analysis

```bash
# 1. Set environment variable
export OPENAI_API_KEY="sk-..."

# 2. Run tests
npm test

# 3. Verify reports generated
ls -la reports/failure-analysis-*
```

To integrate into test lifecycle (optional):

```typescript
// In test afterEach hook
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    const artifact = await failureCollector.collectArtifacts(...);
    const analysis = await failureAnalyzer.analyzeFail(...);
    await reportGenerator.generateReports(...);
  }
});
```

---

## Scaling Guide

### Adding More Tests

```typescript
// tests/newfeature/test.spec.ts
import { test, expect } from '../../framework/fixtures/testfixtures';
import { SomeNewPage } from '../../framework/pages/SomeNewPage';

test('New feature test', async ({ authenticatedPage: page }) => {
  const page = new SomeNewPage(page);
  // Test logic...
});
```

### Adding More Locators with Self-Healing

```typescript
// In page object
import { SelfHealingLocator } from '../utils/selfHealingLocator';

getElement(): Locator {
  return SelfHealingLocator.get(this.page, 'elementName', [
    // Priority order:
    { desc: 'data-testid', factory: p => p.locator('[data-testid="id"]') },
    { desc: 'CSS selector', factory: p => p.locator('.css-class') },
    { desc: 'role', factory: p => p.getByRole('button') },
    { desc: 'text match', factory: p => p.getByText('Text') },
    { desc: 'XPath', factory: p => p.locator('//xpath') }
  ]);
}
```

### Parallel Execution

Configured in `playwright.config.ts`:
```typescript
fullyParallel: true,
workers: 3  // or process.env.CI ? 1 : 3
```

To run specific number of workers:
```bash
npx playwright test --workers=4
```

---

## Monitoring Dashboard (Optional)

### Create Metrics Dashboard

```bash
# Generate weekly report
cat artifacts/failures.json | jq '{
  total_failures: length,
  by_category: group_by(.category) | map({category: .[0].category, count: length}),
  by_test: group_by(.testName) | map({test: .[0].testName, failures: length})
}'
```

### Track Key Metrics

| Metric | Command | Frequency |
|--------|---------|-----------|
| Pass Rate | `npm test \| grep passed` | Daily |
| Failure Patterns | `cat artifacts/failures.json \| jq '.[] \| .category'` | Weekly |
| Slowest Tests | `cat test-results/results.json \| jq '.suites[].tests[] \| sort_by(.duration) \| reverse \| .[0:5]'` | Weekly |
| Vector Store Size | `wc -l artifacts/failures.json` | Monthly |

---

## Troubleshooting Guide

### Tests Running Slow

```bash
# 1. Check browser processes
ps aux | grep chrome

# 2. Disable unnecessary features
# Remove trace/video/screenshot if not needed in playwright.config.ts

# 3. Run with specific browser only
npx playwright test --project=chromium

# 4. Increase timeouts
test.setTimeout(60000);  // 60 seconds
```

### Intermittent Failures

```bash
# 1. Identify failing test
npm test

# 2. Run with retries
npx playwright test --grep "failing test" --retries=3

# 3. Run with trace
npx playwright test --trace=on

# 4. Check for timing issues
# Add explicit waits: await page.waitForLoadState('networkidle');
```

### AI Analysis Not Working

```bash
# 1. Check OpenAI key
echo "API Key set: $([ -n "$OPENAI_API_KEY" ] && echo 'Yes' || echo 'No')"

# 2. Test API connectivity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# 3. Check logs for errors
grep -i "openai\|api" logs/test-logs-*.json

# 4. Fallback works without key
# Framework automatically uses heuristic analysis if key unavailable
```

### Locator Not Found

```bash
# 1. Run with headed browser
npx playwright test --headed

# 2. Use debug mode
npx playwright test --debug

# 3. Check self-healing cache
cat framework/utils/selfHealingCache.json

# 4. Clear cache and retry
rm framework/utils/selfHealingCache.json
npm test

# 5. Update locator candidates if UI changed
# Edit SelfHealingLocator.get() call in page object
```

---

## Security Best Practices

### Protect Secrets

```bash
# Never commit secrets to git
echo ".env" >> .gitignore
echo "artifacts/" >> .gitignore

# Use environment variables in CI/CD
# GitHub: Settings → Secrets and variables → Actions
# Jenkins: Manage Jenkins → Credentials
```

### Handle Credentials Safely

```bash
# Bad: Hard-coded credentials
const username = 'Admin';
const password = 'admin123';

# Good: Environment variables
import { getEnv } from './env';
const username = getEnv('USERNAME');
const password = getEnv('PASSWORD');
```

### Audit Logs

```bash
# Review who ran tests
# GitHub: Actions → Workflow run history
# Jenkins: Build history → Console output

# Monitor for suspicious activity
grep -i "error\|failure\|unauthorized" logs/test-logs-*.json
```

---

## Version Control Workflow

### Commit Changes

```bash
# Feature development
git checkout -b feature/new-test
# ... make changes ...
git add .
git commit -m "feat: add new test for feature X"
git push origin feature/new-test
# Create Pull Request

# After review and tests pass
git merge feature/new-test
git push origin main
```

### Tag Releases

```bash
# After successful deployment
git tag -a v2.0.0 -m "Production release - Self-healing locators and AI analysis"
git push origin v2.0.0
```

---

## Rollback Procedure

### If Deployment Fails

```bash
# 1. Stop current CI/CD pipeline
# GitHub Actions: Cancel workflow run
# Jenkins: Stop job execution

# 2. Revert changes
git revert HEAD  # or git checkout previous-stable-commit

# 3. Push revert
git push origin main

# 4. Re-run tests
npm test

# 5. Verify stability
npx playwright show-report
```

---

## Documentation Updates

When deploying changes:

- [ ] Update version number (PROJECT_SUMMARY.md)
- [ ] Update "Last Updated" date
- [ ] Add change notes to README.md
- [ ] Update CHANGELOG (if maintaining one)
- [ ] Review and update runbooks

---

## Team Communication

### Deployment Notification

```markdown
# Deployment Notice

**Version**: 2.0
**Date**: June 19, 2026
**Changes**: 
- ✅ Self-healing locators for search
- ✅ AI-powered failure analysis
- ✅ Enhanced logging
- ✅ CI/CD pipelines

**Testing**: All 3 tests passing ✓

**Action Required**: None (backward compatible)

**Questions?** See INTEGRATION_GUIDE.md
```

### Weekly Status Report

```
Week of: June 19-25, 2026

✅ Deployments: 1 (v2.0 - production ready)
✅ Tests: 3/3 passing
✅ CI/CD: GitHub Actions + Jenkins ready
⚠️  Pending: AI analysis production tuning
```

---

## Emergency Procedures

### Critical Test Failure

```bash
# 1. Notify team immediately
# 2. Run debug
npx playwright test --debug --headed

# 3. Check latest changes
git log --oneline -5

# 4. Revert if needed
git revert HEAD
git push origin main

# 5. File incident report
# Include: error message, screenshots, logs
```

### Data Loss in Vector Store

```bash
# artifacts/failures.json corrupted

# 1. Backup corrupted file
cp artifacts/failures.json artifacts/failures.json.bak

# 2. Rebuild from scratch
rm artifacts/failures.json
npm test  # Generates new store

# 3. Restore from git history if available
git checkout HEAD~1 -- artifacts/failures.json
```

### API Rate Limiting (OpenAI)

```bash
# If getting rate limit errors:

# 1. Check quota
# Monitor: https://platform.openai.com/account/billing/overview

# 2. Temporarily disable LLM analysis
# unset OPENAI_API_KEY
# or set ENABLE_LLM_ANALYSIS=false

# 3. Framework automatically falls back to heuristics
# Tests continue to work without disruption
```

---

## Regular Review Schedule

### Daily (Automated)
- CI/CD pipeline execution
- Test results notification
- Failure alerts

### Weekly
- Review failure patterns
- Check test stability
- Update team metrics

### Monthly
- Archive old reports/logs
- Update dependencies
- Review and optimize performance

### Quarterly
- Comprehensive framework audit
- Update documentation
- Plan feature enhancements

---

## Success Criteria

Mark items complete as you progress:

### Week 1
- [ ] Tests passing locally
- [ ] CI/CD pipeline configured
- [ ] Team trained on new features
- [ ] Documentation accessible

### Week 2
- [ ] No critical failures
- [ ] Artifacts generating correctly
- [ ] AI analysis producing insights
- [ ] Logs being collected

### Week 4 (1 Month)
- [ ] Stable execution (≥95% pass rate)
- [ ] Vector store capturing patterns
- [ ] Team confident with framework
- [ ] Reports improving analysis accuracy

---

## Contact & Support

**Framework Owner**: QA Engineering Team  
**Technical Lead**: [Name/Contact]  
**DevOps Contact**: [Name/Contact]  

**Documentation**:
- Technical: FRAMEWORK_ENHANCEMENT_REPORT.md
- Integration: INTEGRATION_GUIDE.md
- Operations: TESTING_GUIDE.md
- Summary: PROJECT_SUMMARY.md

**Quick Help**: See relevant .md file or contact technical lead

---

**Last Updated**: June 19, 2026  
**Framework Version**: 2.0  
**Status**: Production Ready ✅
