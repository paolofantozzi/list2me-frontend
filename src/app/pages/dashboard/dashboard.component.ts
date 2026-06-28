import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NbCardModule, NbIconModule, NbSpinnerModule, NbListModule, NbUserModule, NbButtonModule, NbBadgeModule } from '@nebular/theme';
import { ActivityService } from '../../services/activity.service';
import { Activity } from '../../models/activity.model';

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
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  activities = signal<Activity[]>([]);
  loading = signal(true);
  error = signal('');

  constructor(private activityService: ActivityService) {}

  ngOnInit(): void {
    this.loadFeed();
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

  targetName(activity: Activity): string {
    const extra = activity.extra_data as Record<string, string> | null;
    if (!extra) return '';
    return extra['title'] ?? extra['list_title'] ?? extra['name'] ?? extra['username'] ?? '';
  }

  targetLink(activity: Activity): string | null {
    if (activity.target_type === 'list' && activity.target_object_id) {
      return `/pages/lists/${activity.target_object_id}`;
    }
    return null;
  }
}
