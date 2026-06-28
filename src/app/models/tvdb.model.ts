export type TvdbItemType = 'series' | 'movie' | 'episode' | 'person' | 'company';

export interface TvdbSearchResultMetadata {
  thetvdb_id: string;
  type: TvdbItemType | string;
  slug: string;
  image_url: string;
  language: string;
  service_url: string;
  year?: string;
  network?: string;
  status?: string;
}

export interface TvdbSearchResult {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  service_url: string;
  metadata: TvdbSearchResultMetadata;
}

export interface TvdbSeries {
  tvdb_id: number;
  name: string;
  slug: string;
  overview: string;
  status: string;
  first_aired: string;
  last_aired: string;
  network: string;
  image_url: string;
  genres: string[];
  imdb_id: string;
  language: string;
  service_url: string;
}

export interface TvdbEpisode {
  tvdb_id: number;
  season_number: number;
  episode_number: number;
  name: string;
  overview: string;
  aired: string;
  runtime: number | null;
  image_url: string;
  service_url: string;
}

export interface TvdbEpisodesPage {
  series_name: string;
  series_slug: string;
  page: number;
  episodes: TvdbEpisode[];
}

export interface TvdbMovie {
  tvdb_id: number;
  name: string;
  slug: string;
  overview: string;
  status: string;
  year: string;
  image_url: string;
  genres: string[];
  imdb_id: string;
  language: string;
  service_url: string;
}

export interface TvdbLanguage {
  code: string;
  name: string;
}
