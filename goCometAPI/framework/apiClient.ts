import { APIRequestContext, APIResponse } from '@playwright/test';
import { ApiConfig } from './config';
import { Logger } from './logger';

export class ApiClient {
  constructor(private request: APIRequestContext) {}

  private buildUrl(endpoint: string) {
    return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  }

  private async sendRequest(method: string, endpoint: string, payload?: unknown): Promise<APIResponse> {
    const url = this.buildUrl(endpoint);
    Logger.request(method, url, payload);

    try {
      const requestOptions: Record<string, unknown> = {
        headers: ApiConfig.defaultHeaders,
      };

      if (payload !== undefined) {
        requestOptions['data'] = JSON.stringify(payload);
      }

      const response = await this.request.fetch(`${ApiConfig.baseUrl}${url}`, {
        method,
        ...requestOptions,
      });

      Logger.response(url, response.status());
      return response;
    } catch (error) {
      Logger.error(`Failed API request for ${method} ${url}`, error);
      throw error;
    }
  }

  async get(endpoint: string): Promise<APIResponse> {
    return this.sendRequest('GET', endpoint);
  }

  async post(endpoint: string, payload: unknown): Promise<APIResponse> {
    return this.sendRequest('POST', endpoint, payload);
  }

  async patch(endpoint: string, payload: unknown): Promise<APIResponse> {
    return this.sendRequest('PATCH', endpoint, payload);
  }
}
