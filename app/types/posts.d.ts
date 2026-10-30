import type { ImageMeta, ItemUploadMeta } from "./core"
import type { UploadMethodResultItem } from "./forms"
import type { User } from "./user"
import type { PostAttachmentPayload, PostMode } from "~~/shared/types/posts"

export type Post = PostInsert & {
  id: number,
  createdAt: string,
  updatedAt: string,
  userId: number,
  user: Omit<User, "password">
  tags: Tag[],
  attachments?: PostImageMeta[]
  mode: PostMode,
  contentHtml?: string | null,
  description?: string | null,
  excerpt?: string | null,
}

export type Tag = { name: string; slug: string };
export type PostImageMeta = ImageMeta & { id?: number; postCover?: boolean };
export type PostItemUploadMeta = ItemUploadMeta & {
  postCover?: boolean;
  originalName?: string;
  clientTempId?: string;
};

export type PostInsert = {
  url: string,
  title: string,
  content: string
  mode?: PostMode,
  contentHtml?: string,
  description?: string,
  tags?: Tag[],
  images?: PostAttachmentPayload[],
}

export type PostUpdate = Partial<PostInsert> & {
  id: number,
}

export type PostFormProps = {
  url?: string,
  title?: string,
  content?: string,
  contentHtml?: string | null,
  description?: string | null,
  mode?: PostMode,
  images?: PostImageMeta[],
  id?: number,
  tags?: Tag[],
}

export type PostFormData = {
  title: string,
  content: string,
  url: string,
  images: StagedUploadFile[],
  cover: StagedUploadFile[],
  contentImages: StagedUploadFile[],
  description: string,
  contentHtml: string,
  mode: PostMode,
  tags: Tag[],
  id?: number,
}

export type PostEditorShell = {
  editor?: import('@tiptap/vue-3').Editor,
}

export type PostModeOption = {
  label: string,
  value: PostMode,
}

export type ImagePreviewModalState = {
  open: boolean,
  picture?: string,
  description?: string,
  file?: File & { description?: string },
}

export type StagedUploadFile = File & {
  clientTempId?: string,
  fileId?: number,
  originalName?: string,
  postCover?: boolean,
  existingPath?: string,
  description?: string,
  previewUrl?: string,
  name: string,
}

export type ContentImageRewriteMaps = {
  idMap: Record<string, number>,
  pathMap: Record<string, string>,
  blobSrcMap: Record<string, string>,
}

export type UploadedWithTemp = UploadMethodResultItem & {
  clientTempId?: string,
  fileId?: number,
  originalName?: string,
}

export type PostEditorExpose = {
  insertImageAtCursor: (src: string, imageId: string | number) => void,
  prependImage: (src: string, imageId: string | number) => void,
  insertCarousel: (imageIds: (string | number)[], slot?: string | null) => void,
  fillCarouselSlot: (slot: string, imageIds: (string | number)[]) => boolean,
  fillCarouselSlots: (slots: { slot: string; imageIds: (string | number)[] }[]) => void,
  setHtmlContent: (html: string, options?: { lockAuthored?: boolean }) => boolean,
  editor: unknown,
}

export type PostFormattedFields = {
  content: string,
  contentHtml: string,
}

export type PostModeSwitchArgs = {
  next: PostMode,
  previous: PostMode | undefined,
  content: string,
  contentHtml: string,
}

export type PostModeSwitchFilesArgs = {
  next: PostMode,
  previous: PostMode | undefined,
  images: StagedUploadFile[],
  cover: StagedUploadFile[],
  contentImages: StagedUploadFile[],
  coverIndex?: number | null,
}

export type PostModeSwitchFilesResult = {
  images: StagedUploadFile[],
  cover: StagedUploadFile[],
  contentImages: StagedUploadFile[],
  coverIndex: number | null,
}

export type PostEditorEmit = {
  (event: 'insertImageRequest'): void,
  (event: 'insertCarouselRequest'): void,
}

export interface IPostsState {
  posts: Post[]
}