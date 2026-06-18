# GoCometAPI Playwright Framework

Reusable API automation framework for JSONPlaceholder using Playwright and TypeScript.

## Project Overview
This repository contains a data-driven Playwright API test framework that validates JSONPlaceholder endpoints. It supports structured test cases, YAML-driven test data, reusable API clients, centralized logging, and response validation.

## Framework Architecture
- `framework/config.ts` - Base URL and API configuration.
- `framework/logger.ts` - Centralized request/response logging.
- `framework/apiClient.ts` - Reusable GET, POST, PATCH request methods with error handling.
- `framework/validator.ts` - Reusable status and field validation helpers.
- `framework/postService.ts` - Post-specific API service methods.
- `framework/testDataLoader.ts` - YAML loader for structured API test cases.

## Folder Structure
- `tests/` - Playwright test files that consume YAML data and framework helpers.
- `framework/` - Core reusable API client, service, logger, validator, and data loader.
- `test-data/` - Structured YAML definitions for API test cases.
- `docs/` - Test scenario documentation.
- `.github/workflows/` - CI workflow definition.

## Installation
1. Install Node.js if needed.
2. Run `npm ci` to install dependencies.
3. Run `npm run install:browsers` to install Playwright browsers.

## Execution
- Run tests: `npm test`
- Show report: `npm run show-report`
- Generate Allure report: `npm run allure:generate`
- Open Allure report: `npm run allure:open`

## Report Generation
The Playwright HTML report is generated automatically in `playwright-report/`.
The Allure report is generated in `allure-report/` after running `npm run allure:generate`.

## CI/CD Workflow
The GitHub Actions workflow in `.github/workflows/playwright.yml`:
- runs on `push` and `pull_request` for `main` and `master`
- checks out code
- installs Node dependencies
- installs Playwright browsers
- executes `npx playwright test`
- uploads `playwright-report/` as an artifact
