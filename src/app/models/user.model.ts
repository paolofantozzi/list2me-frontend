export interface UserDetail {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  bio?: string;
  avatar_url?: string;
  date_joined: string;
}

export interface UserPublic {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  avatar_url: string;
  date_joined: string;
}

export interface JWT {
  access: string;
  refresh: string;
  user: UserDetail;
}

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password1: string;
  password2: string;
  bio?: string;
  avatar_url?: string;
}

export interface TokenRefresh {
  access: string;
  refresh: string;
}
