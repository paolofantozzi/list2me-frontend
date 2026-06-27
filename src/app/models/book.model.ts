export interface BookResult {
  title: string;
  author: string;
  isbn: string;
  cover_url: string;
  open_library_key: string;
  year: number | null;
  service_url: string;
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
