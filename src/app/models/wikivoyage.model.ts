export interface WikivoyageListing {
  name: string;
  description: string;
  address: string;
  url: string;
}

export interface WikivoyageSearchResult {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  service_url: string;
  metadata: {
    wikivoyage_page_id: number | null;
    title: string;
    lang: string;
    service_url: string;
  };
}

export interface WikivoyageGuide {
  wikivoyage_page_id: number | null;
  title: string;
  lang: string;
  image_url: string | null;
  service_url: string;
  see: WikivoyageListing[];
  do: WikivoyageListing[];
  eat: WikivoyageListing[];
}
