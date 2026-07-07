import { Component, Input } from '@angular/core';
import { NbIconModule } from '@nebular/theme';
import { AttributionLogo } from '../external-search-panel/external-search-panel.component';
import { ItemRowBadge } from '../item-row/item-row.component';

export interface ItemDetailRow {
  /** Omesso per una riga senza icona (es. il nome scientifico di una pianta). */
  icon?: string;
  text: string;
  wrap?: boolean;
  italic?: boolean;
}

export interface ItemDetailLink {
  url: string;
  label: string;
}

@Component({
  selector: 'app-item-detail-expand',
  standalone: true,
  imports: [NbIconModule],
  templateUrl: './item-detail-expand.component.html',
  styleUrl: './item-detail-expand.component.scss',
})
export class ItemDetailExpandComponent {
  @Input() imageUrl: string | null = null;
  @Input({ required: true }) title = '';
  @Input() rows: ItemDetailRow[] = [];
  @Input() gallery: string[] | null = null;
  @Input() externalLink: ItemDetailLink | null = null;
  /** Logo di attribuzione sempre visibile (es. "Powered by BGG"), oltre all'eventuale externalLink. */
  @Input() attributionLogo: AttributionLogo | null = null;
  /** Badge a pillola (es. "Da interno"/"Tropicale" per una pianta, o Nutri-Score/NOVA/Eco-Score colorati per un prodotto). */
  @Input() badges: ItemRowBadge[] | null = null;
  /** Riga di avviso in evidenza (es. tossicità), mostrata dopo i badge. */
  @Input() warningText: string | null = null;
}
