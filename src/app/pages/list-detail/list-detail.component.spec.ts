import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { NbToastrService, NbThemeModule } from '@nebular/theme';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { ListDetailComponent } from './list-detail.component';
import { ListService } from '../../services/list.service';
import { ItemService } from '../../services/item.service';
import { BookService } from '../../services/book.service';
import { AuthService } from '../../services/auth.service';
import { List, Item, Suggestion, ListDiff } from '../../models/list.model';
import { UserDetail } from '../../models/user.model';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser: UserDetail = { id: 'user-1', username: 'mario', email: 'm@test.it', first_name: '', last_name: '', date_joined: '2026-01-01T00:00:00Z' };

const mockOwner = { id: 'user-1', username: 'mario', first_name: '', last_name: '', bio: '', avatar_url: '', date_joined: '2026-01-01T00:00:00Z' };

const makeList = (overrides: Partial<List> = {}): List => ({
  id: 'list-1',
  title: 'La mia lista',
  owner: mockOwner,
  visibility: 'public',
  tags: [],
  items_count: 2,
  version: 1,
  is_fork: false,
  is_following: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'item-1',
  list: 'list-1',
  position: '1',
  text: 'Elemento uno',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeSuggestion = (): Suggestion => ({
  id: 'sugg-1',
  list: 'list-1',
  author: mockOwner,
  status: 'pending',
  actions: [{ action: 'add', item_text: 'Nuovo elemento' }],
  created_at: '2026-01-01T00:00:00Z',
});

// ── Factory ───────────────────────────────────────────────────────────────────

function buildComponent(userOverride: Partial<UserDetail> = {}) {
  const items = [makeItem(), makeItem({ id: 'item-2', position: '2', text: 'Elemento due' })];

  const listService = {
    getList: vi.fn().mockReturnValue(of({ ...makeList(), items })),
    forkList: vi.fn(),
    followList: vi.fn(),
    unfollowList: vi.fn(),
    getDiff: vi.fn(),
    mergeList: vi.fn(),
    reportList: vi.fn(),
    getSuggestions: vi.fn(),
    createSuggestion: vi.fn(),
    acceptSuggestion: vi.fn(),
    rejectSuggestion: vi.fn(),
  };

  const itemService = {
    getItems: vi.fn().mockReturnValue(of([])),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    reorderItems: vi.fn(),
  };

  const bookService = {
    search: vi.fn().mockReturnValue(of([])),
    syncBook: vi.fn(),
    getBookItemTypeId: vi.fn().mockReturnValue(of('type-book-id')),
  };

  const toastr = { success: vi.fn(), danger: vi.fn(), info: vi.fn() };
  const router = { navigate: vi.fn() };
  const currentUser = vi.fn().mockReturnValue({ ...mockUser, ...userOverride });

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: ListService, useValue: listService },
      { provide: ItemService, useValue: itemService },
      { provide: BookService, useValue: bookService },
      { provide: NbToastrService, useValue: toastr },
      { provide: Router, useValue: router },
      { provide: AuthService, useValue: { currentUser } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'list-1' } } } },
    ],
  });
  // Use empty template + only ReactiveFormsModule to avoid loading the full Nebular provider tree
  TestBed.overrideComponent(ListDetailComponent, {
    set: { template: '', imports: [ReactiveFormsModule] },
  });

  const fixture = TestBed.createComponent(ListDetailComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { fixture, component, listService, itemService, bookService, toastr, router };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ListDetailComponent', () => {

  describe('inizializzazione', () => {
    it('carica la lista al ngOnInit', () => {
      const { component, listService } = buildComponent();
      expect(listService.getList).toHaveBeenCalledWith('list-1');
      expect(component.list()?.title).toBe('La mia lista');
    });

    it('popola gli items dalla risposta della lista', () => {
      const { component } = buildComponent();
      expect(component.items().length).toBe(2);
    });

    it('carica gli items separatamente se non inclusi nella lista', () => {
      const listService2 = { getList: vi.fn().mockReturnValue(of(makeList())) };
      const itemService2 = { getItems: vi.fn().mockReturnValue(of([makeItem()])), addItem: vi.fn(), updateItem: vi.fn(), deleteItem: vi.fn(), reorderItems: vi.fn() };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideAnimationsAsync(),
          { provide: ListService, useValue: listService2 },
          { provide: ItemService, useValue: itemService2 },
          { provide: BookService, useValue: { search: vi.fn().mockReturnValue(of([])), getBookItemTypeId: vi.fn() } },
          { provide: NbToastrService, useValue: { success: vi.fn(), danger: vi.fn() } },
          { provide: Router, useValue: { navigate: vi.fn() } },
          { provide: AuthService, useValue: { currentUser: vi.fn().mockReturnValue(mockUser) } },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'list-1' } } } },
        ],
        schemas: [NO_ERRORS_SCHEMA],
      });
      TestBed.overrideComponent(ListDetailComponent, { set: { template: '', imports: [ReactiveFormsModule] } });
      const fixture = TestBed.createComponent(ListDetailComponent);
      fixture.detectChanges();
      expect(itemService2.getItems).toHaveBeenCalledWith('list-1');
    });
  });

  // ── isOwner ────────────────────────────────────────────────────────────────

  describe('isOwner', () => {
    it('è true quando il currentUser è il proprietario', () => {
      const { component } = buildComponent({ id: 'user-1' });
      expect(component.isOwner).toBe(true);
    });

    it('è false quando il currentUser non è il proprietario', () => {
      const { component } = buildComponent({ id: 'altro-utente' });
      expect(component.isOwner).toBe(false);
    });
  });

  // ── isBookItem ─────────────────────────────────────────────────────────────

  describe('isBookItem()', () => {
    it('è true per item con cover_url nei metadata', () => {
      const { component } = buildComponent();
      expect(component.isBookItem(makeItem({ metadata: { cover_url: 'http://example.com/cover.jpg' } }))).toBe(true);
    });

    it('è true per item con author nei metadata', () => {
      const { component } = buildComponent();
      expect(component.isBookItem(makeItem({ metadata: { author: 'Frank Herbert' } }))).toBe(true);
    });

    it('è true per item con item_type_detail.name === book', () => {
      const { component } = buildComponent();
      const item = makeItem({ item_type_detail: { id: '1', name: 'book', label: 'Book', icon: 'book', schema: {}, is_system: true, created_by: null } });
      expect(component.isBookItem(item)).toBe(true);
    });

    it('è false per item generico', () => {
      const { component } = buildComponent();
      expect(component.isBookItem(makeItem())).toBe(false);
    });
  });

  // ── addItem ────────────────────────────────────────────────────────────────

  describe('addItem()', () => {
    it('chiama itemService.addItem con testo e posizione', () => {
      const { component, itemService, toastr } = buildComponent();
      itemService.addItem.mockReturnValue(of(makeItem({ id: 'item-3', text: 'Nuovo' })));

      component.addItemForm.setValue({ text: 'Nuovo', new_child_list_title: '', new_child_list_visibility: 'public' });
      component.addItem();

      expect(itemService.addItem).toHaveBeenCalledWith('list-1', expect.objectContaining({ text: 'Nuovo' }));
      expect(toastr.success).toHaveBeenCalled();
    });

    it('include new_child_list nel payload quando showNewChildList è true', () => {
      const { component, itemService } = buildComponent();
      itemService.addItem.mockReturnValue(of(makeItem()));

      component.showNewChildList.set(true);
      component.addItemForm.setValue({ text: 'Con sotto-lista', new_child_list_title: 'Sub-lista', new_child_list_visibility: 'private' });
      component.addItem();

      const payload = itemService.addItem.mock.calls[0][1] as any;
      expect(payload['new_child_list']).toEqual({ title: 'Sub-lista', visibility: 'private' });
    });

    it('non include new_child_list se showNewChildList è false', () => {
      const { component, itemService } = buildComponent();
      itemService.addItem.mockReturnValue(of(makeItem()));

      component.showNewChildList.set(false);
      component.addItemForm.setValue({ text: 'Semplice', new_child_list_title: 'Titolo', new_child_list_visibility: 'public' });
      component.addItem();

      const payload = itemService.addItem.mock.calls[0][1] as any;
      expect(payload['new_child_list']).toBeUndefined();
    });

    it('non fa nulla se il form è invalido', () => {
      const { component, itemService } = buildComponent();
      component.addItemForm.setValue({ text: '', new_child_list_title: '', new_child_list_visibility: 'public' });
      component.addItem();
      expect(itemService.addItem).not.toHaveBeenCalled();
    });
  });

  // ── deleteItem ─────────────────────────────────────────────────────────────

  describe('deleteItem()', () => {
    it('rimuove l\'item dalla lista locale dopo DELETE', () => {
      const { component, itemService } = buildComponent();
      itemService.deleteItem.mockReturnValue(of(undefined));
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const initialCount = component.items().length;
      component.deleteItem(component.items()[0]);

      expect(component.items().length).toBe(initialCount - 1);
    });

    it('non fa nulla se l\'utente annulla il confirm', () => {
      const { component, itemService } = buildComponent();
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      component.deleteItem(component.items()[0]);
      expect(itemService.deleteItem).not.toHaveBeenCalled();
    });
  });

  // ── Reorder ────────────────────────────────────────────────────────────────

  describe('moveItemUp() / moveItemDown()', () => {
    it('moveItemUp() sposta l\'item in posizione precedente e chiama reorderItems', () => {
      const { component, itemService } = buildComponent();
      itemService.reorderItems.mockReturnValue(of({}));
      const secondId = component.items()[1].id;

      component.moveItemUp(1);

      expect(component.items()[0].id).toBe(secondId);
      expect(itemService.reorderItems).toHaveBeenCalledWith('list-1', [
        { id: secondId, position: 1 },
        { id: 'item-1', position: 2 },
      ]);
    });

    it('moveItemDown() sposta l\'item in posizione successiva e chiama reorderItems', () => {
      const { component, itemService } = buildComponent();
      itemService.reorderItems.mockReturnValue(of({}));
      const firstId = component.items()[0].id;

      component.moveItemDown(0);

      expect(component.items()[1].id).toBe(firstId);
      expect(itemService.reorderItems).toHaveBeenCalled();
    });

    it('moveItemUp(0) non fa nulla', () => {
      const { component, itemService } = buildComponent();
      component.moveItemUp(0);
      expect(itemService.reorderItems).not.toHaveBeenCalled();
    });

    it('moveItemDown(ultimo) non fa nulla', () => {
      const { component, itemService } = buildComponent();
      component.moveItemDown(component.items().length - 1);
      expect(itemService.reorderItems).not.toHaveBeenCalled();
    });
  });

  // ── Diff / merge ───────────────────────────────────────────────────────────

  describe('diff / merge', () => {
    it('loadDiff() chiama getDiff e popola il signal', () => {
      const { component, listService } = buildComponent();
      const diff: ListDiff = { added: [makeItem({ id: 'item-new' })], removed: [] };
      listService.getDiff.mockReturnValue(of(diff));

      component.loadDiff();

      expect(listService.getDiff).toHaveBeenCalledWith('list-1');
      expect(component.diff()).toEqual(diff);
    });

    it('toggleDiff() chiama loadDiff se il diff non è ancora caricato', () => {
      const { component, listService } = buildComponent();
      listService.getDiff.mockReturnValue(of({ added: [], removed: [] }));

      component.toggleDiff();

      expect(component.showDiff()).toBe(true);
      expect(listService.getDiff).toHaveBeenCalled();
    });

    it('toggleDiff() non richiama getDiff se il diff è già caricato', () => {
      const { component, listService } = buildComponent();
      component.diff.set({ added: [], removed: [] });

      component.toggleDiff();

      expect(listService.getDiff).not.toHaveBeenCalled();
    });

    it('mergeFork() chiama mergeList e ricarica la lista', () => {
      const { component, listService } = buildComponent();
      listService.mergeList.mockReturnValue(of({}));
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      component.mergeFork();

      expect(listService.mergeList).toHaveBeenCalledWith('list-1');
      expect(listService.getList).toHaveBeenCalledTimes(2);
    });

    it('mergeFork() non fa nulla se l\'utente annulla', () => {
      const { component, listService } = buildComponent();
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      component.mergeFork();
      expect(listService.mergeList).not.toHaveBeenCalled();
    });
  });

  // ── Suggestions ────────────────────────────────────────────────────────────

  describe('suggestions', () => {
    it('loadSuggestions() chiama getSuggestions e popola il signal', () => {
      const { component, listService } = buildComponent();
      listService.getSuggestions.mockReturnValue(of([makeSuggestion()]));

      component.loadSuggestions();

      expect(component.suggestions().length).toBe(1);
    });

    it('submitSuggestion() chiama createSuggestion con le azioni corrette', () => {
      const { component, listService, toastr } = buildComponent();
      listService.createSuggestion.mockReturnValue(of(makeSuggestion()));

      component.suggestForm.setValue({ action: 'add', item_text: 'Proposta' });
      component.submitSuggestion();

      expect(listService.createSuggestion).toHaveBeenCalledWith('list-1', [{ action: 'add', item_text: 'Proposta' }]);
      expect(toastr.success).toHaveBeenCalled();
    });

    it('submitSuggestion() non fa nulla se il form è invalido', () => {
      const { component, listService } = buildComponent();
      component.suggestForm.setValue({ action: 'add', item_text: '' });
      component.submitSuggestion();
      expect(listService.createSuggestion).not.toHaveBeenCalled();
    });

    it('acceptSuggestion() chiama acceptSuggestion e rimuove il suggerimento dalla lista', () => {
      const { component, listService } = buildComponent();
      listService.acceptSuggestion.mockReturnValue(of({}));
      const sugg = makeSuggestion();
      component.suggestions.set([sugg]);

      component.acceptSuggestion(sugg);

      expect(listService.acceptSuggestion).toHaveBeenCalledWith('list-1', 'sugg-1');
      expect(component.suggestions()).toEqual([]);
    });

    it('rejectSuggestion() chiama rejectSuggestion e rimuove il suggerimento dalla lista', () => {
      const { component, listService } = buildComponent();
      listService.rejectSuggestion.mockReturnValue(of({}));
      const sugg = makeSuggestion();
      component.suggestions.set([sugg]);

      component.rejectSuggestion(sugg);

      expect(listService.rejectSuggestion).toHaveBeenCalledWith('list-1', 'sugg-1');
      expect(component.suggestions()).toEqual([]);
    });
  });

  // ── Report ─────────────────────────────────────────────────────────────────

  describe('reportList()', () => {
    it('chiama reportList con il motivo inserito', () => {
      const { component, listService, toastr } = buildComponent();
      listService.reportList.mockReturnValue(of({}));
      vi.spyOn(window, 'prompt').mockReturnValue('Spam');

      component.reportList();

      expect(listService.reportList).toHaveBeenCalledWith('list-1', 'Spam');
      expect(toastr.success).toHaveBeenCalled();
    });

    it('non fa nulla se il prompt è annullato', () => {
      const { component, listService } = buildComponent();
      vi.spyOn(window, 'prompt').mockReturnValue(null);
      component.reportList();
      expect(listService.reportList).not.toHaveBeenCalled();
    });

    it('non fa nulla se il motivo è vuoto', () => {
      const { component, listService } = buildComponent();
      vi.spyOn(window, 'prompt').mockReturnValue('   ');
      component.reportList();
      expect(listService.reportList).not.toHaveBeenCalled();
    });
  });

  // ── Liste annidate ─────────────────────────────────────────────────────────

  describe('liste annidate (child_list)', () => {
    it('navigateToChildList() naviga alla lista figlia', () => {
      const { component, router } = buildComponent();
      component.navigateToChildList('list-child-99');
      expect(router.navigate).toHaveBeenCalledWith(['/pages/lists', 'list-child-99']);
    });

    it('unlinkChildList() chiama updateItem con child_list: null', () => {
      const { component, itemService } = buildComponent();
      const itemWithChild = makeItem({ child_list: 'list-child-99', child_list_detail: { id: 'list-child-99', title: 'Sub', visibility: 'private', items_count: 0 } });
      itemService.updateItem.mockReturnValue(of({ ...itemWithChild, child_list: null, child_list_detail: null }));

      component.unlinkChildList(itemWithChild);

      expect(itemService.updateItem).toHaveBeenCalledWith('list-1', 'item-1', { child_list: null });
    });

    it('saveEditItem() include new_child_list nel PATCH quando showEditChildList è true', () => {
      const { component, itemService } = buildComponent();
      const item = makeItem();
      itemService.updateItem.mockReturnValue(of(item));

      component.startEditItem(item);
      component.showEditChildList.set(true);
      component.editItemForm.setValue({ text: 'Modifica', new_child_list_title: 'Sotto', new_child_list_visibility: 'public' });
      component.saveEditItem();

      const patch = itemService.updateItem.mock.calls[0][2] as any;
      expect(patch['new_child_list']).toEqual({ title: 'Sotto', visibility: 'public' });
    });

    it('saveEditItem() non include new_child_list se showEditChildList è false', () => {
      const { component, itemService } = buildComponent();
      const item = makeItem();
      itemService.updateItem.mockReturnValue(of(item));

      component.startEditItem(item);
      component.showEditChildList.set(false);
      component.editItemForm.setValue({ text: 'Solo testo', new_child_list_title: 'Sotto', new_child_list_visibility: 'public' });
      component.saveEditItem();

      const patch = itemService.updateItem.mock.calls[0][2] as any;
      expect(patch['new_child_list']).toBeUndefined();
    });
  });

  // ── Follow / fork ──────────────────────────────────────────────────────────

  describe('follow / fork', () => {
    it('toggleFollow() chiama followList quando non si sta seguendo', () => {
      const { component, listService } = buildComponent({ id: 'altro-utente' });
      listService.followList.mockReturnValue(of({}));
      component.list.update(l => l ? { ...l, is_following: false } : l);

      component.toggleFollow();

      expect(listService.followList).toHaveBeenCalledWith('list-1');
    });

    it('toggleFollow() chiama unfollowList quando si sta già seguendo', () => {
      const { component, listService } = buildComponent({ id: 'altro-utente' });
      listService.unfollowList.mockReturnValue(of(undefined));
      component.list.update(l => l ? { ...l, is_following: true } : l);

      component.toggleFollow();

      expect(listService.unfollowList).toHaveBeenCalledWith('list-1');
    });

    it('forkList() naviga alla lista forkata', () => {
      const { component, listService, router } = buildComponent({ id: 'altro-utente' });
      listService.forkList.mockReturnValue(of({ ...makeList(), id: 'list-fork' }));

      component.forkList();

      expect(router.navigate).toHaveBeenCalledWith(['/pages/lists', 'list-fork']);
    });
  });
});
