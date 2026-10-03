import type { ImageMeta } from "./core";
import type { User } from "./user";

export type Comment = {
  id: number,
  text: string,
  content?: string,
  createdAt: string,
  updatedAt: string | null,
  deletedAt: string | null,
  userId: number,
  postId: number | null,
  parentId: number | null,
  user: Omit<User, "password">
  attachments?: Partial<ImageMeta>[]
  replies?: Comment[]
}

export type CommentInsert<T = PostComment | ImageComment> = T & {
  text: string,
  parentId?: number | null,
  images?: ImageMeta[]
}

export type CommentUpdate = {
  id: number,
  text: string,
  images?: ImageMeta[]
}

export type PostComment = {
  postId: number
  parentId?: number | null
}

export type ImageComment = {
  imageId: number
}