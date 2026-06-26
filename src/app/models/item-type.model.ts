export interface ItemType {
  id: string;
  name: string;
  label: string;
  icon?: string;
  schema?: unknown;
  is_system: boolean;
  created_by: string | null;
}

export interface ItemTypeRequest {
  name: string;
  label: string;
  icon?: string;
  schema?: unknown;
}
