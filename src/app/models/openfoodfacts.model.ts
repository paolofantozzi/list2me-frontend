export type OpenFoodFactsDomain = 'food' | 'beauty' | 'product';

export interface OpenFoodFactsResultMetadata {
  barcode: string;
  brands?: string;
  quantity?: string;
  categories?: string;
  image_url?: string | null;
  ingredients_text?: string;
  labels?: string[];
  allergens?: string[];
  service_url: string;
  nutriscore_grade?: string;
  nova_group?: number;
  ecoscore_grade?: string;
}

export interface OpenFoodFactsSearchResult {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  service_url: string;
  metadata: OpenFoodFactsResultMetadata;
}
