import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';

export interface ItemRowBadge {
  text: string;
  /** Es. 'nutri-badge--a' per colorare un Nutri-Score/Eco-Score. */
  cssClass?: string;
}

@Component({
  selector: 'app-item-row',
  standalone: true,
  imports: [TuiIcon],
  templateUrl: './item-row.component.html',
  styleUrl: './item-row.component.scss',
})
export class ItemRowComponent {
  @Input() imageUrl: string | null = null;
  @Input({ required: true }) iconFallback = '';
  @Input({ required: true }) title = '';
  @Input() typeLabel: string | null = null;
  @Input() metaText: string | null = null;
  /** 'cover' per una thumbnail che deve riempire il riquadro (es. tile mappa), invece del contain di default (copertine libro/album/...). */
  @Input() coverFit: 'contain' | 'cover' = 'contain';
  /** Badge a pillola sotto la riga meta (es. Nutri-Score/NOVA/Eco-Score di un prodotto). */
  @Input() badges: ItemRowBadge[] | null = null;

  @Output() open = new EventEmitter<void>();
}
