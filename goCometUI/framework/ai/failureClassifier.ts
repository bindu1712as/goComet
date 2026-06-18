import { logger } from '../utils/logger';

export enum FailureCategory {
  LOCATOR_FAILURE = 'Locator Failure',
  TIMING_ISSUE = 'Timing Issue',
  ENVIRONMENT_ISSUE = 'Environment Issue',
  APPLICATION_DEFECT = 'Application Defect',
  TEST_DATA_ISSUE = 'Test Data Issue',
  NETWORK_FAILURE = 'Network Failure',
  AUTHENTICATION_FAILURE = 'Authentication Failure',
  ASSERTION_FAILURE = 'Assertion Failure',
  UNKNOWN = 'Unknown'
}

/**
 * Classify failures based on error messages and patterns
 */
export class FailureClassifier {
  
  /**
   * Classify a failure based on error message
   */
  static classify(
    errorMessage: string,
    stackTrace?: string,
    logs?: any[]
  ): FailureCategory {
    const msg = errorMessage.toLowerCase();
    const stack = stackTrace?.toLowerCase() || '';

    logger.debug(`Classifying failure: ${errorMessage.substring(0, 100)}`);

    // Locator failures
    if (this.isLocatorFailure(msg, stack, logs)) {
      logger.info('Classified as: Locator Failure');
      return FailureCategory.LOCATOR_FAILURE;
    }

    // Timing issues
    if (this.isTimingIssue(msg, stack)) {
      logger.info('Classified as: Timing Issue');
      return FailureCategory.TIMING_ISSUE;
    }

    // Network failures
    if (this.isNetworkFailure(msg, stack, logs)) {
      logger.info('Classified as: Network Failure');
      return FailureCategory.NETWORK_FAILURE;
    }

    // Authentication failures
    if (this.isAuthFailure(msg, stack)) {
      logger.info('Classified as: Authentication Failure');
      return FailureCategory.AUTHENTICATION_FAILURE;
    }

    // Environment issues
    if (this.isEnvironmentIssue(msg, stack)) {
      logger.info('Classified as: Environment Issue');
      return FailureCategory.ENVIRONMENT_ISSUE;
    }

    // Test data issues
    if (this.isTestDataIssue(msg, stack)) {
      logger.info('Classified as: Test Data Issue');
      return FailureCategory.TEST_DATA_ISSUE;
    }

    // Assertion failures
    if (this.isAssertionFailure(msg, stack)) {
      logger.info('Classified as: Assertion Failure');
      return FailureCategory.ASSERTION_FAILURE;
    }

    // Application defects
    if (this.isApplicationDefect(msg, stack)) {
      logger.info('Classified as: Application Defect');
      return FailureCategory.APPLICATION_DEFECT;
    }

    logger.warn('Could not classify failure, defaulting to Unknown');
    return FailureCategory.UNKNOWN;
  }

  private static isLocatorFailure(msg: string, stack: string, logs?: any[]): boolean {
    const locatorKeywords = [
      'locator',
      'selector',
      'element not found',
      'no node',
      'not visible',
      'detached',
      'stale',
      'unable to find',
      'cannot find',
      'get by'
    ];

    return locatorKeywords.some(keyword => msg.includes(keyword) || stack.includes(keyword));
  }

  private static isTimingIssue(msg: string, stack: string): boolean {
    const timingKeywords = [
      'timeout',
      'timed out',
      'waitfor',
      'wait for',
      'timeout waiting',
      'still loading',
      'not loaded'
    ];

    return timingKeywords.some(keyword => msg.includes(keyword) || stack.includes(keyword));
  }

  private static isNetworkFailure(msg: string, stack: string, logs?: any[]): boolean {
    const networkKeywords = [
      'net::err_',
      'econnrefused',
      'enotfound',
      'socket',
      'connection reset',
      'connection refused',
      'dns',
      'network',
      'proxy',
      'request failed',
      'fetch failed'
    ];

    const networkFail = networkKeywords.some(keyword => msg.includes(keyword) || stack.includes(keyword));

    // Also check if there are network errors in logs
    if (logs && Array.isArray(logs)) {
      const hasNetworkLogs = logs.some(log =>
        log && (log.toString().includes('net::err') || log.toString().includes('ERR_'))
      );
      return networkFail || hasNetworkLogs;
    }

    return networkFail;
  }

  private static isAuthFailure(msg: string, stack: string): boolean {
    const authKeywords = [
      'authentication',
      'unauthorized',
      '401',
      '403',
      'forbidden',
      'invalid credentials',
      'login failed',
      'auth failed'
    ];

    return authKeywords.some(keyword => msg.includes(keyword) || stack.includes(keyword));
  }

  private static isEnvironmentIssue(msg: string, stack: string): boolean {
    const envKeywords = [
      'baseurl',
      'base_url',
      'env',
      'environment',
      'configuration',
      'config',
      'endpoint',
      'host',
      'port'
    ];

    return envKeywords.some(keyword => msg.includes(keyword) || stack.includes(keyword));
  }

  private static isTestDataIssue(msg: string, stack: string): boolean {
    const dataKeywords = [
      'data',
      'field',
      'invalid data',
      'missing data',
      'null',
      'undefined',
      'expected',
      'actual'
    ];

    return dataKeywords.some(keyword => msg.includes(keyword) || stack.includes(keyword));
  }

  private static isAssertionFailure(msg: string, stack: string): boolean {
    const assertKeywords = [
      'assert',
      'expect',
      'to be',
      'to equal',
      'to contain',
      'not equal',
      'assertion error'
    ];

    return assertKeywords.some(keyword => msg.includes(keyword) || stack.includes(keyword));
  }

  private static isApplicationDefect(msg: string, stack: string): boolean {
    const defectKeywords = [
      'error',
      'exception',
      'crash',
      'failed',
      'failure',
      'internal server',
      'server error',
      '500'
    ];

    return defectKeywords.some(keyword => msg.includes(keyword) || stack.includes(keyword));
  }
}
