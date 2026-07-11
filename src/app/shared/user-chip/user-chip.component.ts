import { Component, Input } from '@angular/core';
import { TuiAvatar } from '@taiga-ui/kit';

/**
 * Piccola "user chip" (avatar + nome + eventuale sottotitolo) che sostituisce
 * `nb-user` di Nebular. L'avatar usa la direttiva Taiga `tuiAvatar`: se `picture`
 * è un URL mostra l'immagine, altrimenti ricava le iniziali dal nome.
 */
@Component({
  selector: 'app-user-chip',
  standalone: true,
  imports: [TuiAvatar],
  template: `
    <span class="uc">
      <span class="uc-avatar" [tuiAvatar]="picture || initials" [round]="true" [size]="size"></span>
      @if (!onlyPicture) {
        <span class="uc-text">
          <span class="uc-name">{{ name }}</span>
          @if (caption) { <span class="uc-caption">{{ caption }}</span> }
        </span>
      }
    </span>
  `,
  styleUrl: './user-chip.component.scss',
})
export class UserChipComponent {
  @Input({ required: true }) name = '';
  @Input() picture: string | null = null;
  @Input() caption?: string;
  @Input() size: 'xs' | 's' | 'm' | 'l' | 'xl' = 'm';
  @Input() onlyPicture = false;

  get initials(): string {
    const parts = this.name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
}
