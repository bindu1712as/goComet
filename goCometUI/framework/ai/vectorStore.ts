import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface FailureRecord {
  id: string;
  timestamp: string;
  testName: string;
  errorMessage: string;
  category: string;
  rootCause?: string;
  suggestedFix?: string;
  confidence?: number;
}

/**
 * Vector Store for Historical Failures
 * 
 * Stores failure records locally in JSON format.
 * Optional: Can integrate with ChromaDB for vector embeddings and similarity search.
 */
export class VectorStore {
  private storePath = path.join(process.cwd(), 'artifacts', 'failures.json');
  private storeDir = path.dirname(this.storePath);
  private records: FailureRecord[] = [];

  constructor() {
    this.ensureStore();
    this.loadRecords();
  }

  private ensureStore(): void {
    if (!fs.existsSync(this.storeDir)) {
      fs.mkdirSync(this.storeDir, { recursive: true });
      logger.info(`Created artifacts directory: ${this.storeDir}`);
    }
  }

  private loadRecords(): void {
    try {
      if (fs.existsSync(this.storePath)) {
        const data = fs.readFileSync(this.storePath, 'utf-8');
        this.records = JSON.parse(data) || [];
        logger.info(`Loaded ${this.records.length} historical failures`);
      }
    } catch (error) {
      logger.error(`Failed to load failure records: ${error}`);
      this.records = [];
    }
  }

  private saveRecords(): void {
    try {
      fs.writeFileSync(this.storePath, JSON.stringify(this.records, null, 2), 'utf-8');
    } catch (error) {
      logger.error(`Failed to save failure records: ${error}`);
    }
  }

  /**
   * Add a new failure record
   */
  async addFailure(record: Omit<FailureRecord, 'id' | 'timestamp'>): Promise<string> {
    const id = this.generateId();
    const fullRecord: FailureRecord = {
      ...record,
      id,
      timestamp: new Date().toISOString()
    };

    this.records.push(fullRecord);
    this.saveRecords();

    logger.info(`Added failure record: ${id} for test: ${record.testName}`);
    return id;
  }

  /**
   * Find similar failures by error message
   * Returns failures with similar keywords/patterns
   */
  async findSimilar(errorMessage: string, topK: number = 5): Promise<FailureRecord[]> {
    const keywords = this.extractKeywords(errorMessage);

    if (keywords.length === 0) {
      return [];
    }

    const scored = this.records.map(record => {
      const recordKeywords = this.extractKeywords(record.errorMessage);
      const matching = keywords.filter(k => recordKeywords.includes(k)).length;
      const score = matching / Math.max(keywords.length, recordKeywords.length);
      return { record, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(s => s.record);
  }

  /**
   * Update a failure with root cause and fix
   */
  async updateFailure(id: string, rootCause: string, suggestedFix: string, confidence: number): Promise<void> {
    const record = this.records.find(r => r.id === id);
    if (record) {
      record.rootCause = rootCause;
      record.suggestedFix = suggestedFix;
      record.confidence = confidence;
      this.saveRecords();
      logger.info(`Updated failure record: ${id} with root cause and fix`);
    }
  }

  /**
   * Get all records
   */
  getAllRecords(): FailureRecord[] {
    return [...this.records];
  }

  /**
   * Get records by category
   */
  getRecordsByCategory(category: string): FailureRecord[] {
    return this.records.filter(r => r.category === category);
  }

  /**
   * Get records by test name
   */
  getRecordsByTest(testName: string): FailureRecord[] {
    return this.records.filter(r => r.testName === testName);
  }

  private generateId(): string {
    return `failure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractKeywords(text: string): string[] {
    const commonWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'and', 'or', 'not', 'in', 'at', 'to', 'for', 'of', 'by']);
    const tokens: string[] = text
      .toLowerCase()
      .match(/\b\w+\b/g) ?? [];
    
    return tokens
      .filter(word => !commonWords.has(word) && word.length > 3);
  }

  /**
   * Clear all records (useful for testing)
   */
  clear(): void {
    this.records = [];
    try {
      if (fs.existsSync(this.storePath)) {
        fs.unlinkSync(this.storePath);
      }
    } catch (error) {
      logger.error(`Failed to clear vector store: ${error}`);
    }
  }
}

export const vectorStore = new VectorStore();
