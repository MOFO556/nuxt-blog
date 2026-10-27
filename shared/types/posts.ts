export enum PostMode {
  Legacy = 'legacy',
  Formatted = 'formatted',
}

export const POST_MODE_VALUES = [PostMode.Legacy, PostMode.Formatted] as const;

export type PostAttachmentPayload = {
  id: number;
  postCover: boolean;
};
