import { test } from '../../framework/fixtures/testfixtures';

import { ENV } from '../../framework/utils/env';

test('Invalid Login', async ({
    LoginPage
}) => {

    await LoginPage.navigate(ENV.BASE_URL);

    await LoginPage.login(
        'wrong',
        'wrong'
    );

    await LoginPage.verifyInvalidLogin();
});