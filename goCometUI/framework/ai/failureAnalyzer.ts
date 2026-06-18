import { logger } from '../utils/logger';
import { FailureArtifact } from './failureCollector';
import { FailureRecord } from './vectorStore';

export interface RootCauseAnalysis {
  rootCause: string;
  category: string;
  confidence: number;
  suggestedFix: string;
  owner: 'Automation Team' | 'Application Team' | 'Infrastructure Team';
}

/**
 * LLM-based Failure Analyzer using OpenAI
 * 
 * Analyzes failure artifacts and generates root cause analysis
 */
export class FailureAnalyzer {
  private openaiKey = process.env.OPENAI_API_KEY;
  private endpoint = 'https://api.openai.com/v1/chat/completions';

  /**
   * Analyze a failure using LLM
   */
  async analyzeFail(
    artifact: FailureArtifact,
    similarFailures: FailureRecord[],
    category: string
  ): Promise<RootCauseAnalysis | null> {
    if (!this.openaiKey) {
      logger.warn('OPENAI_API_KEY not set; skipping LLM analysis');
      return this.generateFallbackAnalysis(artifact, similarFailures, category);
    }

    try {
      const prompt = this.buildAnalysisPrompt(artifact, similarFailures, category);
      
      logger.info('Calling OpenAI API for failure analysis');
      
      const response = await this.callOpenAI(prompt);
      
      if (response && response.rootCause) {
        logger.info('LLM analysis completed successfully');
        return response;
      } else {
        logger.warn('LLM returned incomplete analysis, using fallback');
        return this.generateFallbackAnalysis(artifact, similarFailures, category);
      }
    } catch (error) {
      logger.error(`LLM analysis failed: ${error}`);
      return this.generateFallbackAnalysis(artifact, similarFailures, category);
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<RootCauseAnalysis | null> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an expert test automation engineer analyzing Playwright test failures. 
              Provide a JSON response with fields: rootCause, confidence (0-1), suggestedFix, owner.
              Be concise and actionable.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error(`OpenAI API error: ${error}`);
        return null;
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        
        // Try to parse JSON from response
        try {
          const json = JSON.parse(content);
          return {
            rootCause: json.rootCause || 'Unknown',
            category: json.category || 'Unknown',
            confidence: json.confidence || 0.5,
            suggestedFix: json.suggestedFix || 'No fix suggested',
            owner: json.owner || 'Automation Team'
          };
        } catch {
          // Fallback to parsing response as text
          logger.warn('Failed to parse LLM response as JSON, using text');
          return {
            rootCause: content.substring(0, 200),
            category: 'Unknown',
            confidence: 0.5,
            suggestedFix: 'Review error message and logs',
            owner: 'Automation Team'
          };
        }
      }

      return null;
    } catch (error) {
      logger.error(`Failed to call OpenAI API: ${error}`);
      return null;
    }
  }

  /**
   * Generate fallback analysis when LLM is unavailable
   */
  private generateFallbackAnalysis(
    artifact: FailureArtifact,
    similarFailures: FailureRecord[],
    category: string
  ): RootCauseAnalysis {
    // Check similar failures for insights
    const withFix = similarFailures.filter(f => f.suggestedFix);
    
    let rootCause = 'Unable to determine root cause';
    let suggestedFix = 'Review error message and test logs';
    let owner: 'Automation Team' | 'Application Team' | 'Infrastructure Team' = 'Automation Team';
    let confidence = 0.3;

    if (withFix.length > 0) {
      const similar = withFix[0];
      rootCause = similar.rootCause || 'Similar failure detected in history';
      suggestedFix = similar.suggestedFix || 'Apply same fix as similar failure';
      confidence = 0.6;
    }

    // Classify owner based on error message
    if (artifact.errorMessage.includes('locator') || artifact.errorMessage.includes('selector')) {
      owner = 'Automation Team';
    } else if (artifact.errorMessage.includes('auth') || artifact.errorMessage.includes('login')) {
      owner = 'Application Team';
    } else if (artifact.errorMessage.includes('network') || artifact.errorMessage.includes('timeout')) {
      owner = 'Infrastructure Team';
    }

    logger.info(`Generated fallback analysis for: ${artifact.testName}`);

    return {
      rootCause,
      category,
      confidence,
      suggestedFix,
      owner
    };
  }

  /**
   * Build analysis prompt for LLM
   */
  private buildAnalysisPrompt(
    artifact: FailureArtifact,
    similarFailures: FailureRecord[],
    category: string
  ): string {
    let prompt = `Analyze this test failure and provide root cause analysis.\n\n`;
    
    prompt += `## Failure Details\n`;
    prompt += `Test: ${artifact.testName}\n`;
    prompt += `Error: ${artifact.errorMessage}\n`;
    prompt += `Category: ${category}\n`;

    if (artifact.consoleLogs && artifact.consoleLogs.length > 0) {
      prompt += `\n## Recent Console Output\n`;
      artifact.consoleLogs.slice(-5).forEach(log => {
        prompt += `${JSON.stringify(log)}\n`;
      });
    }

    if (similarFailures.length > 0) {
      prompt += `\n## Similar Historical Failures\n`;
      similarFailures.slice(0, 3).forEach(failure => {
        prompt += `- Test: ${failure.testName}\n`;
        prompt += `  Error: ${failure.errorMessage}\n`;
        if (failure.rootCause) {
          prompt += `  Root Cause: ${failure.rootCause}\n`;
        }
        if (failure.suggestedFix) {
          prompt += `  Fix: ${failure.suggestedFix}\n`;
        }
      });
    }

    prompt += `\n## Required Response (JSON)\n`;
    prompt += `{\n`;
    prompt += `  "rootCause": "...",\n`;
    prompt += `  "confidence": 0-1,\n`;
    prompt += `  "suggestedFix": "...",\n`;
    prompt += `  "owner": "Automation Team" | "Application Team" | "Infrastructure Team"\n`;
    prompt += `}\n`;

    return prompt;
  }
}

export const failureAnalyzer = new FailureAnalyzer();
