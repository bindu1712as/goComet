# Locator Analysis Report – goCometUI Framework

**Date:** June 2026  
**Framework:** goCometUI Playwright TypeScript  
**Scope:** All UI tests in `/tests`

---

## Executive Summary

All 3 existing tests use stable locator strategies with minimal risk. The search test is protected by a 5-candidate self-healing fallback chain. Login tests use semantic locators (role/text) which are the lowest-risk approach.

| Test | Primary Locator | Risk Level | Fallback Coverage | Recommendation |
|------|-----------------|------------|------------------|-----------------|
| Valid Login | Semantic (role/text) | 🟢 Low | N/A | ✅ No changes needed |
| Invalid Login | Semantic (role/text) | 🟢 Low | N/A | ✅ No changes needed |
| Search Admin | Placeholder-based | 🟡 Medium | ✅ 5-layer fallback | ✅ Self-healing protects |

---

## Test 1: `tests/login/valid-login.spec.ts`

### Test Purpose
Validates successful login with valid credentials (Admin/Admin123)

### Locators Used

**LoginPage.ts**:
```typescript
// Username field
page.getByPlaceholder('username')

// Password field
page.getByPlaceholder('password')

// Login button
page.getByRole('button', { name: 'Login' })
```

**DashboardPage.ts**:
```typescript
// Dashboard verification
page.getByText('Dashboard')
```

### Locator Strategy Analysis

| Locator | Type | Stability | Reason |
|---------|------|-----------|--------|
| `getByPlaceholder('username')` | Semantic | 🟢 High | Placeholder is core input attribute |
| `getByPlaceholder('password')` | Semantic | 🟢 High | Placeholder is core input attribute |
| `getByRole('button', { name: 'Login' })` | Semantic (ARIA) | 🟢 High | Role + accessible name is stable |
| `getByText('Dashboard')` | Semantic | 🟢 High | Page title/heading rarely changes |

### Risk Assessment

**Overall Risk Level:** 🟢 **LOW RISK**

**Strengths:**
- Uses semantic locators (placeholder, role, text) – lowest failure risk
- Playwright's `getByPlaceholder`, `getByRole` are accessibility-based and rarely break
- Multiple independent elements → no single point of failure
- Login flow is mission-critical and well-tested in application

**Weaknesses:**
- No explicit fallback strategy defined
- If placeholder naming convention changes across application → could break
- If button text "Login" is internationalized → could break

### Failure Scenarios

**Low Probability:**
1. Placeholder `'username'` renamed → would break but application would be broken
2. Login button text changed → unlikely (core UX element)
3. Page structure completely redesigned → rare

### Fallback Strategy (Current)

**Implicit fallback:** None. Test depends solely on semantic locators.

**Suggested explicit fallbacks (for defensive coding):**
1. `getByRole('textbox').first()` – first textbox (fallback for username)
2. `getByRole('textbox').nth(1)` – second textbox (fallback for password)
3. `locator('button').first()` – first button (fallback for Login)

### Recommendation

✅ **Keep as-is.** No changes needed. Semantic locators are stable and maintainable.

**Optional enhancement:** Add explicit CSS data-testid to application input fields for maximum stability:
```html
<input data-testid="username-input" placeholder="username" />
<input data-testid="password-input" placeholder="password" />
<button data-testid="login-button">Login</button>
```

Then update locators:
```typescript
page.getByTestId('username-input')
page.getByTestId('password-input')
page.getByTestId('login-button')
```

---

## Test 2: `tests/login/invalid-login.spec.ts`

### Test Purpose
Validates login rejection with invalid credentials (wrong/wrongpassword)

### Locators Used

**LoginPage.ts** (same as valid-login):
```typescript
page.getByPlaceholder('username')
page.getByPlaceholder('password')
page.getByRole('button', { name: 'Login' })
```

**Verification:**
```typescript
// Tests expect error message
page.getByText(/invalid credentials/i)
```

### Locator Strategy Analysis

Same as Test 1, with addition of error message verification.

### Risk Assessment

**Overall Risk Level:** 🟢 **LOW RISK**

**Strengths:**
- Identical stable locators as Test 1
- Error message uses case-insensitive regex match (flexible)
- Negative flow is important but less frequently UI-refactored than happy path

**Weaknesses:**
- Error message text subject to change (UX copy updates)
- If error message is removed/hidden in future → test breaks

### Failure Scenarios

**Low Probability:**
1. Error message text changes → easy to fix
2. Error message removed entirely → application issue
3. UI structure changes → unlikely for core auth flow

### Fallback Strategy (Current)

**Implicit fallback:** Regex match on error message (flexible to minor text changes)

**Suggested explicit fallback:**
```typescript
// Primary
await expect(page.getByText(/invalid credentials/i)).toBeVisible();

// Fallback if message text changes
const errorIndicators = page.locator('[role="alert"], .error, .notification');
await expect(errorIndicators).toBeVisible();
```

### Recommendation

✅ **Keep as-is.** Regex approach is already defensive.

**Optional:** Add a more robust error detection:
```typescript
await expect(
  page.locator('[role="alert"], .error-message, .notification')
).toBeVisible();
```

---

## Test 3: `tests/search/search.spec.ts` ⭐ Self-Healing

### Test Purpose
Validates search functionality (search for "Admin" and verify result appears)

### Locators Used

**SearchPage.ts** - Self-healing locator with 5 candidates:

```typescript
await SelfHealingLocator.get(this.page, 'searchInput', [
  { desc: `getByPlaceholder('Search')`, factory: p => p.getByPlaceholder('Search') },
  { desc: `locator('input[placeholder="Search"]')`, factory: p => p.locator('input[placeholder="Search"]') },
  { desc: `locator('.oxd-input')`, factory: p => p.locator('.oxd-input') },
  { desc: `getByRole('textbox')`, factory: p => p.getByRole('textbox') },
  { desc: `xpath input[@placeholder='Search']`, factory: p => p.locator("//input[@placeholder='Search']") }
]);

// Verify result
page.getByText('Admin', { exact: true })
```

### Locator Strategy Analysis

| Candidate # | Strategy | Type | Stability | When Used |
|-------------|----------|------|-----------|-----------|
| 1 | `getByPlaceholder('Search')` | Semantic | 🟡 Medium | Primary (preferred) |
| 2 | `locator('input[placeholder="Search"]')` | CSS attribute | 🟡 Medium | Placeholder selector fallback |
| 3 | `locator('.oxd-input')` | CSS class | 🟠 Lower | Class-based fallback |
| 4 | `getByRole('textbox')` | ARIA role | 🟡 Medium | Broad semantic fallback |
| 5 | XPath `//input[@placeholder='Search']` | XPath | 🟠 Lower | Last resort |

### Risk Assessment

**Overall Risk Level:** 🟡 **MEDIUM RISK** (mitigated by self-healing)

**Strengths:**
- 5-layer fallback chain covers multiple failure modes
- Semantic + CSS + XPath coverage
- Self-healing automatically selects first working candidate
- Successful candidate is cached per-worker for performance
- Logging tracks all attempts

**Weaknesses:**
- Primary locator (placeholder) is mid-risk
- Candidate 4 (getByRole('textbox')) might match wrong input if multiple textboxes present
- No DOM similarity scoring or AI-driven locator suggestion
- Local cache could stale if UI structure changes dramatically

### Failure Scenarios

**Medium Probability (handled by fallbacks):**
1. **Placeholder renamed from 'Search' to 'Find'**
   - Candidate 1 fails → Candidate 3 (CSS class) succeeds
   - ✅ Self-healing recovers

2. **CSS class '.oxd-input' removed**
   - Candidate 3 fails → Candidate 4 (getByRole) succeeds
   - ✅ Self-healing recovers

3. **Multiple textboxes present**
   - Candidate 4 (getByRole) might match wrong input
   - ⚠️ Risk: silent test pass with wrong element
   - Mitigation: visibility + enabled checks prevent this

4. **Search input moved to iframe**
   - All candidates fail
   - ❌ Test fails → AI analyzer triggered
   - 🤖 AI suggests fix

5. **Search input completely removed**
   - All candidates fail
   - ❌ Test fails → AI analyzer triggered
   - 🤖 AI suggests fix

### Fallback Strategy (Current)

✅ **5-candidate self-healing chain implemented:**
- Semantic → CSS → ARIA → XPath
- Per-worker cache for performance
- Visibility + enabled checks prevent false matches
- Logging tracks recovery

**Effectiveness Score:** 8/10
- Very comprehensive for common UI changes
- Lacks embedding-based suggestion or DOM similarity scoring
- No human-in-loop validation for ambiguous cases

### Improvements (Optional)

**High Priority:**
1. Add `data-testid='search-input'` to application
   - Insert as Candidate 0 (highest priority)
   - Would raise effectiveness to 9/10

**Medium Priority:**
2. Add DOM similarity scoring
   - On candidate failure, compute DOM fragment hash
   - Query vector DB for similar elements
   - Suggest candidates with highest DOM similarity

3. Add AI-driven locator generation
   - If all candidates fail, call LLM to generate new selectors
   - LLM analyzes DOM snapshot + error to suggest new candidates

**Low Priority:**
4. Add confidence scoring
   - Track success rate of each candidate
   - Prioritize by success frequency instead of static order

### Recommendation

✅ **Current implementation is GOOD. No immediate changes needed.**

**Next Steps (for robustness):**
1. **Short-term:** Add `data-testid='search-input'` to search input in application
2. **Medium-term:** Monitor search locator changes in application releases
3. **Long-term:** Implement embedding-based locator suggestion for all tests

---

## Summary Table

| Test | Risk | Locator Type | Fallback | Self-Healing | Overall Assessment |
|------|------|--------------|----------|--------------|-------------------|
| Valid Login | Low | Semantic | None | N/A | ✅ Stable |
| Invalid Login | Low | Semantic + Regex | Implicit | N/A | ✅ Stable |
| Search Admin | Medium | 5-layer chain | Explicit | ✅ Active | ✅ Protected |

---

## General Recommendations

### 1. Application-Side Improvements

**Add test-friendly attributes to all interactive elements:**
```html
<!-- Before -->
<input placeholder="Search" />

<!-- After -->
<input data-testid="search-input" placeholder="Search" />
```

**Benefits:**
- Makes locators independent of UI styling
- Enables robust cross-browser testing
- Explicit intent for test automation

### 2. Test Framework Improvements

**Add to all Page Objects (not just Search):**
```typescript
// Extend LoginPage with self-healing
private async getUsernameInput(): Promise<Locator> {
  return await SelfHealingLocator.get(this.page, 'usernameInput', [
    { desc: `getByTestId('username-input')`, factory: p => p.getByTestId('username-input') },
    { desc: `getByPlaceholder('username')`, factory: p => p.getByPlaceholder('username') },
    { desc: `locator('input').first()`, factory: p => p.locator('input').first() }
  ]);
}
```

### 3. Monitoring & Maintenance

**Quarterly Locator Audit:**
- Review application UI changes each quarter
- Run self-healing reports to see which candidates are used
- Update fallback strategy if patterns change

**Local Store Review:**
```bash
cat framework/utils/selfHealingCache.worker-0.json
# Shows which candidates were selected
# If candidates change frequently → indicates instability
```

### 4. CI/CD Integration

**Add locator monitoring to build reports:**
```bash
# Extract locator usage from test logs
grep "using candidate" test-results/*.json

# Alert if candidate index >= 2 (using fallback)
# Indicates potential instability in application
```

---

## Conclusion

**Current State:** ✅ All tests have acceptable or excellent locator strategies

**Locator Strategy Health Score:** 8/10
- Login tests: 9/10 (semantic, stable)
- Search test: 7/10 (explicit fallback, but could benefit from data-testid)

**Recommendation:** No immediate action required. Framework is production-ready.

---

**Report Generated:** June 2026  
**Next Review:** Q3 2026
