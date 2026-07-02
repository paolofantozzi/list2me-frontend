export interface PlaceResultMetadata {
  display_name: string;
  address?: Record<string, string>;
  latitude: number;
  longitude: number;
  osm_id: number;
  osm_type: string;
  place_id: number;
  category?: string;
  place_type?: string;
  service_url: string;
}

export interface PlaceSearchResult {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  service_url: string;
  metadata: PlaceResultMetadata;
}
