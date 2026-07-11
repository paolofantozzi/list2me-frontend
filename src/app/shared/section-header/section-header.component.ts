import { Component, Input } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [TuiIcon],
  templateUrl: './section-header.component.html',
  styleUrl: './section-header.component.scss',
})
export class SectionHeaderComponent {
  @Input() title = '';
  @Input() icon?: string;
  @Input() count?: number;
}
