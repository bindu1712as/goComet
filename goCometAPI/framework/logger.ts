export class Logger {
  private static formatData(data: unknown) {
    if (data === undefined) return '';
    try {
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  static info(message: string, data?: unknown) {
    console.log(`[INFO] ${message}${data !== undefined ? ' | ' + this.formatData(data) : ''}`);
  }

  static warn(message: string, data?: unknown) {
    console.warn(`[WARN] ${message}${data !== undefined ? ' | ' + this.formatData(data) : ''}`);
  }

  static error(message: string, data?: unknown) {
    console.error(`[ERROR] ${message}${data !== undefined ? ' | ' + this.formatData(data) : ''}`);
  }

  static request(method: string, endpoint: string, payload?: unknown) {
    console.log(`[REQUEST] ${method.toUpperCase()} ${endpoint}${payload ? ' | Payload: ' + this.formatData(payload) : ''}`);
  }

  static response(endpoint: string, status: number, body?: unknown) {
    console.log(`[RESPONSE] ${endpoint} | Status: ${status}${body !== undefined ? ' | Body: ' + this.formatData(body) : ''}`);
  }
}
