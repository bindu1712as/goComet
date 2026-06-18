# Playwright UI Test Automation Framework

## Overview

This project demonstrates a scalable UI Test Automation Framework built using Playwright and TypeScript. The framework follows industry best practices for maintainability, reusability, and CI/CD integration.

## Tech Stack

* Playwright
* TypeScript
* Node.js
* GitHub Actions
* HTML Reports

## Project Structure

```text
goComet/
├── tests/
│   └── *.spec.ts
├── pages/
│   └── Page Objects
├── utils/
│   └── Helper Functions
├── test-data/
│   └── Test Data Files
├── .github/
│   └── workflows/
│       └── playwright.yml
├── playwright.config.ts
├── package.json
└── README.md
```

## Features

* Playwright with TypeScript
* Page Object Model (POM)
* Cross-browser support
* Parallel execution
* HTML reporting
* CI/CD integration using GitHub Actions
* Easy test maintenance and scalability

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd goComet
```

Install dependencies:

```bash
npm install
```

Install Playwright browsers:

```bash
npx playwright install
```

## Running Tests

Run all tests:

```bash
npx playwright test
```

Run tests in headed mode:

```bash
npx playwright test --headed
```

Run a specific test:

```bash
npx playwright test tests/example.spec.ts
```

## Reports

Generate and open the Playwright HTML report:

```bash
npx playwright show-report
```

## CI/CD Integration

GitHub Actions is configured to automatically execute tests on every push to the main branch.

Workflow Steps:

1. Checkout repository
2. Setup Node.js
3. Install dependencies
4. Install Playwright browsers
5. Execute Playwright tests
6. Publish test reports and artifacts

## Future Enhancements

* Allure Reporting
* API Automation Integration
* Docker Support
* Jenkins Pipeline Integration
* AI-assisted Test Generation

## Author

Bindu AS

Senior QA Automation Engineer | Playwright | TypeScript | CI/CD | AI-powered Testing
