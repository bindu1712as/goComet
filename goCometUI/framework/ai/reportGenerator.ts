import { logger } from '../utils/logger';
import { FailureArtifact } from './failureCollector';
import { RootCauseAnalysis } from './failureAnalyzer';
import { FailureRecord } from './vectorStore';
import * as fs from 'fs';
import * as path from 'path';

export interface FailureReport {
  id: string;
  testName: string;
  timestamp: string;
  errorMessage: string;
  category: string;
  analysis: RootCauseAnalysis;
  similarFailures: FailureRecord[];
  artifactPath: string;
}

/**
 * Generate failure analysis reports
 */
export class ReportGenerator {
  private reportsDir = path.join(process.cwd(), 'reports');

  constructor() {
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
      logger.info(`Created reports directory: ${this.reportsDir}`);
    }
  }

  /**
   * Generate all report formats
   */
  async generateReports(
    artifact: FailureArtifact,
    analysis: RootCauseAnalysis,
    similarFailures: FailureRecord[]
  ): Promise<{ json: string; html: string; markdown: string }> {
    logger.info(`Generating failure analysis reports for: ${artifact.testName}`);

    const id = this.generateId();
    const timestamp = new Date().toISOString().split('T')[0];

    const report: FailureReport = {
      id,
      testName: artifact.testName,
      timestamp: artifact.timestamp,
      errorMessage: artifact.errorMessage,
      category: analysis.category,
      analysis,
      similarFailures,
      artifactPath: ''
    };

    // Generate JSON report
    const jsonPath = path.join(this.reportsDir, `failure-analysis-${id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
    logger.info(`Generated JSON report: ${jsonPath}`);

    // Generate HTML report
    const htmlPath = path.join(this.reportsDir, `failure-analysis-${id}.html`);
    const htmlContent = this.generateHtmlReport(report);
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    logger.info(`Generated HTML report: ${htmlPath}`);

    // Generate Markdown report
    const mdPath = path.join(this.reportsDir, `failure-analysis-${id}.md`);
    const mdContent = this.generateMarkdownReport(report);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');
    logger.info(`Generated Markdown report: ${mdPath}`);

    return {
      json: jsonPath,
      html: htmlPath,
      markdown: mdPath
    };
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: FailureReport): string {
    const { testName, timestamp, errorMessage, category, analysis, similarFailures } = report;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Failure Analysis Report</title>
  <style>
    * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    body { margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #d32f2f; margin-top: 0; }
    h2 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
    .field { margin: 15px 0; }
    .label { font-weight: bold; color: #666; }
    .value { margin-top: 5px; padding: 10px; background: #f9f9f9; border-left: 3px solid #2196F3; }
    .confidence { display: inline-block; padding: 5px 10px; border-radius: 4px; font-weight: bold; }
    .confidence-high { background: #4CAF50; color: white; }
    .confidence-medium { background: #FF9800; color: white; }
    .confidence-low { background: #f44336; color: white; }
    .similar-failure { margin: 15px 0; padding: 15px; background: #f0f0f0; border-radius: 4px; border-left: 4px solid #2196F3; }
    .owner { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; color: white; }
    .owner-automation { background: #2196F3; }
    .owner-application { background: #FF9800; }
    .owner-infrastructure { background: #f44336; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Failure Analysis Report</h1>
    
    <div class="field">
      <div class="label">Test Name:</div>
      <div class="value">${this.escapeHtml(testName)}</div>
    </div>
    
    <div class="field">
      <div class="label">Timestamp:</div>
      <div class="value">${timestamp}</div>
    </div>
    
    <div class="field">
      <div class="label">Error Message:</div>
      <div class="value">${this.escapeHtml(errorMessage)}</div>
    </div>
    
    <div class="field">
      <div class="label">Category:</div>
      <div class="value">${category}</div>
    </div>
    
    <h2>Root Cause Analysis</h2>
    
    <div class="field">
      <div class="label">Root Cause:</div>
      <div class="value">${this.escapeHtml(analysis.rootCause)}</div>
    </div>
    
    <div class="field">
      <div class="label">Confidence:</div>
      <div class="value">
        <span class="confidence ${this.getConfidenceClass(analysis.confidence)}">
          ${(analysis.confidence * 100).toFixed(0)}%
        </span>
      </div>
    </div>
    
    <div class="field">
      <div class="label">Suggested Fix:</div>
      <div class="value">${this.escapeHtml(analysis.suggestedFix)}</div>
    </div>
    
    <div class="field">
      <div class="label">Suggested Owner:</div>
      <div class="value">
        <span class="owner owner-${analysis.owner.toLowerCase().replace(' ', '-')}">
          ${analysis.owner}
        </span>
      </div>
    </div>
    
    ${this.generateSimilarFailuresHtml(similarFailures)}
  </div>
</body>
</html>`;
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(report: FailureReport): string {
    const { testName, timestamp, errorMessage, category, analysis, similarFailures } = report;

    let md = `# Failure Analysis Report\n\n`;
    md += `## Failure Summary\n\n`;
    md += `- **Test**: ${testName}\n`;
    md += `- **Timestamp**: ${timestamp}\n`;
    md += `- **Category**: ${category}\n`;
    md += `- **Error**: ${errorMessage}\n\n`;

    md += `## Root Cause Analysis\n\n`;
    md += `**Root Cause**: ${analysis.rootCause}\n\n`;
    md += `**Confidence**: ${(analysis.confidence * 100).toFixed(0)}%\n\n`;
    md += `**Suggested Fix**: ${analysis.suggestedFix}\n\n`;
    md += `**Suggested Owner**: ${analysis.owner}\n\n`;

    if (similarFailures.length > 0) {
      md += `## Similar Historical Failures\n\n`;
      similarFailures.forEach((failure, idx) => {
        md += `### Failure ${idx + 1}\n\n`;
        md += `- **Test**: ${failure.testName}\n`;
        md += `- **Error**: ${failure.errorMessage}\n`;
        md += `- **Category**: ${failure.category}\n`;
        if (failure.rootCause) {
          md += `- **Root Cause**: ${failure.rootCause}\n`;
        }
        if (failure.suggestedFix) {
          md += `- **Fix**: ${failure.suggestedFix}\n`;
        }
        if (failure.confidence) {
          md += `- **Confidence**: ${(failure.confidence * 100).toFixed(0)}%\n`;
        }
        md += `\n`;
      });
    }

    return md;
  }

  /**
   * Generate HTML for similar failures section
   */
  private generateSimilarFailuresHtml(similarFailures: FailureRecord[]): string {
    if (similarFailures.length === 0) {
      return '';
    }

    let html = `<h2>Similar Historical Failures</h2>\n`;
    similarFailures.forEach((failure, idx) => {
      html += `<div class="similar-failure">
        <h3>Failure ${idx + 1}: ${this.escapeHtml(failure.testName)}</h3>
        <div class="field">
          <div class="label">Error:</div>
          <div class="value">${this.escapeHtml(failure.errorMessage)}</div>
        </div>
        <div class="field">
          <div class="label">Category:</div>
          <div class="value">${failure.category}</div>
        </div>`;

      if (failure.rootCause) {
        html += `<div class="field">
          <div class="label">Root Cause:</div>
          <div class="value">${this.escapeHtml(failure.rootCause)}</div>
        </div>`;
      }

      if (failure.suggestedFix) {
        html += `<div class="field">
          <div class="label">Fix:</div>
          <div class="value">${this.escapeHtml(failure.suggestedFix)}</div>
        </div>`;
      }

      html += `</div>\n`;
    });

    return html;
  }

  private getConfidenceClass(confidence: number): string {
    if (confidence >= 0.7) return 'confidence-high';
    if (confidence >= 0.4) return 'confidence-medium';
    return 'confidence-low';
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all reports
   */
  getReports(): string[] {
    try {
      if (!fs.existsSync(this.reportsDir)) {
        return [];
      }
      return fs.readdirSync(this.reportsDir).filter(f => f.endsWith('.json'));
    } catch (error) {
      logger.error(`Failed to get reports: ${error}`);
      return [];
    }
  }

  /**
   * Clear all reports
   */
  clear(): void {
    try {
      if (fs.existsSync(this.reportsDir)) {
        const files = fs.readdirSync(this.reportsDir);
        files.forEach(f => {
          fs.unlinkSync(path.join(this.reportsDir, f));
        });
      }
      logger.info('Cleared all failure reports');
    } catch (error) {
      logger.error(`Failed to clear reports: ${error}`);
    }
  }
}

export const reportGenerator = new ReportGenerator();
