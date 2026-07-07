import { Injectable, signal } from '@angular/core';
import { NbThemeService } from '@nebular/theme';

export type AppTheme = 'default' | 'dark';

const THEME_KEY = 'list2me_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<AppTheme>(this.loadStoredTheme());

  readonly theme = this._theme.asReadonly();

  constructor(private nbThemeService: NbThemeService) {
    this.nbThemeService.changeTheme(this._theme());
  }

  toggle(): void {
    this.setTheme(this._theme() === 'dark' ? 'default' : 'dark');
  }

  setTheme(theme: AppTheme): void {
    this._theme.set(theme);
    localStorage.setItem(THEME_KEY, theme);
    this.nbThemeService.changeTheme(theme);
  }

  private loadStoredTheme(): AppTheme {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'default';
  }
}
