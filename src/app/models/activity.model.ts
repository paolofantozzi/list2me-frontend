import { UserPublic } from './user.model';

export interface Activity {
  id: string;
  actor: UserPublic;
  verb: string;
  target_type: string;
  target_object_id: string | null;
  extra_data: unknown;
  created_at: string;
}
