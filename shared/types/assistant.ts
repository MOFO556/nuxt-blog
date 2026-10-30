import type { PostMode } from '~~/shared/types/posts';

export type AssistantFormSnapshot = {
  mode: PostMode;
  title: string;
  description: string;
  url: string;
  content: string;
  contentHtml: string;
  tags: string[];
};

export type AssistantFormPatch = {
  title?: string;
  description?: string;
  url?: string;
  content?: string;
  contentHtml?: string;
  tags?: string[];
};

export type AssistantNavigationProposal = {
  path: string;
  query?: Record<string, string>;
  reason?: string;
};

export type AssistantClientContext = {
  path?: string;
  formOpen?: boolean;
  postFormSnapshot?: AssistantFormSnapshot | null;
};