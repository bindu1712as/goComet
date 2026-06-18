# goComet Automation Framework

## Overview

goComet is a unified test automation repository built using Playwright and TypeScript, covering both UI and API testing. The framework focuses on maintainability, scalability, reliability, and CI/CD readiness.

## Repository Structure

```text
goComet/
├── goCometUI/      # Playwright UI Automation Framework
├── goCometAPI/     # Playwright API Automation Framework
```

---

# UI Automation Framework

## Technology Stack

* Playwright
* TypeScript
* Node.js
* Allure Reporting
* GitHub Actions
* Jenkins

## Framework Highlights

* Page Object Model (POM)
* Reusable utilities
* Centralized configuration
* Environment support
* Allure reporting
* Cross-browser execution
* CI/CD integration

---

## Smart Locator Fallback Strategy

To improve test stability and reduce maintenance, a fallback locator strategy has been implemented.

### Locator Priority

1. Accessibility-based locators

```typescript
page.getByRole('button', { name: 'Login' })
```

2. Test ID locators

```typescript
page.getByTestId('login-btn')
```

3. CSS/XPath fallback locators

```typescript
page.locator('#loginButton')
```

### Benefits

* Reduces flaky tests
* Handles minor UI changes
* Improves execution reliability
* Minimizes maintenance effort

---

## MCP-Based Self-Healing Concept

The framework incorporates Playwright MCP concepts to improve locator resilience.

### Approach

When a locator fails:

* Capture page DOM information
* Analyze alternative matching elements
* Generate recommended locator strategies
* Assist in identifying resilient selectors

### Benefits

* Faster failure analysis
* Reduced debugging effort
* Improved test robustness
* AI-assisted locator recommendations

Note: MCP is currently leveraged as an intelligent locator recovery and analysis mechanism rather than fully autonomous self-healing.

---

## UI Validations Covered

* Element visibility validation
* Text validation
* URL validation
* Title validation
* Table validations
* Form submission validation
* Error message validation
* Navigation validation
* API response validation through network interception

---

# API Automation Framework

## Technology Stack

* Playwright API Testing
* TypeScript
* Playwright Request Context

---

## Framework Highlights

* Reusable API client layer
* Request/Response abstraction
* Environment configuration support
* Data-driven testing
* Schema validation
* CI/CD integration

---

## API Validations Implemented

### Status Code Validation

Validate expected response codes.

Examples:

* 200 OK
* 201 Created
* 400 Bad Request
* 401 Unauthorized
* 404 Not Found

---

### Response Body Validation

Validate:

* Mandatory fields
* Field values
* Data types
* Business rules

Example:

```typescript
expect(responseBody.name).toBe(expectedName);
expect(responseBody.id).toBeDefined();
```

---

### Schema Validation

Verify API contract consistency.

Validate:

* Required properties
* Optional properties
* Response structure
* Data types

---

### Header Validation

Validate:

* Content-Type
* Authorization
* Response metadata

---

### Response Time Validation

Ensure APIs respond within acceptable thresholds.

Example:

```typescript
expect(responseTime).toBeLessThan(2000);
```

---

### Negative Testing

Validate:

* Invalid payloads
* Missing mandatory fields
* Invalid authentication
* Invalid request parameters

---

## Data-Driven Testing

The API framework supports parameterized execution using external test data.

### Sources

* JSON files
* TypeScript test data files
* Playwright test parameterization

### Example Coverage

* User creation
* Login scenarios
* Boundary value testing
* Negative test scenarios
* Multiple payload combinations

### Benefits

* Improved test coverage
* Reduced code duplication
* Easy maintenance
* Scalable test execution

---

# Reporting

## UI Reports

* Playwright HTML Reports
* Allure Reports

## API Reports

* Playwright HTML Reports
* Allure Reports

---

# CI/CD Integration

The framework is integrated with:

* GitHub Actions
* Jenkins

Pipeline capabilities include:

* Automated execution
* Report generation
* Regression execution
* Continuous feedback

---

# Future Enhancements

* Advanced AI-assisted self-healing
* Contract testing
* Visual regression testing
* AI-driven test generation
* Automated failure analysis
* LLM-assisted test maintenance
