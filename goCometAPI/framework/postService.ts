import { APIResponse } from '@playwright/test';
import { ApiClient } from './apiClient';

export class PostService {
  constructor(private apiClient: ApiClient) {}

  async createPost(payload: unknown): Promise<APIResponse> {
    return this.apiClient.post('/posts', payload);
  }

  async patchPost(postId: number | string, payload: unknown): Promise<APIResponse> {
    return this.apiClient.patch(`/posts/${postId}`, payload);
  }
}
