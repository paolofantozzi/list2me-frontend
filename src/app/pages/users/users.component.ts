import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';
import {
  NbCardModule, NbIconModule, NbSpinnerModule, NbButtonModule,
  NbInputModule, NbUserModule, NbAlertModule
} from '@nebular/theme';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { UserPublic } from '../../models/user.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NbCardModule,
    NbIconModule,
    NbSpinnerModule,
    NbButtonModule,
    NbInputModule,
    NbUserModule,
    NbAlertModule,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  searchControl = new FormControl('');
  users = signal<UserPublic[]>([]);
  loading = signal(false);
  error = signal('');
  total = signal(0);
  followingIds = new Set<string>();

  constructor(private userService: UserService, private authService: AuthService) {
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(query => {
        this.loading.set(true);
        this.error.set('');
        return this.userService.searchUsers(query ?? '').pipe(
          catchError(() => {
            this.error.set('Search failed.');
            return of({ count: 0, results: [], next: null, previous: null });
          })
        );
      })
    ).subscribe(result => {
      this.users.set(result.results);
      this.total.set(result.count);
      this.loading.set(false);
    });
  }

  ngOnInit(): void {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.userService.getFollowing(currentUser.id).subscribe({
        next: records => {
          records.forEach(r => this.followingIds.add(r.following.id));
        }
      });
    }
  }

  search(): void {
    const q = this.searchControl.value ?? '';
    this.loading.set(true);
    this.userService.searchUsers(q).subscribe({
      next: result => {
        this.users.set(result.results);
        this.total.set(result.count);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Search failed.');
        this.loading.set(false);
      }
    });
  }

  toggleFollow(user: UserPublic): void {
    const isFollowing = this.followingIds.has(user.id);
    const action = isFollowing
      ? this.userService.unfollowUser(user.id)
      : this.userService.followUser(user.id);

    action.subscribe({
      next: () => {
        if (isFollowing) {
          this.followingIds.delete(user.id);
        } else {
          this.followingIds.add(user.id);
        }
        this.users.update(us => [...us]);
      }
    });
  }

  isFollowing(user: UserPublic): boolean {
    return this.followingIds.has(user.id);
  }

  displayName(user: UserPublic): string {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return name || user.username;
  }
}
