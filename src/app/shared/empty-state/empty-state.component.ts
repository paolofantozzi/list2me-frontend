import { Component, Input } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [TuiIcon],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  @Input() icon = '@tui.info';
  @Input() title = '';
  @Input() message?: string;
}
