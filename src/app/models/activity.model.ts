import { UserPublic } from './user.model';

export interface Activity {
  id: string;
  actor: UserPublic;
  verb: string;
  target_type?: string;
  target_id?: string;
  target_title?: string;
  created_at: string;
}
