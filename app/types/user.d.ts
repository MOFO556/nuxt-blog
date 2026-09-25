export type User = {
  id: number,
  login: string,
  password: string
}

export type UserResp  = { 
  user: User, 
  token: string
}