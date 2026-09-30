export type User = {
  id: number,
  login: string,
  password: string,
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

export type ProfileFormData = {
  avatar: File | null,
  newPassword: string,
  currentPassword: string,
  removePassword: boolean
}

export type CredentialsInfo = {
  id: string,
  backedUp: boolean,
  deviceType: "singleDevice" | "multiDevice" | null,
  city: string | null,
  country: string | null,
  userAgent: string | null,
  createdAt: string
}

export type SessionsInfo = {
    id: string;
    createdAt: string;
    city: string | null;
    country: string | null;
    userAgent: string | null;
    loginMethod: "password" | "passkey";
    lastSeenAt: string;
    invalidated: boolean;
    invalidReason: "passkey removed" | "password changed" | null;
    current: boolean
}