import type { ImageMeta } from "./core";
import type { User } from "./user";

export type Comment = {
  id: number,
  text: string,
  content: string,
  createdAt: string,
  updatedAt: string,
  userId: number,
  postId: number,
  user: Omit<User, "password">
  attachments?: Partial<ImageMeta>[]
}

export type CommentInsert<T = PostComment | ImageComment> = T & {
  text: string,
  images?: ImageMeta[]
}

export type PostComment = {
  postId: number
}

export type ImageComment = {
  postId: number
}