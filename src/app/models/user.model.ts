export interface UserDetail {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  bio?: string;
  avatar_url?: string;
  avatar?: string | null;
  date_joined: string;
  /** Opzionale: assente in una sessione cache salvata prima del backend v0.22.0. */
  is_staff?: boolean;
  /** Opzionale: assente in una sessione cache salvata prima del backend v0.22.0. */
  is_superuser?: boolean;
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

/** Riga restituita da `GET /auth/admin/users/` (solo admin) — include gli account disattivati. */
export interface AdminUser extends UserPublic {
  is_active: boolean;
}

export interface UserFollowRecord {
  id: string;
  follower: UserPublic;
  following: UserPublic;
  created_at: string;
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
  username?: string;
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
