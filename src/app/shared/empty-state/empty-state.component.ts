import { Component, Input } from '@angular/core';
import { NbIconModule } from '@nebular/theme';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [NbIconModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  @Input() icon = 'info-outline';
  @Input() title = '';
  @Input() message?: string;
}
