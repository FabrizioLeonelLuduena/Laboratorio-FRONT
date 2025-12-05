import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';

import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { PageTitleService } from 'src/app/shared/services/page-title.service';

import { CareReportingService } from '../../../services/care-reporting.service';
import { CareReportingCardComponent, CareReportingCardData } from '../care-reporting-card/care-reporting-card.component';
import { CareReportingFiltersComponent, CareReportingFilters } from '../care-reporting-filters/care-reporting-filters.component';

/** Main container for Attention reporting (filters + cards). */
@Component({
  selector: 'app-care-reporting-main',
  imports: [CommonModule, CareReportingFiltersComponent, CareReportingCardComponent],
  templateUrl: './care-reporting-main.component.html'
})
export class CareReportingMainComponent implements OnInit {
  data = signal<CareReportingCardData[]>([]);
  readonly cards = computed<CareReportingCardData[]>(() => this.data());

  /**
   * Component constructor that injects required services.
   */
  constructor(
    private readonly breadcrumb: BreadcrumbService,
    private readonly pageTitle: PageTitleService,
    private readonly reportingService: CareReportingService
  ) {}

  /**
   * Initializes the component and sets up page title and breadcrumbs.
   */
  ngOnInit(): void {
    this.pageTitle.setTitle('Reportes de Atención');
    this.breadcrumb.setBreadcrumbs([
      { label: 'Gestión de atenciones', route: '/care-management/care-home' },
      { label: 'Reportes' }
    ]);
  }

  /**
   * Handles filter changes, calls the service, and subscribes to update the data.
   */
  onFiltersApplied(filters: CareReportingFilters): void {
    this.reportingService.getCardsData(filters).subscribe(cards => {
      this.data.set(cards);
    });
  }
}
