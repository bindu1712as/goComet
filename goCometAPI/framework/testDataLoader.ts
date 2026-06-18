import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

export type TestCase = {
  name: string;
  method: string;
  endpoint: string;
  payload?: Record<string, unknown>;
  expectedStatus: number;
  assertions: Record<string, unknown>;
};

export class TestDataLoader {
  private static testCases: TestCase[] | null = null;

  private static loadTestData(): void {
    if (this.testCases) {
      return;
    }

    const testDataPath = path.resolve(__dirname, '../test-data/api-testcases.yaml');
    const rawContent = fs.readFileSync(testDataPath, 'utf8');
    const parsed = YAML.parse(rawContent) as { testCases: TestCase[] };

    if (!parsed || !Array.isArray(parsed.testCases)) {
      throw new Error('Invalid YAML test data format: expected a root testCases array.');
    }

    this.testCases = parsed.testCases;
  }

  static getAllTestCases(): TestCase[] {
    this.loadTestData();
    return this.testCases ?? [];
  }

  static getTestCaseByName(name: string): TestCase {
    this.loadTestData();
    const testCase = this.testCases?.find((item) => item.name === name);
    if (!testCase) {
      throw new Error(`Test case with name '${name}' not found in YAML data.`);
    }
    return testCase;
  }
}
