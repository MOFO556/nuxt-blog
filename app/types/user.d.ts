export type User = {
  login: string,
  password: string
}

export type UserResp  = { 
  user: User, 
  token: string
}