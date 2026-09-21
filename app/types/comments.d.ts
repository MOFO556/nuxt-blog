export type Comment = {
  id: number,
  text: string,
  content: string,
  createdAt: string,
  updatedAt: string,
  userId: string,
  user: Omit<User, "password">
  attachments?: { path: string }[]
}