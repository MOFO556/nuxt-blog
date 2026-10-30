import type { 
  UIMessage,
  UIMessagePart,
  UIDataTypes,
  UITools
} from 'ai';
import type {
  AssistantFormPatch,
} from '~~/shared/types/assistant';

export type AssistantThreadOption = {
  label: string;
  value: string;
};

export type AssistantThreadSummary = {
  id: string;
  userId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type AssistantThreadDetail = {
  thread: AssistantThreadSummary;
  messages: {
    id: string;
    role: UIMessage['role'];
    parts: UIMessage['parts'];
    createdAt: string;
  }[];
};

export type AssistantPendingNavigation = {
  path: string;
  query: Record<string, string>;
  reason?: string | null;
  toolCallId?: string;
};

export type AssistantPendingFormPatch = {
  patch: AssistantFormPatch;
  reason?: string | null;
  toolCallId?: string;
};

export type AssistantPendingImage = {
  imageId: string;
  regularUrl: string;
  thumbUrl: string;
  alt: string | null;
  photographer: string | null;
  downloadLocation: string | null;
  asCover: boolean;
  alsoInContent: boolean;
  forCarousel: boolean;
  carouselSlot: string | null;
  includeImageDescriptions: boolean;
  reason?: string | null;
  toolCallId?: string;
};

export type AssistantPendingImageBatch = {
  images: AssistantPendingImage[];
  reason?: string | null;
  toolCallId?: string;
  toolCallIds: string[];
};

export type AssistantRemoteImageInput = {
  regularUrl: string;
  alt?: string | null;
  photographer?: string | null;
  asCover?: boolean;
  alsoInContent?: boolean;
  forCarousel?: boolean;
  carouselSlot?: string | null;
  includeImageDescriptions?: boolean;
};

export type AssistantFormBridgeApi = {
  getSnapshot: () => AssistantFormSnapshot;
  applyPatch: (patch: AssistantFormPatch) => void;
  stageRemoteImage: (image: AssistantRemoteImageInput) => Promise<void>;
  stageRemoteImages: (images: AssistantRemoteImageInput[]) => Promise<void>;
};

export type AssistantUIMessagePart = UIMessagePart<UIDataTypes, UITools>;

declare module '#app' {
  interface PageMeta {
    assistantDocked?: boolean;
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    assistantDocked?: boolean;
  }
}