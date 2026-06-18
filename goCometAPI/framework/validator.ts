import { APIResponse, expect } from '@playwright/test';

export class Validator {
  static async validateStatusCode(response: APIResponse, expectedStatus: number): Promise<void> {
    const actualStatus = response.status();
    expect(actualStatus).toBe(expectedStatus);
  }

  static validateResponseFields(body: Record<string, unknown>, assertions: Record<string, unknown>): void {
    for (const [field, expectedValue] of Object.entries(assertions)) {
      const actualValue = this.getFieldValue(body, field);
      expect(actualValue).toEqual(expectedValue);
    }
  }

  static validateFieldTypes(body: Record<string, unknown>, expectedTypes: Record<string, string>): void {
    for (const [field, expectedType] of Object.entries(expectedTypes)) {
      const actualValue = this.getFieldValue(body, field);
      expect(typeof actualValue).toBe(expectedType);
    }
  }

  private static getFieldValue(body: Record<string, unknown>, field: string): unknown {
    const pathSegments = field.split('.');
    let current: unknown = body;

    for (const segment of pathSegments) {
      if (current && typeof current === 'object' && segment in current) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return undefined;
      }
    }

    return current;
  }
}
