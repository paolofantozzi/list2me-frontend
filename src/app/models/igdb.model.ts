export interface IGDBSearchResult {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  service_url: string;
  metadata: {
    igdb_id: number | null;
    slug: string;
    platforms: string[];
    genres: string[];
    first_release_date: string | null;
    image_url: string | null;
    service_url: string;
  };
}

export interface IGDBGameDetail {
  igdb_id: number | null;
  name: string;
  slug: string;
  summary: string;
  storyline: string;
  image_url: string | null;
  screenshots: string[];
  genres: string[];
  platforms: string[];
  game_modes: string[];
  themes: string[];
  developers: string[];
  publishers: string[];
  first_release_date: string | null;
  rating: number | null;
  aggregated_rating: number | null;
  service_url: string;
}
