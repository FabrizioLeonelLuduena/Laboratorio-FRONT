import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, ActivatedRoute } from '@angular/router';

import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../shared/services/page-title.service';

/**
 * Patients feature home component.
 */
@Component({
  selector: 'app-patients',
  standalone: true,
  templateUrl: './patients-home.component.html',
  imports: [
    RouterOutlet
  ],
  styleUrl: './patients-home.component.css'
})
export class PatientsHomeComponent implements OnInit {
  private breadcrumb = inject(BreadcrumbService);
  private title = inject(PageTitleService);
  private route = inject(ActivatedRoute);

  /**
   * Initializes the component.
   */
  ngOnInit(): void {
    this.title.setTitle('Gestión de pacientes');
    this.breadcrumb.buildFromRoute(this.route);
  }
}
