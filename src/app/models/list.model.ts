import { UserPublic } from './user.model';
import { Tag } from './tag.model';
import { ItemType } from './item-type.model';
import { Group } from './group.model';

export type ListVisibility = 'public' | 'private' | 'group';

/** Payload per creare/aggiornare una lista: i tag sono stringhe, non oggetti Tag. */
export interface ListWriteData {
  title?: string;
  description?: string;
  visibility?: ListVisibility;
  tags?: string[];
}

export interface List {
  id: string;
  title: string;
  description?: string;
  owner: UserPublic;
  visibility: ListVisibility;
  tags: Tag[];
  items_count: number;
  version: number;
  forked_from?: string | null;
  fork_point_version?: number | null;
  is_fork: boolean;
  is_following?: boolean;
  items?: Item[];
  created_at: string;
  updated_at: string;
}

export interface ChildListDetail {
  id: string;
  title: string;
  description?: string;
  visibility: ListVisibility;
  items_count: number;
}

/** Stessa forma di `ChildListDetail` (backend: `ListSummarySerializer`), riusata per `copied_from_list_detail`. */
export type ListSummary = ChildListDetail;

export interface Item {
  id: string;
  list: string;
  position: string;
  text: string;
  item_type?: string | null;
  item_type_detail?: ItemType | null;
  metadata?: Record<string, unknown>;
  image?: string | null;
  child_list?: string | null;
  child_list_detail?: ChildListDetail | null;
  copied_from_item?: string | null;
  copied_from_list?: string | null;
  copied_from_list_detail?: ListSummary | null;
  created_at: string;
  updated_at: string;
}

export interface ListShare {
  id: string;
  shared_with: UserPublic;
  shared_by: UserPublic;
  permission: 'view' | 'edit';
  created_at: string;
}

export interface GroupVisibility {
  id: string;
  group: Group;
  permission: 'view' | 'edit';
  created_at: string;
}

export interface Suggestion {
  id: string;
  list: string;
  suggested_by: UserPublic;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  actions: SuggestionAction[];
  reviewed_at: string | null;
  created_at: string;
}

export interface SuggestionAction {
  id: string;
  action_type: 'add' | 'remove' | 'modify' | 'reorder';
  target_item: string | null;
  position?: string | null;
  text?: string;
  item_type?: string | null;
  metadata?: unknown;
}

export interface ListDiff {
  source_version: number;
  fork_version: number;
  fork_point_version: number;
  only_in_source: string[];
  only_in_fork: string[];
  in_both: string[];
}
