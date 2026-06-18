import { Page, Locator } from '@playwright/test';
import { logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';

export interface LocatorCandidate {
  desc: string;
  factory: (page: Page) => Locator;
}

/**
 * Self-Healing Locator Strategy
 * 
 * Tries multiple locator candidates in priority order.
 * Caches successful candidate index for faster subsequent attempts.
 * Logs all recovery attempts for debugging.
 */
export class SelfHealingLocator {
  private static cacheDir = path.join(process.cwd(), 'framework', 'utils');
  private static cacheFile = path.join(this.cacheDir, 'selfHealingCache.json');
  private static cache: Record<string, number> = {};

  static {
    this.loadCache();
  }

  /**
   * Load cache from file
   */
  private static loadCache(): void {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf-8');
        this.cache = JSON.parse(data);
        logger.info('Self-healing cache loaded successfully');
      }
    } catch (error) {
      logger.error(`Failed to load cache: ${error}`);
      this.cache = {};
    }
  }

  /**
   * Save cache to file
   */
  private static saveCache(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (error) {
      logger.error(`Failed to save cache: ${error}`);
    }
  }

  /**
   * Get a locator using self-healing strategy
   * 
   * @param page - Playwright page object
   * @param name - Unique locator identifier
   * @param candidates - Array of locator candidates to try
   * @returns Promise<Locator> - The first working locator
   */
  static async get(
    page: Page,
    name: string,
    candidates: LocatorCandidate[]
  ): Promise<Locator> {
    logger.info(`[SelfHealing] Getting locator: ${name}`);

    // Try cached candidate first
    if (this.cache[name] !== undefined) {
      const cachedIndex = this.cache[name];
      const cachedCandidate = candidates[cachedIndex];

      logger.info(`[SelfHealing] Trying cached candidate ${cachedIndex}: ${cachedCandidate.desc}`);

      try {
        const locator = cachedCandidate.factory(page);
        
        // Verify locator is still valid
        if (await this.isValid(locator)) {
          logger.info(`[SelfHealing] ✓ Cached locator still valid: ${cachedCandidate.desc}`);
          return locator;
        } else {
          logger.warn(`[SelfHealing] Cached locator no longer valid, trying fallbacks`);
        }
      } catch (error) {
        logger.warn(`[SelfHealing] Cached locator failed: ${error}`);
      }
    }

    // Try each candidate in order
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      
      logger.info(`[SelfHealing] Attempting candidate ${i}: ${candidate.desc}`);

      try {
        const locator = candidate.factory(page);

        if (await this.isValid(locator)) {
          // Cache successful candidate
          this.cache[name] = i;
          this.saveCache();

          logger.info(`[SelfHealing] ✓ Successfully recovered using candidate ${i}: ${candidate.desc}`);
          return locator;
        }
      } catch (error) {
        logger.warn(`[SelfHealing] Candidate ${i} failed: ${candidate.desc} - ${error}`);
      }
    }

    // No valid candidate found
    const errorMsg = `[SelfHealing] ✗ No valid locator found for: ${name}. Tried ${candidates.length} candidates.`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  /**
   * Validate if a locator is functional
   * Checks: exists, visible, enabled
   */
  private static async isValid(locator: Locator): Promise<boolean> {
    try {
      const count = await locator.count();
      if (count === 0) {
        return false;
      }

      const visible = await locator.first().isVisible();
      if (!visible) {
        return false;
      }

      const enabled = await locator.first().isEnabled();
      if (!enabled) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear cache (useful for testing or UI changes)
   */
  static clearCache(): void {
    logger.info('[SelfHealing] Clearing cache');
    this.cache = {};
    try {
      if (fs.existsSync(this.cacheFile)) {
        fs.unlinkSync(this.cacheFile);
      }
    } catch (error) {
      logger.error(`Failed to clear cache file: ${error}`);
    }
  }

  /**
   * Get current cache state (for debugging)
   */
  static getCache(): Record<string, number> {
    return { ...this.cache };
  }
}
