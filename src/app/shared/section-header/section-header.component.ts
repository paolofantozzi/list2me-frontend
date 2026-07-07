import { Component, Input } from '@angular/core';
import { NbIconModule } from '@nebular/theme';

@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [NbIconModule],
  templateUrl: './section-header.component.html',
  styleUrl: './section-header.component.scss',
})
export class SectionHeaderComponent {
  @Input() title = '';
  @Input() icon?: string;
  @Input() count?: number;
}
