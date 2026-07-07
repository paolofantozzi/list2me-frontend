import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NbCardModule, NbIconModule, NbSpinnerModule, NbListModule, NbUserModule, NbButtonModule, NbBadgeModule } from '@nebular/theme';
import { ActivityService } from '../../services/activity.service';
import { Activity } from '../../models/activity.model';
import { ListService } from '../../services/list.service';
import { GroupService } from '../../services/group.service';
import { AuthService } from '../../services/auth.service';
import { List } from '../../models/list.model';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NbCardModule,
    NbIconModule,
    NbSpinnerModule,
    NbListModule,
    NbUserModule,
    NbButtonModule,
    NbBadgeModule,
    PageHeaderComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  activities = signal<Activity[]>([]);
  loading = signal(true);
  error = signal('');
  expandedIds = signal<Set<string>>(new Set());

  // Pannello "Panoramica" — stato indipendente dal feed: un fallimento qui
  // non deve nascondere il feed attività e viceversa.
  statsLoading = signal(true);
  statsError = signal('');
  listsCount = signal(0);
  groupsCount = signal(0);
  pendingInvitesCount = signal(0);
  recentLists = signal<List[]>([]);

  constructor(
    private activityService: ActivityService,
    private listService: ListService,
    private groupService: GroupService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadFeed();
    this.loadStats();
  }

  loadFeed(): void {
    this.loading.set(true);
    this.activityService.getFeed().subscribe({
      next: data => {
        this.activities.set(Array.isArray(data) ? data : (data as any).results ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load activity feed.');
        this.loading.set(false);
      }
    });
  }

  loadStats(): void {
    this.statsLoading.set(true);
    this.statsError.set('');
    const uid = this.auth.currentUser()?.id;

    this.listService.getLists(undefined, true).subscribe({
      next: response => {
        const ownLists = response.results
          .filter(l => l.owner.id === uid)
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
        this.listsCount.set(ownLists.length);
        this.recentLists.set(ownLists.slice(0, 4));
        this.statsLoading.set(false);
      },
      error: () => {
        this.statsError.set('Impossibile caricare la panoramica.');
        this.statsLoading.set(false);
      }
    });

    this.groupService.getGroups().subscribe({
      next: groups => this.groupsCount.set(groups.length),
      error: () => {},
    });

    this.groupService.getPendingInvites().subscribe({
      next: invites => this.pendingInvitesCount.set(invites.length),
      error: () => {},
    });
  }

  activityIcon(verb: string): string {
    const map: Record<string, string> = {
      'created_list': 'plus-circle-outline',
      'updated_list': 'edit-outline',
      'deleted_list': 'trash-2-outline',
      'forked_list': 'copy-outline',
      'added_item': 'plus-outline',
      'removed_item': 'minus-outline',
      'followed_user': 'person-add-outline',
      'followed_list': 'heart-outline',
      'created_group': 'people-outline',
      'joined_group': 'person-done-outline',
      'shared_list': 'share-outline',
      'suggested_change': 'bulb-outline',
      'accepted_suggestion': 'checkmark-circle-outline',
      'reported_list': 'flag-outline',
    };
    return map[verb] ?? 'activity-outline';
  }

  verbLabel(verb: string): string {
    const map: Record<string, string> = {
      'created_list': 'ha creato la lista',
      'updated_list': 'ha aggiornato la lista',
      'deleted_list': 'ha eliminato la lista',
      'forked_list': 'ha copiato la lista',
      'added_item': 'ha aggiunto un elemento a',
      'removed_item': 'ha rimosso un elemento da',
      'followed_user': 'ha iniziato a seguire',
      'followed_list': 'ha iniziato a seguire la lista',
      'created_group': 'ha creato il gruppo',
      'joined_group': 'si è unito al gruppo',
      'shared_list': 'ha condiviso la lista',
      'suggested_change': 'ha proposto una modifica a',
      'accepted_suggestion': 'ha accettato un suggerimento per',
      'reported_list': 'ha segnalato la lista',
    };
    return map[verb] ?? verb;
  }

  private readonly itemVerbs = new Set(['added_item', 'updated_item', 'removed_item']);

  categoryLabel(verb: string): string {
    const map: Record<string, string> = {
      created_list: 'Lista',
      updated_list: 'Lista',
      deleted_list: 'Lista',
      forked_list: 'Lista',
      followed_list: 'Lista',
      shared_list: 'Lista',
      reported_list: 'Lista',
      added_item: 'Elemento',
      updated_item: 'Elemento',
      removed_item: 'Elemento',
      followed_user: 'Utente',
      created_group: 'Gruppo',
      joined_group: 'Gruppo',
      suggested_change: 'Suggerimento',
      accepted_suggestion: 'Suggerimento',
    };
    return map[verb] ?? 'Attività';
  }

  targetName(activity: Activity): string {
    const extra = (activity.extra_data ?? {}) as Record<string, string>;
    if (this.itemVerbs.has(activity.verb)) {
      return extra['text'] ?? extra['list_title'] ?? '';
    }
    if (activity.verb === 'followed_user') {
      return extra['username'] ?? '';
    }
    if (activity.verb === 'created_group' || activity.verb === 'joined_group') {
      return extra['name'] ?? '';
    }
    return extra['title'] ?? extra['list_title'] ?? extra['name'] ?? extra['username'] ?? '';
  }

  targetLink(activity: Activity): string | null {
    const extra = (activity.extra_data ?? {}) as Record<string, string>;
    if (extra['list_id']) {
      return `/pages/lists/${extra['list_id']}`;
    }
    if (activity.target_type === 'list' && activity.target_object_id) {
      return `/pages/lists/${activity.target_object_id}`;
    }
    return null;
  }

  private readonly detailFieldLabels: Record<string, string> = {
    title: 'Titolo',
    list_title: 'Lista',
    text: 'Elemento',
    name: 'Nome',
    username: 'Utente',
    shared_with_username: 'Condiviso con',
    reported_to_username: 'Segnalato a',
    suggested_by_username: 'Proposto da',
    source_title: 'Lista originale',
    description: 'Descrizione',
  };

  activityDetails(activity: Activity): { label: string; value: string }[] {
    const extra = (activity.extra_data ?? {}) as Record<string, unknown>;
    return Object.entries(extra)
      .filter(([key, value]) => key !== 'list_id' && value !== null && value !== undefined && value !== '')
      .map(([key, value]) => ({ label: this.detailFieldLabels[key] ?? key, value: String(value) }));
  }

  toggleExpand(id: string): void {
    this.expandedIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }
}
