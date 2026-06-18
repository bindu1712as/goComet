# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login\invalid-login.spec.ts >> Invalid Login
- Location: tests\login\invalid-login.spec.ts:5:5

# Error details

```
Error: locator.fill: Error: strict mode violation: locator('input[name="username"]').or(getByPlaceholder('Username')).or(locator('input').first()) resolved to 2 elements:
    1) <input name="_token" type="hidden" data-v-0af708be="" value="6ad22f6743ee0bb3c143f.1LV_T5j2QqMVMI2ePu8JcjVlQc2NpF6rJY3eMgHXuw0.sPASAsiUI5RRWP71V9hcG2YKOJjIzTyeQdyYazSt9VqS_wgZzIF6zX9evQ"/> aka locator('input[name="_token"]')
    2) <input autofocus="" name="username" data-v-1f99f73c="" placeholder="Username" class="oxd-input oxd-input--focus"/> aka getByRole('textbox', { name: 'Username' })

Call log:
  - waiting for locator('input[name="username"]').or(getByPlaceholder('Username')).or(locator('input').first())

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e6]:
    - img "company-branding" [ref=e8]
    - generic [ref=e9]:
      - heading "Login" [level=5] [ref=e10]
      - generic [ref=e11]:
        - generic [ref=e13]:
          - paragraph [ref=e14]: "Username : Admin"
          - paragraph [ref=e15]: "Password : admin123"
        - generic [ref=e16]:
          - generic [ref=e18]:
            - generic [ref=e19]:
              - generic [ref=e20]: 
              - generic [ref=e21]: Username
            - textbox "Username" [active] [ref=e23]
          - generic [ref=e25]:
            - generic [ref=e26]:
              - generic [ref=e27]: 
              - generic [ref=e28]: Password
            - textbox "Password" [ref=e30]
          - button "Login" [ref=e32] [cursor=pointer]
          - paragraph [ref=e34] [cursor=pointer]: Forgot your password?
        - separator [ref=e35]
        - paragraph [ref=e37]: Or login with
        - generic "adm98$" [ref=e39] [cursor=pointer]:
          - paragraph [ref=e40]: adm98$
      - generic [ref=e41]:
        - generic [ref=e42]:
          - link [ref=e43] [cursor=pointer]:
            - /url: https://www.linkedin.com/company/orangehrm/mycompany/
          - link [ref=e46] [cursor=pointer]:
            - /url: https://www.facebook.com/OrangeHRM/
          - link [ref=e49] [cursor=pointer]:
            - /url: https://twitter.com/orangehrm?lang=en
          - link [ref=e52] [cursor=pointer]:
            - /url: https://www.youtube.com/c/OrangeHRMInc
        - generic [ref=e55]:
          - paragraph [ref=e56]: OrangeHRM OS 5.8
          - paragraph [ref=e57]:
            - text: © 2005 - 2026
            - link "OrangeHRM, Inc" [ref=e58] [cursor=pointer]:
              - /url: http://www.orangehrm.com
            - text: . All rights reserved.
  - img "orangehrm-logo" [ref=e60]
```

# Test source

```ts
  1  | import { Page, Locator, expect } from '@playwright/test';
  2  | import { logger } from '../utils/logger';
  3  | 
  4  | export class LoginPage {
  5  | 
  6  |     constructor(private page: Page) {}
  7  | 
  8  |     /**
  9  |      * Username Locator
  10 |      * Priority:
  11 |      * 1. name attribute
  12 |      * 2. placeholder
  13 |      * 3. first input textbox on page
  14 |      */
  15 |     usernameTextbox = (): Locator =>
  16 |         this.page
  17 |             .locator('input[name="username"]')
  18 |             .or(this.page.getByPlaceholder('Username'))
  19 |             .or(this.page.locator('input').first());
  20 | 
  21 |     /**
  22 |      * Password Locator
  23 |      * Priority:
  24 |      * 1. name attribute
  25 |      * 2. placeholder
  26 |      * 3. password input type
  27 |      */
  28 |     passwordTextbox = (): Locator =>
  29 |         this.page
  30 |             .locator('input[name="password"]')
  31 |             .or(this.page.getByPlaceholder('Password'))
  32 |             .or(this.page.locator('input[type="password"]'));
  33 | 
  34 |     /**
  35 |      * Login Button Locator
  36 |      * Priority:
  37 |      * 1. submit button
  38 |      * 2. role-based locator
  39 |      * 3. text-based locator
  40 |      */
  41 |     loginButton = (): Locator =>
  42 |         this.page
  43 |             .locator('button[type="submit"]')
  44 |             .or(this.page.getByRole('button', { name: /login/i }))
  45 |             .or(this.page.locator('button:has-text("Login")'));
  46 | 
  47 |     /**
  48 |      * Invalid Login Message
  49 |      */
  50 |     invalidLoginMessage = (): Locator =>
  51 |         this.page.locator('.oxd-alert-content-text');
  52 | 
  53 |     /**
  54 |      * Navigate to Login Page
  55 |      */
  56 |     async navigate(url: string): Promise<void> {
  57 | 
  58 |         logger.info(`Navigating to ${url}`);
  59 | 
  60 |         await this.page.goto(url, {
  61 |             waitUntil: 'domcontentloaded'
  62 |         });
  63 |     }
  64 | 
  65 |     /**
  66 |      * Login Action
  67 |      */
  68 |     async login(username: string, password: string): Promise<void> {
  69 | 
  70 |         logger.info(`Logging in with user: ${username}`);
  71 | 
> 72 |         await this.usernameTextbox().fill(username);
     |                                      ^ Error: locator.fill: Error: strict mode violation: locator('input[name="username"]').or(getByPlaceholder('Username')).or(locator('input').first()) resolved to 2 elements:
  73 | 
  74 |         await this.passwordTextbox().fill(password);
  75 | 
  76 |         await this.loginButton().click();
  77 | 
  78 |         logger.info('Login button clicked');
  79 |     }
  80 | 
  81 |     /**
  82 |      * Verify Invalid Login
  83 |      */
  84 |     async verifyInvalidLogin(): Promise<void> {
  85 | 
  86 |         await expect(this.invalidLoginMessage())
  87 |             .toContainText('Invalid credentials');
  88 |     }
  89 | }
  90 | 
  91 | 
```