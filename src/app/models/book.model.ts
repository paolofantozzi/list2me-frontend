export interface BookResultMetadata {
  open_library_key: string;
  author: string;
  isbn: string;
  cover_url: string;
  year: number | null;
  service_url: string;
}

export interface BookResult {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  service_url: string;
  metadata: BookResultMetadata;
}

export interface BookEdition {
  edition_key: string;
  title: string;
  languages: string[];
  year: number | null;
  publisher: string;
  isbn: string;
  cover_url: string;
  pages: number | null;
  edition_name: string;
  service_url: string;
}
