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
      'created': 'plus-circle-outline',
      'forked': 'copy-outline',
      'followed': 'heart-outline',
      'updated': 'edit-outline',
      'deleted': 'trash-2-outline',
      'suggested': 'bulb-outline',
      'merged': 'shuffle-2-outline',
      'shared': 'share-outline',
    };
    return map[verb] ?? 'activity-outline';
  }
}
