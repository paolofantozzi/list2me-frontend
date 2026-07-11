import { Component, Input, Output, EventEmitter, OnDestroy, signal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError } from 'rxjs';
import { TagService } from '../../services/tag.service';
import { Tag } from '../../models/tag.model';

@Component({
  selector: 'app-tag-input',
  standalone: true,
  imports: [TuiIcon],
  templateUrl: './tag-input.component.html',
  styleUrl: './tag-input.component.scss',
})
export class TagInputComponent implements OnDestroy {
  @Input() tags: string[] = [];
  @Output() tagsChange = new EventEmitter<string[]>();

  suggestions = signal<Tag[]>([]);

  private search$ = new Subject<string>();

  constructor(private tagService: TagService) {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(q => q.trim().length >= 1),
      switchMap(q => this.tagService.searchTags(q).pipe(
        catchError(() => of({ count: 0, next: null, previous: null, results: [] }))
      ))
    ).subscribe(resp => this.suggestions.set(resp.results.filter(t => !this.tags.includes(t.name))));
  }

  onQueryChange(value: string): void {
    if (!value.trim()) {
      this.suggestions.set([]);
      return;
    }
    this.search$.next(value);
  }

  addTag(name: string): void {
    const clean = name.trim().toLowerCase().replace(/^#/, '');
    if (!clean || this.tags.includes(clean)) return;
    this.tagsChange.emit([...this.tags, clean]);
    this.suggestions.set([]);
  }

  addTagFromInput(input: HTMLInputElement): void {
    this.addTag(input.value);
    input.value = '';
  }

  removeTag(name: string): void {
    this.tagsChange.emit(this.tags.filter(t => t !== name));
  }

  ngOnDestroy(): void {
    this.search$.complete();
  }
}
