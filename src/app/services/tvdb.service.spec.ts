import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { TvdbService } from './tvdb.service';
import { ItemTypeService } from './item-type.service';

const SERIES_ID = 76290;
const MOVIE_ID = 12345;

const mockSearchResult = {
  tvdb_id: '76290',
  type: 'series',
  name: 'Buffy the Vampire Slayer',
  slug: 'buffy-the-vampire-slayer',
  overview: 'A girl with superpowers fights vampires.',
  image_url: 'https://artworks.thetvdb.com/banners/posters/70327-1.jpg',
  year: '1997',
  network: 'The WB',
  status: 'Ended',
  country: 'usa',
  primary_language: 'eng',
  available_languages: ['eng', 'ita'],
  service_url: 'https://thetvdb.com/series/buffy-the-vampire-slayer',
};

const mockSeries = {
  tvdb_id: SERIES_ID,
  name: 'Buffy the Vampire Slayer',
  slug: 'buffy-the-vampire-slayer',
  overview: 'A girl with superpowers.',
  status: 'Ended',
  first_aired: '1997-03-10',
  last_aired: '2003-05-20',
  network: 'The WB',
  image_url: 'https://artworks.thetvdb.com/banners/posters/70327-1.jpg',
  genres: ['Action', 'Drama'],
  imdb_id: 'tt0118276',
  language: 'eng',
  service_url: 'https://thetvdb.com/series/buffy-the-vampire-slayer',
};

const mockEpisodesPage = {
  series_name: 'Buffy the Vampire Slayer',
  series_slug: 'buffy-the-vampire-slayer',
  page: 0,
  episodes: [
    { tvdb_id: 111, season_number: 1, episode_number: 1, name: 'Welcome to the Hellmouth', overview: '', aired: '1997-03-10', runtime: 42, image_url: '', service_url: '' },
  ],
};

const mockMovie = {
  tvdb_id: MOVIE_ID,
  name: 'The Matrix',
  slug: 'the-matrix',
  overview: 'A hacker discovers reality is a simulation.',
  status: 'Released',
  year: '1999',
  image_url: 'https://artworks.thetvdb.com/banners/movies/12345.jpg',
  genres: ['Sci-Fi', 'Action'],
  imdb_id: 'tt0133093',
  language: 'eng',
  service_url: 'https://thetvdb.com/movies/the-matrix',
};

const mockItemTypeResp = (name: string) => ({
  count: 1,
  results: [{ id: `type-${name}-id`, name, label: name, icon: name, schema: {}, is_system: true, created_by: null }],
  next: null,
  previous: null,
});

describe('TvdbService', () => {
  let service: TvdbService;
  let http: HttpTestingController;
  let getItemTypesFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getItemTypesFn = vi.fn().mockImplementation((name: string) => of(mockItemTypeResp(name)));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TvdbService,
        { provide: ItemTypeService, useValue: { getItemTypes: getItemTypesFn } },
      ],
    });
    service = TestBed.inject(TvdbService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ── search ────────────────────────────────────────────────────────────────

  describe('search()', () => {
    it('fa GET con q e language di default', () => {
      let result: any;
      service.search('buffy').subscribe(r => (result = r));

      const req = http.expectOne(r => r.url.includes('/tvdb/search/'));
      expect(req.request.params.get('q')).toBe('buffy');
      expect(req.request.params.get('language')).toBe('eng');
      req.flush({ results: [mockSearchResult] });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Buffy the Vampire Slayer');
    });

    it('passa il type quando specificato', () => {
      service.search('buffy', 'series', 'ita').subscribe();
      const req = http.expectOne(r => r.url.includes('/tvdb/search/'));
      expect(req.request.params.get('type')).toBe('series');
      expect(req.request.params.get('language')).toBe('ita');
      req.flush({ results: [] });
    });

    it('non passa type quando è undefined', () => {
      service.search('buffy').subscribe();
      const req = http.expectOne(r => r.url.includes('/tvdb/search/'));
      expect(req.request.params.has('type')).toBe(false);
      req.flush({ results: [] });
    });

    it('restituisce array vuoto se results è assente', () => {
      let result: any;
      service.search('xyz').subscribe(r => (result = r));
      http.expectOne(r => r.url.includes('/tvdb/search/')).flush({});
      expect(result).toEqual([]);
    });
  });

  // ── getSeries ─────────────────────────────────────────────────────────────

  describe('getSeries()', () => {
    it('fa GET alla URL corretta con language', () => {
      let result: any;
      service.getSeries(SERIES_ID, 'ita').subscribe(r => (result = r));

      const req = http.expectOne(r => r.url.includes(`/tvdb/series/${SERIES_ID}/`) && !r.url.includes('episodes'));
      expect(req.request.params.get('language')).toBe('ita');
      req.flush(mockSeries);

      expect(result.name).toBe('Buffy the Vampire Slayer');
    });
  });

  // ── getSeriesEpisodes ─────────────────────────────────────────────────────

  describe('getSeriesEpisodes()', () => {
    it('fa GET alla URL episodi con page 0 di default', () => {
      service.getSeriesEpisodes(SERIES_ID).subscribe();
      const req = http.expectOne(r => r.url.includes(`/tvdb/series/${SERIES_ID}/episodes/`));
      expect(req.request.params.get('page')).toBe('0');
      req.flush(mockEpisodesPage);
    });

    it('passa season quando specificata', () => {
      service.getSeriesEpisodes(SERIES_ID, 1, 0, 'ita').subscribe();
      const req = http.expectOne(r => r.url.includes('/episodes/'));
      expect(req.request.params.get('season')).toBe('1');
      req.flush(mockEpisodesPage);
    });

    it('non passa season quando non specificata', () => {
      service.getSeriesEpisodes(SERIES_ID).subscribe();
      const req = http.expectOne(r => r.url.includes('/episodes/'));
      expect(req.request.params.has('season')).toBe(false);
      req.flush(mockEpisodesPage);
    });
  });

  // ── getMovie ──────────────────────────────────────────────────────────────

  describe('getMovie()', () => {
    it('fa GET alla URL corretta', () => {
      let result: any;
      service.getMovie(MOVIE_ID, 'ita').subscribe(r => (result = r));

      const req = http.expectOne(r => r.url.includes(`/tvdb/movies/${MOVIE_ID}/`));
      expect(req.request.params.get('language')).toBe('ita');
      req.flush(mockMovie);

      expect(result.name).toBe('The Matrix');
    });
  });

  // ── getLanguages ──────────────────────────────────────────────────────────

  describe('getLanguages()', () => {
    it('fa GET e restituisce la lista linguaggi', () => {
      let result: any;
      service.getLanguages().subscribe(r => (result = r));

      const req = http.expectOne(r => r.url.includes('/tvdb/languages/'));
      req.flush({ languages: [{ code: 'eng', name: 'English' }, { code: 'ita', name: 'Italian' }] });

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('eng');
    });

    it('non fa una seconda chiamata HTTP (cache)', () => {
      service.getLanguages().subscribe();
      http.expectOne(r => r.url.includes('/tvdb/languages/')).flush({ languages: [] });

      service.getLanguages().subscribe();
      http.expectNone(r => r.url.includes('/tvdb/languages/'));
    });
  });

  // ── getItemTypeId ─────────────────────────────────────────────────────────

  describe('getItemTypeId()', () => {
    it("restituisce l'id del tipo series", () => {
      let id: string | null | undefined;
      service.getItemTypeId('series').subscribe(r => (id = r));
      expect(getItemTypesFn).toHaveBeenCalledWith('series');
      expect(id).toBe('type-series-id');
    });

    it('usa la cache alla seconda chiamata', () => {
      service.getItemTypeId('movie').subscribe();
      service.getItemTypeId('movie').subscribe();
      expect(getItemTypesFn).toHaveBeenCalledTimes(1);
    });

    it('restituisce null se il tipo non esiste', () => {
      const emptyFn = vi.fn().mockReturnValue(of({ count: 0, results: [], next: null, previous: null }));
      const fresh = new TvdbService(null as any, { getItemTypes: emptyFn } as any);
      let id: string | null | undefined;
      fresh.getItemTypeId('unknown').subscribe(r => (id = r));
      expect(id).toBeNull();
    });
  });
});
