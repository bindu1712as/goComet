# UI Test Automation Framework Design Document

## Overview

This framework automates Login and Search workflows for the OrangeHRM application using Playwright and TypeScript.

Application Under Test:

https://opensource-demo.orangehrmlive.com/

---

## Framework Architecture

```text
tests
│
├── login
│   ├── valid-login.spec.ts
│   └── invalid-login.spec.ts
│
├── search
│   └── search.spec.ts
│
framework
│
├── pages
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   └── SearchPage.ts
│
├── fixtures
│   └── testfixtures.ts
│
└── utils
    ├── env.ts
    └── logger.ts
```

---

## Design Pattern

Page Object Model (POM)

Benefits:

* Improved maintainability
* Reusable page methods
* Better readability
* Reduced code duplication

---

## Implemented Features

### Login

* Valid Login
* Invalid Login Validation

### Search

* Search menu item
* Verify search result

---

## Locator Strategy

Priority based fallback locators are implemented.

Example:

1. Attribute based locator
2. Placeholder based locator
3. CSS based fallback locator

This approach improves locator stability and maintainability.

---

## Reporting

Supported Reports:

* Playwright HTML Report
* Allure Report

Artifacts:

* Screenshots on failure
* Videos on failure
* Trace files on failure

---

## CI/CD

GitHub Actions Pipeline:

1. Checkout Repository
2. Install Dependencies
3. Install Playwright Browsers
4. Execute Tests
5. Publish Reports

---

## Future Enhancements

* API Automation
* Database Validation
* Parallel Execution Optimization
* Cross Browser Testing
* Docker Integration
* AI Assisted Failure Analysis
