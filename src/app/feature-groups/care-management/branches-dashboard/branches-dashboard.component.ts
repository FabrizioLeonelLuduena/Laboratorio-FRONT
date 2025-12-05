import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';

import { ChartData, ChartOptions } from 'chart.js';
import { SkeletonModule } from 'primeng/skeleton';
import { Subject, takeUntil } from 'rxjs';
import { DashboardChartCard, DashboardChartCardComponent } from 'src/app/shared/components/dashboard-chart-card/dashboard-chart-card.component';
import { DashboardMetric, DashboardMetricCardComponent } from 'src/app/shared/components/dashboard-metric-card/dashboard-metric-card.component';
import { SkeletonCardComponent } from 'src/app/shared/components/skeleton-card/skeleton-card.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { PageTitleService } from 'src/app/shared/services/page-title.service';

import { BranchResume } from '../models/branch';
import { BranchService } from '../services/branch.service';


/**
 * Branches Dashboard component
 *
 * Renders KPIs and charts that summarize operational data per branch.
 * Consumes `api/v2/configurations/branches/resume` via BranchService and
 * maps it into shared dashboard cards.
 */
@Component({
  selector: 'app-branches-dashboard',
  standalone: true,
  templateUrl: './branches-dashboard.component.html',
  styleUrl: './branches-dashboard.component.css',
  imports: [
    CommonModule,
    SkeletonModule,
    DashboardMetricCardComponent,
    DashboardChartCardComponent,
    SkeletonCardComponent
  ]
})
export class BranchesDashboardComponent implements OnInit, OnDestroy {
  private readonly pageTitleService = inject(PageTitleService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly branchService = inject(BranchService);

  metrics: DashboardMetric[] = [];
  chartCards: DashboardChartCard[] = [];
  loading = signal<boolean>(true);
  /** Notifier to cancel ongoing subscriptions on destroy */
  private destroy$ = new Subject<void>();

  /**
   * Initializes title and breadcrumbs, then loads dashboard data.
   */
  ngOnInit(): void {
    this.pageTitleService.setTitle('Sucursales');
    this.breadcrumbService.setBreadcrumbs([
      { label: 'GestiÃ³n de sucursales', route: '/care-management/branches' },
      { label: 'Dashboard' }
    ]);

    this.loadData();
  }

  /**
   * Loads branch resume data and builds metrics and charts.
   * Manages loading state and provides a safe fallback on errors.
   */
  private loadData(): void {
    this.loading.set(true);
    this.branchService.getBranchesResume()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resumes) => {
          this.metrics = this.buildMetrics(resumes);
          this.chartCards = this.buildCharts(resumes);
          this.loading.set(false);
        },
        error: () => {
          this.metrics = [];
          this.chartCards = [];
          this.loading.set(false);
        }
      });
  }

  /**
   * Builds KPI metrics from the branch resume collection.
   *
   * @param list List of BranchResume items returned by the API
   * @returns DashboardMetric array for KPI cards
   */
  private buildMetrics(list: BranchResume[]): DashboardMetric[] {
    const totalBranches = list.length;
    const totalBoxes = list.reduce((acc, b) => acc + (b.boxCount ?? 0), 0);
    const totalRegisters = list.reduce((acc, b) => acc + (b.registerCount ?? 0), 0);
    const totalDesks = list.reduce((acc, b) => acc + (b.assistantDesk ?? 0), 0);

    return [
      {
        label: 'Sucursales',
        value: String(totalBranches),
        subtext: 'Total habilitadas',
        icon: 'pi pi-building',
        helpText: 'Cantidad total de sucursales registradas en el sistema.',
        accent: 'primary'
      },
      {
        label: 'Boxes',
        value: String(totalBoxes),
        subtext: 'Capacidad instalada',
        icon: 'pi pi-th-large',
        helpText: 'Suma de boxes declarados en todas las sucursales.',
        accent: 'success'
      },
      {
        label: 'Puestos de admisión',
        value: String(totalDesks),
        subtext: 'Mesas de atención',
        icon: 'pi pi-desktop',
        helpText: 'Total de puestos de admisión reportados en sucursales.',
        accent: 'warning'
      },
      {
        label: 'Registros',
        value: String(totalRegisters),
        subtext: 'Acumulado reciente',
        icon: 'pi pi-inbox',
        helpText: 'Cantidad de registros asociados a sucursales (indicador operativo).',
        accent: 'danger'
      }
    ];
  }

  /**
   * Creates chart card configurations from the branch resume data.
   * Generates bar charts for registers/boxes/desks and a pie chart for distribution.
   *
   * @param list List of BranchResume items returned by the API
   * @returns DashboardChartCard array ready to render
   */
  private buildCharts(list: BranchResume[]): DashboardChartCard[] {
    const labels = list.map(b => b.description ?? b.code);

    const registersData: ChartData<'bar'> = {
      labels,
      datasets: [{ label: 'Registros', data: list.map(b => (b.registerCount ?? 0)), backgroundColor: '#008c8a', borderRadius: 8 }]
    };

    const boxesData: ChartData<'bar'> = {
      labels,
      datasets: [{ label: 'Boxes', data: list.map(b => (b.boxCount ?? 0)), backgroundColor: '#35cdcb', borderRadius: 8 }]
    };

    const desksData: ChartData<'bar'> = {
      labels,
      datasets: [{ label: 'Puestos', data: list.map(b => (b.assistantDesk ?? 0)), backgroundColor: '#6fdfdd', borderRadius: 8 }]
    };

    const distributionPie: ChartData<'pie'> = {
      labels,
      datasets: [{ data: list.map(b => (b.registerCount ?? 0)), backgroundColor: ['#008c8a', '#00a3a1', '#00bab8', '#35cdcb', '#6fdfdd', '#a6efee'] }]
    };

    const compactOptions: ChartOptions<'bar'> = {
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { maxRotation: 45, minRotation: 0 } } }
    };

    const cards: DashboardChartCard[] = [
      {
        title: 'Registros por sucursal',
        description: 'Comparativa de registros operativos por sucursal.',
        icon: 'pi pi-chart-bar',
        chartType: 'bar',
        data: registersData,
        options: compactOptions
      },
      {
        title: 'Boxes por sucursal',
        description: 'Capacidad instalada por ubicación.',
        icon: 'pi pi-sliders-h',
        chartType: 'bar',
        data: boxesData,
        options: compactOptions
      },
      {
        title: 'Puestos de admisión',
        description: 'Cantidad de puestos de atención por sucursal.',
        icon: 'pi pi-users',
        chartType: 'bar',
        data: desksData,
        options: compactOptions
      },
      {
        title: 'Distribución de carga',
        description: 'Participación de registros por sucursal.',
        icon: 'pi pi-chart-pie',
        chartType: 'pie',
        data: distributionPie
      }
    ];
    return cards;
  }

  /**
   * Cleans up subscriptions when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
