import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { TabViewModule } from 'primeng/tabview';

import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { BillingReportsComponent } from '../../billing-reports/billing-reports.component';
import { ReportDashboardComponent } from '../components/report-dashboard/report-dashboard.component';

// Global filter types used by the reporting dashboard
/**
 * Global filter types used by the reporting dashboard
 */
export type Granularity = 'month' | 'week' | 'year';

/**
 * Reporting home component that hosts the reporting dashboard.
 * Comments and docs in English; user-facing texts remain in Spanish in templates/services.
 */
@Component({
  selector: 'app-reporting-home',
  imports: [
    TabViewModule,
    ReportDashboardComponent,
    BillingReportsComponent
  ],
  templateUrl: './reporting-home.component.html',
  styleUrl: './reporting-home.component.css'
})
export class ReportingHomeComponent implements OnInit {
  /**
   * Filters applied and propagated to the dashboard.
   * Property names are compatible with chips/labels and ReportService payload.
   */
  appliedFilters: {
    insurerId?: number;
    insurerName?: string;
    dateStart?: Date;
    dateEnd?: Date;
  } = {};

  /**
   * Current time series granularity (monthly/weekly/yearly).
   * Kept here so the dashboard can be a dumb component.
   */
  granularity: Granularity = 'month';

  private breadcrumbService = inject(BreadcrumbService);
  private pageTitleService = inject(PageTitleService);
  private route = inject(ActivatedRoute);

  /** Lifecycle: set page title */
  ngOnInit(): void {
    this.pageTitleService.setTitle('Reportes');
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Facturación y cobros' },
      { label: 'Reportes' }
    ]);
  }

  /** Handler invoked by filters component */
  onApplyFilters(filters: { insurerId?: number; insurerName?: string; dateStart?: Date; dateEnd?: Date }) {
    this.appliedFilters = { ...filters };
  }

  /** Clears filters */
  onClearFilters() {
    this.appliedFilters = {};
  }

  /** Granularity change from dashboard time series component */
  onGranularityChange(g: Granularity) {
    this.granularity = g;
  }
}
