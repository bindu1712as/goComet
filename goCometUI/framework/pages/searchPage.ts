import { Page, expect } from '@playwright/test';
import { healLocator } from '../utils/selfHealingLocator';

export class SearchPage {

    constructor(private page: Page) {}

    /**
     * Resolves the search input using a self-healing strategy.
     *
     * Primary  : input[placeholder="Search"]
     * Fallback 1 (priority 1 – getByRole)
     * Fallback 2 (priority 2 – getByLabel)
     * Fallback 3 (priority 3 – getByPlaceholder)
     * Fallback 4 (priority 4 – getByText)
     * Fallback 5 (priority 5 – CSS)
     * Fallback 6 (priority 6 – XPath)
     */
    async searchInput() {
        const result = await healLocator(this.page, {
            name: 'search-input',
            primary: this.page.locator('input[placeholder="Search123"]'),
            primaryDescription: "locator('input[placeholder=\"Search\"]')",
            fallbacks: [
                {
                    description: "getByRole('textbox', { name: /search/i })",
                    factory: () =>
                        this.page.getByRole('textbox', { name: /search/i }),
                },
                {
                    description: "getByLabel(/search/i)",
                    factory: () => this.page.getByLabel(/search/i),
                },
                {
                    description: "getByPlaceholder(/search/i)",
                    factory: () => this.page.getByPlaceholder(/search/i),
                },
                {
                    description: "getByText(/search/i)",
                    factory: () => this.page.getByText(/search/i),
                },
                {
                    description: "locator('.oxd-input') [CSS]",
                    factory: () => this.page.locator('.oxd-input'),
                },
                {
                    description: "locator(\"//input[contains(@placeholder,'Search')]\") [XPath]",
                    factory: () =>
                        this.page.locator(
                            "//input[contains(@placeholder,'Search')]"
                        ),
                },
            ],
        });

        return result.locator;
    }

    searchResult =
        (menuName: string) => this.page.getByText(
            menuName,
            { exact: true }
        );

    async search(menuName: string) {

        const input = await this.searchInput();
        await input.fill(menuName);
    }

    async verifyResult(menuName: string) {

        await expect(
            this.searchResult(menuName)
        ).toBeVisible();
    }

    async searchAndVerify(menuName: string) {

        await this.search(menuName);
        await this.verifyResult(menuName);
    }
}
