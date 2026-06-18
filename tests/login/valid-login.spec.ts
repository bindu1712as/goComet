import { test } from '../../framework/fixtures/testfixtures';

import { ENV } from '../../framework/utils/env';

test('Valid Login', async ({
    LoginPage,
    dashboardPage
}) => {

    await LoginPage.navigate(ENV.BASE_URL);

    await LoginPage.login(
        ENV.USERNAME,
        ENV.PASSWORD
    );

    await dashboardPage.verifyDashboardLoaded();
});