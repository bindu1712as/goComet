import { Page, Locator, expect } from '@playwright/test';
import { logger } from '../utils/logger';

export class LoginPage {

    constructor(private page: Page) {}

    /**
     * Username Locator
     * Priority:
     * 1. input[name="username"]
     * 2. getByPlaceholder('username')
     * 3. first visible input
     */
    usernameTextbox = (): Locator =>
        this.page.locator('input[name="username"]').first();

    /**
     * Password Locator
     * Priority:
     * 1. input[name="password"]
     * 2. input[type="password"]
     * 3. second visible input
     */
    passwordTextbox = (): Locator =>
        this.page.locator('input[name="password"]').first();

    /**
     * Login Button Locator
     */
    loginButton = (): Locator =>
        this.page.locator('button[type="submit"]').first();

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