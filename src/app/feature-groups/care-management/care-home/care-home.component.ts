import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { ChartData, ChartOptions, ChartType } from 'chart.js';
import { SkeletonModule } from 'primeng/skeleton';
import { DashboardChartCard, DashboardChartCardComponent } from 'src/app/shared/components/dashboard-chart-card/dashboard-chart-card.component';
import { DashboardMetric, DashboardMetricCardComponent } from 'src/app/shared/components/dashboard-metric-card/dashboard-metric-card.component';
import { SkeletonCardComponent } from 'src/app/shared/components/skeleton-card/skeleton-card.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { PageTitleService } from 'src/app/shared/services/page-title.service';


import { CareReportingFilters, CareReportingFiltersComponent } from '../reporting/components/care-reporting-filters/care-reporting-filters.component';
import { CareDashboardService } from '../services/care-dashboard.service';

import { DelayedAttentionsTableComponent } from './delayed-attentions-table/delayed-attentions-table.component';

/**
 *
 */
@Component({
  selector: 'app-care-management',
  standalone: true,
  templateUrl: './care-home.component.html',
  imports: [
    CommonModule,
    SkeletonModule,
    DashboardMetricCardComponent,
    DashboardChartCardComponent,
    SkeletonCardComponent,
    CareReportingFiltersComponent,
    DelayedAttentionsTableComponent
  ],
  styleUrl: './care-home.component.css'
})
export class CareHomeComponent implements OnInit {
  metrics: DashboardMetric[] = [];
  chartCards: DashboardChartCard[] = [];
  delayedAttentions: any[] = [];

  /**
   * Component constructor that injects required services.
   */
  constructor(
    private readonly pageTitleService: PageTitleService,
    private readonly breadcrumbService: BreadcrumbService,
    private readonly careDashboard: CareDashboardService
  ) {}

  /**
   * Initializes the component and sets up page title and breadcrumbs.
   */
  ngOnInit(): void {
    this.pageTitleService.setTitle('Atención');
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Gestión de atenciones', route: '/care-management/care-home' },
      { label: 'Dashboard' }
    ]);
  }

  /**
   * Handles filter application event and loads dashboard data.
   */
  onFiltersApplied(filters: CareReportingFilters): void {
    this.loadData(filters);
  }

  /**
   * Loads dashboard metrics and chart cards based on applied filters.
   */
  private loadData(filters: CareReportingFilters): void {
    this.careDashboard.getMetrics(filters).subscribe(m => this.metrics = m);
    this.careDashboard.getChartCards(filters).subscribe(cards => {
      const standardChartTypes: ChartType[] = ['bar', 'line', 'pie', 'doughnut', 'polarArea', 'radar', 'scatter', 'bubble'];
      this.chartCards = cards
        .filter(c => standardChartTypes.includes(c.chartType as ChartType))
        .map(c => ({
          ...c,
          chartType: c.chartType as ChartType,
          data: c.data as ChartData,
          options: c.options as ChartOptions
        }));

      const tableCard = cards.find(c => c.chartType === 'table');
      this.delayedAttentions = tableCard ? (tableCard.data as any[]) : [];
    });
  }
}
