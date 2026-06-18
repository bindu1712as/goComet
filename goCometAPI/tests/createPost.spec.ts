import { test } from '@playwright/test';
import { ApiClient } from '../framework/apiClient';
import { Logger } from '../framework/logger';
import { PostService } from '../framework/postService';
import { Validator } from '../framework/validator';
import { TestDataLoader } from '../framework/testDataLoader';

const testCase = TestDataLoader.getTestCaseByName('Create Post');

test.describe('Create Post', () => {
  test('validates POST /posts response payload and status', async ({ request }) => {
    Logger.info(`Running test case: ${testCase.name}`);
    const apiClient = new ApiClient(request);
    const postService = new PostService(apiClient);

    const response = await postService.createPost(testCase.payload);
    await Validator.validateStatusCode(response, testCase.expectedStatus);

    const body = await response.json();
    Validator.validateResponseFields(body as Record<string, unknown>, testCase.assertions);

    Logger.info(`Completed test case: ${testCase.name}`);
  });
});
