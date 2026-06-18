import { test } from '../../framework/fixtures/testfixtures';

import { ENV } from '../../framework/utils/env';

test(
    'Search Admin Menu',
    async ({
        LoginPage,
        dashboardPage,
        searchPage
    }) => {

        await LoginPage.navigate(
            ENV.BASE_URL
        );

        await LoginPage.login(
            ENV.USERNAME,
            ENV.PASSWORD
        );

        await dashboardPage
            .verifyDashboardLoaded();

        await searchPage.search(
            'Admin'
        );

        await searchPage.verifyResult(
            'Admin'
        );
    }
);