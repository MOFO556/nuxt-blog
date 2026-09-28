export type User = {
  id: number,
  login: string,
  password: string
  avatar?: string
}
export type UserFormData = {
  login: string,
  password: string
  usePasskey: boolean,
  avatar?: File | undefined
}


export type UserResp  = { 
  user: User, 
  token: string
}