import { test } from '@playwright/test';
import { ApiClient } from '../framework/apiClient';
import { Logger } from '../framework/logger';
import { Validator } from '../framework/validator';
import { TestDataLoader } from '../framework/testDataLoader';

const testCase = TestDataLoader.getTestCaseByName('Get User Details');

const expectedFieldTypes = {
  'id': 'number',
  'name': 'string',
  'username': 'string',
  'email': 'string',
};

test.describe('Get User Details', () => {
  test('validates GET /users/1 response payload and status', async ({ request }) => {
    Logger.info(`Running test case: ${testCase.name}`);
    const apiClient = new ApiClient(request);
    const response = await apiClient.get(testCase.endpoint);

    await Validator.validateStatusCode(response, testCase.expectedStatus);
    Logger.info(`Response status validated: ${response.status()}`);

    const body = await response.json();
    Validator.validateResponseFields(body as Record<string, unknown>, testCase.assertions);
    Validator.validateFieldTypes(body as Record<string, unknown>, expectedFieldTypes);

    Logger.info('Response fields validated successfully.', testCase.assertions);
    Logger.info(`Completed test case: ${testCase.name}`);
  });
});
