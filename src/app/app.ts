import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NbIconLibraries } from '@nebular/theme';

// Eva Icons non include icone dado/meeple, vinile o lettera; vengono aggiunte al pack
// "eva" (invece di un pack separato) così restano usabili senza l'attributo [pack].
const DICE_OUTLINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="100%" height="100%" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M7 3H17A4 4 0 0 1 21 7V17A4 4 0 0 1 17 21H7A4 4 0 0 1 3 17V7A4 4 0 0 1 7 3Z M7 5H17A2 2 0 0 1 19 7V17A2 2 0 0 1 17 19H7A2 2 0 0 1 5 17V7A2 2 0 0 1 7 5Z"/><circle cx="7.5" cy="7.5" r="1.6"/><circle cx="16.5" cy="7.5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="7.5" cy="16.5" r="1.6"/><circle cx="16.5" cy="16.5" r="1.6"/></svg>`;

const VINYL_OUTLINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="100%" height="100%" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M22 12A10 10 0 1 1 2 12A10 10 0 1 1 22 12Z M20.7 12A8.7 8.7 0 1 1 3.3 12A8.7 8.7 0 1 1 20.7 12Z M19 12A7 7 0 1 1 5 12A7 7 0 1 1 19 12Z M18.3 12A6.3 6.3 0 1 1 5.7 12A6.3 6.3 0 1 1 18.3 12Z M15.5 12A3.5 3.5 0 1 1 8.5 12A3.5 3.5 0 1 1 15.5 12Z M12.8 12A0.8 0.8 0 1 1 11.2 12A0.8 0.8 0 1 1 12.8 12Z"/></svg>`;

const LETTER_A_OUTLINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="100%" height="100%" viewBox="0 0 24 24"><text x="12" y="12.5" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="17">A</text></svg>`;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class App {
  constructor() {
    const iconLibraries = inject(NbIconLibraries);
    const evaPack = iconLibraries.getPack('eva');
    iconLibraries.registerSvgPack('eva', {
      ...Object.fromEntries(evaPack.icons),
      'dice-outline': DICE_OUTLINE_SVG,
      'vinyl-outline': VINYL_OUTLINE_SVG,
      'letter-a-outline': LETTER_A_OUTLINE_SVG,
    });
  }
}
