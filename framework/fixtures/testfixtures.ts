import { test as base } from '@playwright/test';

import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { SearchPage } from '../pages/searchPage';

type MyFixtures = {

    LoginPage: LoginPage;

    dashboardPage: DashboardPage;

    searchPage: SearchPage;
};

export const test = base.extend<MyFixtures>({

    LoginPage: async ({ page }, use) => {
         console.log('LoginPage:', LoginPage);

        await use(new LoginPage(page));
    },

    dashboardPage: async ({ page }, use) => {

        await use(new DashboardPage(page));
    },

    searchPage: async ({ page }, use) => {

        await use(new SearchPage(page));
    }
});

export { expect } from '@playwright/test';