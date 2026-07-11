import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TuiRoot } from '@taiga-ui/core';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TuiRoot],
  template: '<tui-root><router-outlet></router-outlet></tui-root>',
})
export class App {
  // Istanzia ThemeService al boot così il tema (classe body + dark Taiga) è
  // applicato fin dall'avvio, anche sulle pagine di autenticazione.
  private readonly theme = inject(ThemeService);
}
