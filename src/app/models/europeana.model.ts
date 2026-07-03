export type EuropeanaEntityType = 'artwork' | 'artist';

export interface EuropeanaSearchResult {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  service_url: string;
  metadata: Record<string, unknown>;
}
