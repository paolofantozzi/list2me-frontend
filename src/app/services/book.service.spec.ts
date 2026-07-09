import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { BookService } from './book.service';
import { ItemTypeService } from './item-type.service';
import { BookResult } from '../models/book.model';
import { API_BASE } from './auth.service';

const mockBooks: BookResult[] = [
  {
    title: 'Dune',
    subtitle: 'Frank Herbert',
    image_url: 'https://covers.openlibrary.org/b/id/1-M.jpg',
    service_url: 'https://openlibrary.org/works/OL118077W',
    metadata: { open_library_key: '/works/OL118077W', author: 'Frank Herbert', isbn: '9780441013593', cover_url: 'https://covers.openlibrary.org/b/id/1-M.jpg', year: 1965, service_url: 'https://openlibrary.org/works/OL118077W' },
  },
  {
    title: 'Dune Messiah',
    subtitle: 'Frank Herbert',
    image_url: null,
    service_url: '',
    metadata: { open_library_key: '/works/OL118078W', author: 'Frank Herbert', isbn: '', cover_url: '', year: 1969, service_url: '' },
  },
];

const mockItemTypeResp = {
  count: 1,
  results: [{ id: 'type-book-id', name: 'book', label: 'Book', icon: 'book', schema: {}, is_system: true, created_by: null }],
  next: null,
  previous: null,
};

describe('BookService', () => {
  let service: BookService;
  let http: HttpTestingController;
  let getItemTypesFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getItemTypesFn = vi.fn().mockReturnValue(of(mockItemTypeResp));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BookService,
        { provide: ItemTypeService, useValue: { getItemTypes: getItemTypesFn } },
      ],
    });

    service = TestBed.inject(BookService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('search()', () => {
    it('restituisce array quando la risposta è già un array', () => {
      let result: BookResult[] | undefined;
      service.search('dune').subscribe(r => (result = r));

      const req = http.expectOne(r => r.url.includes('/books/search/'));
      expect(req.request.params.get('q')).toBe('dune');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush(mockBooks);

      expect(result).toEqual(mockBooks);
    });

    it('estrae results quando la risposta è un oggetto paginato', () => {
      let result: BookResult[] | undefined;
      service.search('dune').subscribe(r => (result = r));

      http.expectOne(r => r.url.includes('/books/search/')).flush({ results: mockBooks, count: 2, next: null, previous: null });

      expect(result).toEqual(mockBooks);
    });

    it('restituisce array vuoto se results è assente nella risposta', () => {
      let result: BookResult[] | undefined;
      service.search('xyz').subscribe(r => (result = r));

      http.expectOne(r => r.url.includes('/books/search/')).flush({});

      expect(result).toEqual([]);
    });

    it('usa il limit personalizzato', () => {
      service.search('dune', 5).subscribe();
      const req = http.expectOne(r => r.url.includes('/books/search/'));
      expect(req.request.params.get('limit')).toBe('5');
      req.flush([]);
    });
  });

  describe('getEditions()', () => {
    it('fa GET con work_key e restituisce le edizioni', () => {
      const mockEditions = [
        { edition_key: '/books/OL123M', title: 'Dune', languages: ['English'], year: 1965, publisher: 'Chilton', isbn: '9780441013593', cover_url: '', pages: 412, edition_name: 'First edition', service_url: 'https://openlibrary.org/books/OL123M' },
      ];
      let result: any;
      service.getEditions('/works/OL118077W').subscribe(r => (result = r));

      const req = http.expectOne(r => r.url.includes('/books/editions/'));
      expect(req.request.params.get('work_key')).toBe('/works/OL118077W');
      req.flush({ editions: mockEditions });

      expect(result).toHaveLength(1);
      expect(result[0].edition_key).toBe('/books/OL123M');
    });

    it('restituisce array vuoto se editions mancanti', () => {
      let result: any;
      service.getEditions('OL118077W').subscribe(r => (result = r));
      http.expectOne(r => r.url.includes('/books/editions/')).flush({});
      expect(result).toEqual([]);
    });

    it('usa il limit personalizzato', () => {
      service.getEditions('OL118077W', 5).subscribe();
      const req = http.expectOne(r => r.url.includes('/books/editions/'));
      expect(req.request.params.get('limit')).toBe('5');
      req.flush({ editions: [] });
    });
  });

  describe('syncBook()', () => {
    it('invia open_library_key nel body quando fornita', () => {
      service.syncBook('list-1', 'item-1', '/works/OL118077W').subscribe();

      const req = http.expectOne(r => r.url.includes('/sync-book/'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ open_library_key: '/works/OL118077W' });
      req.flush({});
    });

    it('invia body vuoto quando open_library_key è assente', () => {
      service.syncBook('list-1', 'item-1').subscribe();

      const req = http.expectOne(r => r.url.includes('/sync-book/'));
      expect(req.request.body).toEqual({});
      req.flush({});
    });
  });

  describe('getBookItemTypeId()', () => {
    it("restituisce l'id del tipo book", () => {
      let id: string | null | undefined;
      service.getBookItemTypeId().subscribe(r => (id = r));
      expect(id).toBe('type-book-id');
    });

    it('non chiama l\'API una seconda volta (cache)', () => {
      service.getBookItemTypeId().subscribe();
      service.getBookItemTypeId().subscribe();
      expect(getItemTypesFn).toHaveBeenCalledTimes(1);
    });

    it('restituisce null se il tipo book non esiste', () => {
      const emptyFn = vi.fn().mockReturnValue(of({ count: 0, results: [], next: null, previous: null }));
      const freshService = new BookService(null as any, { getItemTypes: emptyFn } as any);
      let id: string | null | undefined;
      freshService.getBookItemTypeId().subscribe(r => (id = r));
      expect(id).toBeNull();
    });
  });
});
