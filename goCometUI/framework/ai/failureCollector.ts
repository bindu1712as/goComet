import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface FailureArtifact {
  testName: string;
  errorMessage: string;
  stackTrace?: string;
  timestamp: string;
  screenshotPath?: string;
  tracePath?: string;
  videoPath?: string;
  consoleLogs?: any[];
  networkErrors?: any[];
  htmlSnapshot?: string;
  metadata?: Record<string, any>;
}

/**
 * Collect and store failure artifacts for analysis
 */
export class FailureCollector {
  private artifactsDir = path.join(process.cwd(), 'artifacts', 'failures');

  constructor() {
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
      logger.info(`Created artifacts directory: ${this.artifactsDir}`);
    }
  }

  /**
   * Collect failure artifacts
   */
  async collectArtifacts(
    testName: string,
    error: Error,
    additionalData?: {
      screenshotPath?: string;
      tracePath?: string;
      videoPath?: string;
      consoleLogs?: any[];
      networkErrors?: any[];
      htmlSnapshot?: string;
    }
  ): Promise<FailureArtifact> {
    logger.info(`Collecting artifacts for failed test: ${testName}`);

    const artifact: FailureArtifact = {
      testName,
      errorMessage: error.message,
      stackTrace: error.stack,
      timestamp: new Date().toISOString(),
      ...additionalData,
      metadata: {
        environment: process.env.NODE_ENV || 'test',
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    // Save artifact to file
    await this.saveArtifact(artifact);

    logger.info(`Saved failure artifact for: ${testName}`);
    return artifact;
  }

  /**
   * Save artifact to file
   */
  private async saveArtifact(artifact: FailureArtifact): Promise<void> {
    const filename = this.generateFilename(artifact.testName);
    const filepath = path.join(this.artifactsDir, filename);

    try {
      const data = JSON.stringify(artifact, null, 2);
      fs.writeFileSync(filepath, data, 'utf-8');
      logger.info(`Saved failure artifact: ${filepath}`);
    } catch (error) {
      logger.error(`Failed to save failure artifact: ${error}`);
    }
  }

  /**
   * Get all failure artifacts
   */
  getArtifacts(): FailureArtifact[] {
    try {
      if (!fs.existsSync(this.artifactsDir)) {
        return [];
      }

      const files = fs.readdirSync(this.artifactsDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => {
          try {
            const data = fs.readFileSync(path.join(this.artifactsDir, f), 'utf-8');
            return JSON.parse(data);
          } catch (error) {
            logger.warn(`Failed to parse artifact: ${f}`);
            return null;
          }
        })
        .filter(Boolean);
    } catch (error) {
      logger.error(`Failed to get artifacts: ${error}`);
      return [];
    }
  }

  /**
   * Get artifacts by test name
   */
  getArtifactsByTest(testName: string): FailureArtifact[] {
    return this.getArtifacts().filter(a => a.testName === testName);
  }

  /**
   * Clear all artifacts
   */
  clear(): void {
    try {
      if (fs.existsSync(this.artifactsDir)) {
        const files = fs.readdirSync(this.artifactsDir);
        files.forEach(f => {
          const filepath = path.join(this.artifactsDir, f);
          fs.unlinkSync(filepath);
        });
      }
      logger.info('Cleared all failure artifacts');
    } catch (error) {
      logger.error(`Failed to clear artifacts: ${error}`);
    }
  }

  private generateFilename(testName: string): string {
    const sanitized = testName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    return `failure_${sanitized}_${Date.now()}.json`;
  }
}

export const failureCollector = new FailureCollector();
