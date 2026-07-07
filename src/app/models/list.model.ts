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
  /** Permesso effettivo dell'utente corrente su questa lista ('edit' anche per il proprietario). */
  my_permission: 'view' | 'edit';
  /** Se questa lista è referenziata come `child_list` da un item, la lista che la contiene. */
  parent_list?: ListSummary | null;
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
  /** Data facoltativa a cui l'elemento si riferisce (auto-compilata da alcuni servizi esterni, sempre modificabile). */
  event_date?: string | null;
  /** Ora facoltativa, abbinata a `event_date`. */
  event_time?: string | null;
  /** Indirizzo o nome del luogo in forma libera. */
  location_address?: string;
  /** Latitudine GPS facoltativa, abbinata a `location_longitude`. */
  location_latitude?: string | null;
  /** Longitudine GPS facoltativa, abbinata a `location_latitude`. */
  location_longitude?: string | null;
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
