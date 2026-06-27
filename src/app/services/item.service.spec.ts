import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ItemService } from './item.service';
import { Item } from '../models/list.model';

const LIST_ID = 'list-abc';
const ITEM_ID = 'item-xyz';

const mockItem = (overrides: Partial<Item> = {}): Item => ({
  id: ITEM_ID,
  list: LIST_ID,
  position: '1',
  text: 'Test item',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('ItemService', () => {
  let service: ItemService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ItemService],
    });
    service = TestBed.inject(ItemService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getItems() fa GET alla URL corretta', () => {
    service.getItems(LIST_ID).subscribe();
    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/items/`) && r.method === 'GET');
    req.flush([mockItem()]);
  });

  it('addItem() fa POST con i dati corretti', () => {
    const payload = { text: 'Nuovo', position: '1' };
    let result: Item | undefined;
    service.addItem(LIST_ID, payload).subscribe(r => (result = r));

    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/items/`) && r.method === 'POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockItem(payload));

    expect(result?.text).toBe('Nuovo');
  });

  it('addItem() con new_child_list incluso nel payload', () => {
    const payload = { text: 'Con sotto-lista', position: '1', new_child_list: { title: 'Sub', visibility: 'private' } };
    service.addItem(LIST_ID, payload as any).subscribe();

    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/items/`) && r.method === 'POST');
    expect(req.request.body['new_child_list']).toEqual({ title: 'Sub', visibility: 'private' });
    req.flush(mockItem());
  });

  it('getItem() fa GET alla URL corretta', () => {
    service.getItem(LIST_ID, ITEM_ID).subscribe();
    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/items/${ITEM_ID}/`) && r.method === 'GET');
    req.flush(mockItem());
  });

  it('updateItem() fa PATCH con i dati corretti', () => {
    const patch = { text: 'Aggiornato' };
    service.updateItem(LIST_ID, ITEM_ID, patch).subscribe();

    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/items/${ITEM_ID}/`) && r.method === 'PATCH');
    expect(req.request.body).toEqual(patch);
    req.flush(mockItem(patch));
  });

  it('updateItem() con child_list: null scollega la sotto-lista', () => {
    service.updateItem(LIST_ID, ITEM_ID, { child_list: null } as any).subscribe();

    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/items/${ITEM_ID}/`) && r.method === 'PATCH');
    expect(req.request.body).toEqual({ child_list: null });
    req.flush(mockItem({ child_list: null }));
  });

  it('deleteItem() fa DELETE alla URL corretta', () => {
    service.deleteItem(LIST_ID, ITEM_ID).subscribe();
    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/items/${ITEM_ID}/`) && r.method === 'DELETE');
    req.flush(null);
  });

  it('reorderItems() fa POST con l\'array order corretto', () => {
    const order = [{ id: 'a', position: 1 }, { id: 'b', position: 2 }];
    service.reorderItems(LIST_ID, order).subscribe();

    const req = http.expectOne(r => r.url.endsWith(`/lists/${LIST_ID}/items/reorder/`) && r.method === 'POST');
    expect(req.request.body).toEqual({ order });
    req.flush({});
  });
});
