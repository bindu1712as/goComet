import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
}

class Logger {
  private logs: LogEntry[] = [];
  private logsDir = path.join(process.cwd(), 'logs');

  constructor() {
    this.ensureLogsDir();
  }

  private ensureLogsDir(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    this.logs.push(entry);

    // Console output
    const prefix = `[${entry.timestamp}] [${level}]`;
    const output = context ? `${prefix} ${message} ${JSON.stringify(context)}` : `${prefix} ${message}`;

    if (level === LogLevel.ERROR) {
      console.error(output);
    } else if (level === LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Get all collected logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Save logs to file (for failure analysis)
   */
  saveLogs(filename: string): void {
    try {
      const filepath = path.join(this.logsDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(this.logs, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save logs: ${error}`);
    }
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }
}

export const logger = new Logger();