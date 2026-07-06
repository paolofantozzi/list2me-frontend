export type BGGSearchType = 'boardgame' | 'rpgitem';

export interface BGGSearchResult {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  service_url: string;
  metadata: {
    bgg_id: number | null;
    year_published: number | null;
    service_url: string;
  };
}

export interface BGGGameDetail {
  bgg_id: number | null;
  type: string;
  name: string;
  thumbnail_url: string | null;
  image_url: string | null;
  year_published: number | null;
  service_url: string;
}
