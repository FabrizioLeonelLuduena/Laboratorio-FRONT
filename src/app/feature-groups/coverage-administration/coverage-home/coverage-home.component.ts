import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, ActivatedRoute } from '@angular/router';

import { BreadcrumbService } from '../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../shared/services/page-title.service';

/**
 * Coverage Administration feature home component.
 * Acts as a container for child routes.
 */
@Component({
  selector: 'app-coverage-administration',
  standalone: true,
  templateUrl: './coverage-home.component.html',
  imports: [
    RouterOutlet
  ],
  styleUrl: './coverage-home.component.css'
})
export class CoverageHomeComponent implements OnInit {
  private breadcrumbService = inject(BreadcrumbService);
  private pageTitleService = inject(PageTitleService);
  private route = inject(ActivatedRoute);


  /**
   * Sets the page title and breadcrumb on component initialization.
   */
  ngOnInit(): void {
    // Limpiar cualquier borrador de liquidación previo al volver al home de coberturas
    try {
      localStorage.removeItem('settlementNewDraft');
      localStorage.removeItem('settlementState');
    } catch {}
    this.pageTitleService.setTitle('Administración de Coberturas');
    this.breadcrumbService.buildFromRoute(this.route);
  }
}
