import { Page, Locator, expect } from '@playwright/test';
import { logger } from '../utils/logger';

export class LoginPage {

    constructor(private page: Page) {}

    /**
     * Username Locator
     * Priority:
     * 1. name attribute
     * 2. placeholder
     * 3. first visible textbox on page
     */
    usernameTextbox = (): Locator =>
        this.page
            .locator('input[name="username"]')
            .or(this.page.getByPlaceholder('Username'))
            .or(this.page.locator('input.oxd-input').nth(0));

    /**
     * Password Locator
     * Priority:
     * 1. name attribute
     * 2. placeholder
     * 3. password input type
     * 4. second visible textbox on page
     */
    passwordTextbox = (): Locator =>
        this.page
            .locator('input[name="password"]')
            .or(this.page.getByPlaceholder('Password'))
            .or(this.page.locator('input[type="password"]'))
            .or(this.page.locator('input.oxd-input').nth(1));

    /**
     * Login Button Locator
     * Priority:
     * 1. submit button
     * 2. role based locator
     * 3. text based locator
     */
    loginButton = (): Locator =>
        this.page
            .locator('button[type="submit"]')
            .or(this.page.getByRole('button', {
                name: /login/i
            }))
            .or(this.page.locator(
                'button:has-text("Login")'
            ));

    /**
     * Invalid Login Message
     */
    invalidLoginMessage = (): Locator =>
        this.page.locator(
            '.oxd-alert-content-text'
        );

    /**
     * Navigate to Login Page
     */
    async navigate(
        url: string
    ): Promise<void> {

        logger.info(
            `Navigating to ${url}`
        );

        await this.page.goto(
            url,
            {
                waitUntil: 'domcontentloaded'
            }
        );
    }

    /**
     * Login Action
     */
    async login(
        username: string,
        password: string
    ): Promise<void> {

        logger.info(
            `Logging in with user: ${username}`
        );

        await this.usernameTextbox()
            .fill(username);

        await this.passwordTextbox()
            .fill(password);

        await this.loginButton()
            .click();

        logger.info(
            'Login button clicked'
        );
    }

    /**
     * Verify Invalid Login
     */
    async verifyInvalidLogin(): Promise<void> {

        await expect(
            this.invalidLoginMessage()
        ).toContainText(
            'Invalid credentials'
        );
    }
}