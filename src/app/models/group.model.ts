import { UserPublic } from './user.model';

export interface Group {
  id: string;
  name: string;
  description?: string;
  owner: UserPublic;
  members_count: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  user: UserPublic;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'declined';
  invited_by: UserPublic;
  created_at: string;
}
