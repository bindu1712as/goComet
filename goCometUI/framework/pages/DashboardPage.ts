import { Page, expect, Locator } from '@playwright/test';

export class DashboardPage {

    constructor(private readonly page: Page) {}

    private dashboardHeader(): Locator {
        return this.page
            .getByRole('heading', {
                name: 'Dashboard'
            })
            .or(
                this.page.locator(
                    'h6.oxd-topbar-header-breadcrumb-module'
                )
            )
            .or(
                this.page.locator(
                    '.oxd-topbar-header-breadcrumb-module'
                )
            );
    }

    async verifyDashboardLoaded(): Promise<void> {

        await expect(
            this.dashboardHeader()
        ).toBeVisible();

        await expect(
            this.dashboardHeader()
        ).toHaveText('Dashboard');
    }
}