export type MusicBrainzEntityType = 'artist' | 'album' | 'track';

export interface MusicBrainzSearchResult {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  service_url: string;
  metadata: Record<string, unknown>;
}
