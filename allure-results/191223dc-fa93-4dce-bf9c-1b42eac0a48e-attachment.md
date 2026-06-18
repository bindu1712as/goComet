# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login\invalid-login.spec.ts >> Invalid Login
- Location: tests\login\invalid-login.spec.ts:5:5

# Error details

```
TypeError: _LoginPage.LoginPage is not a constructor
```

# Test source

```ts
  1  | import { test as base } from '@playwright/test';
  2  | 
  3  | import { LoginPage } from '../pages/LoginPage';
  4  | import { DashboardPage } from '../pages/DashboardPage';
  5  | import { SearchPage } from '../pages/searchPage';
  6  | 
  7  | type MyFixtures = {
  8  | 
  9  |     LoginPage: LoginPage;
  10 | 
  11 |     dashboardPage: DashboardPage;
  12 | 
  13 |     searchPage: SearchPage;
  14 | };
  15 | 
  16 | export const test = base.extend<MyFixtures>({
  17 | 
  18 |     LoginPage: async ({ page }, use) => {
  19 |          console.log('LoginPage:', LoginPage);
  20 | 
> 21 |         await use(new LoginPage(page));
     |                   ^ TypeError: _LoginPage.LoginPage is not a constructor
  22 |     },
  23 | 
  24 |     dashboardPage: async ({ page }, use) => {
  25 | 
  26 |         await use(new DashboardPage(page));
  27 |     },
  28 | 
  29 |     searchPage: async ({ page }, use) => {
  30 | 
  31 |         await use(new SearchPage(page));
  32 |     }
  33 | });
  34 | 
  35 | export { expect } from '@playwright/test';
```