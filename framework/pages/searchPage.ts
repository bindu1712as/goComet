import { Page, Locator, expect } from '@playwright/test';

export class SearchPage {

    constructor(private page: Page) {}

    pimMenu =
        (): Locator => this.page
            .getByRole('link', { name: 'PIM' })
            .or(this.page.getByText('PIM', { exact: true }))
            .or(this.page.locator('a:has-text("PIM")'));

    employeeName =
        (): Locator => this.page
            .locator('input[placeholder="Type for hints..."]')
            .or(this.page.getByPlaceholder('Type for hints...'))
            .or(this.page.locator('.oxd-autocomplete-text-input input'));

    searchButton =
        (): Locator => this.page
            .getByRole('button', { name: 'Search' })
            .or(this.page.locator('button[type="submit"]'))
            .or(this.page.locator('button:has-text("Search")'));

    resultTable =
        (): Locator => this.page
            .locator('.oxd-table')
            .or(this.page.locator('.oxd-table-body'));

    async searchEmployee(employee: string) {

        await this.pimMenu().click();

        await expect(this.employeeName())
            .toBeVisible();

        await this.employeeName().fill(employee);

        await this.searchButton().click();
    }

    async verifyResults() {

        await expect(this.resultTable())
            .toBeVisible();
    }
}