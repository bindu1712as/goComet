import { logger } from '../utils/logger';
import { vectorStore, FailureRecord } from './vectorStore';
import { FailureArtifact } from './failureCollector';

/**
 * RAG (Retrieval Augmented Generation) Analyzer
 * 
 * Retrieves similar historical failures to provide context for LLM analysis
 */
export class RAGAnalyzer {
  
  /**
   * Get context from historical failures
   */
  async getContext(artifact: FailureArtifact): Promise<{
    similarFailures: FailureRecord[];
    context: string;
  }> {
    logger.info(`Building RAG context for: ${artifact.testName}`);

    // Find similar failures from history
    const similarFailures = await vectorStore.findSimilar(artifact.errorMessage, 5);

    logger.info(`Found ${similarFailures.length} similar historical failures`);

    // Build context string for LLM
    const context = this.buildContextPrompt(artifact, similarFailures);

    return {
      similarFailures,
      context
    };
  }

  /**
   * Build context prompt for LLM
   */
  private buildContextPrompt(
    artifact: FailureArtifact,
    similarFailures: FailureRecord[]
  ): string {
    let prompt = `## Current Failure\n\n`;
    prompt += `Test: ${artifact.testName}\n`;
    prompt += `Error: ${artifact.errorMessage}\n`;
    prompt += `Timestamp: ${artifact.timestamp}\n`;

    if (artifact.consoleLogs && artifact.consoleLogs.length > 0) {
      prompt += `\n## Console Logs\n\n`;
      artifact.consoleLogs.slice(0, 10).forEach(log => {
        prompt += `- ${JSON.stringify(log)}\n`;
      });
    }

    if (similarFailures.length > 0) {
      prompt += `\n## Similar Historical Failures\n\n`;
      similarFailures.forEach((failure, index) => {
        prompt += `### Failure ${index + 1}\n`;
        prompt += `Test: ${failure.testName}\n`;
        prompt += `Error: ${failure.errorMessage}\n`;
        prompt += `Category: ${failure.category}\n`;
        
        if (failure.rootCause) {
          prompt += `Root Cause: ${failure.rootCause}\n`;
        }
        
        if (failure.suggestedFix) {
          prompt += `Fix: ${failure.suggestedFix}\n`;
        }
        
        if (failure.confidence) {
          prompt += `Confidence: ${(failure.confidence * 100).toFixed(0)}%\n`;
        }
        
        prompt += `\n`;
      });
    }

    return prompt;
  }

  /**
   * Get recommendations based on similar failures
   */
  getRecommendations(similarFailures: FailureRecord[]): string[] {
    const recommendations: string[] = [];

    // Group by root cause
    const byCause = new Map<string, FailureRecord[]>();
    similarFailures.forEach(failure => {
      if (failure.rootCause) {
        const key = failure.rootCause;
        if (!byCause.has(key)) {
          byCause.set(key, []);
        }
        byCause.get(key)!.push(failure);
      }
    });

    // Get most common root causes
    Array.from(byCause.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .forEach(([cause, failures]) => {
        // Get the most confident fix
        const withFix = failures.filter(f => f.suggestedFix && f.confidence && f.confidence > 0.7);
        if (withFix.length > 0) {
          const best = withFix.reduce((a, b) => 
            (b.confidence || 0) > (a.confidence || 0) ? b : a
          );
          
          if (best.suggestedFix) {
            recommendations.push(best.suggestedFix);
          }
        }
      });

    logger.info(`Generated ${recommendations.length} recommendations based on history`);
    return recommendations;
  }
}

export const ragAnalyzer = new RAGAnalyzer();
