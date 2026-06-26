import { UserPublic } from './user.model';
import { Tag } from './tag.model';
import { ItemType } from './item-type.model';

export type ListVisibility = 'public' | 'private' | 'group';

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
  visibility: ListVisibility;
  items_count: number;
}

export interface Item {
  id: string;
  list: string;
  position: string;
  text: string;
  item_type?: string | null;
  item_type_detail?: ItemType | null;
  metadata?: Record<string, unknown>;
  child_list?: string | null;
  child_list_detail?: ChildListDetail | null;
  created_at: string;
  updated_at: string;
}

export interface ListShare {
  id: string;
  shared_with: UserPublic;
  created_at: string;
}

export interface GroupVisibility {
  id: string;
  group: string;
  group_name: string;
}

export interface Suggestion {
  id: string;
  list: string;
  author: UserPublic;
  status: 'pending' | 'accepted' | 'rejected';
  actions: SuggestionAction[];
  created_at: string;
}

export interface SuggestionAction {
  action: 'add' | 'remove';
  item_text: string;
  position?: number;
}

export interface ListDiff {
  added: Item[];
  removed: Item[];
}
