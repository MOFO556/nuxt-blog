import type { ImageMeta, ItemUploadMeta } from "./core"
import type { User } from "./user"

export type Post = PostInsert & {
  id: number,
  createdAt: string,
  updatedAt: string,
  userId: number,
  user: Omit<User, "password">
  tags: Tag[],
  attachments?: PostImageMeta[]
}

export type Tag = { name: string; slug: string };
export type PostImageMeta = ImageMeta & { postCover?: boolean };
export type PostItemUploadMeta = ItemUploadMeta & { postCover?: boolean };

export type PostInsert = {
  url: string,
  title: string,
  content: string
}

export interface IPostsState {
  posts: Post[]
}