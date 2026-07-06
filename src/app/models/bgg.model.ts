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
