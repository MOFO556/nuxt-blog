import type { User } from "./user"

export type Post = {
  id: number
  title: string
  url: string
  content: string,
  createdAt: string,
  updatedAt: string,
  userId: string,
  user: Omit<User, "password">
  images?: PostImage[]
}

export type PostImage = { path: string, postCover: boolean };

// export type PostUpload = {
//   id: number
//   title: string
//   url: string
//   content: string,
//   images: File[]
// }

export interface PostStore {
  url: string,
  title: string,
  content: string
}

export interface IPostsState {
  posts: Post[]
}