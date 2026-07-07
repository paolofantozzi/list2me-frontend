export interface SeatGeekSearchResult {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  service_url: string;
  metadata: SeatGeekEvent;
}

export interface SeatGeekEvent {
  seatgeek_event_id: number | null;
  title: string;
  short_title: string;
  datetime_local: string;
  datetime_utc: string;
  venue_name: string;
  venue_address: string;
  venue_city: string;
  venue_state: string;
  venue_country: string;
  venue_latitude: number | null;
  venue_longitude: number | null;
  performers: string[];
  image_url: string | null;
  service_url: string;
  low_price?: number | null;
  average_price?: number | null;
  high_price?: number | null;
  listing_count?: number | null;
}
