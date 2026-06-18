/**
 * Self-Healing Locator Utility
 *
 * Provides runtime locator recovery for Playwright tests.
 * When the primary locator fails, it automatically tries fallback strategies
 * in priority order until one succeeds or all are exhausted.
 *
 * Priority order:
 *  1. getByRole()
 *  2. getByLabel()
 *  3. getByPlaceholder()
 *  4. getByText()
 *  5. locator(css)
 *  6. locator(xpath)
 */

import { Locator, Page } from '@playwright/test';
import { test } from '@playwright/test';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FallbackDescriptor {
  /** Human-readable label shown in logs and reports */
  description: string;
  /** Factory that creates the Locator when called */
  factory: () => Locator;
}

export interface HealLocatorOptions {
  /** Descriptive name used in all log output */
  name: string;
  /** The primary Locator to try first */
  primary: Locator;
  /** Human-readable description of the primary locator */
  primaryDescription: string;
  /** Ordered list of fallback strategies */
  fallbacks: FallbackDescriptor[];
}

export interface HealResult {
  locator: Locator;
  healed: boolean;
  failedLocator: string;
  recoveredLocator: string;
  recoveryMethod: string;
  recoveryDuration: number;
}

// ─── Core Function ────────────────────────────────────────────────────────────

/**
 * Attempt to resolve a Locator with automatic fallback recovery.
 *
 * @example
 * const input = await healLocator(page, {
 *   name: 'search-input',
 *   primary: page.locator('[data-testid="search"]'),
 *   primaryDescription: 'data-testid=search',
 *   fallbacks: [
 *     { description: "getByRole('textbox')", factory: () => page.getByRole('textbox', { name: /search/i }) },
 *     { description: "getByPlaceholder('Search')", factory: () => page.getByPlaceholder(/search/i) },
 *   ]
 * });
 */
export async function healLocator(
  page: Page,
  options: HealLocatorOptions
): Promise<HealResult> {
  const { name, primary, primaryDescription, fallbacks } = options;
  const startTime = Date.now();

  // ── Step 1: Try primary locator ──────────────────────────────────────────
  const primaryOk = await isLocatorUsable(primary);

  if (primaryOk) {
    log(`[Self-Healing] Primary locator resolved for "${name}": ${primaryDescription}`);
    return {
      locator: primary,
      healed: false,
      failedLocator: '',
      recoveredLocator: primaryDescription,
      recoveryMethod: 'primary',
      recoveryDuration: Date.now() - startTime,
    };
  }

  // ── Step 2: Primary failed – begin fallback chain ──────────────────────
  log(`[Self-Healing] Primary locator failed for "${name}": ${primaryDescription}`);
  log(`[Self-Healing] Starting fallback chain (${fallbacks.length} strategies)...`);

  for (let i = 0; i < fallbacks.length; i++) {
    const { description, factory } = fallbacks[i];
    log(`[Self-Healing] Trying fallback ${i + 1}: ${description}`);

    try {
      const candidate = factory();
      const ok = await isLocatorUsable(candidate);

      if (ok) {
        const duration = Date.now() - startTime;
        const result: HealResult = {
          locator: candidate,
          healed: true,
          failedLocator: primaryDescription,
          recoveredLocator: description,
          recoveryMethod: description,
          recoveryDuration: duration,
        };

        log(`[Self-Healing] Recovery successful ✓`);
        log(`[Self-Healing] Locator healed using: ${description}`);
        log(`[Self-Healing] Recovery duration: ${duration}ms`);

        await attachRecoveryReport(name, result);

        return result;
      }

      log(`[Self-Healing] Fallback ${i + 1} not usable: ${description}`);
    } catch (err) {
      log(`[Self-Healing] Fallback ${i + 1} threw error: ${description} — ${(err as Error).message}`);
    }
  }

  // ── Step 3: All strategies exhausted ─────────────────────────────────
  const duration = Date.now() - startTime;
  const exhaustedMsg =
    `[Self-Healing] Locator healing unsuccessful.\n` +
    `All fallback strategies exhausted for "${name}".\n` +
    `Failed locator: ${primaryDescription}\n` +
    `Tried ${fallbacks.length} fallback(s) over ${duration}ms.`;

  log(exhaustedMsg);

  // Attach failure summary to the HTML report
  try {
    const info = test.info();
    await info.attach('self-healing-failed', {
      contentType: 'text/plain',
      body: exhaustedMsg,
    });
  } catch {
    // Not inside a test context – skip attachment
  }

  throw new Error(exhaustedMsg);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if a locator has at least one visible + enabled element.
 */
async function isLocatorUsable(locator: Locator): Promise<boolean> {
  try {
    const count = await locator.count();
    if (count === 0) return false;

    const target = count > 1 ? locator.first() : locator;
    const visible = await target.isVisible();
    const enabled = await target.isEnabled();

    return visible && enabled;
  } catch {
    return false;
  }
}

/**
 * Write a timestamped line to stdout (captured by CI/CD log systems).
 */
function log(message: string): void {
  const ts = new Date().toISOString();
  // Use process.stdout.write so the message appears even when Playwright
  // suppresses console.log output during parallel runs.
  process.stdout.write(`${ts}  ${message}\n`);
}

/**
 * Attach a structured recovery report to the active Playwright test's HTML report.
 */
async function attachRecoveryReport(
  locatorName: string,
  result: HealResult
): Promise<void> {
  const report =
    `Self-Healing Recovery Report\n` +
    `=============================\n` +
    `Locator Name    : ${locatorName}\n` +
    `Failed Locator  : ${result.failedLocator}\n` +
    `Recovered Using : ${result.recoveredLocator}\n` +
    `Recovery Method : ${result.recoveryMethod}\n` +
    `Recovery Duration: ${result.recoveryDuration}ms\n`;

  try {
    const info = test.info();
    // Attach to HTML report (shows up in Playwright's built-in reporter)
    await info.attach(`self-healing: ${locatorName}`, {
      contentType: 'text/plain',
      body: report,
    });
  } catch {
    // Not inside a test context (e.g. unit test for the utility itself)
  }
}
