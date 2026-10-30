import type {
  AssistantThreadDetail,
  AssistantThreadSummary,
} from '~/types/assistant';

export function createAssistantRepository(appFetch: typeof $fetch) {
  return {
    async listThreads() {
      return appFetch<AssistantThreadSummary[]>('assistant/threads');
    },
    async createThread(title?: string) {
      return appFetch<AssistantThreadSummary>('assistant/threads', {
        method: 'POST',
        body: title ? { title } : {},
      });
    },
    async getThread(id: string) {
      return appFetch<AssistantThreadDetail>(`assistant/threads/${id}`);
    },
    async deleteThread(id: string) {
      return appFetch<AssistantThreadSummary>(`assistant/threads/${id}`, {
        method: 'DELETE',
      });
    },
  };
}