import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ListService } from './list.service';

const LIST_ID = 'list-abc';
const SUGGESTION_ID = 'sugg-xyz';

// URL matchers use endsWith so they work regardless of API_BASE (dev vs prod)
const url = (suffix: string) => (r: { url: string; method: string }, method: string) =>
  r.url.endsWith(suffix) && r.method === method;

describe('ListService', () => {
  let service: ListService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ListService],
    });
    service = TestBed.inject(ListService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ── Core list endpoints ────────────────────────────────────────────────────

  it('getLists() fa GET con paginazione', () => {
    service.getLists(2).subscribe();
    const req = http.expectOne(r => r.url.includes('/lists/') && r.params.get('page') === '2');
    expect(req.request.method).toBe('GET');
    req.flush({ count: 0, results: [] });
  });

  it('getList() fa GET alla URL corretta', () => {
    service.getList(LIST_ID).subscribe();
    http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/`) && r.method === 'GET').flush({});
  });

  it('createList() fa POST con i dati', () => {
    service.createList({ title: 'Nuova' }).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/lists/') && r.method === 'POST');
    expect(req.request.body).toEqual({ title: 'Nuova' });
    req.flush({});
  });

  it('updateList() fa PATCH', () => {
    service.updateList(LIST_ID, { title: 'Aggiornata' }).subscribe();
    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/`) && r.method === 'PATCH');
    expect(req.request.body).toEqual({ title: 'Aggiornata' });
    req.flush({});
  });

  it('deleteList() fa DELETE', () => {
    service.deleteList(LIST_ID).subscribe();
    http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/`) && r.method === 'DELETE').flush(null);
  });

  // ── Fork ──────────────────────────────────────────────────────────────────

  it('forkList() fa POST', () => {
    service.forkList(LIST_ID).subscribe();
    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/fork/`));
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  // ── Follow ────────────────────────────────────────────────────────────────

  it('followList() fa POST', () => {
    service.followList(LIST_ID).subscribe();
    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/follow/`) && r.method === 'POST');
    req.flush({});
  });

  it('unfollowList() fa DELETE', () => {
    service.unfollowList(LIST_ID).subscribe();
    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/follow/`) && r.method === 'DELETE');
    req.flush(null);
  });

  // ── Diff / merge ──────────────────────────────────────────────────────────

  it('getDiff() restituisce il diff corretto', () => {
    let result: any;
    service.getDiff(LIST_ID).subscribe(r => (result = r));
    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/diff/`) && r.method === 'GET');
    req.flush({ added: [], removed: [] });
    expect(result).toEqual({ added: [], removed: [] });
  });

  it('mergeList() fa POST', () => {
    service.mergeList(LIST_ID).subscribe();
    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/merge/`));
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  // ── Report ────────────────────────────────────────────────────────────────

  it('reportList() invia destinatario e motivo nel body', () => {
    service.reportList(LIST_ID, 'user-9', 'Contenuto inappropriato').subscribe();
    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/report/`));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reported_to_id: 'user-9', message: 'Contenuto inappropriato' });
    req.flush({});
  });

  // ── Suggestions ───────────────────────────────────────────────────────────

  it('getSuggestions() fa GET', () => {
    service.getSuggestions(LIST_ID).subscribe();
    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/suggestions/`) && r.method === 'GET');
    req.flush([]);
  });

  it('createSuggestion() invia descrizione e azioni nel body', () => {
    const description = 'Aggiungi un elemento';
    const actions = [{ action: 'add', item_text: 'Elemento suggerito' }];
    service.createSuggestion(LIST_ID, description, actions).subscribe();
    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/suggestions/`) && r.method === 'POST');
    expect(req.request.body).toEqual({ description, actions });
    req.flush({});
  });

  it('acceptSuggestion() fa POST all\'endpoint accept', () => {
    service.acceptSuggestion(LIST_ID, SUGGESTION_ID).subscribe();
    const req = http.expectOne(r => r.url.includes(`/suggestions/${SUGGESTION_ID}/accept/`));
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('rejectSuggestion() fa POST all\'endpoint reject', () => {
    service.rejectSuggestion(LIST_ID, SUGGESTION_ID).subscribe();
    const req = http.expectOne(r => r.url.includes(`/suggestions/${SUGGESTION_ID}/reject/`));
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  // ── Shares ────────────────────────────────────────────────────────────────

  it('shareList() fa POST con shared_with_id e permesso (default view)', () => {
    service.shareList(LIST_ID, 'user-123').subscribe();
    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/shares/`) && r.method === 'POST');
    expect(req.request.body).toEqual({ shared_with_id: 'user-123', permission: 'view' });
    req.flush({});
  });

  it('revokeShare() fa DELETE', () => {
    service.revokeShare(LIST_ID, 'share-1').subscribe();
    const req = http.expectOne(r => r.url.endsWith('/shares/share-1/') && r.method === 'DELETE');
    req.flush(null);
  });
});
