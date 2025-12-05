import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, ActivatedRoute } from '@angular/router';

import { BreadcrumbService } from '../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../shared/services/page-title.service';

/**
 *
 */
@Component({
  selector: 'app-analytical-management-home',
  standalone: true,
  templateUrl: './analytical-management-home.component.html',
  styleUrls: ['./analytical-management-home.component.css'],
  imports: [RouterOutlet]
})
/**
 * Main container for Analytical Management.
 * Renders child routes via <router-outlet> and configures
 * the page title and breadcrumbs for the module root.
 */
export class AnalyticalManagementHomeComponent implements OnInit {
  private breadcrumb = inject(BreadcrumbService);
  private title = inject(PageTitleService);
  private route = inject(ActivatedRoute);

  /** Inicializa título y breadcrumbs del módulo. */
  ngOnInit(): void {
    this.title.setTitle('Gestión de Analítica');
    this.breadcrumb.buildFromRoute(this.route);
  }
}
