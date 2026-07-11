import { Injectable, signal, inject } from '@angular/core';
import { TUI_DARK_MODE } from '@taiga-ui/core';

export type AppTheme = 'default' | 'dark';

const THEME_KEY = 'list2me_theme';

/**
 * Gestione del tema chiaro/scuro senza Nebular.
 * - Applica la classe `nb-theme-{name}` su <body>: i design token `--l2m-*`
 *   (definiti in styles.scss per body.nb-theme-default/dark) seguono di conseguenza.
 * - Sincronizza il dark mode nativo di Taiga tramite il signal TUI_DARK_MODE,
 *   così anche i componenti Taiga (superfici, dropdown, ecc.) si adattano.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly darkMode = inject(TUI_DARK_MODE);
  private readonly _theme = signal<AppTheme>(this.loadStoredTheme());

  readonly theme = this._theme.asReadonly();

  constructor() {
    this.apply(this._theme());
  }

  toggle(): void {
    this.setTheme(this._theme() === 'dark' ? 'default' : 'dark');
  }

  setTheme(theme: AppTheme): void {
    this._theme.set(theme);
    localStorage.setItem(THEME_KEY, theme);
    this.apply(theme);
  }

  private apply(theme: AppTheme): void {
    const dark = theme === 'dark';
    const body = document.body;
    body.classList.toggle('nb-theme-dark', dark);
    body.classList.toggle('nb-theme-default', !dark);
    this.darkMode.set(dark);
  }

  private loadStoredTheme(): AppTheme {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'default';
  }
}
